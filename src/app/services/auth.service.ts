import { Injectable, inject } from '@angular/core';
import { Auth, signInWithEmailAndPassword, signOut, authState } from '@angular/fire/auth';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private auth = inject(Auth);
  private firestore = inject(Firestore);

  user$: Observable<any> = authState(this.auth);

  private currentRole: string | null = null;

  // =========================
  // LOGIN
  // =========================

  async login(email: string, password: string): Promise<boolean> {
    try {
      const credential = await signInWithEmailAndPassword(
        this.auth,
        email,
        password
      );

      const role = await this.getUserRole(credential.user.uid);

      if (!role) {
        await signOut(this.auth);
        return false;
      }

      this.currentRole = role;

      return true;

    } catch (error) {
      console.error('Error login:', error);
      return false;
    }
  }

  // =========================
  // LOGOUT
  // =========================

  async logout(): Promise<void> {
    this.currentRole = null;
    await signOut(this.auth);
  }

  // =========================
  // ROLE
  // =========================

  async getUserRole(uid: string): Promise<string | null> {
    const userRef = doc(this.firestore, `users/${uid}`);
    const snap = await getDoc(userRef);

    if (snap.exists()) {
      return snap.data()['role'] || null;
    }

    return null;
  }

  getRole(): string | null {
    return this.currentRole;
  }

  isAdmin(): boolean {
    return this.currentRole === 'admin';
  }

  isProfesional(): boolean {
    return this.currentRole === 'profesional';
  }

  // =========================
  // SESSION
  // =========================

  isAuthenticated(): boolean {
    return !!this.auth.currentUser;
  }

  getCurrentUser() {
    return this.auth.currentUser;
  }

  getUsername(): string {
    return this.auth.currentUser?.email || '';
  }

  getNombreCompleto(): string {
    return this.auth.currentUser?.email || 'Usuario';
  }

  async getCurrentUserData(): Promise<any> {
    const user = this.auth.currentUser;
    if (!user) throw new Error('No autenticado');

    const userRef = doc(this.firestore, `users/${user.uid}`);
    const snap = await getDoc(userRef);

    if (!snap.exists()) {
      throw new Error('Usuario sin perfil en Firestore');
    }

    return snap.data();
  }

  async getCurrentClinicId(): Promise<string> {
    const data = await this.getCurrentUserData();

    if (!data?.clinicId) {
      throw new Error('Usuario sin clinicId');
    }

    return data.clinicId;
  }

  // =========================
  // PERFIL (Placeholder)
  // =========================

  async cambiarNombre(nuevoNombre: string): Promise<void> {
    console.log('Cambio de nombre pendiente de implementación real');
  }

  async cambiarPassword(
    passwordActual: string,
    passwordNueva: string
  ): Promise<{ success: boolean; message: string }> {

    if (!this.auth.currentUser) {
      return { success: false, message: 'No hay sesión activa' };
    }

    return {
      success: false,
      message: 'Cambio de contraseña requiere reautenticación'
    };
  }
}