import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp
} from '@angular/fire/firestore';
import { Observable, combineLatest, map } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class EjerciciosFirestoreService {

  private firestore = inject(Firestore);
  private authService = inject(AuthService);

  // 🔥 Obtener ejercicios globales + del profesional
  getEjercicios(): Observable<any[]> {
    const user = this.authService.getCurrentUser();
    if (!user) throw new Error('No autenticado');

    const ejerciciosRef = collection(this.firestore, 'ejercicios');
    const isAdmin = this.authService.getRole() === 'admin';

    // Admin: lectura completa explícita
    if (isAdmin) {
      return collectionData(ejerciciosRef, { idField: 'id' });
    }

    // Profesional: consultas filtradas en servidor
    const qGlobal = query(ejerciciosRef, where('esGlobal', '==', true));
    const qPropios = query(ejerciciosRef, where('createdBy', '==', user.uid));

    return combineLatest([
      collectionData(qGlobal, { idField: 'id' }) as Observable<any[]>,
      collectionData(qPropios, { idField: 'id' }) as Observable<any[]>
    ]).pipe(
      map(([globales, propios]) => {
        const ejerciciosMap = new Map<string, any>();

        [...globales, ...propios].forEach(ej => {
          if (ej?.id) ejerciciosMap.set(ej.id, ej);
        });

        return Array.from(ejerciciosMap.values());
      })
    );
  }

  async agregarEjercicioPersonalizado(ejercicio: any) {
    const user = this.authService.getCurrentUser();
    if (!user) throw new Error('No autenticado');

    return addDoc(collection(this.firestore, 'ejercicios'), {
        ...ejercicio,
        global: false,
        createdBy: user.uid,
        createdAt: serverTimestamp()
    });
}

  async actualizarEjercicio(id: string, cambios: any) {
  return updateDoc(doc(this.firestore, `ejercicios/${id}`), cambios);
}

  async eliminarEjercicio(id: string) {
    return deleteDoc(doc(this.firestore, `ejercicios/${id}`));
  }

  async seedEjerciciosPorDefecto(ejercicios: any[]) {
        for (const ej of ejercicios) {
            await addDoc(collection(this.firestore, 'ejercicios'), {
            ...ej,
            global: true,
            createdAt: serverTimestamp(),
            createdBy: null
            });
        }
    }

    getCategorias() {
  return [
    { valor: 'fuerza', nombre: 'Fuerza', icono: 'barbell-outline', color: '#e74c3c' },
    { valor: 'estiramiento', nombre: 'Estiramiento', icono: 'body-outline', color: '#3498db' },
    { valor: 'movilidad', nombre: 'Movilidad', icono: 'sync-outline', color: '#2ecc71' },
    { valor: 'equilibrio', nombre: 'Equilibrio', icono: 'accessibility-outline', color: '#f39c12' },
    { valor: 'cardio', nombre: 'Cardio', icono: 'heart-outline', color: '#e91e63' },
    { valor: 'funcional', nombre: 'Funcional', icono: 'fitness-outline', color: '#9b59b6' },
    { valor: 'rehabilitacion', nombre: 'Rehabilitación', icono: 'medkit-outline', color: '#1abc9c' }
  ];
}

getVideoThumbnail(videoUrl: string): string {
  if (!videoUrl) return '';
  const match = videoUrl.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (match) {
    return `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg`;
  }
  return '';
}
}