import { Injectable } from '@angular/core';
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
  orderBy
} from '@angular/fire/firestore';
import { Observable, from, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class FirestoreService {

  constructor(private firestore: Firestore) {}

  // ==================== PACIENTES ====================

  getPacientes(): Observable<any[]> {
    const ref = collection(this.firestore, 'pacientes');
    const q = query(ref, orderBy('fechaCreacion', 'desc'));
    return collectionData(q, { idField: 'id' }).pipe(
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
    const ref = collection(this.firestore, 'pacientes');
    const data = {
      ...paciente,
      activo: paciente.activo !== undefined ? paciente.activo : true,
      fechaCreacion: paciente.fechaCreacion || new Date().toISOString(),
      num_sesiones: paciente.num_sesiones || 0
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
    const ref = collection(this.firestore, 'sesiones');
    const q = query(ref, where('paciente_id', '==', pacienteId), orderBy('fecha', 'desc'));
    return collectionData(q, { idField: 'id' }).pipe(
      catchError(err => {
        console.error('Error obteniendo sesiones:', err);
        return of([]);
      })
    );
  }

  async addSesion(sesion: any): Promise<any> {
    const ref = collection(this.firestore, 'sesiones');
    const data = {
      ...sesion,
      fecha: sesion.fecha || new Date().toISOString()
    };
    const docRef = await addDoc(ref, data);

    // Incrementar contador de sesiones en el paciente
    if (sesion.paciente_id) {
      try {
        const pacRef = doc(this.firestore, `pacientes/${sesion.paciente_id}`);
        // We get current count from the sesiones query instead of increment
        const sesiones = collection(this.firestore, 'sesiones');
        const q = query(sesiones, where('paciente_id', '==', sesion.paciente_id));
        // Simple approach: just update with known value if available
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
