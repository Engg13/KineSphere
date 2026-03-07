import { Injectable, inject } from '@angular/core';
import { Auth, signInWithEmailAndPassword, signOut, authState } from '@angular/fire/auth';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from '@angular/fire/auth';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private auth = inject(Auth);

  user$ = authState(this.auth);

  // =========================
  // LOGIN
  // =========================

  async login(email: string, password: string): Promise<boolean> {

    try {

      await signInWithEmailAndPassword(
        this.auth,
        email,
        password
      );

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
    await signOut(this.auth);
  }

  // =========================
  // SESSION
  // =========================

  isAuthenticated(): boolean {
    return !!this.auth.currentUser;
  }

  getUsername(): string {
    return this.auth.currentUser?.email || '';
  }

  async cambiarPassword(passwordActual: string, passwordNueva: string)
    : Promise<{ success: boolean; message: string }> {

      const user = this.auth.currentUser;

      if (!user || !user.email) {
        return { success: false, message: 'No hay sesión activa' };
      }

      try {

        const credential = EmailAuthProvider.credential(
          user.email,
          passwordActual
        );

        await reauthenticateWithCredential(user, credential);

        await updatePassword(user, passwordNueva);

        return {
          success: true,
          message: 'Contraseña actualizada correctamente'
        };

      } catch (error) {

        console.error(error);

        return {
          success: false,
          message: 'No se pudo cambiar la contraseña'
        };

      }

    }

}