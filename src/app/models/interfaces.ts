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
  clinicId: string;
  es_demo?: boolean;
  fecha_creacion?: string;
  fechaIngreso?: string;
  fechaCreacion?: string;
  observaciones?: string;
  zonaPrincipal?: string;
  zonasSecundarias?: string[];
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
  clinicId: string;
}

export interface Documento {
  id: number | string;
  pacienteId: number | string;
  imagen: string;
  fecha: string;
  tipo: 'foto_camara' | 'desde_galeria';
  descripcion?: string;
  clinicId?: string;
  professionalId?: string;
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

export interface BackupData {
  version: string;
  fecha: string;
  app: string;
  pacientes: Paciente[];
  sesiones: { [pacienteId: string]: Sesion[] };
  documentos: { [pacienteId: string]: Documento[] };
}
