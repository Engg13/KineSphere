import { Timestamp } from '@angular/fire/firestore';


export interface Paciente {
  id: number | string;
  nombre: string;
  rut?: string;
  fechaNacimiento?: string;
  edad?: number;
  email?: string;
  telefono?: string;
  diagnostico?: string;
  direccion?: string;
  sesionesPlanificadas?: number;
  sesionesCompletadas?: number;
  activo: boolean;
  es_demo?: boolean;
  fecha_creacion?: string;
  fechaIngreso?: string;
  fechaCreacion?: string;
  observaciones?: string;
  num_sesiones?: number;
}

export interface Sesion {
  id: number | string;
  paciente_id: number | string;
  paciente_nombre?: string;
  numero_sesion?: number;
  fecha: string;
  ejercicios?: string;
  ejercicios_realizados?: boolean;
  observaciones?: string;
  eva?: number;
  nivel_dolor?: number;
  calidad_sueno?: number;
  sueño?: number;
  zona_tratamiento?: string;
  tecnicas_aplicadas?: string[];
  rom?: string;
  objetivo_proxima?: string;
  enviado_whatsapp?: boolean;
  creado_en?: string;
  fecha_creacion?: string;
  fecha_registro?: string;
}

export interface Documento {
  id: number | string;
  pacienteId: number | string;
  imagen: string;
  fecha: string;
  tipo: 'foto_camara' | 'desde_galeria';
  descripcion?: string;
}

export interface Evaluacion {
  id?: string;
  pacienteId: number | string;
  pacienteNombre?: string;
  eva: number;
  movilidad?: string;
  actividadesDiarias?: string;
  fortaleza?: number;
  sueno?: number;
  observaciones?: string;
  recomendacion?: string;
  fecha: string;
}

// ==================== EJERCICIOS ====================

export interface EjercicioLocal {
  id: string;
  nombre: string;
  descripcion: string;
  instrucciones?: string;
  categoria: CategoriaEjercicio;
  musculoPrincipal: string;
  equipamiento: string;
  videoUrl?: string;        // URL de YouTube (lista privada)
  videoThumbnail?: string;  // Thumbnail del video
  imagenUrl?: string;
  dificultad: 'basico' | 'intermedio' | 'avanzado';
  fechaCreacion: string;
}

export type CategoriaEjercicio =
  | 'fuerza'
  | 'estiramiento'
  | 'movilidad'
  | 'equilibrio'
  | 'cardio'
  | 'funcional'
  | 'rehabilitacion';

export interface SerieEjercicio {
  numero: number;
  repeticiones: number | null;
  peso: number | null;
  completada: boolean;
  tiempo?: number;  // segundos, para ejercicios isométricos
}

export interface EjercicioEnRutina {
  ejercicioId: string;
  ejercicio: EjercicioLocal;
  letra: string;             // A, B, C...
  series: SerieEjercicio[];
  descansoSegundos: number;
  notas?: string;
}

export interface RutinaEjercicios {
  id?: string;
  pacienteId: string;
  pacienteNombre?: string;
  nombre: string;
  descripcion?: string;
  ejercicios: EjercicioEnRutina[];
  fecha: string;
  estado: 'draft' | 'active' | 'completed' | 'archived';
  fechaCompletada?: string;
  enviadaWhatsapp: boolean;
  createdAt?: Timestamp;
}

export interface HistorialEjercicio {
  fecha: string;
  series: SerieEjercicio[];
  rutinaId: string;
}

export interface BackupData {
  version: string;
  fecha: string;
  app: string;
  pacientes: Paciente[];
  sesiones: { [pacienteId: string]: Sesion[] };
  documentos: { [pacienteId: string]: Documento[] };
}
