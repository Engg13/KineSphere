import { Timestamp } from '@angular/fire/firestore';

export type TipoEvolucion = 'initial' | 'progress' | 'discharge';

export interface RomEntry {
  movimiento: string;
  unidad: 'grados';
  arom?: { valor: number | null; dolor?: number | null };
  prom?: { valor: number | null; dolor?: number | null };
  observacion?: string;
}

export interface ArticulacionRom {
  articulacion: string;
  movimientos: RomEntry[];
}

export interface EvolucionTest {
  testId: string;
  testNombre: string;
  puntajeTotal: number;
  resultado: string;
}

export interface Evolucion {
  id?: string;
  clinicId: string;
  patientId: string;
  professionalId: string;
  tipoEvolucion: TipoEvolucion;
  sessionNumber: number;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  painScale: number | null;
  sleepQuality: number | null;
  rom: ArticulacionRom[];
  zonaTratamiento: string | null;
  tecnicasAplicadas: string[];
  ejerciciosRealizados: boolean;
  rutinaId?: string;
  rutinaNombre?: string;
  test?: EvolucionTest;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface EvolucionCreateInput {
  patientId: string;
  tipoEvolucion: TipoEvolucion;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  painScale: number | null;
  sleepQuality: number | null;
  rom: ArticulacionRom[];
  zonaTratamiento: string | null;
  tecnicasAplicadas: string[];
  ejerciciosRealizados: boolean;
  rutinaId?: string;
  rutinaNombre?: string;
  test?: EvolucionTest;
}
