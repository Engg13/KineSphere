import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  addDoc,
  collection,
  collectionData,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where
} from '@angular/fire/firestore';
import { Observable, from, switchMap } from 'rxjs';
import { AuthService } from './auth.service';
import { ArticulacionRom, Evolucion, EvolucionCreateInput } from '../models/evolucion.model';

type EvolucionUpdateInput = Partial<Omit<Evolucion, 'id' | 'sessionNumber' | 'clinicId' | 'professionalId' | 'createdAt'>>;
@Injectable({
  providedIn: 'root'
})
export class EvolucionesFirestoreService {
  private firestore = inject(Firestore);
  private authService = inject(AuthService);

  async createEvolucion(payload: EvolucionCreateInput): Promise<string> {
    const user = this.authService.getCurrentUser();
    if (!user) throw new Error('No autenticado');

    const clinicId = await this.authService.getCurrentClinicId();

    if (payload.tipoEvolucion === 'progress') {
      const existeInitial = await this.existeEvaluacionInicial(payload.patientId);
      if (!existeInitial) {
        throw new Error('No se puede crear una evolución de progreso sin evaluación inicial.');
      }
    }

    let sessionNumber: number | null = null;

    if (payload.tipoEvolucion === 'progress') {
      sessionNumber = await this.getNextSessionNumber(payload.patientId);
    }

    const evolucionRef = await addDoc(collection(this.firestore, 'evoluciones'), {
      clinicId,
      patientId: payload.patientId,
      professionalId: user.uid,
      tipoEvolucion: payload.tipoEvolucion,
      sessionNumber,
      subjective: payload.subjective,
      objective: payload.objective,
      assessment: payload.assessment,
      plan: payload.plan,
      painScale: payload.painScale,
      sleepQuality: payload.sleepQuality,
      rom: payload.rom,
      zonaTratamiento: payload.zonaTratamiento,
      tecnicasAplicadas: payload.tecnicasAplicadas,
      ejerciciosRealizados: payload.ejerciciosRealizados,
      rutinaId: payload.rutinaId || null,
      rutinaNombre: payload.rutinaNombre || null,
      test: payload.test || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return evolucionRef.id;
  }

  async existeEvaluacionInicial(patientId: string): Promise<boolean> {
    const user = this.authService.getCurrentUser();
    if (!user) throw new Error('No autenticado');

    const clinicId = await this.authService.getCurrentClinicId();
    const evolucionesQuery = query(
      collection(this.firestore, 'evoluciones'),
      where('clinicId', '==', clinicId),
      where('patientId', '==', patientId),
      where('tipoEvolucion', '==', 'initial'),
      limit(1)
    );

    const snapshot = await getDocs(evolucionesQuery);
    return !snapshot.empty;
  }

  getEvolucionesByPacienteRealtime(patientId: string): Observable<Evolucion[]> {
    const user = this.authService.getCurrentUser();
    if (!user) throw new Error('No autenticado');

    return from(this.authService.getCurrentClinicId()).pipe(
      switchMap((clinicId) => {
        const evolucionesQuery = query(
          collection(this.firestore, 'evoluciones'),
          where('clinicId', '==', clinicId),
          where('patientId', '==', patientId),
          orderBy('createdAt', 'desc')
        );

        return collectionData(evolucionesQuery, { idField: 'id' }) as Observable<Evolucion[]>;
      })
    );
  }

  async getNextSessionNumber(patientId: string): Promise<number> {
    const user = this.authService.getCurrentUser();
    if (!user) throw new Error('No autenticado');

    const clinicId = await this.authService.getCurrentClinicId();
    const evolucionesQuery = query(
      collection(this.firestore, 'evoluciones'),
      where('clinicId', '==', clinicId),
      where('patientId', '==', patientId),
      where('tipoEvolucion', '==', 'progress'),
      orderBy('sessionNumber', 'desc'),
      limit(1)
    );

    const snapshot = await getDocs(evolucionesQuery);
    const ultimaSesion = snapshot.docs[0]?.data()?.['sessionNumber'] || 0;

    return Number(ultimaSesion) + 1;
  }

  async existsArticulacionEnOtrasEvoluciones(
    patientId: string,
    articulacion: string,
    evolucionIdExcluir?: string
  ): Promise<boolean> {
    const user = this.authService.getCurrentUser();
    if (!user) throw new Error('No autenticado');

    const clinicId = await this.authService.getCurrentClinicId();
    const evolucionesQuery = query(
      collection(this.firestore, 'evoluciones'),
      where('clinicId', '==', clinicId),
      where('patientId', '==', patientId)
    );

    const snapshot = await getDocs(evolucionesQuery);

    return snapshot.docs.some((snapshotDoc) => {
      if (evolucionIdExcluir && snapshotDoc.id === evolucionIdExcluir) return false;
      const data = snapshotDoc.data() as Partial<Evolucion>;
      const rom = (data.rom || []) as ArticulacionRom[];
      return rom.some((romArt) => romArt.articulacion === articulacion);
    });
  }

  async updateEvolucion(evolucionId: string, cambios: EvolucionUpdateInput): Promise<void> {
    const evolucionDoc = doc(this.firestore, `evoluciones/${evolucionId}`);

    const {
      // inmutables por contrato de dominio
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      sessionNumber,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      clinicId,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      professionalId,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      createdAt,
      ...safeChanges
    } = cambios as Partial<Evolucion>;

    const snap = await getDoc(evolucionDoc);
    if (!snap.exists()) throw new Error('Evolución no encontrada');

    const evolucionActual = snap.data() as Evolucion;

    if ('zonaTratamiento' in safeChanges && evolucionActual.tipoEvolucion !== 'initial') {
      console.warn('Intento bloqueado: zonaPrincipal/zonaTratamiento solo editable en evoluciones initial.');
      delete safeChanges.zonaTratamiento;
    }

    await updateDoc(evolucionDoc, {
      ...safeChanges,
      updatedAt: serverTimestamp()
    });
  }
}
