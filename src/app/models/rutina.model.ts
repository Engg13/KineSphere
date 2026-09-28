import { Timestamp } from '@angular/fire/firestore';
import { RutinaTemplateEjercicio } from './rutina-ejercicio.model';
import { RutinaTemplate } from './rutina-template.model';
import { RutinaPaciente, TipoRutina, EstadoRutina } from './rutina-paciente.model';

export interface Rutina {

  id?: string;

  nombre: string;

  descripcion?: string;

  ejercicios: RutinaTemplateEjercicio[];

  tipo: 'template' | 'paciente';

  pacienteId?: string;

  /** Treatment associated with a patient routine. */
  treatmentId?: string;

  templateId?: string;

  clinicId: string;

  activa?: boolean;

  tipoRutina?: TipoRutina;

  estado?: EstadoRutina;

  publicToken?: string;

  publicEnabled?: boolean;

  createdBy: string;

  createdAt?: Timestamp | Date;

  fechaCompletada?: Date;

}

export function templateToRutina(t: RutinaTemplate): Rutina {
  return {
    id: t.id,
    nombre: t.nombre,
    descripcion: t.descripcion,
    ejercicios: t.ejercicios,
    tipo: 'template',
    clinicId: t.clinicId,
    createdBy: t.createdBy,
    createdAt: t.createdAt
  };
}

export function pacienteToRutina(r: RutinaPaciente): Rutina {
  return {
    id: r.id,
    nombre: r.nombre,
    descripcion: r.descripcion,
    ejercicios: r.ejercicios,
    tipo: 'paciente',
    pacienteId: r.pacienteId,
    treatmentId: r.treatmentId,
    templateId: r.templateId,
    clinicId: r.clinicId,
    activa: r.activa,
    tipoRutina: r.tipo,
    estado: r.estado,
    publicToken: r.publicToken,
    publicEnabled: r.publicEnabled,
    createdBy: r.createdBy,
    createdAt: r.createdAt,
    fechaCompletada: r.fechaCompletada
  };
}

export function rutinaToTemplate(r: Rutina): Omit<RutinaTemplate, 'id'> & { id?: string } {
  return {
    id: r.id,
    nombre: r.nombre,
    descripcion: r.descripcion,
    ejercicios: r.ejercicios,
    clinicId: r.clinicId,
    createdBy: r.createdBy,
    createdAt: r.createdAt as Date | undefined
  };
}

export function rutinaToPaciente(r: Rutina): Omit<RutinaPaciente, 'id'> & { id?: string } {
  return {
    id: r.id,
    nombre: r.nombre,
    descripcion: r.descripcion,
    ejercicios: r.ejercicios,
    pacienteId: r.pacienteId!,
    treatmentId: r.treatmentId,
    clinicId: r.clinicId,
    activa: r.activa ?? true,
    tipo: r.tipoRutina,
    estado: r.estado,
    publicToken: r.publicToken,
    publicEnabled: r.publicEnabled,
    createdBy: r.createdBy,
    createdAt: r.createdAt,
    templateId: r.templateId,
    fechaCompletada: r.fechaCompletada
  };
}
