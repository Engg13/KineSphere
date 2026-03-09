import { RutinaTemplateEjercicio } from './rutina-ejercicio.model';

export interface RutinaTemplate {

  id?: string;

  clinicId: string;

  nombre: string;

  descripcion?: string;

  ejercicios: RutinaTemplateEjercicio[];

  createdBy: string;

  createdAt?: Date;

}