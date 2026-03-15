import { Injectable, inject } from '@angular/core';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  Timestamp,
  limit,
  orderBy
} from '@angular/fire/firestore';
import { BaseClinicService } from '../core/services/base-clinic.service';

export interface TratamientoDocument {
  id: string;
  clinicId: string;
  patientId: string;
  professionalId: string;
  estado: 'active' | 'completed';
  totalSesiones: number;
  nextSessionNumber: number;
  zonaPrincipal: string | null;
  zonasSecundarias: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  closedAt: Timestamp | null;
}

@Injectable({
  providedIn: 'root'
})
export class TratamientosService extends BaseClinicService {

  private readonly collectionName = 'tratamientos';


  async create(
    patientId: string,
    data?: {
      zonaPrincipal?: string | null;
      zonasSecundarias?: string[];
    }
  ): Promise<TratamientoDocument> {

    const clinicId = this.clinicId;
    const professionalId = this.professionalId;

    const ref = await addDoc(
      this.getCollection(),
      {
        clinicId,
        patientId,
        professionalId,

        estado: 'active',
        totalSesiones: 0,
        nextSessionNumber: 1,

        zonaPrincipal: data?.zonaPrincipal ?? null,
        zonasSecundarias: data?.zonasSecundarias ?? [],

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        closedAt: null
      }
    );

    return this.getByIdOrThrow(ref.id, clinicId);
  }

  async close(id: string): Promise<void> {

    const clinicId = this.clinicId;

    const tratamiento = await this.getByIdOrThrow(id, clinicId);

    await updateDoc(
      doc(this.firestore, `${this.collectionName}/${tratamiento.id}`),
      {
        estado: 'completed',
        updatedAt: serverTimestamp(),
        closedAt: serverTimestamp()
      }
    );

  }

  async getById(id: string): Promise<TratamientoDocument | null> {
    const clinicId = this.clinicId;

    const ref = this.docRef(id);
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
    const clinicId = this.clinicId;

    const q = query(
      this.getCollection(),
      where('clinicId', '==', clinicId),
      where('patientId', '==', patientId),
      where('estado', '==', 'active'),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;

    const docSnap = snapshot.docs[0];

    return {
      id: docSnap.id,
      ...(docSnap.data() as Omit<TratamientoDocument, 'id'>)
    };
  }

  private async getByIdOrThrow(id: string, clinicId: string): Promise<TratamientoDocument> {
    const ref = this.docRef(id);
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

    console.log("clinicId", this.clinicId);
    console.log("professionalId", this.professionalId);

    const q = query(
      this.getCollection(),
      where('clinicId', '==', this.clinicId),
      where('professionalId', '==', this.professionalId),
      where('estado', '==', 'active')
    );

    const snapshot = await getDocs(q);

    console.log("TRATAMIENTOS SNAPSHOT", snapshot.size);

    return snapshot.docs.map(d => ({
      id: d.id,
      ...(d.data() as Omit<TratamientoDocument,'id'>)
    }));
  }

    async update(
      id: string,
      changes: {
        zonaPrincipal?: string | null;
        zonasSecundarias?: string[];
      }
    ): Promise<void> {

      const clinicId = this.clinicId;

      const tratamiento = await this.getByIdOrThrow(id, clinicId);

      if (tratamiento.estado !== 'active') {
        throw new Error('No se puede modificar un tratamiento finalizado');
      }

      await updateDoc(
        this.docRef(id),
        {
          ...changes,
          updatedAt: serverTimestamp()
        }
      );
    }

    private getCollection() {
    return collection(this.firestore, this.collectionName);
  }

  private docRef(id: string) {
    return doc(this.firestore, `${this.collectionName}/${id}`);
  }
}