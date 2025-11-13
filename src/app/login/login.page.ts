import { Component } from '@angular/core';
import { NavController } from '@ionic/angular';

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
  rememberMe: boolean = false; 

  constructor(private navCtrl: NavController) {}

  getProfesionalNombre(): string {
    const nombres: any = {
      'Esteban': 'Klgo. Esteban Gomez',
    };
    return nombres[this.profesionalSeleccionado] || 'Profesional';
  }

  // REEMPLAZA ESTA FUNCIÓN COMPLETA:
  login() {
    if (this.username && this.password) {
      this.navCtrl.navigateRoot('/dashboard'); // ← Método de Ionic
    }
  }
}