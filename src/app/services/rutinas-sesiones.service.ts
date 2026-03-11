import { Injectable } from '@angular/core';
import {
  collection,
  collectionData,
  addDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch,
  doc
} from '@angular/fire/firestore';
import { Rutina } from '../models/rutina.model';
import { Observable, map } from 'rxjs';
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

    const docRef = await addDoc(ref, {
      ...log,
      createdAt: serverTimestamp()
    });

    return docRef.id;

}

  async registrarLogs(logs: Omit<RutinaLog, 'id'>[]): Promise<void> {

    const batch = writeBatch(this.firestore);

    for (const log of logs) {

      const logRef = doc(
        collection(this.firestore, this.logsPath)
      );

      batch.set(logRef, {
        ...log,
        createdAt: serverTimestamp()
      });

    }

    await batch.commit();

  }

  getLogsSesion(sesionId: string): Observable<RutinaLog[]> {

    const ref = collection(this.firestore, this.logsPath);

    const q = query(
      ref,
      where('sesionId', '==', sesionId)
    );

    return collectionData(q, { idField: 'id' }) as Observable<RutinaLog[]>;

  }

  getAdherenciaRutina(rutina: Rutina): Observable<number> {

    const ref = collection(this.firestore, this.logsPath);

    const q = query(
      ref,
      where('rutinaId', '==', rutina.id)
    );

    const totalSeries = rutina.ejercicios
      .reduce((acc, ej) => acc + (ej.series || 0), 0);

    return collectionData(q).pipe(

      map(logs => {

        const realizadas = logs.length;

        if (!totalSeries) return 0;

        return Math.round((realizadas / totalSeries) * 100);

      })

    );

  }

}
