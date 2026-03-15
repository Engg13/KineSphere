export type TipoSesion = 'clinica' | 'domiciliaria';

export interface RutinaSesion {

  id?: string;

  rutinaId: string;

  patientId: string;

  clinicId: string;

  tipoSesion?: TipoSesion;

  fecha: Date;

  comentario?: string;

  painScore?: number;

  /** @deprecated Kept for backward compat with subcollection sessions */
  ejercicios?: RutinaSesionEjercicio[];

  /** @deprecated Use comentario */
  notas?: string;

  createdAt: Date;

}

export interface RutinaSesionEjercicio {

  ejercicioId: string;

  serie: number;

  repeticiones?: number;

  tiempo?: number;

  carga?: number;

  dolor?: number;

  completado?: boolean;

}

export interface RutinaLog {

  id?: string;

  sesionId: string;

  ejercicioId: string;

  serie: number;

  completado: boolean;

  dolor?: number;

  repeticiones?: number;

  tiempo?: number;

  carga?: number;

}
