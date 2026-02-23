import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  serverTimestamp
} from '@angular/fire/firestore';

import { EjerciciosService } from './ejercicios.service'; // tu servicio actual con defaults

@Injectable({
  providedIn: 'root'
})
export class EjerciciosSeederService {

  private firestore = inject(Firestore);
  private ejerciciosService = inject(EjerciciosService);

  private ejerciciosRef = collection(this.firestore, 'ejercicios');

  async seedBibliotecaGlobal(): Promise<void> {

    console.log('🚀 Iniciando seed de ejercicios globales...');

    const defaults = this.ejerciciosService['getEjerciciosPorDefecto']();

    for (const ejercicio of defaults) {

      // Evitar duplicados por nombre
      const q = query(
        this.ejerciciosRef,
        where('nombre', '==', ejercicio.nombre)
      );

      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        console.log(`⏭ Ya existe: ${ejercicio.nombre}`);
        continue;
      }

      await addDoc(this.ejerciciosRef, {
        ...ejercicio,
        esGlobal: true,
        createdBy: null,
        createdAt: serverTimestamp()
      });

      console.log(`✅ Subido: ${ejercicio.nombre}`);
    }

    console.log('🔥 Seed completado.');
  }
}