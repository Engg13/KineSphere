// auth.service.ts
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private isLoggedIn = false;

  constructor() {
    // Verificar si hay sesión guardada
    this.checkStoredAuth();
  }

  login(username: string, password: string): boolean {
    // Aquí tu lógica de autenticación
    if (username && password) {
      this.isLoggedIn = true;
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('username', username);
      return true;
    }
    return false;
  }

  logout(): void {
    this.isLoggedIn = false;
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('username');
  }

  isAuthenticated(): boolean {
    return this.isLoggedIn;
  }

  private checkStoredAuth(): void {
    const storedAuth = localStorage.getItem('isLoggedIn');
    this.isLoggedIn = storedAuth === 'true';
  }

  getUsername(): string {
    return localStorage.getItem('username') || '';
  }
}