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
  limit,
  Timestamp
} from '@angular/fire/firestore';
import { AuthService } from './auth.service';

export type TipoEvolucion = 'initial' | 'progress' | 'discharge';

export interface EvolucionDocument {
  id: string;

  clinicId: string;
  professionalId: string;
  patientId: string;
  treatmentId: string | null;

  tipoEvolucion: 'initial' | 'progress' | 'discharge';
  sessionNumber: number | null;

  painScale: number | null;
  sleepQuality: number | null;

  zonaTratamiento: string | null;
  tecnicasAplicadas: string[];

  rom: ArticulacionRom[];

  ejerciciosRealizados: boolean;

  subjective: string;
  objective: string;
  assessment: string;
  plan: string;

  objetivos: ObjetivoClinico[];

  rutinaId: string | null;
  rutinaNombre: string | null;

  test: EvolucionTest | null;

  activo: boolean;

  createdAt: Timestamp;
  updatedAt: Timestamp;
  deletedAt?: Timestamp;
}

export type EvolucionCreateInput =
  Required<Pick<EvolucionDocument, 'patientId' | 'tipoEvolucion'>> &
  Omit<
    Partial<EvolucionDocument>,
    | 'id'
    | 'clinicId'
    | 'professionalId'
    | 'createdAt'
    | 'updatedAt'
    | 'activo'
    | 'patientId'
    | 'tipoEvolucion'
  >;

export type EvolucionUpdateInput = Omit<
  Partial<EvolucionDocument>,
  | 'id'
  | 'clinicId'
  | 'professionalId'
  | 'createdAt'
  | 'updatedAt'
>;

export interface RomMovimiento {
  movimiento: string;
  unidad: 'grados';
  arom?: {
    valor: number | null;
    dolor?: number;
  };
  prom?: {
    valor: number | null;
    dolor?: number;
  };
  observacion?: string;
}

export interface ArticulacionRom {
  articulacion: string;
  movimientos: RomMovimiento[];
}

export interface EvolucionTest {
  testId: string;
  testNombre: string;
  puntajeTotal: number;
  resultado: string;
}

export interface ObjetivoClinico {
  descripcion: string;
  indicador?: string;
  tiempoEstimado?: string;
  logrado?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class EvolucionesService {

  private readonly firestore = inject(Firestore);
  private readonly authService = inject(AuthService);
  private readonly collectionName = 'evoluciones';

  // =========================
  // CREATE
  // =========================

  async create(payload: EvolucionCreateInput): Promise<EvolucionDocument> {

    if (!payload.patientId) {
        throw new Error('patientId es obligatorio');
    }

    if (!payload.tipoEvolucion) {
        throw new Error('tipoEvolucion es obligatorio');
    }

    if (payload.tipoEvolucion === 'progress' && payload.sessionNumber == null) {
    throw new Error('Las evoluciones progress deben tener sessionNumber');
    }

    if (payload.tipoEvolucion === 'initial' && payload.sessionNumber != null) {
    throw new Error('Evaluación inicial no debe tener sessionNumber');
    }

    if (payload.tipoEvolucion === 'progress' && !payload.treatmentId) {
    throw new Error('Las evoluciones progress requieren treatmentId');
    }

    const { clinicId, professionalId } = await this.getAuthContext();

    const cleanPayload = {
        patientId: payload.patientId,
        treatmentId: payload.treatmentId ?? null,

        tipoEvolucion: payload.tipoEvolucion,
        sessionNumber: payload.sessionNumber ?? null,

        painScale: payload.painScale ?? null,
        sleepQuality: payload.sleepQuality ?? null,

        zonaTratamiento: payload.zonaTratamiento ?? null,
        tecnicasAplicadas: payload.tecnicasAplicadas ?? [],
        rom: Array.isArray(payload.rom) ? payload.rom : [],
        ejerciciosRealizados: payload.ejerciciosRealizados ?? false,

        subjective: payload.subjective ?? '',
        objective: payload.objective ?? '',
        assessment: payload.assessment ?? '',
        plan: payload.plan ?? '',

        objetivos: payload.objetivos ?? [],

        rutinaId: payload.rutinaId ?? null,
        rutinaNombre: payload.rutinaNombre ?? null,

        test: payload.test ?? null,

        clinicId,
        professionalId,

        activo: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    };

    const ref = await addDoc(
        collection(this.firestore, this.collectionName),
        cleanPayload
    );

    return this.getByIdOrThrow(ref.id, clinicId);
}

  // =========================
  // UPDATE
  // =========================

  async update(id: string, changes: EvolucionUpdateInput): Promise<void> {
    const { clinicId } = await this.getAuthContext();
    const actual = await this.getByIdOrThrow(id, clinicId);

    if (
        'clinicId' in changes ||
        'professionalId' in changes ||
        'createdAt' in changes
    ) {
        throw new Error('Campos inmutables no pueden modificarse');
    }

    if ('sessionNumber' in changes && changes.sessionNumber !== actual.sessionNumber) {
        throw new Error('No se puede modificar sessionNumber');
    }

    const clean = this.removeUndefinedFields({
        ...changes,
        updatedAt: serverTimestamp()
    });

    await updateDoc(
        doc(this.firestore, `${this.collectionName}/${id}`),
        clean
    );
    }

  // =========================
  // SOFT DELETE
  // =========================

  async softDelete(id: string): Promise<void> {
    const { clinicId } = await this.getAuthContext();
    await this.getByIdOrThrow(id, clinicId);

    await updateDoc(
      doc(this.firestore, `${this.collectionName}/${id}`),
      {
        activo: false,
        deletedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }
    );
  }

  // =========================
  // GET BY ID
  // =========================

  async getById(id: string): Promise<EvolucionDocument | null> {
    const { clinicId } = await this.getAuthContext();

    const ref = doc(this.firestore, `${this.collectionName}/${id}`);
    const snapshot = await getDoc(ref);

    if (!snapshot.exists()) return null;

    const evolucion = {
      id: snapshot.id,
      ...(snapshot.data() as Omit<EvolucionDocument, 'id'>)
    };

    if (evolucion.clinicId !== clinicId || !evolucion.activo) {
      return null;
    }

    return evolucion;
  }

  // =========================
  // LIST BY PACIENTE
  // =========================

  async listByPaciente(patientId: string): Promise<EvolucionDocument[]> {
    const { clinicId } = await this.getAuthContext();

    const q = query(
      collection(this.firestore, this.collectionName),
      where('clinicId', '==', clinicId),
      where('patientId', '==', patientId),
      where('activo', '==', true),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map(docItem => ({
      id: docItem.id,
      ...(docItem.data() as Omit<EvolucionDocument, 'id'>)
    }));
  }

  // =========================
  // GET INITIAL
  // =========================

  async getEvaluacionInicial(patientId: string): Promise<EvolucionDocument | null> {
    const { clinicId } = await this.getAuthContext();

    const q = query(
      collection(this.firestore, this.collectionName),
      where('clinicId', '==', clinicId),
      where('patientId', '==', patientId),
      where('tipoEvolucion', '==', 'initial'),
      where('activo', '==', true),
      orderBy('createdAt', 'asc'),
      limit(1)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) return null;

    const docSnap = snapshot.docs[0];

    return {
      id: docSnap.id,
      ...(docSnap.data() as Omit<EvolucionDocument, 'id'>)
    };
  }

  // =========================
  // NEXT SESSION NUMBER
  // =========================

  async getNextSessionNumber(patientId: string): Promise<number> {
    const { clinicId } = await this.getAuthContext();

    const q = query(
      collection(this.firestore, this.collectionName),
      where('clinicId', '==', clinicId),
      where('patientId', '==', patientId),
      where('tipoEvolucion', '==', 'progress'),
      where('activo', '==', true),
      orderBy('sessionNumber', 'desc'),
      limit(1)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) return 1;

    const lastData = snapshot.docs[0].data() as Partial<EvolucionDocument>;
    const last = Number(lastData.sessionNumber ?? 0);
    return Number(last) + 1;
  }

  // =========================
  // INTERNAL HELPERS
  // =========================

  private async getAuthContext(): Promise<{ clinicId: string; professionalId: string }> {
    const user = this.authService.getCurrentUser();
    if (!user?.uid) {
      throw new Error('No autenticado');
    }

    const clinicId = await this.authService.getCurrentClinicId();
    if (!clinicId) {
      throw new Error('No hay clinicId disponible');
    }

    return {
      clinicId,
      professionalId: user.uid
    };
  }

  private async getByIdOrThrow(id: string, clinicId: string): Promise<EvolucionDocument> {
    const ref = doc(this.firestore, `${this.collectionName}/${id}`);
    const snapshot = await getDoc(ref);

    if (!snapshot.exists()) {
      throw new Error('Evolución no encontrada');
    }

    const evolucion = {
      id: snapshot.id,
      ...(snapshot.data() as Omit<EvolucionDocument, 'id'>)
    };

    if (evolucion.clinicId !== clinicId) {
      throw new Error('Evolución fuera de la clínica actual');
    }

    if (!evolucion.activo) {
      throw new Error('Evolución eliminada');
    }

    return evolucion;
  }

  private removeUndefinedFields<T extends Record<string, unknown>>(data: T): Partial<T> {
    return Object.entries(data).reduce<Partial<T>>((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key as keyof T] = value as T[keyof T];
      }
      return acc;
    }, {});
  }

  async listHoy(): Promise<EvolucionDocument[]> {
    const { clinicId } = await this.getAuthContext();

    const inicioHoy = new Date();
    inicioHoy.setHours(0, 0, 0, 0);

    const q = query(
        collection(this.firestore, this.collectionName),
        where('clinicId', '==', clinicId),
        where('activo', '==', true),
        where('createdAt', '>=', inicioHoy)
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map(docItem => ({
        id: docItem.id,
        ...(docItem.data() as Omit<EvolucionDocument, 'id'>)
        }));
    }

    async listIniciales(): Promise<EvolucionDocument[]> {
        const { clinicId } = await this.getAuthContext();

        const q = query(
            collection(this.firestore, this.collectionName),
            where('clinicId', '==', clinicId),
            where('tipoEvolucion', '==', 'initial'),
            where('activo', '==', true)
        );

        const snapshot = await getDocs(q);

        return snapshot.docs.map(docItem => ({
            id: docItem.id,
            ...(docItem.data() as Omit<EvolucionDocument, 'id'>)
        }));
    }
}