import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  addDoc,
  deleteDoc,
  doc,
  query,
  where
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { ClinicContextService } from '../core/tenancy/clinic-context.service';
import { Documento } from '../models/documento.model';

@Injectable({
  providedIn: 'root'
})
export class DocumentosService {

  private firestore = inject(Firestore);
  private clinicContext = inject(ClinicContextService);

  private documentosRef = collection(this.firestore, 'documentos');

  getDocumentosByPaciente(patientId: string): Observable<Documento[]> {

    const clinicId = this.clinicContext.clinicId

    const q = query(
      this.documentosRef,
      where('patientId', '==', patientId),
      where('clinicId', '==', clinicId)
    );

    return collectionData(q, { idField: 'id' }) as Observable<Documento[]>;
  }

  addDocumento(documento: Omit<Documento, 'clinicId'>) {

    const clinicId = this.clinicContext.clinicId;

    if (!clinicId) {
      throw new Error('Clinic context not loaded');
    }

    const data: Documento = {
      ...documento,
      clinicId
    };

    return addDoc(this.documentosRef, data);
  }

  deleteDocumento(id: string) {
    const ref = doc(this.firestore, `documentos/${id}`);
    return deleteDoc(ref);
  }

}