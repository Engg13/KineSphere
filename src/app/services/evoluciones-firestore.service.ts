import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  query,
  where,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
  orderBy
} from '@angular/fire/firestore';
import { Observable, from } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { Evolucion } from '../models/evolucion.model';

@Injectable({
  providedIn: 'root'
})
export class EvolucionesFirestoreService {

  private firestore = inject(Firestore);
  private authService = inject(AuthService);

  // =====================================================
  // CREAR EVOLUCION
  // =====================================================

  async createEvolucion(data: Omit<Evolucion, 'id' | 'clinicId' | 'profesionalId' | 'createdAt' | 'updatedAt'>): Promise<void> {
    const user = this.authService.getCurrentUser();
    if (!user) throw new Error('No autenticado');

    const clinicId = await this.authService.getCurrentClinicId();

    await addDoc(collection(this.firestore, 'evoluciones'), {
      ...data,
      clinicId,
      profesionalId: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }

  // =====================================================
  // OBTENER EVOLUCIONES POR PACIENTE (REALTIME)
  // =====================================================

  getEvolucionesByPacienteRealtime(patientId: string): Observable<Evolucion[]> {
    const user = this.authService.getCurrentUser();
    if (!user) throw new Error('No autenticado');

    return from(this.authService.getCurrentClinicId()).pipe(
      switchMap(clinicId => {
        const q = query(
          collection(this.firestore, 'evoluciones'),
          where('clinicId', '==', clinicId),
          where('profesionalId', '==', user.uid),
          where('patientId', '==', patientId),
          orderBy('createdAt', 'desc')
        );

        return (collectionData(q, { idField: 'id' }) as Observable<Evolucion[]>);
      })
    );
  }

  // =====================================================
  // OBTENER SIGUIENTE NUMERO DE SESION
  // =====================================================

  async getNextSessionNumber(patientId: string): Promise<number> {
    const user = this.authService.getCurrentUser();
    if (!user) return 1;

    const clinicId = await this.authService.getCurrentClinicId();

    const q = query(
      collection(this.firestore, 'evoluciones'),
      where('clinicId', '==', clinicId),
      where('profesionalId', '==', user.uid),
      where('patientId', '==', patientId)
    );

    const snapshot = await getDocs(q);
    return snapshot.size + 1;
  }

  // =====================================================
  // ACTUALIZAR EVOLUCION
  // =====================================================

  async updateEvolucion(id: string, cambios: Partial<Evolucion>): Promise<void> {
    const { id: _id, clinicId: _c, profesionalId: _p, createdAt: _cr, ...safeChanges } = cambios as any;

    await updateDoc(doc(this.firestore, `evoluciones/${id}`), {
      ...safeChanges,
      updatedAt: serverTimestamp()
    });
  }
}
