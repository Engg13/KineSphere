import { Injectable } from '@angular/core';
import {
  collection,
  collectionData,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from '@angular/fire/firestore';
import { Observable, combineLatest, map } from 'rxjs';
import { BaseClinicService } from '../core/services/base-clinic.service';
import { Ejercicio } from '../models/ejercicio.model';

@Injectable({
  providedIn: 'root'
})
export class EjerciciosFirestoreService extends BaseClinicService {

  getEjercicios(): Observable<Ejercicio[]> {

    const globalRef = collection(
      this.firestore,
      'ejercicios_globales'
    );

    const clinicRef = collection(
      this.firestore,
      `clinics/${this.clinicId}/ejercicios`
    );

    const global$ = collectionData(globalRef, { idField: 'id' });
    const clinic$ = collectionData(clinicRef, { idField: 'id' });

    return combineLatest([global$, clinic$]).pipe(

      map(([global, clinic]) => [
        ...(global as Ejercicio[]),
        ...(clinic as Ejercicio[])
      ])

    );

  }

  async crearEjercicio(ejercicio: any) {

    const clinicId = this.clinicId;

    const ref = collection(
      this.firestore,
      `clinics/${clinicId}/ejercicios`
    );

    return addDoc(ref, {
      ...ejercicio,
      createdBy: this.professionalId,
      createdAt: serverTimestamp()
    });

  }

  async actualizarEjercicio(id: string, cambios: any) {

    const clinicId = this.clinicId;

    return updateDoc(
      doc(this.firestore, `clinics/${clinicId}/ejercicios/${id}`),
      cambios
    );

  }

  async eliminarEjercicio(id: string) {

    const clinicId = this.clinicId;

    return deleteDoc(
      doc(this.firestore, `clinics/${clinicId}/ejercicios/${id}`)
    );

  }

  async seedEjerciciosGlobales(ejercicios: any[]) {

    for (const ej of ejercicios) {

      await addDoc(
        collection(this.firestore, 'ejercicios_globales'),
        ej
      );

    }

  }

  private getYoutubeThumbnail(url?: string): string {

    if (!url) return '';

    const match = url.match(
      /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    );

    return match
      ? `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`
      : '';

  }

}