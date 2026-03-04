import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  Timestamp
} from '@angular/fire/firestore';
import { AuthService } from './auth.service';

export interface TratamientoDocument {
  id: string;
  clinicId: string;
  patientId: string;
  professionalId: string;
  estado: 'active' | 'completed';
  totalSesiones: number;
  zonaPrincipal: string | null;
  articulacionesSecundarias: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  closedAt: Timestamp | null;
}

@Injectable({
  providedIn: 'root'
})
export class TratamientosService {

  private readonly firestore = inject(Firestore);
  private readonly authService = inject(AuthService);
  private readonly collectionName = 'tratamientos';

  async create(
    patientId: string,
    data?: {
        zonaPrincipal?: string | null;
        articulacionesSecundarias?: string[];
    }
    ): Promise<TratamientoDocument> {

    const { clinicId, professionalId } = await this.getAuthContext();

    const ref = await addDoc(
        collection(this.firestore, this.collectionName),
        {
        clinicId,
        patientId,
        professionalId,

        estado: 'active',
        totalSesiones: 0,

        zonaPrincipal: data?.zonaPrincipal ?? null,
        articulacionesSecundarias: data?.articulacionesSecundarias ?? [],

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        closedAt: null
        }
    );

    return this.getByIdOrThrow(ref.id, clinicId);
    }

  async incrementTotalSesiones(id: string, newTotal: number): Promise<void> {
    await updateDoc(
      doc(this.firestore, `${this.collectionName}/${id}`),
      {
        totalSesiones: newTotal,
        updatedAt: serverTimestamp()
      }
    );
  }

  async close(id: string): Promise<void> {
    await updateDoc(
      doc(this.firestore, `${this.collectionName}/${id}`),
      {
        estado: 'completed',
        updatedAt: serverTimestamp(),
        closedAt: serverTimestamp()
      }
    );
  }

  async getById(id: string): Promise<TratamientoDocument | null> {
    const { clinicId } = await this.getAuthContext();

    const ref = doc(this.firestore, `${this.collectionName}/${id}`);
    const snap = await getDoc(ref);

    if (!snap.exists()) return null;

    const tratamiento = {
      id: snap.id,
      ...(snap.data() as Omit<TratamientoDocument, 'id'>)
    };

    if (tratamiento.clinicId !== clinicId) return null;

    return tratamiento;
  }

  async getActivoByPaciente(patientId: string): Promise<TratamientoDocument | null> {
    const { clinicId } = await this.getAuthContext();

    const q = query(
      collection(this.firestore, this.collectionName),
      where('clinicId', '==', clinicId),
      where('patientId', '==', patientId),
      where('estado', '==', 'active')
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;

    const docSnap = snapshot.docs[0];

    return {
      id: docSnap.id,
      ...(docSnap.data() as Omit<TratamientoDocument, 'id'>)
    };
  }

  private async getAuthContext(): Promise<{ clinicId: string; professionalId: string }> {
    const user = this.authService.getCurrentUser();
    if (!user?.uid) throw new Error('No autenticado');

    const clinicId = await this.authService.getCurrentClinicId();
    if (!clinicId) throw new Error('Sin clinicId');

    return { clinicId, professionalId: user.uid };
  }

  private async getByIdOrThrow(id: string, clinicId: string): Promise<TratamientoDocument> {
    const ref = doc(this.firestore, `${this.collectionName}/${id}`);
    const snap = await getDoc(ref);

    if (!snap.exists()) throw new Error('Tratamiento no encontrado');

    const tratamiento = {
      id: snap.id,
      ...(snap.data() as Omit<TratamientoDocument, 'id'>)
    };

    if (tratamiento.clinicId !== clinicId) {
      throw new Error('Tratamiento fuera de clínica');
    }

    return tratamiento;
  }

  async listActivos(): Promise<TratamientoDocument[]> {
    const { clinicId } = await this.getAuthContext();

    const q = query(
        collection(this.firestore, this.collectionName),
        where('clinicId', '==', clinicId),
        where('estado', '==', 'active')
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map(docItem => ({
        id: docItem.id,
        ...(docItem.data() as Omit<TratamientoDocument, 'id'>)
    }));
    }

    async update(
        id: string,
        changes: {
            zonaPrincipal?: string | null;
            articulacionesSecundarias?: string[];
        }
        ): Promise<void> {

        const { clinicId } = await this.getAuthContext();

        const ref = doc(this.firestore, `${this.collectionName}/${id}`);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
            throw new Error('Tratamiento no encontrado');
        }

        const tratamiento = snap.data();

        if (tratamiento['clinicId'] !== clinicId) {
            throw new Error('Tratamiento fuera de la clínica actual');
        }

        if (tratamiento['estado'] !== 'active') {
            throw new Error('No se puede modificar un tratamiento finalizado');
        }

        await updateDoc(ref, {
            ...changes,
            updatedAt: serverTimestamp()
        });
    }
}