import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { RutinasSesionesService } from '../../services/rutinas-sesiones.service';
import { FormsModule } from '@angular/forms';
import {
  Firestore,
  collectionGroup,
  collection,
  query,
  where,
  limit,
  getDocs,
  doc,
  writeBatch,
  addDoc,
  serverTimestamp
} from '@angular/fire/firestore';
import { RutinaTemplateEjercicio } from '../../models/rutina-ejercicio.model';

interface SerieLocal {
  numero: number;
  repeticiones?: number;
  completada: boolean;
}

interface EjercicioLocal {
  ejercicioId: string;
  nombre: string;
  notas?: string;
  videoUrl?: string;
  videoThumbnail?: string;
  videoOpen?: boolean; 
  series: SerieLocal[];
}


@Component({
  selector: 'app-rutina-publica',
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
  templateUrl: './rutina-publica.page.html',
  styleUrls: ['./rutina-publica.page.scss']
})
export class RutinaPublicaPage implements OnInit {

  private route = inject(ActivatedRoute);
  private firestore = inject(Firestore);
  private sesionesService = inject(RutinasSesionesService);


  rutina: any = null;
  rutinaId: string | null = null;
  rutinaPath: string | null = null;
  ejerciciosLocales: EjercicioLocal[] = [];
  cargando = true;
  painScore: number | null = null;
  guardandoSesion = false;
  sesionGuardada = false;
  ejerciciosGlobales: Record<string, any> = {};
  

  async ngOnInit() {
    

    try {

      const token = this.route.snapshot.paramMap.get('token');

      if (!token) {
        this.cargando = false;
        return;
      }

      const clinicId = 'clinic_kinesiologia_fundadores';

      // =============================
      // 1️⃣ Buscar rutina por token
      // =============================

      const ref = collection(
        this.firestore,
        `clinics/${clinicId}/rutinas_paciente`
      );

      const q = query(
        ref,
        where('publicToken', '==', token),
        where('publicEnabled', '==', true),
        limit(1)
      );

      const snap = await getDocs(q);

      if (snap.empty) {
        console.warn('Rutina no encontrada para token');
        this.cargando = false;
        return;
      }

      const docSnap = snap.docs[0];

      this.rutina = docSnap.data();
      this.rutinaId = docSnap.id;
      this.rutinaPath = docSnap.ref.path;

      // =============================
      // 2️⃣ Obtener IDs de ejercicios
      // =============================

      const ejerciciosIds = (this.rutina.ejercicios || []).map(
        (e: any) => e.ejercicioId
      );

      if (ejerciciosIds.length > 0) {

        const ejerciciosRef = collection(this.firestore, 'ejercicios_globales');

        const ejerciciosQuery = query(
          ejerciciosRef,
          where('__name__', 'in', ejerciciosIds)
        );

        const ejerciciosSnap = await getDocs(ejerciciosQuery);

        this.ejerciciosGlobales = {};

        ejerciciosSnap.forEach(doc => {
          this.ejerciciosGlobales[doc.id] = doc.data();
        });

      }

      // =============================
      // 3️⃣ Construir ejercicios locales
      // =============================

      this.ejerciciosLocales = this.buildEjerciciosLocales(
        this.rutina.ejercicios || []
      );

    } catch (err) {

      console.error('Error cargando rutina publica', err);

    }

    this.cargando = false;

  }

  // ========================================
  // BUILD LOCAL STATE FROM RUTINA EXERCISES
  // ========================================

  private buildEjerciciosLocales(
    ejercicios: RutinaTemplateEjercicio[]
  ): EjercicioLocal[] {

    return ejercicios.map(ej => {

      const series: SerieLocal[] = [];

      for (let i = 1; i <= ej.series; i++) {
        series.push({
          numero: i,
          repeticiones: ej.repeticiones,
          completada: false
        });
      }

      const ejercicioGlobal = this.ejerciciosGlobales[ej.ejercicioId];

      return {
        ejercicioId: ej.ejercicioId,
        nombre: ej.nombre,
        notas: ej.notas,
        videoUrl: ejercicioGlobal?.videoUrl,
        videoThumbnail: ejercicioGlobal?.videoThumbnail,
        videoOpen: false,
        series
      };

    });

  }

  // ========================================
  // TOGGLE SERIES (LOCAL ONLY — no Firestore write)
  // ========================================

  toggleSerie(ejIdx: number, serieIdx: number) {

    if (this.sesionGuardada) return;

    const serie = this.ejerciciosLocales[ejIdx]?.series[serieIdx];

    if (serie) {
      serie.completada = !serie.completada;
    }

  }

  // ========================================
  // PROGRESS
  // ========================================

  getProgreso(): number {

    let total = 0;
    let completadas = 0;

    this.ejerciciosLocales.forEach(ej => {

      total += ej.series.length;

      completadas += ej.series.filter(s => s.completada).length;

    });

    return total ? Math.round((completadas / total) * 100) : 0;

  }

  // ========================================
  // FINISH SESSION — creates session + logs
  // ========================================

  async finalizarSesion() {

    if (!this.rutinaPath || !this.rutinaId || !this.rutina) return;
    if (this.guardandoSesion || this.sesionGuardada) return;

    this.guardandoSesion = true;

    try {

      // clinics/{clinicId}/rutinas_paciente/{rutinaId}
      const pathParts = this.rutinaPath.split('/');
      const clinicId = pathParts[1];

      // =========================
      // Crear sesión
      // =========================

      const sesionId = await this.sesionesService.registrarSesion({
        rutinaId: this.rutinaId,
        pacienteId: this.rutina.pacienteId,
        clinicId,
        tipoSesion: 'domiciliaria',
        fecha: new Date(),
        painScore: this.painScore,
        comentario: ''
      });

      // =========================
      // Crear logs
      // =========================

      const logs = [];

      for (const ej of this.ejerciciosLocales) {

        for (const serie of ej.series) {

          if (!serie.completada) continue;

          logs.push({
            sesionId,
            rutinaId: this.rutinaId,
            pacienteId: this.rutina.pacienteId,
            ejercicioId: ej.ejercicioId,
            serie: serie.numero,
            repeticiones: serie.repeticiones,
            dolor: this.painScore
          });

        }

      }

      if (logs.length) {
        await this.sesionesService.registrarLogs(logs);
      }

      this.sesionGuardada = true;

    } catch (err) {

      console.error('Error guardando sesión', err);

    }

    this.guardandoSesion = false;

  }

  reproducirVideo(event: any) {

    const video = event.target as HTMLVideoElement;

    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }

  }
  
}