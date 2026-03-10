import { Injectable } from '@angular/core';
import {
  collection,
  collectionData,
  collectionGroup,
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
import { RutinaPaciente, TipoRutina } from '../models/rutina-paciente.model';

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

    if (rutina.tipoRutina) {
      data.tipo = rutina.tipoRutina;
    }

    if (rutina.estado) {
      data.estado = rutina.estado;
    }

    if (rutina.publicToken) {
      data.publicToken = rutina.publicToken;
    }

    if (rutina.publicEnabled !== undefined) {
      data.publicEnabled = rutina.publicEnabled;
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

    const updates: any = { activa };

    if (!activa) {
      updates.estado = 'cerrada';
      updates.fechaCompletada = serverTimestamp();
    } else {
      updates.estado = 'activa';
    }

    await updateDoc(
      doc(this.firestore, `${this.pacientePath}/${rutinaId}`),
      updates
    );

  }

  // ========================================
  // CLINICAL ROUTINE
  // ========================================

  async crearRutinaClinica(
    pacienteId: string,
    nombre: string,
    ejercicios: any[],
    templateId?: string
  ): Promise<string> {

    const rutinasRef = collection(this.firestore, this.pacientePath);

    const data: any = {
      pacienteId,
      nombre,
      descripcion: '',
      ejercicios,
      tipo: 'clinica' as TipoRutina,
      estado: 'activa',
      activa: true,
      clinicId: this.clinicId,
      createdBy: this.professionalId,
      createdAt: serverTimestamp()
    };

    if (templateId) {
      data.templateId = templateId;
    }

    const docRef = await addDoc(rutinasRef, data);

    return docRef.id;

  }

  async cerrarRutinaClinica(rutinaId: string): Promise<void> {

    await updateDoc(
      doc(this.firestore, `${this.pacientePath}/${rutinaId}`),
      {
        activa: false,
        estado: 'cerrada',
        fechaCompletada: serverTimestamp()
      }
    );

  }

  // ========================================
  // HOME ROUTINE
  // ========================================

  async crearRutinaDomiciliaria(
    pacienteId: string,
    nombre: string,
    ejercicios: any[],
    templateId?: string
  ): Promise<string> {

    const rutinasRef = collection(this.firestore, this.pacientePath);

    // Deactivate existing active routines
    const q = query(
      rutinasRef,
      where('pacienteId', '==', pacienteId),
      where('activa', '==', true)
    );

    const snapshot = await getDocs(q);

    const token = this.generarToken();

    let newId = '';

    await runTransaction(this.firestore, async (transaction) => {

      snapshot.forEach(docSnap => {
        transaction.update(docSnap.ref, {
          activa: false,
          estado: 'cerrada',
          fechaCompletada: serverTimestamp()
        });
      });

      const nuevaDoc = doc(rutinasRef);
      newId = nuevaDoc.id;

      const data: any = {
        pacienteId,
        nombre,
        descripcion: '',
        ejercicios,
        tipo: 'domiciliaria' as TipoRutina,
        estado: 'activa',
        activa: true,
        publicToken: token,
        publicEnabled: true,
        clinicId: this.clinicId,
        createdBy: this.professionalId,
        createdAt: serverTimestamp()
      };

      if (templateId) {
        data.templateId = templateId;
      }

      transaction.set(nuevaDoc, data);

    });

    return newId;

  }

  async habilitarAccesoPublico(rutinaId: string): Promise<string> {

    const token = this.generarToken();

    await updateDoc(
      doc(this.firestore, `${this.pacientePath}/${rutinaId}`),
      {
        publicToken: token,
        publicEnabled: true
      }
    );

    return token;

  }

  async deshabilitarAccesoPublico(rutinaId: string): Promise<void> {

    await updateDoc(
      doc(this.firestore, `${this.pacientePath}/${rutinaId}`),
      { publicEnabled: false }
    );

  }

  // ========================================
  // PUBLIC TOKEN LOOKUP (for /r/:token)
  // ========================================

  getRutinaByToken(token: string): Observable<RutinaPaciente | null> {

    const groupRef = collectionGroup(this.firestore, 'rutinas_paciente');

    const q = query(
      groupRef,
      where('publicToken', '==', token),
      where('publicEnabled', '==', true),
      limit(1)
    );

    return (collectionData(q, { idField: 'id' }) as Observable<RutinaPaciente[]>)
      .pipe(
        map(data => data.length ? data[0] : null)
      );

  }

  // ========================================
  // ASSIGN TEMPLATE TO PATIENT
  // ========================================

  async asignarTemplateAPaciente(
    pacienteId: string,
    template: Rutina | RutinaTemplate,
    tipoRutina: TipoRutina = 'domiciliaria'
  ): Promise<void> {

    const rutinasRef = collection(this.firestore, this.pacientePath);

    const q = query(
      rutinasRef,
      where('pacienteId', '==', pacienteId),
      where('activa', '==', true)
    );

    const snapshot = await getDocs(q);

    const token = tipoRutina === 'domiciliaria' ? this.generarToken() : undefined;

    await runTransaction(this.firestore, async (transaction) => {

      snapshot.forEach(docSnap => {
        transaction.update(docSnap.ref, {
          activa: false,
          estado: 'cerrada',
          fechaCompletada: serverTimestamp()
        });
      });

      const nuevaDoc = doc(rutinasRef);

      const data: any = {
        pacienteId,
        nombre: template.nombre,
        descripcion: template.descripcion ?? '',
        ejercicios: template.ejercicios,
        templateId: template.id,
        tipo: tipoRutina,
        estado: 'activa',
        activa: true,
        clinicId: this.clinicId,
        createdBy: this.professionalId,
        createdAt: serverTimestamp()
      };

      if (token) {
        data.publicToken = token;
        data.publicEnabled = true;
      }

      transaction.set(nuevaDoc, data);

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

  // ========================================
  // PRIVATE HELPERS
  // ========================================

  private generarToken(): string {

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';

    for (let i = 0; i < 16; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return token;

  }

}
