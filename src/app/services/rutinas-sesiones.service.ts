import { Injectable } from '@angular/core';
import {
  collection,
  collectionData,
  addDoc,
  query,
  where,
  orderBy,
  serverTimestamp
} from '@angular/fire/firestore';

import { Observable } from 'rxjs';

import { BaseClinicService } from '../core/services/base-clinic.service';
import { RutinaSesion, RutinaLog } from '../models/rutina-sesion.model';

@Injectable({
  providedIn: 'root'
})
export class RutinasSesionesService extends BaseClinicService {

  // ========================================
  // COLLECTION PATHS
  // ========================================

  private get sesionesPath(): string {
    return `clinics/${this.clinicId}/rutina_sesiones`;
  }

  private get logsPath(): string {
    return `clinics/${this.clinicId}/rutina_logs`;
  }

  // ========================================
  // SESSIONS
  // ========================================

  async registrarSesion(sesion: Omit<RutinaSesion, 'id' | 'createdAt'>): Promise<string> {

    const ref = collection(this.firestore, this.sesionesPath);

    const docRef = await addDoc(ref, {
      ...sesion,
      clinicId: this.clinicId,
      createdAt: serverTimestamp()
    });

    return docRef.id;

  }

  getSesionesRutina(rutinaId: string): Observable<RutinaSesion[]> {

    const ref = collection(this.firestore, this.sesionesPath);

    const q = query(
      ref,
      where('rutinaId', '==', rutinaId),
      orderBy('fecha', 'desc')
    );

    return collectionData(q, { idField: 'id' }) as Observable<RutinaSesion[]>;

  }

  getSesionesPaciente(pacienteId: string): Observable<RutinaSesion[]> {

    const ref = collection(this.firestore, this.sesionesPath);

    const q = query(
      ref,
      where('pacienteId', '==', pacienteId),
      orderBy('fecha', 'desc')
    );

    return collectionData(q, { idField: 'id' }) as Observable<RutinaSesion[]>;

  }

  // ========================================
  // LOGS
  // ========================================

  async registrarLog(log: Omit<RutinaLog, 'id'>): Promise<string> {

    const ref = collection(this.firestore, this.logsPath);

    const docRef = await addDoc(ref, log);

    return docRef.id;

  }

  async registrarLogs(logs: Omit<RutinaLog, 'id'>[]): Promise<void> {

    const ref = collection(this.firestore, this.logsPath);

    for (const log of logs) {
      await addDoc(ref, log);
    }

  }

  getLogsSesion(sesionId: string): Observable<RutinaLog[]> {

    const ref = collection(this.firestore, this.logsPath);

    const q = query(
      ref,
      where('sesionId', '==', sesionId)
    );

    return collectionData(q, { idField: 'id' }) as Observable<RutinaLog[]>;

  }

}
