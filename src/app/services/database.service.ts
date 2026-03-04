import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  query,
  where,
  addDoc,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  orderBy,
  limit
} from '@angular/fire/firestore';
import { Observable, from, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {

  private firestore = inject(Firestore);
  private authService = inject(AuthService);


  private async buildClinicScopedQuery(
    collectionName: string,
    extraConstraints: any[] = []
  ) {
    const role = this.authService.getRole();

    const baseConstraints = [
      where('isDeleted', '==', false),
      ...extraConstraints
    ];

    if (role === 'superadmin') {
      return query(
        collection(this.firestore, collectionName),
        ...baseConstraints
      );
    }

    const clinicId = await this.authService.getCurrentClinicId();

    return query(
      collection(this.firestore, collectionName),
      where('clinicId', '==', clinicId),
      ...baseConstraints
    );
  }


  // =====================================================
  // 🔥 REALTIME PACIENTES
  // =====================================================

  getPacientesRealtime(): Observable<any[]> {
    return this.authService.user$.pipe(
      switchMap(() =>
        from(this.buildClinicScopedQuery('pacientes')).pipe(
          switchMap(q =>
            collectionData(q, { idField: 'id' }) as Observable<any[]>
          )
        )
      )
    );
  }

  // =====================================================
  // 🔥 REALTIME SESIONES
  // =====================================================

  getSesionesRealtime(): Observable<any[]> {
    return this.authService.user$.pipe(
      switchMap(() =>
        from(this.buildClinicScopedQuery('sesiones')).pipe(
          switchMap(q =>
            collectionData(q, { idField: 'id' }) as Observable<any[]>
          )
        )
      )
    );
  }

  // =====================================================
  // 📋 MÉTODOS CLÁSICOS (Promise)
  // =====================================================

  async getPacientes(): Promise<any[]> {
    const q = await this.buildClinicScopedQuery('pacientes');

    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  async getPaciente(id: string): Promise<any> {
    const ref = doc(this.firestore, `pacientes/${id}`);
    const snap = await getDoc(ref);

    if (!snap.exists()) return null;

    return { id: snap.id, ...snap.data() };
  }

  async addPaciente(paciente: any) {
    const user = this.authService.getCurrentUser();
    if (!user) throw new Error('No autenticado');

    const clinicId = await this.authService.getCurrentClinicId();

    const {
      nombre,
      rut,
      telefono,
      email,
      direccion,
      fechaNacimiento
    } = paciente;

    if (!rut) throw new Error('RUT obligatorio');

    const rutNormalizado = rut.replace(/\./g, '').toUpperCase();

    const q = query(
      collection(this.firestore, 'pacientes'),
      where('clinicId', '==', clinicId),
      where('rut', '==', rutNormalizado),
      where('isDeleted', '==', false)
    );

    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      throw new Error('Paciente ya existe en esta clínica');
    }

    const pacienteData: any = {
      nombre,
      rut: rutNormalizado,
      clinicId,
      professionalId: user.uid,
      activo: true,
      isDeleted: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    if (telefono) pacienteData.telefono = telefono;
    if (email) pacienteData.email = email;
    if (direccion) pacienteData.direccion = direccion;
    if (fechaNacimiento) pacienteData.fechaNacimiento = fechaNacimiento;

    return addDoc(collection(this.firestore, 'pacientes'), pacienteData);
  }

  async updatePaciente(id: string, data: any) {
    const {
      nombre,
      telefono,
      email,
      direccion,
      fechaNacimiento,
      activo
    } = data;

    return updateDoc(doc(this.firestore, `pacientes/${id}`), {
      nombre,
      telefono,
      email,
      direccion,
      fechaNacimiento,
      activo,
      updatedAt: serverTimestamp()
    });
  }

  async deletePaciente(id: string) {
    return updateDoc(doc(this.firestore, `pacientes/${id}`), {
      isDeleted: true,
      deletedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }

  // =====================================================
  // 🗂 SESIONES
  // =====================================================

  async addSesion(sesion: any) {
    const user = this.authService.getCurrentUser();
    if (!user) throw new Error('No autenticado');

    const clinicId = await this.authService.getCurrentClinicId();

    const {
      pacienteId,
      tipoEvolucion,
      notas,
      fecha
    } = sesion;

    if (!pacienteId) throw new Error('Paciente requerido');

    // 🔹 Buscar última sesión
    const q = query(
      collection(this.firestore, 'sesiones'),
      where('clinicId', '==', clinicId),
      where('pacienteId', '==', pacienteId),
      where('isDeleted', '==', false),
      orderBy('sessionNumber', 'desc'),
      limit(1)
    );

    const snapshot = await getDocs(q);

    let nextSessionNumber = 1;

    if (!snapshot.empty) {
      const lastData = snapshot.docs[0].data() as any;
      nextSessionNumber = (lastData.sessionNumber ?? 0) + 1;
    }

    return addDoc(collection(this.firestore, 'sesiones'), {
      pacienteId,
      tipoEvolucion,
      notas,
      fecha,

      sessionNumber: nextSessionNumber,

      clinicId,
      professionalId: user.uid,
      isDeleted: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }

  async getSesionesByPaciente(pacienteId: string): Promise<any[]> {
    const q = await this.buildClinicScopedQuery('sesiones', [
      where('pacienteId', '==', pacienteId),
      orderBy('sessionNumber', 'asc')
    ]);

    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  async getNumeroSesionesByPaciente(pacienteId: string): Promise<number> {
    const sesiones = await this.getSesionesByPaciente(pacienteId);
    return sesiones.length;
  }
}