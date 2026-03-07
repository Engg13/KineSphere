import { Injectable, inject } from '@angular/core';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';

@Injectable({
  providedIn: 'root'
})
export class ClinicContextService {

  private firestore = inject(Firestore);
  private auth = inject(Auth);

  clinicId: string | null = null;
  role: string | null = null;
  uid: string | null = null;

  async init(): Promise<void> {

    const user = this.auth.currentUser;

    if (!user) throw new Error('Usuario no autenticado');

    this.uid = user.uid;

    const ref = doc(this.firestore, `users/${user.uid}`);
    const snap = await getDoc(ref);

    if (!snap.exists()) throw new Error('Perfil de usuario no existe');

    const data = snap.data();

    this.clinicId = data['clinicId'];
    this.role = data['role'];

    console.log('Clinic loaded:', this.clinicId);
    console.log('Role:', this.role);

  }

  isAdmin(): boolean {
    return this.role === 'admin';
  }

}