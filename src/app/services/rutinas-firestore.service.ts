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
import { Observable, combineLatest, from, map } from 'rxjs';
import { switchMap } from 'rxjs/operators';
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

  getRutinasPorPacienteRealtime(pacienteId: string | null): Observable<any[]> {
    const user = this.authService.getCurrentUser();
    if (!user) throw new Error('No autenticado');

    const ref = collection(this.firestore, 'rutinas');

    return from(this.authService.getCurrentClinicId()).pipe(
      switchMap((clinicId) => {
        const plantillasQ = query(
          ref,
          where('clinicId', '==', clinicId),
          where('profesionalId', '==', user.uid),
          where('esPlantilla', '==', true)
        );

        if (!pacienteId) {
          return (collectionData(plantillasQ, { idField: 'id' }) as Observable<any[]>).pipe(
            map((rutinas) => rutinas.map((r) => this.normalizarRutinaLegacy(r)))
          );
        }

        const pacienteQ = query(
          ref,
          where('clinicId', '==', clinicId),
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

            return Array.from(mapRutinas.values()).map((r) => this.normalizarRutinaLegacy(r));
          })
        );
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
        estado: 'draft' | 'active' | 'completed' | 'archived';
        ejercicios?: any[];
        }) {
        const user = this.authService.getCurrentUser();
        if (!user) throw new Error('No autenticado');

        const esPlantilla = !data.pacienteId;
        const clinicId = await this.authService.getCurrentClinicId();
        console.log("ClinicId:", clinicId);
        console.log("User UID:", user.uid);

        return addDoc(collection(this.firestore, 'rutinas'), {
            clinicId,
            pacienteId: data.pacienteId ?? null,
            pacienteNombre: data.pacienteNombre ?? null,
            nombre: data.nombre,
            ejercicios: data.ejercicios ?? [],
            fecha: new Date().toISOString(),
            estado: data.estado,
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

  getRutinasGeneralesRealtime(): Observable<any[]> {
    const user = this.authService.getCurrentUser();
    if (!user) throw new Error('No autenticado');

    const ref = collection(this.firestore, 'rutinas');

    return from(this.authService.getCurrentClinicId()).pipe(
      switchMap((clinicId) => {
        const q = query(
          ref,
          where('clinicId', '==', clinicId),
          where('profesionalId', '==', user.uid),
          where('pacienteId', '==', null)
        );

        return (collectionData(q, { idField: 'id' }) as Observable<any[]>).pipe(
          map((rutinas) => rutinas.map((r) => this.normalizarRutinaLegacy(r)))
        );
      })
    );
  }

    async clonarRutinaACliente(
        rutinaOriginal: any,
        pacienteId: string,
        pacienteNombre: string
        ) {
        const user = this.authService.getCurrentUser();
        if (!user) throw new Error('No autenticado');

        const clinicId = await this.authService.getCurrentClinicId();

        const nuevaRutina = {
            clinicId,
            pacienteId,
            pacienteNombre,
            nombre: rutinaOriginal.nombre,
            ejercicios: rutinaOriginal.ejercicios || [],
            fecha: new Date().toISOString(),
            estado: 'active',
            enviadaWhatsapp: false,
            esPlantilla: false,
            profesionalId: user.uid,
            createdAt: serverTimestamp()
        };

        return addDoc(collection(this.firestore, 'rutinas'), nuevaRutina);
        }

        getRutinasRealtime(): Observable<any[]> {
            const user = this.authService.getCurrentUser();
            if (!user) throw new Error('No autenticado');

            const ref = collection(this.firestore, 'rutinas');

            return from(this.authService.getCurrentClinicId()).pipe(
              switchMap((clinicId) => {
                const q = query(
                  ref,
                  where('clinicId', '==', clinicId),
                  where('profesionalId', '==', user.uid)
                );

                return (collectionData(q, { idField: 'id' }) as Observable<any[]>).pipe(
                  map((rutinas) => rutinas.map((r) => this.normalizarRutinaLegacy(r)))
                );
              })
            );
            }


  private normalizarRutinaLegacy(rutina: any): any {
    if (rutina?.estado) return rutina;

    const estado = rutina?.completada === true ? 'completed' : 'active';
    const { completada, ...resto } = rutina || {};

    return {
      ...resto,
      estado
    };
  }
}
