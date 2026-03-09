export interface RutinaSesion {

  id?: string;

  rutinaId: string;

  pacienteId: string;

  clinicId: string;

  fecha: Date;

  ejercicios: RutinaSesionEjercicio[];

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