import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  addDoc,
  collection,
  doc,
  getDoc,
  increment,
  serverTimestamp,
  query,
  getDocs,
  where,
  updateDoc
} from '@angular/fire/firestore';
import { AuthService } from './auth.service';
import { EvolucionCreateInput, TipoEvolucion } from '../models/evolucion.model';

interface TratamientoDoc {
  id?: string;
  clinicId: string;
  patientId: string;
  professionalId: string;
  estado: 'active' | 'completed';
  totalSesiones: number;
  createdAt?: unknown;
  updatedAt?: unknown;
  closedAt?: unknown;
}

@Injectable({
  providedIn: 'root'
})
export class TreatmentService {
  private firestore = inject(Firestore);
  private authService = inject(AuthService);

  async crearTratamiento(patientId: string, clinicId: string, professionalId: string): Promise<string> {
    const tratamientoRef = await addDoc(collection(this.firestore, 'tratamientos'), {
      clinicId,
      patientId,
      professionalId,
      estado: 'active',
      totalSesiones: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      closedAt: null
    });

    return tratamientoRef.id;
  }

  async crearEvaluacionInicial(
    patientId: string,
    clinicId: string,
    professionalId: string,
    payload: Omit<EvolucionCreateInput, 'patientId' | 'tipoEvolucion'>
  ): Promise<string> {
    const treatmentId = await this.crearTratamiento(patientId, clinicId, professionalId);
    return this.crearEvolucionConTratamiento(treatmentId, patientId, clinicId, professionalId, 'initial', payload);
  }

  async crearSesionProgreso(
    treatmentId: string,
    patientId: string,
    clinicId: string,
    professionalId: string,
    payload: Omit<EvolucionCreateInput, 'patientId' | 'tipoEvolucion'>
  ): Promise<string> {
    const evolucionId = await this.crearEvolucionConTratamiento(
      treatmentId,
      patientId,
      clinicId,
      professionalId,
      'progress',
      payload
    );

    await updateDoc(doc(this.firestore, `tratamientos/${treatmentId}`), {
      totalSesiones: increment(1),
      updatedAt: serverTimestamp()
    });

    return evolucionId;
  }

  async finalizarTratamiento(
    treatmentId: string,
    patientId: string,
    clinicId: string,
    professionalId: string,
    payload: Omit<EvolucionCreateInput, 'patientId' | 'tipoEvolucion'>
  ): Promise<string> {
    const evolucionId = await this.crearEvolucionConTratamiento(
      treatmentId,
      patientId,
      clinicId,
      professionalId,
      'discharge',
      payload
    );

    await updateDoc(doc(this.firestore, `tratamientos/${treatmentId}`), {
      estado: 'completed',
      updatedAt: serverTimestamp(),
      closedAt: serverTimestamp()
    });

    return evolucionId;
  }

  async getTratamientoById(treatmentId: string): Promise<TratamientoDoc | null> {
    const ref = doc(this.firestore, `tratamientos/${treatmentId}`);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      return null;
    }

    return { id: snap.id, ...(snap.data() as TratamientoDoc) };
  }

  private async crearEvolucionConTratamiento(
    treatmentId: string,
    patientId: string,
    clinicId: string,
    professionalId: string,
    tipoEvolucion: TipoEvolucion,
    payload: Omit<EvolucionCreateInput, 'patientId' | 'tipoEvolucion'>
  ): Promise<string> {
    const user = this.authService.getCurrentUser();
    if (!user) throw new Error('No autenticado');

    const tratamiento = await this.getTratamientoById(treatmentId);
    const sessionNumber = tipoEvolucion === 'progress' ? Number(tratamiento?.totalSesiones || 0) + 1 : null;

    const evolucionRef = await addDoc(collection(this.firestore, 'evoluciones'), {
      clinicId,
      treatmentId,
      patientId,
      professionalId,
      tipoEvolucion,
      sessionNumber,
      painScale: payload.painScale ?? null,
      sleepQuality: payload.sleepQuality ?? null,
      zonaTratamiento: payload.zonaTratamiento ?? null,
      tecnicasAplicadas: payload.tecnicasAplicadas ?? [],
      rom: payload.rom ?? [],
      ejerciciosRealizados: payload.ejerciciosRealizados ?? false,
      subjective: payload.subjective ?? '',
      objective: payload.objective ?? '',
      assessment: payload.assessment ?? '',
      plan: payload.plan ?? '',
      objetivos: payload.objetivos ?? [],
      rutinaId: payload.rutinaId ?? null,
      rutinaNombre: payload.rutinaNombre ?? null,
      test: payload.test ?? null,
      activo: true,
      deletedAt: null,
      deletedBy: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return evolucionRef.id;
  }

  async getTratamientoActivo(patientId: string) {
    const q = query(
      collection(this.firestore, 'tratamientos'),
      where('patientId', '==', patientId),
      where('estado', '==', 'activo')
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) return null;

    const docSnap = snapshot.docs[0];

    return {
      id: docSnap.id,
      ...docSnap.data()
    };
  }
}
