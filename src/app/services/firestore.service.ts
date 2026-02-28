import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp
} from '@angular/fire/firestore';
import { Observable, of, from } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class FirestoreService {

  private firestore = inject(Firestore);
  private authService = inject(AuthService);

  // ==================== PACIENTES ====================

  getPacientes(): Observable<any[]> {
    return from(this.authService.getCurrentClinicId()).pipe(
      switchMap((clinicId) => {
        const ref = collection(this.firestore, 'pacientes');
        const q = query(
          ref,
          where('clinicId', '==', clinicId),
          orderBy('fechaCreacion', 'desc')
        );

        return collectionData(q, { idField: 'id' }) as Observable<any[]>;
      }),
      catchError(err => {
        console.error('Error obteniendo pacientes de Firestore:', err);
        return of([]);
      })
    );
  }

  getPaciente(id: string): Observable<any> {
    const ref = doc(this.firestore, `pacientes/${id}`);
    return docData(ref, { idField: 'id' }).pipe(
      catchError(err => {
        console.error('Error obteniendo paciente:', err);
        return of(null);
      })
    );
  }

  async addPaciente(paciente: any): Promise<any> {
    const user = this.authService.getCurrentUser();
    if (!user) throw new Error('No autenticado');

    const clinicId = await this.authService.getCurrentClinicId();
    const ref = collection(this.firestore, 'pacientes');
    const data = {
      ...paciente,
      activo: paciente.activo !== undefined ? paciente.activo : true,
      fechaCreacion: paciente.fechaCreacion || new Date().toISOString(),
      num_sesiones: paciente.num_sesiones || 0,
      clinicId,
      professionalId: user.uid,
      createdAt: serverTimestamp()
    };

    const docRef = await addDoc(ref, data);
    return { id: docRef.id, ...data };
  }

  async updatePaciente(id: string, data: any): Promise<void> {
    const ref = doc(this.firestore, `pacientes/${id}`);
    await updateDoc(ref, data);
  }

  async deletePaciente(id: string): Promise<void> {
    const ref = doc(this.firestore, `pacientes/${id}`);
    await deleteDoc(ref);
  }

  // ==================== SESIONES ====================

  getSesionesByPaciente(pacienteId: string): Observable<any[]> {
    return from(this.authService.getCurrentClinicId()).pipe(
      switchMap((clinicId) => {
        const ref = collection(this.firestore, 'sesiones');
        const q = query(
          ref,
          where('clinicId', '==', clinicId),
          where('paciente_id', '==', pacienteId),
          orderBy('fecha', 'desc')
        );

        return collectionData(q, { idField: 'id' }) as Observable<any[]>;
      }),
      catchError(err => {
        console.error('Error obteniendo sesiones:', err);
        return of([]);
      })
    );
  }

  async addSesion(sesion: any): Promise<any> {
    const user = this.authService.getCurrentUser();
    if (!user) throw new Error('No autenticado');

    const clinicId = await this.authService.getCurrentClinicId();
    const ref = collection(this.firestore, 'sesiones');
    const data = {
      ...sesion,
      clinicId,
      professionalId: user.uid,
      fecha: sesion.fecha || new Date().toISOString(),
      createdAt: serverTimestamp()
    };

    const docRef = await addDoc(ref, data);

    if (sesion.paciente_id) {
      try {
        const pacRef = doc(this.firestore, `pacientes/${sesion.paciente_id}`);
        if (sesion.numero_sesion) {
          await updateDoc(pacRef, { num_sesiones: sesion.numero_sesion });
        }
      } catch (err) {
        console.log('No se pudo actualizar contador de sesiones:', err);
      }
    }

    return { id: docRef.id, ...data };
  }

  // ==================== DOCUMENTOS ====================

  getDocumentosByPaciente(pacienteId: string): Observable<any[]> {
    const ref = collection(this.firestore, 'documentos');
    const q = query(ref, where('paciente_id', '==', pacienteId));
    return collectionData(q, { idField: 'id' }).pipe(
      catchError(err => {
        console.error('Error obteniendo documentos:', err);
        return of([]);
      })
    );
  }

  async addDocumento(documento: any): Promise<any> {
    const ref = collection(this.firestore, 'documentos');
    const docRef = await addDoc(ref, documento);
    return { id: docRef.id, ...documento };
  }

  async deleteDocumento(id: string): Promise<void> {
    const ref = doc(this.firestore, `documentos/${id}`);
    await deleteDoc(ref);
  }
}
