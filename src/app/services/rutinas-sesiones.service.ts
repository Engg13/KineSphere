import { Injectable } from '@angular/core';
import {
  collection,
  collectionData,
  addDoc,
  query,
  where,
  serverTimestamp
} from '@angular/fire/firestore';

import { Observable } from 'rxjs';

import { BaseClinicService } from '../core/services/base-clinic.service';
import { RutinaSesion } from '../models/rutina-sesion.model';

@Injectable({
  providedIn: 'root'
})
export class RutinasSesionesService extends BaseClinicService {

  registrarSesion(rutinaId: string, sesion: RutinaSesion) {

    const ref = collection(
        this.firestore,
        `clinics/${this.clinicId}/rutinas_paciente/${rutinaId}/sesiones`
    );

    return addDoc(ref, {
        ...sesion,
        createdAt: serverTimestamp()
    });

    }

  getSesionesRutina(rutinaId: string): Observable<RutinaSesion[]> {

    const ref = collection(
        this.firestore,
        `clinics/${this.clinicId}/rutinas_paciente/${rutinaId}/sesiones`
    );

    return collectionData(ref, { idField: 'id' }) as Observable<RutinaSesion[]>;

    }

}