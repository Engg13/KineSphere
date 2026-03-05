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

@Injectable({
  providedIn: 'root'
})
export class DocumentosService {

  private firestore = inject(Firestore);
  private clinicContext = inject(ClinicContextService);

  private documentosRef = collection(this.firestore, 'documentos');

  getDocumentosByPaciente(pacienteId: string): Observable<any[]> {

    const clinicId = this.clinicContext.getClinicId();

    const q = query(
      this.documentosRef,
      where('patientId', '==', pacienteId),
      where('clinicId', '==', clinicId)
    );

    return collectionData(q, { idField: 'id' }) as Observable<any[]>;
  }

  addDocumento(documento: any) {
    return addDoc(this.documentosRef, documento);
  }

  deleteDocumento(id: string) {

    const ref = doc(this.firestore, `documentos/${id}`);

    return deleteDoc(ref);
  }

}