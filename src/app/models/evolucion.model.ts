import { Timestamp } from '@angular/fire/firestore';

export type TipoEvolucion = 'initial' | 'progress' | 'discharge';

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
  profesionalId: string;

  tipoEvolucion: TipoEvolucion;
  sessionNumber: number;

  subjective: string;
  objective: string;
  assessment: string;
  plan: string;

  painScale: number | null;
  sleepQuality: number | null;
  rom: string | null;
  zonaTratamiento: string | null;
  tecnicasAplicadas: string[];

  ejerciciosRealizados: boolean;

  rutinaId?: string;
  rutinaNombre?: string;

  test?: EvolucionTest;

  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}
