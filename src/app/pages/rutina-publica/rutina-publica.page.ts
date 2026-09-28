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
  comentarioDolor = '';
  guardandoSesion = false;
  sesionGuardada = false;
  progresoGuardado = false;
  ejerciciosGlobales: Record<string, any> = {};
  private readonly DRAFT_PREFIX = 'kinesphere_rutina_domiciliaria_draft_';
  

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

      this.restaurarProgresoGuardado();

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

  getSeriesCompletadas(): number {
    return this.ejerciciosLocales.reduce(
      (total, ej) => total + ej.series.filter(s => s.completada).length,
      0
    );
  }

  // ========================================
  // SAVE / RESTORE PROGRESS
  // ========================================

  private getDraftKey(): string {
    return `${this.DRAFT_PREFIX}${this.rutinaId ?? 'unknown'}`;
  }

  guardarProgresoParaDespues() {
    if (!this.rutinaId || this.sesionGuardada || this.getSeriesCompletadas() === 0) {
      return;
    }

    try {
      const draft = {
        ejercicios: this.ejerciciosLocales.map(ej => ({
          ejercicioId: ej.ejercicioId,
          series: ej.series.map(serie => ({
            numero: serie.numero,
            completada: serie.completada
          }))
        })),
        painScore: this.painScore,
        comentarioDolor: this.comentarioDolor,
        savedAt: new Date().toISOString()
      };

      localStorage.setItem(this.getDraftKey(), JSON.stringify(draft));
      this.progresoGuardado = true;
    } catch (err) {
      console.error('No se pudo guardar el progreso local', err);
    }
  }

  private restaurarProgresoGuardado() {
    if (!this.rutinaId) return;

    try {
      const raw = localStorage.getItem(this.getDraftKey());
      if (!raw) return;

      const draft = JSON.parse(raw);

      for (const ejercicio of this.ejerciciosLocales) {
        const guardado = draft.ejercicios?.find(
          (item: any) => item.ejercicioId === ejercicio.ejercicioId
        );

        if (!guardado) continue;

        for (const serie of ejercicio.series) {
          const serieGuardada = guardado.series?.find(
            (item: any) => item.numero === serie.numero
          );

          if (serieGuardada) {
            serie.completada = !!serieGuardada.completada;
          }
        }
      }

      this.painScore =
        typeof draft.painScore === 'number' ? draft.painScore : null;

      this.comentarioDolor = draft.comentarioDolor ?? '';
      this.progresoGuardado = this.getSeriesCompletadas() > 0;
    } catch (err) {
      console.error('No se pudo restaurar el progreso local', err);
      localStorage.removeItem(this.getDraftKey());
    }
  }

  private eliminarProgresoGuardado() {
    if (!this.rutinaId) return;

    try {
      localStorage.removeItem(this.getDraftKey());
      this.progresoGuardado = false;
    } catch (err) {
      console.error('No se pudo eliminar el progreso local', err);
    }
  }

  // ========================================
  // FINISH ACTIVITY — creates session + logs
  // ========================================

  async finalizarSesion() {

    if (!this.rutinaPath || !this.rutinaId || !this.rutina) return;
    if (this.guardandoSesion || this.sesionGuardada) return;

    if (this.getSeriesCompletadas() === 0 || this.painScore === null) return;

    if (!this.rutina.treatmentId) {
      console.error('La rutina domiciliaria no tiene tratamiento asociado');
      return;
    }

    this.guardandoSesion = true;

    try {

      // clinics/{clinicId}/rutinas_paciente/{rutinaId}
      const pathParts = this.rutinaPath.split('/');
      const clinicId = pathParts[1];

      // =========================
      // Construir logs de la actividad
      // =========================

      const logs: Omit<import('../../models/rutina-sesion.model').RutinaLog, 'id'>[] = [];
      const totalSeries = this.ejerciciosLocales.reduce(
        (total, ej) => total + ej.series.length,
        0
      );
      const seriesCompletadas = this.ejerciciosLocales.reduce(
        (total, ej) => total + ej.series.filter(s => s.completada).length,
        0
      );

      for (const ej of this.ejerciciosLocales) {
        for (const serie of ej.series) {
          if (!serie.completada) continue;

          logs.push({
            sesionId: '',
            rutinaId: this.rutinaId,
            pacienteId: this.rutina.pacienteId,
            treatmentId: this.rutina.treatmentId,
            ejercicioId: ej.ejercicioId,
            serie: serie.numero,
            completado: true,
            repeticiones: serie.repeticiones,
            dolor: this.painScore ?? undefined
          });
        }
      }

      // =========================
      // Registrar actividad completa de forma atómica
      // =========================

      await this.sesionesService.registrarActividadDomiciliaria(
        {
          rutinaId: this.rutinaId,
          pacienteId: this.rutina.pacienteId,
          treatmentId: this.rutina.treatmentId,
          clinicId,
          tipoSesion: 'domiciliaria',
          fecha: new Date(),
          ...(this.painScore !== null && this.painScore !== undefined ? { painScore: this.painScore } : {}),
...(this.comentarioDolor.trim()
  ? {
      comentario: this.comentarioDolor.trim()
    }
  : {}),
totalSeries,
          seriesCompletadas,
          progreso: totalSeries ? Math.round((seriesCompletadas / totalSeries) * 100) : 0
        },
        logs
      );

      this.sesionGuardada = true;
      this.eliminarProgresoGuardado();

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