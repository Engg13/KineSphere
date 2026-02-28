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
  getDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from '@angular/fire/firestore';
import { Observable, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {

  private firestore = inject(Firestore);
  private authService = inject(AuthService);


  // =====================================================
  // 🔥 REALTIME PACIENTES
  // =====================================================

  getPacientesRealtime(): Observable<any[]> {
    return this.authService.user$.pipe(
      switchMap(user => {
        if (!user) throw new Error('Usuario no autenticado');

        return from(this.authService.getCurrentClinicId()).pipe(
          switchMap(clinicId => {
            const q = query(
              collection(this.firestore, 'pacientes'),
              where('clinicId', '==', clinicId),
              where('professionalId', '==', user.uid)
            );

            return collectionData(q, { idField: 'id' }) as Observable<any[]>;
          })
        );
      })
    );
  }

  // =====================================================
  // 🔥 REALTIME SESIONES
  // =====================================================

  getSesionesRealtime(): Observable<any[]> {
    return this.authService.user$.pipe(
      switchMap(user => {
        if (!user) throw new Error('Usuario no autenticado');

        return from(this.authService.getCurrentClinicId()).pipe(
          switchMap(clinicId => {
            const q = query(
              collection(this.firestore, 'sesiones'),
              where('clinicId', '==', clinicId),
              where('professionalId', '==', user.uid)
            );

            return collectionData(q, { idField: 'id' }) as Observable<any[]>;
          })
        );
      })
    );
  }

  // =====================================================
  // 📋 MÉTODOS CLÁSICOS (Promise)
  // =====================================================

  async getPacientes(): Promise<any[]> {
    const user = this.authService.getCurrentUser();
    if (!user) return [];

    const clinicId = await this.authService.getCurrentClinicId();

    const q = query(
      collection(this.firestore, 'pacientes'),
      where('clinicId', '==', clinicId),
      where('professionalId', '==', user.uid)
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => {
      const data = doc.data() as any;
      return {
        id: doc.id,
        ...data
      };
    });
  }

  async getPaciente(id: string): Promise<any> {
    const ref = doc(this.firestore, `pacientes/${id}`);
    const snap = await getDoc(ref);

    if (!snap.exists()) return null;

    return { id: snap.id, ...snap.data() };
  }

  async addPaciente(paciente: any) {
    const user = this.authService.getCurrentUser();
    if (!user) throw new Error('No autenticado');

    const clinicId = await this.authService.getCurrentClinicId();

    return addDoc(collection(this.firestore, 'pacientes'), {
      ...paciente,
      clinicId,
      professionalId: user.uid,
      activo: true,
      createdAt: serverTimestamp()
    });
  }

  async updatePaciente(id: string, data: any) {
    return updateDoc(doc(this.firestore, `pacientes/${id}`), data);
  }

  async deletePaciente(id: string) {
    return deleteDoc(doc(this.firestore, `pacientes/${id}`));
  }

  // =====================================================
  // 🗂 SESIONES
  // =====================================================

  async addSesion(sesion: any) {
    const user = this.authService.getCurrentUser();
    if (!user) throw new Error('No autenticado');

    const clinicId = await this.authService.getCurrentClinicId();

    return addDoc(collection(this.firestore, 'sesiones'), {
      ...sesion,
      clinicId,
      professionalId: user.uid,
      createdAt: serverTimestamp()
    });
  }

  async getSesionesByPaciente(pacienteId: string): Promise<any[]> {
    const user = this.authService.getCurrentUser();
    if (!user) return [];

    const clinicId = await this.authService.getCurrentClinicId();

    const q = query(
      collection(this.firestore, 'sesiones'),
      where('clinicId', '==', clinicId),
      where('pacienteId', '==', pacienteId),
      where('professionalId', '==', user.uid)
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => {
      const data = doc.data() as any;
      return {
        id: doc.id,
        ...data
      };
    });
  }

  async getNumeroSesionesByPaciente(pacienteId: string): Promise<number> {
    const sesiones = await this.getSesionesByPaciente(pacienteId);
    return sesiones.length;
  }
}