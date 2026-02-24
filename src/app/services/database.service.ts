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
  // 🔐 HELPER: determinar si es admin
  // =====================================================

  private async isAdmin(): Promise<boolean> {
    const user = this.authService.getCurrentUser();
    if (!user) return false;

    const role = await this.authService.getUserRole(user.uid);
    return role === 'admin';
  }

  // =====================================================
  // 🔥 REALTIME PACIENTES
  // =====================================================

  getPacientesRealtime(): Observable<any[]> {
    return this.authService.user$.pipe(
      switchMap(user => {
        if (!user) throw new Error('Usuario no autenticado');

        return from(this.authService.getUserRole(user.uid)).pipe(
          switchMap(role => {

            let q;

            if (role === 'admin') {
              // Admin ve todo
              q = collection(this.firestore, 'pacientes');
            } else {
              // Profesional solo los suyos
              q = query(
                collection(this.firestore, 'pacientes'),
                where('profesionalId', '==', user.uid)
              );
            }

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

        return from(this.authService.getUserRole(user.uid)).pipe(
          switchMap(role => {

            let q;

            if (role === 'admin') {
              q = collection(this.firestore, 'sesiones');
            } else {
              q = query(
                collection(this.firestore, 'sesiones'),
                where('profesionalId', '==', user.uid)
              );
            }

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

    const role = await this.authService.getUserRole(user.uid);

    let q;

    if (role === 'admin') {
      q = collection(this.firestore, 'pacientes');
    } else {
      q = query(
        collection(this.firestore, 'pacientes'),
        where('profesionalId', '==', user.uid)
      );
    }

    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => {
      const data = doc.data() as any; // 👈 casteo controlado
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
      profesionalId: user.uid,
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
      profesionalId: user.uid,
      createdAt: serverTimestamp()
    });
  }

  async getSesionesByPaciente(pacienteId: string): Promise<any[]> {
    const user = this.authService.getCurrentUser();
    if (!user) return [];

    const role = await this.authService.getUserRole(user.uid);

    let q;

    if (role === 'admin') {
      q = query(
        collection(this.firestore, 'sesiones'),
        where('pacienteId', '==', pacienteId)
      );
    } else {
      q = query(
        collection(this.firestore, 'sesiones'),
        where('pacienteId', '==', pacienteId),
        where('profesionalId', '==', user.uid)
      );
    }

    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => {
      const data = doc.data() as any; // 👈 casteo controlado
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