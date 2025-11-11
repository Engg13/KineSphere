import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false
})
export class LoginPage {
  username: string = '';
  password: string = '';
  profesionalSeleccionado: string = 'Esteban';
  rememberMe: boolean = false; //

  constructor(private router: Router) {}

  getProfesionalNombre(): string {
    const nombres: any = {
      'Esteban': 'Klgo. Esteban Gomez',
    };
    return nombres[this.profesionalSeleccionado] || 'Profesional';
  }

  login() {
    if (this.username && this.password) {
      this.router.navigate(['/dashboard']);
    }
  }

  // AGREGAR ESTE MÉTODO
  onLogin() {
    this.login();
  }
}