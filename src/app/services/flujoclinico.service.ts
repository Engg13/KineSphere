import { Injectable, inject } from '@angular/core';
import { runTransaction, doc, collection, serverTimestamp } from '@angular/fire/firestore';
import { Firestore } from '@angular/fire/firestore';

import { TratamientosService } from './tratamientos.service';
import { EvolucionesService } from './evoluciones.service';
import { AuthService } from './auth.service';
import { EvolucionCreateInput } from '../models/evolucion.model';

@Injectable({
  providedIn: 'root'
})
export class FlujoClinicoService {

  private readonly firestore = inject(Firestore);
  private readonly tratamientosService = inject(TratamientosService);
  private readonly evolucionesService = inject(EvolucionesService);
  private readonly authService = inject(AuthService);

 async crearEvaluacionInicial(
  patientId: string,
  payload: Omit<EvolucionCreateInput, 'patientId' | 'tipoEvolucion'>
): Promise<string> {

  const existente = await this.tratamientosService.getActivoByPaciente(patientId);

  if (existente) {
    throw new Error('El paciente ya tiene un tratamiento activo');
  }

  const tratamiento = await this.tratamientosService.create(patientId, {
    zonaPrincipal: payload.zonaTratamiento ?? null,
    articulacionesSecundarias: []
  });

  const evolucion = await this.evolucionesService.create({
    ...payload,
    patientId,
    treatmentId: tratamiento.id,
    tipoEvolucion: 'initial',
    sessionNumber: null
  });

  return evolucion.id;
}

  async crearSesionProgreso(
    treatmentId: string,
    payload: Omit<EvolucionCreateInput, 'patientId' | 'tipoEvolucion'>
  ): Promise<string> {

    const user = this.authService.getCurrentUser();
    if (!user) throw new Error('No autenticado');

    const tratamiento = await this.tratamientosService.getById(treatmentId);
    if (!tratamiento) throw new Error('Tratamiento no encontrado');

    const evolucionId = await runTransaction(this.firestore, async (transaction) => {

      const tratamientoRef = doc(this.firestore, `tratamientos/${treatmentId}`);
      const tratamientoSnap = await transaction.get(tratamientoRef);
      

      if (!tratamientoSnap.exists()) {
        throw new Error('Tratamiento no encontrado');
      }

      const tratamientoData = tratamientoSnap.data();
      const patientId = tratamientoData['patientId'];

      if (tratamientoData['estado'] !== 'active') {
        throw new Error('Tratamiento finalizado');
      }

      const totalActual = Number(tratamientoData['totalSesiones'] || 0);
      const nextSession = totalActual + 1;

      const evolucionRef = doc(collection(this.firestore, 'evoluciones'));

      transaction.set(evolucionRef, {
        ...payload,
        treatmentId,
        patientId,
        tipoEvolucion: 'progress',
        sessionNumber: nextSession,
        clinicId: tratamientoData['clinicId'],
        professionalId: user.uid,
        activo: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      transaction.update(tratamientoRef, {
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

    const user = this.authService.getCurrentUser();
    if (!user) throw new Error('No autenticado');

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

      const patientId = tratamientoData['patientId'];

      const evolucionRef = doc(collection(this.firestore, 'evoluciones'));

      transaction.set(evolucionRef, {
        ...payload,
        patientId,
        treatmentId,
        tipoEvolucion: 'discharge',
        sessionNumber: null,
        clinicId: tratamientoData['clinicId'],
        professionalId: user.uid,
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
}