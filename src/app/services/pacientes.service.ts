import { Injectable, inject } from '@angular/core';
import {
  addDoc,
  collection,
  collectionData,
  doc,
  getDoc,
  getDocs,
  query,
  limit, 
  serverTimestamp,
  updateDoc,
  where,
  orderBy,
  Timestamp
} from '@angular/fire/firestore';
import { Observable, of } from 'rxjs';
import { BaseClinicService } from '../core/services/base-clinic.service';




export interface PacienteDocument {
  id: string;
  clinicId: string;
  professionalId: string;

  nombre: string;
  rut?: string;
  fechaNacimiento?: string;
  edad?: number;
  email?: string;
  telefono?: string;
  diagnostico?: string;
  sesionesPlanificadas?: number;
  sesionesCompletadas?: number;

  activo: boolean;
  isDeleted: boolean;

  createdAt: Timestamp;
  updatedAt: Timestamp;
  deletedAt?: Timestamp;
}

export type PacienteCreateInput = Omit<Partial<PacienteDocument>, 'id' | 'clinicId' | 'professionalId' | 'createdAt' | 'updatedAt' | 'activo' | 'isDeleted'>;
export type PacienteUpdateInput = Omit<Partial<PacienteDocument>, 'id' | 'clinicId' | 'professionalId' | 'createdAt' | 'updatedAt' | 'isDeleted'>;

@Injectable({
  providedIn: 'root'
})
export class PacientesService extends BaseClinicService {

  private readonly collectionName = 'pacientes';

  async create(data: PacienteCreateInput): Promise<PacienteDocument> {
    const clinicId = this.clinicId;
    const professionalId = this.professionalId;
    const normalizedRut = this.normalizeRut(data.rut);

    if (normalizedRut) {
      await this.ensureRutIsUnique(normalizedRut, clinicId);
    }

    const payload = this.removeUndefinedFields({
      ...data,
      rut: normalizedRut,
      clinicId,
      professionalId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      activo: true,
      isDeleted: false
    });

    const ref = await addDoc(this.getCollection(), payload);

    return this.getByIdOrThrow(ref.id, clinicId);
  }

  async update(id: string, data: PacienteUpdateInput): Promise<void> {

    const clinicId = this.clinicId;
    const paciente = await this.getByIdOrThrow(id, clinicId);

    const normalizedRut = this.normalizeRut(data.rut);

    if (normalizedRut && normalizedRut !== paciente.rut) {
      await this.ensureRutIsUnique(normalizedRut, clinicId, id);
    }

    const payload = this.removeUndefinedFields({
      ...data,
      rut: normalizedRut,
      updatedAt: serverTimestamp()
    });

    await updateDoc(this.docRef(id), payload);
  }

  async softDelete(id: string): Promise<void> {

    const clinicId = this.clinicId;

    await this.getByIdOrThrow(id, clinicId);

    await updateDoc(this.docRef(id), {
      isDeleted: true,
      activo: false,
      updatedAt: serverTimestamp(),
      deletedAt: serverTimestamp()
    });

  }

  async getById(id: string): Promise<PacienteDocument | null> {
    const clinicId = this.clinicId;

    const ref = this.docRef(id);
    const snapshot = await getDoc(ref);

    if (!snapshot.exists()) {
      return null;
    }

    const paciente = { id: snapshot.id, ...(snapshot.data() as Omit<PacienteDocument, 'id'>) };

    if (paciente.clinicId !== clinicId || paciente.isDeleted) {
      return null;
    }

    return paciente;
  }

  async list(): Promise<PacienteDocument[]> {
    const clinicId = this.clinicId;

    const q = query(
      this.getCollection(),
      where('clinicId', '==', clinicId),
      where('isDeleted', '==', false),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map((item) => ({
      id: item.id,
      ...(item.data() as Omit<PacienteDocument, 'id'>)
    }));
  }

  private async getByIdOrThrow(id: string, clinicId: string): Promise<PacienteDocument> {
    const ref = this.docRef(id);
    const snapshot = await getDoc(ref);

    if (!snapshot.exists()) {
      throw new Error('Paciente no encontrado');
    }

    const paciente = { id: snapshot.id, ...(snapshot.data() as Omit<PacienteDocument, 'id'>) };

    if (paciente.clinicId !== clinicId) {
      throw new Error('Paciente fuera del alcance de la clínica actual');
    }

    if (paciente.isDeleted) {
      throw new Error('Paciente eliminado');
    }

    return paciente;
  }

  private async ensureRutIsUnique(rut: string, clinicId: string, excludeId?: string): Promise<void> {
    const q = query(
      this.getCollection(),
      where('clinicId', '==', clinicId),
      where('rut', '==', rut),
      where('isDeleted', '==', false)
    );

    const snapshot = await getDocs(q);
    const duplicate = snapshot.docs.some((item) => item.id !== excludeId);

    if (duplicate) {
      throw new Error('Ya existe un paciente con ese RUT en esta clínica');
    }
  }

  private normalizeRut(rut: unknown): string | undefined {
    if (typeof rut !== 'string') {
      return undefined;
    }

    const normalized = rut.replace(/\./g, '').trim().toUpperCase();

    return normalized.length > 0 ? normalized : undefined;
  }

  private removeUndefinedFields<T extends Record<string, unknown>>(data: T): Partial<T> {
    return Object.entries(data).reduce<Partial<T>>((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key as keyof T] = value as T[keyof T];
      }
      return acc;
    }, {});
  }

  getPacientesRealtime(): Observable<PacienteDocument[]> {

    const clinicId = this.clinicId;

    const q = query(
      this.getCollection(),
      where('clinicId', '==', clinicId),
      where('isDeleted', '==', false),
      orderBy('createdAt', 'desc')
    );

    return collectionData(q, { idField: 'id' }) as Observable<PacienteDocument[]>;

  }

  private getCollection() {
    return collection(this.firestore, this.collectionName);
  }

  private docRef(id: string) {
    return doc(this.firestore, `${this.collectionName}/${id}`);
  }
}
