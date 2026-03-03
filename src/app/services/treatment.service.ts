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
  updateDoc,
  runTransaction
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

  async crearTratamiento(patientId: string): Promise<string> {
    const user = this.authService.getCurrentUser();
    if (!user) throw new Error('No autenticado');

    // 🔥 Buscar el user document
    const userDocRef = doc(this.firestore, `users/${user.uid}`);
    const userSnap = await getDoc(userDocRef);

    if (!userSnap.exists()) {
      throw new Error('Documento de usuario no encontrado');
    }

    const userData = userSnap.data();
    const clinicId = userData['clinicId'];

    if (!clinicId) {
      throw new Error('Usuario sin clinicId asignado');
    }

    const tratamientoRef = await addDoc(collection(this.firestore, 'tratamientos'), {
      clinicId,
      patientId,
      professionalId: user.uid,
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
    payload: Omit<EvolucionCreateInput, 'patientId' | 'tipoEvolucion'>
  ): Promise<string> {

    const treatmentId = await this.crearTratamiento(patientId);

    return this.crearEvolucionConTratamiento(
      treatmentId,
      patientId,
      'initial',
      payload
    );
  }

  async crearSesionProgreso(
    treatmentId: string,
    patientId: string,
    payload: Omit<EvolucionCreateInput, 'patientId' | 'tipoEvolucion'>
  ): Promise<string> {

    const user = this.authService.getCurrentUser();
    if (!user) throw new Error('No autenticado');

    const evolucionId = await runTransaction(this.firestore, async (transaction) => {

      const tratamientoRef = doc(this.firestore, `tratamientos/${treatmentId}`);
      const tratamientoSnap = await transaction.get(tratamientoRef);

      if (!tratamientoSnap.exists()) {
        throw new Error('Tratamiento no encontrado');
      }

      const tratamientoData = tratamientoSnap.data();
      const totalActual = Number(tratamientoData?.['totalSesiones'] || 0);
      const nextSessionNumber = totalActual + 1;

      const evolucionRef = doc(collection(this.firestore, 'evoluciones'));

      transaction.set(evolucionRef, {
        treatmentId,
        patientId,
        tipoEvolucion: 'progress',
        sessionNumber: nextSessionNumber,

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

        clinicId: tratamientoData?.['clinicId'],
        professionalId: user.uid,

        activo: true,
        deletedAt: null,
        deletedBy: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      transaction.update(tratamientoRef, {
        totalSesiones: nextSessionNumber,
        updatedAt: serverTimestamp()
      });

      return evolucionRef.id;
    });

    return evolucionId;
  }

  async finalizarTratamiento(
    treatmentId: string,
    patientId: string,
    payload: Omit<EvolucionCreateInput, 'patientId' | 'tipoEvolucion'>
  ): Promise<string> {

    const evolucionId = await this.crearEvolucionConTratamiento(
      treatmentId,
      patientId,
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
    tipoEvolucion: TipoEvolucion,
    payload: Omit<EvolucionCreateInput, 'patientId' | 'tipoEvolucion'>
  ): Promise<string> {

    const user = this.authService.getCurrentUser();
    if (!user) throw new Error('No autenticado');

    if (tipoEvolucion === 'progress') {
      throw new Error('Las sesiones de progreso deben crearse mediante crearSesionProgreso()');
    }

    const tratamiento = await this.getTratamientoById(treatmentId);
    if (!tratamiento) {
      throw new Error('Tratamiento no encontrado');
    }

    const evolucionRef = await addDoc(collection(this.firestore, 'evoluciones'), {
      treatmentId,
      patientId,
      tipoEvolucion,
      sessionNumber: null,

      clinicId: tratamiento.clinicId,
      professionalId: user.uid,

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
      where('estado', '==', 'active')
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
