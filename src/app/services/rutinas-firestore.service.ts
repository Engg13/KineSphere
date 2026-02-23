import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  query,
  where,
  collectionData,
  serverTimestamp,
  doc,
  updateDoc,
  deleteDoc,
  collectionGroup,
  orderBy
} from '@angular/fire/firestore';
import { Observable, map } from 'rxjs';
import { AuthService } from './auth.service';
import { RutinaEjercicios } from '../models/interfaces';

@Injectable({
  providedIn: 'root'
})
export class RutinasFirestoreService {

  private firestore = inject(Firestore);
  private authService = inject(AuthService);

  // =====================================================
  // 🔥 RUTINAS REALTIME
  // =====================================================

  getRutinasPorPacienteRealtime(pacienteId: string | null) {
    const user = this.authService.getCurrentUser();
    if (!user) throw new Error('No autenticado');

    const rutinasRef = collection(this.firestore, 'rutinas');

    return collectionData(rutinasRef, { idField: 'id' }).pipe(
        map((rutinas: any[]) => {

        return rutinas.filter(r => {

            // Si NO hay paciente → mostrar solo plantillas
            if (!pacienteId) {
            return r.esPlantilla === true &&
                    r.profesionalId === user.uid;
            }

            // Si hay paciente → mostrar:
            // - rutinas del paciente
            // - plantillas del profesional
            return (
            (r.pacienteId === pacienteId ||
            r.esPlantilla === true) &&
            r.profesionalId === user.uid
            );
        });

        })
    );
}

  // =====================================================
  // ➕ CREAR RUTINA
  // =====================================================

    async crearRutina(data: {
        pacienteId?: string | null;
        pacienteNombre?: string;
        nombre: string;
        ejercicios?: any[];
        }) {
        const user = this.authService.getCurrentUser();
        if (!user) throw new Error('No autenticado');

        const esPlantilla = !data.pacienteId;

        return addDoc(collection(this.firestore, 'rutinas'), {
            pacienteId: data.pacienteId ?? null,
            pacienteNombre: data.pacienteNombre ?? null,
            nombre: data.nombre,
            ejercicios: data.ejercicios ?? [],
            fecha: new Date().toISOString(),
            completada: false,
            enviadaWhatsapp: false,
            esPlantilla,          
            profesionalId: user.uid,
            createdAt: serverTimestamp()
        });
}

  // =====================================================
  // ✏️ ACTUALIZAR RUTINA
  // =====================================================

  async actualizarRutina(id: string, cambios: Partial<RutinaEjercicios>) {
  return updateDoc(doc(this.firestore, `rutinas/${id}`), cambios);
}

  // =====================================================
  // ❌ ELIMINAR RUTINA
  // =====================================================

  async eliminarRutina(rutinaId: string) {
    return deleteDoc(doc(this.firestore, `rutinas/${rutinaId}`));
  }

  // =====================================================
  // 🏋 EJERCICIOS DENTRO DE RUTINA (SUBCOLLECTION)
  // =====================================================

  getEjerciciosDeRutinaRealtime(rutinaId: string): Observable<any[]> {
    const user = this.authService.getCurrentUser();
    if (!user) throw new Error('No autenticado');

    const q = query(
      collection(this.firestore, `rutinas/${rutinaId}/ejercicios`),
      orderBy('createdAt', 'asc')
    );

    return collectionData(q, { idField: 'id' });
  }

  async agregarEjercicioARutina(
    rutinaId: string,
    ejercicio: any
  ) {
    return addDoc(
      collection(this.firestore, `rutinas/${rutinaId}/ejercicios`),
      {
        ...ejercicio,
        createdAt: serverTimestamp()
      }
    );
  }

  async actualizarEjercicioDeRutina(
    rutinaId: string,
    ejercicioId: string,
    cambios: any
  ) {
    return updateDoc(
      doc(this.firestore, `rutinas/${rutinaId}/ejercicios/${ejercicioId}`),
      cambios
    );
  }

  async eliminarEjercicioDeRutina(
    rutinaId: string,
    ejercicioId: string
  ) {
    return deleteDoc(
      doc(this.firestore, `rutinas/${rutinaId}/ejercicios/${ejercicioId}`)
    );
  }

  // =====================================================
  // 📊 HISTORIAL (SUBCOLLECTION DE RUTINA)
  // =====================================================

  async agregarHistorial(
    rutinaId: string,
    data: any
  ) {
    return addDoc(
      collection(this.firestore, `rutinas/${rutinaId}/historial`),
      {
        ...data,
        createdAt: serverTimestamp()
      }
    );
  }

  getHistorialDeRutinaRealtime(
    rutinaId: string
  ): Observable<any[]> {
    const q = query(
      collection(this.firestore, `rutinas/${rutinaId}/historial`),
      orderBy('createdAt', 'desc')
    );

    return collectionData(q, { idField: 'id' });
  }

  // =====================================================
  // 📊 HISTORIAL GLOBAL POR EJERCICIO (collectionGroup)
  // =====================================================

  getHistorialGlobalPorEjercicioRealtime(
    ejercicioId: string
  ): Observable<any[]> {

    const q = query(
      collectionGroup(this.firestore, 'historial'),
      where('ejercicioId', '==', ejercicioId)
    );

    return collectionData(q, { idField: 'id' });
  }

  getRutinasGeneralesRealtime() {
    const user = this.authService.getCurrentUser();
    if (!user) throw new Error('No autenticado');

    const ref = collection(this.firestore, 'rutinas');

    const q = query(
        ref,
        where('profesionalId', '==', user.uid),
        where('pacienteId', '==', null)
    );

    return collectionData(q, { idField: 'id' });
    }

    async clonarRutinaACliente(
        rutinaOriginal: any,
        pacienteId: string,
        pacienteNombre: string
        ) {
        const user = this.authService.getCurrentUser();
        if (!user) throw new Error('No autenticado');

        const nuevaRutina = {
            pacienteId,
            pacienteNombre,
            nombre: rutinaOriginal.nombre,
            ejercicios: rutinaOriginal.ejercicios || [],
            fecha: new Date().toISOString(),
            completada: false,
            enviadaWhatsapp: false,
            esPlantilla: false,
            profesionalId: user.uid,
            createdAt: serverTimestamp()
        };

        return addDoc(collection(this.firestore, 'rutinas'), nuevaRutina);
        }

        getRutinasRealtime() {
            const user = this.authService.getCurrentUser();
            if (!user) throw new Error('No autenticado');

            const ref = collection(this.firestore, 'rutinas');

            return collectionData(ref, { idField: 'id' }).pipe(
                map((rutinas: any[]) =>
                rutinas.filter(r => r.profesionalId === user.uid)
                )
            );
            }
}