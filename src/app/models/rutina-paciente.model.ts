import { Timestamp } from '@angular/fire/firestore';
import { RutinaTemplateEjercicio } from './rutina-ejercicio.model';

export interface RutinaPaciente {

  id?: string;

  clinicId: string;

  pacienteId: string;

  nombre: string;

  descripcion?: string;

  ejercicios: RutinaTemplateEjercicio[];

  activa: boolean;

  templateId?: string;

  createdBy: string;

  createdAt?: Timestamp | Date;

  fechaCompletada?: Date;

}