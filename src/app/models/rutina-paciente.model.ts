import { Timestamp } from '@angular/fire/firestore';
import { RutinaTemplateEjercicio } from './rutina-ejercicio.model';

export type TipoRutina = 'clinica' | 'domiciliaria';

export type EstadoRutina = 'activa' | 'cerrada';

export interface RutinaPaciente {

  id?: string;

  clinicId: string;

  patientId: string;

  nombre: string;

  descripcion?: string;

  ejercicios: RutinaTemplateEjercicio[];

  /** @deprecated Use estado instead. Kept for backward compatibility. */
  activa: boolean;

  tipo?: TipoRutina;

  estado?: EstadoRutina;

  templateId?: string;

  publicToken?: string;

  publicEnabled?: boolean;

  createdBy: string;

  createdAt?: Timestamp | Date;

  fechaCompletada?: Date;

}
