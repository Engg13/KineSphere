// login.page.ts - CON inject() MODERNO
import { Component, inject } from '@angular/core';
import { NavController } from '@ionic/angular';
import { AuthService } from 'src/app/services/auth.service';

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
  showPwd: boolean = false;

  // ✅ USAR inject() EN LUGAR DEL CONSTRUCTOR
  private navCtrl = inject(NavController);
  private authService = inject(AuthService);

  getProfesionalNombre(): string {
    const nombres: any = {
      'Esteban': 'Klgo. Esteban Gomez',
    };
    return nombres[this.profesionalSeleccionado] || 'Profesional';
  }

  togglePwd() {
    this.showPwd = !this.showPwd;
  }

  login() {
    console.log('Login attempt:', this.username, this.password);
    
    if (this.authService.login(this.username, this.password)) {
      console.log('Login successful!');
      this.navCtrl.navigateRoot('/dashboard'); 
    } else {
      console.log('Login failed');
    }
  }
}