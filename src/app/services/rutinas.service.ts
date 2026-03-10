import { Injectable } from '@angular/core';
import {
  collection,
  collectionData,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  limit,
  serverTimestamp,
  runTransaction,
  docData
} from '@angular/fire/firestore';

import { Observable, map } from 'rxjs';
import { BaseClinicService } from '../core/services/base-clinic.service';
import { Rutina, templateToRutina, pacienteToRutina } from '../models/rutina.model';
import { RutinaTemplate } from '../models/rutina-template.model';
import { RutinaPaciente } from '../models/rutina-paciente.model';

@Injectable({
  providedIn: 'root'
})
export class RutinasService extends BaseClinicService {

  // ========================================
  // TEMPLATES
  // ========================================

  private get templatesPath(): string {
    return `clinics/${this.clinicId}/rutinas_templates`;
  }

  getTemplates(): Observable<Rutina[]> {

    const ref = collection(this.firestore, this.templatesPath);

    return (collectionData(ref, { idField: 'id' }) as Observable<RutinaTemplate[]>)
      .pipe(
        map(templates => templates.map(t => templateToRutina(t)))
      );

  }

  getTemplatesRaw(): Observable<RutinaTemplate[]> {

    const ref = collection(this.firestore, this.templatesPath);

    return collectionData(ref, { idField: 'id' }) as Observable<RutinaTemplate[]>;

  }

  async guardarTemplate(rutina: Rutina): Promise<string> {

    const data = {
      nombre: rutina.nombre,
      descripcion: rutina.descripcion ?? '',
      ejercicios: rutina.ejercicios,
      clinicId: this.clinicId,
      createdBy: this.professionalId,
      createdAt: serverTimestamp()
    };

    if (rutina.id) {
      await updateDoc(
        doc(this.firestore, `${this.templatesPath}/${rutina.id}`),
        {
          nombre: rutina.nombre,
          descripcion: rutina.descripcion ?? '',
          ejercicios: rutina.ejercicios
        }
      );
      return rutina.id;
    }

    const docRef = await addDoc(
      collection(this.firestore, this.templatesPath),
      data
    );

    return docRef.id;

  }

  async eliminarTemplate(id: string): Promise<void> {

    await deleteDoc(
      doc(this.firestore, `${this.templatesPath}/${id}`)
    );

  }

  // ========================================
  // PATIENT ROUTINES
  // ========================================

  private get pacientePath(): string {
    return `clinics/${this.clinicId}/rutinas_paciente`;
  }

  getRutinasPaciente(pacienteId: string): Observable<Rutina[]> {

    const ref = collection(this.firestore, this.pacientePath);
    const q = query(ref, where('pacienteId', '==', pacienteId));

    return (collectionData(q, { idField: 'id' }) as Observable<RutinaPaciente[]>)
      .pipe(
        map(rutinas => rutinas.map(r => pacienteToRutina(r)))
      );

  }

  getRutinaActivaPaciente(pacienteId: string): Observable<Rutina | null> {

    const ref = collection(this.firestore, this.pacientePath);

    const q = query(
      ref,
      where('pacienteId', '==', pacienteId),
      where('activa', '==', true),
      limit(1)
    );

    return (collectionData(q, { idField: 'id' }) as Observable<RutinaPaciente[]>)
      .pipe(
        map(data => data.length ? pacienteToRutina(data[0]) : null)
      );

  }

  getRutinaById(rutinaId: string): Observable<Rutina | null> {

    const ref = doc(this.firestore, `${this.pacientePath}/${rutinaId}`);

    return (docData(ref, { idField: 'id' }) as Observable<RutinaPaciente>)
      .pipe(
        map(data => data ? pacienteToRutina(data) : null)
      );

  }

  async guardarRutinaPaciente(rutina: Rutina): Promise<string> {

    const data: any = {
      nombre: rutina.nombre,
      descripcion: rutina.descripcion ?? '',
      ejercicios: rutina.ejercicios,
      pacienteId: rutina.pacienteId,
      activa: rutina.activa ?? true,
      clinicId: this.clinicId,
      createdBy: this.professionalId
    };

    if (rutina.templateId) {
      data.templateId = rutina.templateId;
    }

    if (rutina.id) {
      await updateDoc(
        doc(this.firestore, `${this.pacientePath}/${rutina.id}`),
        {
          nombre: rutina.nombre,
          descripcion: rutina.descripcion ?? '',
          ejercicios: rutina.ejercicios,
          updatedAt: serverTimestamp()
        }
      );
      return rutina.id;
    }

    data.createdAt = serverTimestamp();

    const docRef = await addDoc(
      collection(this.firestore, this.pacientePath),
      data
    );

    return docRef.id;

  }

  async activarRutina(rutinaId: string, activa: boolean): Promise<void> {

    await updateDoc(
      doc(this.firestore, `${this.pacientePath}/${rutinaId}`),
      { activa }
    );

  }

  // ========================================
  // ASSIGN TEMPLATE TO PATIENT
  // ========================================

  async asignarTemplateAPaciente(
    pacienteId: string,
    template: Rutina | RutinaTemplate
  ): Promise<void> {

    const rutinasRef = collection(this.firestore, this.pacientePath);

    const q = query(
      rutinasRef,
      where('pacienteId', '==', pacienteId),
      where('activa', '==', true)
    );

    const snapshot = await getDocs(q);

    await runTransaction(this.firestore, async (transaction) => {

      snapshot.forEach(docSnap => {
        transaction.update(docSnap.ref, { activa: false });
      });

      const nuevaDoc = doc(rutinasRef);

      transaction.set(nuevaDoc, {
        pacienteId,
        nombre: template.nombre,
        descripcion: template.descripcion ?? '',
        ejercicios: template.ejercicios,
        templateId: template.id,
        activa: true,
        clinicId: this.clinicId,
        createdBy: this.professionalId,
        createdAt: serverTimestamp()
      });

    });

  }

  // ========================================
  // UNIFIED SAVE (dispatches by tipo)
  // ========================================

  async guardar(rutina: Rutina): Promise<string> {

    if (rutina.tipo === 'template') {
      return this.guardarTemplate(rutina);
    }

    return this.guardarRutinaPaciente(rutina);

  }

}
