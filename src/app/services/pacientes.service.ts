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
  orderBy,
  Timestamp
} from '@angular/fire/firestore';
import { AuthService } from './auth.service';

export interface PacienteDocument {
  id: string;
  clinicId: string;
  professionalId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  activo: boolean;
  isDeleted: boolean;
  rut?: string;
  [key: string]: unknown;
}

export type PacienteCreateInput = Omit<Partial<PacienteDocument>, 'id' | 'clinicId' | 'professionalId' | 'createdAt' | 'updatedAt' | 'activo' | 'isDeleted'>;
export type PacienteUpdateInput = Omit<Partial<PacienteDocument>, 'id' | 'clinicId' | 'professionalId' | 'createdAt' | 'updatedAt' | 'isDeleted'>;

@Injectable({
  providedIn: 'root'
})
export class PacientesService {
  private readonly firestore = inject(Firestore);
  private readonly authService = inject(AuthService);

  private readonly collectionName = 'pacientes';

  async create(data: PacienteCreateInput): Promise<PacienteDocument> {
    const { clinicId, professionalId } = await this.getAuthContext();
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

    const ref = await addDoc(collection(this.firestore, this.collectionName), payload);

    return this.getByIdOrThrow(ref.id, clinicId);
  }

  async update(id: string, data: PacienteUpdateInput): Promise<void> {
    const { clinicId } = await this.getAuthContext();
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

    await updateDoc(doc(this.firestore, `${this.collectionName}/${id}`), payload);
  }

  async softDelete(id: string): Promise<void> {
    const { clinicId } = await this.getAuthContext();
    await this.getByIdOrThrow(id, clinicId);

    await updateDoc(doc(this.firestore, `${this.collectionName}/${id}`), {
      isDeleted: true,
      activo: false,
      updatedAt: serverTimestamp(),
      deletedAt: serverTimestamp()
    });
  }

  async getById(id: string): Promise<PacienteDocument | null> {
    const { clinicId } = await this.getAuthContext();

    const ref = doc(this.firestore, `${this.collectionName}/${id}`);
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
    const { clinicId } = await this.getAuthContext();

    const q = query(
      collection(this.firestore, this.collectionName),
      where('clinicId', '==', clinicId),
      where('isDeleted', '==', false),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map((item) => ({
      id: item.id,
      ...(item.data() as Omit<PacienteDocument, 'id'>)
    }));
  }

  private async getAuthContext(): Promise<{ clinicId: string; professionalId: string }> {
    const professional = this.authService.getCurrentUser();
    if (!professional?.uid) {
      throw new Error('No autenticado');
    }

    const clinicId = await this.authService.getCurrentClinicId();
    if (!clinicId) {
      throw new Error('No hay clinicId disponible para el usuario actual');
    }

    return {
      clinicId,
      professionalId: professional.uid
    };
  }

  private async getByIdOrThrow(id: string, clinicId: string): Promise<PacienteDocument> {
    const ref = doc(this.firestore, `${this.collectionName}/${id}`);
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
      collection(this.firestore, this.collectionName),
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
}
