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

}