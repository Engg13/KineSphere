import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { YoutubeEmbedPipe } from '../../pipes/youtube-embed.pipe';

import {
  Firestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc
} from '@angular/fire/firestore';

@Component({
  selector: 'app-rutina-publica',
  standalone: true,
  imports: [IonicModule, CommonModule, YoutubeEmbedPipe],
  templateUrl: './rutina-publica.page.html'
})
export class RutinaPublicaPage implements OnInit {

  private route = inject(ActivatedRoute);
  private firestore = inject(Firestore);

  rutina: any = null;
  rutinaId: string | null = null;
  cargando = true;
  painScore: number | null = null;
  guardandoDolor = false;

  async ngOnInit() {

    try {

      const token = this.route.snapshot.paramMap.get('token');

      if (!token) {
        this.cargando = false;
        return;
      }

      const ref = collection(this.firestore, 'rutinas');

      const q = query(
        ref,
        where('publicToken', '==', token),
        where('publicEnabled', '==', true)
      );

      const snap = await getDocs(q);

      if (!snap.empty) {

        const docData = snap.docs[0];

        this.rutina = docData.data();
        this.rutinaId = docData.id;

        // registrar último acceso del paciente
        await updateDoc(
          doc(this.firestore, `rutinas/${this.rutinaId}`),
          { ultimoAccesoPaciente: new Date().toISOString() }
        );

      }

    } catch (err) {

      console.error('Error cargando rutina pública', err);

    }

    this.cargando = false;

  }

  async toggleSerie(ejIdx: number, serieIdx: number) {

    if (!this.rutina || !this.rutinaId) return;

    // evitar mutación directa
    const ejerciciosActualizados = structuredClone(this.rutina.ejercicios);

    const serie = ejerciciosActualizados[ejIdx].series[serieIdx];
    serie.completada = !serie.completada;

    // actualizar estado local
    this.rutina.ejercicios = ejerciciosActualizados;

    await updateDoc(
      doc(this.firestore, `rutinas/${this.rutinaId}`),
      { ejercicios: ejerciciosActualizados }
    );

  }

  getProgreso(): number {

    if (!this.rutina?.ejercicios) return 0;

    let total = 0;
    let completadas = 0;

    this.rutina.ejercicios.forEach((ej: any) => {

      total += ej.series.length;

      completadas += ej.series.filter(
        (s: any) => s.completada
      ).length;

    });

    return total ? Math.round((completadas / total) * 100) : 0;

  }

  async guardarDolorSesion() {

    if (!this.rutinaId || this.painScore === null) return;

    this.guardandoDolor = true;

    try {

      await updateDoc(
        doc(this.firestore, `rutinas/${this.rutinaId}`),
        {
          painDuringSession: this.painScore,
          painRecordedAt: new Date().toISOString()
        }
      );

    } catch (err) {
      console.error('Error guardando dolor', err);
    }

    this.guardandoDolor = false;

  }

}