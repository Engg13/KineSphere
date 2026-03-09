import { Injectable } from '@angular/core';
import { collection, getDocs, addDoc } from '@angular/fire/firestore';
import { Firestore } from '@angular/fire/firestore';
import { EJERCICIOS_SEED } from '../seed/ejercicios.seed';

@Injectable({
  providedIn: 'root'
})
export class EjerciciosSeederService {

  constructor(private firestore: Firestore) {}

  async seed() {

    const ref = collection(
      this.firestore,
      'ejercicios_globales'
    );

    const snapshot = await getDocs(ref);

    if (!snapshot.empty) return;

    console.log('🌱 Seeding ejercicios globales');

    for (const ejercicio of EJERCICIOS_SEED) {

      await addDoc(ref, {
        ...ejercicio,
        videoThumbnail: this.getYoutubeThumbnail(ejercicio.videoUrl || ''),
        fechaCreacion: new Date()
      });

    }

  }

    private getYoutubeThumbnail(url: string): string {

    if (!url) return '';

    const match = url.match(
        /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    );

    return match
        ? `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`
        : '';

    }




}