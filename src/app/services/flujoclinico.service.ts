import { Injectable, inject } from '@angular/core';
import { runTransaction, doc, collection, serverTimestamp } from '@angular/fire/firestore';
import { TratamientosService } from './tratamientos.service';
import { EvolucionesService } from './evoluciones.service';
import { EvolucionCreateInput } from '../models/evolucion.model';
import { BaseClinicService } from '../core/services/base-clinic.service';
import { PacientesService } from '../services/pacientes.service';

@Injectable({
  providedIn: 'root'
})
export class FlujoClinicoService extends BaseClinicService {

  
  private readonly tratamientosService = inject(TratamientosService);
  private readonly evolucionesService = inject(EvolucionesService);
  private pacientesService = inject(PacientesService);
  private readonly evolucionesCollection = 'evoluciones';

  private buildCleanPayload(payload: Omit<EvolucionCreateInput, 'patientId' | 'tipoEvolucion'>) {

    const clean = {
      subjective: payload.subjective ?? '',
      objective: payload.objective ?? '',
      assessment: payload.assessment ?? '',
      plan: payload.plan ?? '',
      painScale: payload.painScale ?? null,
      sleepQuality: payload.sleepQuality ?? null,
      zonaPrincipal: payload.zonaPrincipal ?? null,
      zonasSecundarias: payload.zonasSecundarias ?? [],
      tecnicasAplicadas: payload.tecnicasAplicadas ?? [],
      rom: payload.rom ?? [],
      ejerciciosRealizados: payload.ejerciciosRealizados ?? false,
      objetivos: payload.objetivos ?? [],
      rutinaId: payload.rutinaId ?? null,
      rutinaNombre: payload.rutinaNombre ?? null,
      test: payload.test ?? null
    };

    return this.sanitize(clean);

  }

 async crearEvaluacionInicial(
    patientId: string,
    payload: Omit<EvolucionCreateInput, 'patientId' | 'tipoEvolucion'>
  ): Promise<string> {
    const paciente = await this.pacientesService.getById(patientId);
    const clinicId = this.clinicContext.clinicId;

    if (!paciente || paciente.clinicId !== clinicId) {
      throw new Error('Paciente no pertenece a esta clínica');}

    const existente = await this.tratamientosService.getActivoByPaciente(patientId);

    if (existente) {
      throw new Error('El paciente ya tiene un tratamiento activo');
    }

    const evolucionId = await runTransaction(this.firestore, async (transaction) => {

      const tratamientoRef = doc(collection(this.firestore, 'tratamientos'));

      transaction.set(tratamientoRef, {
        clinicId,
        professionalId: this.professionalId,
        patientId,

        estado: 'active',

        totalSesiones: 0,
        nextSessionNumber: 1,

        zonaPrincipal: payload.zonaPrincipal ?? null,
        zonasSecundarias: payload.zonasSecundarias ?? [],

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        closedAt: null
      });

      const evolucionRef = doc(collection(this.firestore, 'evoluciones'));

      transaction.set(evolucionRef, {
        ...payload,
        patientId,
        treatmentId: tratamientoRef.id,
        tipoEvolucion: 'initial',
        sessionNumber: null,
        createdAt: serverTimestamp()
      });

      return evolucionRef.id;
    });

    return evolucionId;
  }

  async crearSesionProgreso(
    treatmentId: string,
    payload: Omit<EvolucionCreateInput, 'patientId' | 'tipoEvolucion'>
  ): Promise<string> {

    const clinicId = this.clinicId;
    const professionalId = this.professionalId;

    const evolucionId = await runTransaction(this.firestore, async (transaction) => {

      const tratamientoRef = doc(this.firestore, `tratamientos/${treatmentId}`);
      const tratamientoSnap = await transaction.get(tratamientoRef);

      if (!tratamientoSnap.exists()) {
        throw new Error('Tratamiento no encontrado');
      }

      const tratamientoData = tratamientoSnap.data();

      if (tratamientoData['clinicId'] !== clinicId) {
        throw new Error('Tratamiento fuera de la clínica actual');
      }

      if (tratamientoData['estado'] !== 'active') {
        throw new Error('Tratamiento finalizado');
      }

      const patientId = tratamientoData['patientId'];

      if (!patientId) {
        throw new Error('Tratamiento sin paciente asociado');
      }

      const nextSession = Math.max(1, Number(tratamientoData['nextSessionNumber'] ?? 1));

      const evolucionRef = doc(collection(this.firestore, this.evolucionesCollection));

      const cleanPayload = this.buildCleanPayload(payload);

      // 1. Crear evolución de progreso
      transaction.set(evolucionRef, {
        ...cleanPayload,
        treatmentId,
        patientId,
        tipoEvolucion: 'progress',
        sessionNumber: nextSession,
        clinicId,
        professionalId,
        activo: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // 2. Actualizar contador de sesiones del tratamiento
      transaction.update(tratamientoRef, {
        nextSessionNumber: nextSession + 1,
        totalSesiones: nextSession,
        updatedAt: serverTimestamp()
      });


      return evolucionRef.id;
    });

    return evolucionId;
}

  async finalizarTratamiento(
    treatmentId: string,
    payload: Omit<EvolucionCreateInput, 'patientId' | 'tipoEvolucion'>
  ): Promise<string> {

  const clinicId = this.clinicId;
  const professionalId = this.professionalId;

    return runTransaction(this.firestore, async (transaction) => {

      const tratamientoRef = doc(this.firestore, `tratamientos/${treatmentId}`);
      const tratamientoSnap = await transaction.get(tratamientoRef);

      if (!tratamientoSnap.exists()) {
        throw new Error('Tratamiento no encontrado');
      }

      const tratamientoData = tratamientoSnap.data();

      if (tratamientoData['estado'] !== 'active') {
        throw new Error('Tratamiento ya está finalizado');
      }
      if (tratamientoData['clinicId'] !== clinicId) {
        throw new Error('Tratamiento fuera de la clínica actual');
      }

      const patientId = tratamientoData['patientId'];

      if (!patientId) {
        throw new Error('Tratamiento sin paciente asociado');
      }

      const evolucionRef = doc(collection(this.firestore, this.evolucionesCollection));

      const cleanPayload = this.buildCleanPayload(payload);

      transaction.set(evolucionRef, {
        ...cleanPayload,
        patientId,
        treatmentId,
        tipoEvolucion: 'discharge',
        sessionNumber: null,
        clinicId,
        professionalId,
        activo: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      transaction.update(tratamientoRef, {
        estado: 'completed',
        closedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      return evolucionRef.id;
    });
  }

  async getTratamientoActivo(patientId: string) {
    return this.tratamientosService.getActivoByPaciente(patientId);
  }
}