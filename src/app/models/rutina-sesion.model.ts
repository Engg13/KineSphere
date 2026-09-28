export interface RutinaSesion {
  id: string;
  rutinaId: string;
  pacienteId: string;
  clinicId: string;
  treatmentId?: string;
  tipoSesion: 'clinica' | 'domiciliaria';
  fecha: Date;
  painScore?: number;
  comentario?: string;
  totalSeries?: number;
  seriesCompletadas?: number;
  progreso?: number;
  estado?: 'completada' | 'parcial';
  createdAt?: any;
}

export interface RutinaLog {
  id: string;
  sesionId?: string;
  rutinaId: string;
  pacienteId: string;
  clinicId?: string;
  treatmentId?: string;
  ejercicioId: string;
  serie?: number;
  completado?: boolean;
  repeticiones?: number;
  seriesCompletadas?: number;
  dolor?: number;
  fecha?: Date;
  createdAt?: any;
}
