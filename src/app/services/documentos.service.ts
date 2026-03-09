import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  addDoc,
  deleteDoc,
  doc,
  getDoc,
  query,
  where
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Documento } from '../models/interfaces';
import { ClinicContextService } from '../core/tenancy/clinic-context.service';

@Injectable({
  providedIn: 'root'
})
export class DocumentosService {

  private firestore = inject(Firestore);
  private clinicContext = inject(ClinicContextService);

  private documentosRef = collection(this.firestore, 'documentos');

  getDocumentosByPaciente(pacienteId: string): Observable<Documento[]> {

    const clinicId = this.clinicContext.clinicId

    const q = query(
      this.documentosRef,
      where('pacienteId', '==', pacienteId),
      where('clinicId', '==', clinicId)
    );

    return collectionData(q, { idField: 'id' }) as Observable<Documento[]>;
  }

  addDocumento(documento: any) {
    return addDoc(this.documentosRef, documento);
  }

  async deleteDocumento(id: string) {

    const clinicId = this.clinicContext.clinicId;
    const ref = doc(this.firestore, `documentos/${id}`);
    const snap = await getDoc(ref);

    if (!snap.exists() || snap.data()?.['clinicId'] !== clinicId) {
      throw new Error('Documento no encontrado o no pertenece a esta clínica');
    }

    return deleteDoc(ref);
  }

}