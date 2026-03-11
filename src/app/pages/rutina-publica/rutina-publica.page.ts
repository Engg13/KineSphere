import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { YoutubeEmbedPipe } from '../../pipes/youtube-embed.pipe';
import { RutinasSesionesService } from '../../services/rutinas-sesiones.service';
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
  series: SerieLocal[];
}

@Component({
  selector: 'app-rutina-publica',
  standalone: true,
  imports: [IonicModule, CommonModule, YoutubeEmbedPipe],
  templateUrl: './rutina-publica.page.html'
})
export class RutinaPublicaPage implements OnInit {

  private route = inject(ActivatedRoute);
  private firestore = inject(Firestore);
  private sesionesService: RutinasSesionesService;

  rutina: any = null;
  rutinaId: string | null = null;
  rutinaPath: string | null = null;
  ejerciciosLocales: EjercicioLocal[] = [];
  cargando = true;
  painScore: number | null = null;
  guardandoSesion = false;
  sesionGuardada = false;

  async ngOnInit() {

    try {

      const token = this.route.snapshot.paramMap.get('token');

      if (!token) {
        this.cargando = false;
        return;
      }

      // Query across all clinics using collectionGroup
      const groupRef = collectionGroup(this.firestore, 'rutinas_paciente');

      const q = query(
        groupRef,
        where('publicToken', '==', token),
        where('publicEnabled', '==', true),
        limit(1)
      );

      const snap = await getDocs(q);

      if (!snap.empty) {

        const docSnap = snap.docs[0];

        this.rutina = docSnap.data();
        this.rutinaId = docSnap.id;
        this.rutinaPath = docSnap.ref.path;

        // Build local exercise state for UI tracking
        this.ejerciciosLocales = this.buildEjerciciosLocales(
          this.rutina.ejercicios || []
        );

      }

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

      return {
        ejercicioId: ej.ejercicioId,
        nombre: ej.nombre,
        notas: ej.notas,
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
}