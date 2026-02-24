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
import { Observable, combineLatest, map } from 'rxjs';
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

    const ref = collection(this.firestore, 'rutinas');
    const isAdmin = this.authService.getRole() === 'admin';

    // Admin: mantiene lectura completa explícita
    if (isAdmin) {
      return collectionData(ref, { idField: 'id' });
    }

    // Profesional: solo consultas filtradas en servidor
    const plantillasQ = query(
      ref,
      where('profesionalId', '==', user.uid),
      where('esPlantilla', '==', true)
    );

    if (!pacienteId) {
      return collectionData(plantillasQ, { idField: 'id' });
    }

    const pacienteQ = query(
      ref,
      where('profesionalId', '==', user.uid),
      where('pacienteId', '==', pacienteId)
    );

    return combineLatest([
      collectionData(pacienteQ, { idField: 'id' }) as Observable<any[]>,
      collectionData(plantillasQ, { idField: 'id' }) as Observable<any[]>
    ]).pipe(
      map(([rutinasPaciente, plantillas]) => {
        const mapRutinas = new Map<string, any>();

        [...rutinasPaciente, ...plantillas].forEach(r => {
          if (r?.id) mapRutinas.set(r.id, r);
        });

        return Array.from(mapRutinas.values());
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
            const isAdmin = this.authService.getRole() === 'admin';

            if (isAdmin) {
              return collectionData(ref, { idField: 'id' });
            }

            const q = query(
              ref,
              where('profesionalId', '==', user.uid)
            );

            return collectionData(q, { idField: 'id' });
            }
}
