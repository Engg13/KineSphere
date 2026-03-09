import { Injectable } from '@angular/core';
import {
    runTransaction,
    collection,
    collectionData,
    addDoc,
    doc,
    updateDoc,
    query,
    where,
    serverTimestamp,
    getDocs,
    limit,
    docData
} from '@angular/fire/firestore';

import { Observable, map } from 'rxjs';
import { BaseClinicService } from '../core/services/base-clinic.service';
import { RutinaPaciente } from '../models/rutina-paciente.model';
import { RutinaTemplate } from '../models/rutina-template.model';

@Injectable({
  providedIn: 'root'
})
export class RutinasPacienteService extends BaseClinicService {

    private collectionPath = 'rutinas_paciente';

    getRutinasPaciente(pacienteId: string): Observable<RutinaPaciente[]> {

    const ref = collection(
        this.firestore,
        this.getPath()
    );

    const q = query(
        ref,
        where('pacienteId', '==', pacienteId)
    );

    return collectionData(q, { idField: 'id' }) as Observable<RutinaPaciente[]>;

    }

    async crearRutinaPaciente(rutina: Partial<RutinaPaciente>) {

    const ref = collection(
        this.firestore,
        this.getPath()
    );

    return addDoc(ref, {
        clinicId: this.clinicId,
        createdBy: this.professionalId,
        ...rutina,
        createdAt: serverTimestamp()
        });
    }

    async asignarTemplateAPaciente(
        pacienteId: string,
        template: RutinaTemplate
        ) {

        const rutinasRef = collection(
            this.firestore,
            `clinics/${this.clinicId}/rutinas_paciente`
        );

        const q = query(
            rutinasRef,
            where('pacienteId', '==', pacienteId),
            where('activa', '==', true)
        );

        const snapshot = await getDocs(q);

        await runTransaction(this.firestore, async (transaction) => {

            // Desactivar rutinas activas
            snapshot.forEach(docSnap => {
            transaction.update(docSnap.ref, { activa: false });
            });

            // Crear nueva rutina
            const nuevaRutinaRef = collection(
            this.firestore,
            `clinics/${this.clinicId}/rutinas_paciente`
            );

            const nuevaDoc = doc(nuevaRutinaRef);

            transaction.set(nuevaDoc, {
            pacienteId,
            nombre: template.nombre,
            descripcion: template.descripcion ?? '',
            ejercicios: template.ejercicios,
            templateId: template.id,
            activa: true,
            createdBy: this.professionalId,
            createdAt: serverTimestamp()
            });

        });

    }

    async activarRutina(rutinaId: string, activa: boolean) {

        return updateDoc(
            doc(
            this.firestore,
            `clinics/${this.clinicId}/rutinas_paciente/${rutinaId}`
            ),
            { activa }
        );

        }
        
        private getPath() {
        return `clinics/${this.clinicId}/rutinas_paciente`;
    }

    async actualizarRutina(
        rutinaId: string,
        cambios: Partial<RutinaPaciente>
        ) {

        return updateDoc(
            doc(
            this.firestore,
            `clinics/${this.clinicId}/rutinas_paciente/${rutinaId}`
            ),
            cambios
        );

        }

    getRutinaActivaPaciente(pacienteId: string): Observable<RutinaPaciente | null> {

        const ref = collection(
            this.firestore,
            `clinics/${this.clinicId}/rutinas_paciente`
        );

        const q = query(
            ref,
            where('pacienteId', '==', pacienteId),
            where('activa', '==', true),
            limit(1)
        );

        return collectionData(q, { idField: 'id' }).pipe(
            map(data => data.length ? data[0] as RutinaPaciente : null)
        );

    }

    getRutinaById(rutinaId: string): Observable<RutinaPaciente | null> {

        const ref = doc(
            this.firestore,
            `clinics/${this.clinicId}/rutinas_paciente/${rutinaId}`
        );

        return docData(ref, { idField: 'id' }) as Observable<RutinaPaciente>;

    }
}