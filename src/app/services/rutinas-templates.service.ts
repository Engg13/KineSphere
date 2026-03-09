import { Injectable } from '@angular/core';
import {
  collection,
  collectionData,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from '@angular/fire/firestore';

import { Observable } from 'rxjs';
import { BaseClinicService } from '../core/services/base-clinic.service';
import { RutinaTemplate } from '../models/rutina-template.model';
import { RutinaPaciente } from '../models/rutina-paciente.model';


@Injectable({
  providedIn: 'root'
})
export class RutinasTemplatesService extends BaseClinicService {

  private getCollectionPath(): string {
    return `clinics/${this.clinicId}/rutinas_templates`;
  }

  getTemplates(): Observable<RutinaTemplate[]> {

    const ref = collection(
      this.firestore,
      this.getCollectionPath()
    );

    return collectionData(ref, { idField: 'id' }) as Observable<RutinaTemplate[]>;

  }

  async crearTemplate(template: RutinaTemplate) {

    const ref = collection(
      this.firestore,
      this.getCollectionPath()
    );

    return addDoc(ref, {
      ...template,
      createdBy: this.professionalId,
      createdAt: serverTimestamp()
    });

  }

  async actualizarTemplate(id: string, cambios: Partial<RutinaTemplate>) {

    return updateDoc(
      doc(
        this.firestore,
        `${this.getCollectionPath()}/${id}`
      ),
      cambios
    );

  }

  async eliminarTemplate(id: string) {

    return deleteDoc(
      doc(
        this.firestore,
        `${this.getCollectionPath()}/${id}`
      )
    );

  }

  async crearTemplateDesdeRutina(rutina: RutinaPaciente) {

    const ref = collection(
      this.firestore,
      `clinics/${this.clinicId}/rutinas_templates`
    );

    return addDoc(ref, {
      nombre: rutina.nombre,
      descripcion: rutina.descripcion ?? '',
      ejercicios: rutina.ejercicios.map(e => ({
        ejercicioId: e.ejercicioId,
        nombre: e.nombre,
        orden: e.orden,
        series: e.series,
        repeticiones: e.repeticiones,
        tiempo: e.tiempo,
        carga: e.carga,
        notas: e.notas
      })),
      createdBy: this.professionalId,
      clinicId: this.clinicId,
      createdAt: serverTimestamp()
    });

  }

}