import { Component, inject } from '@angular/core';
import { NavController, ToastController, IonicModule } from '@ionic/angular';
import { AuthService } from 'src/app/services/auth.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [IonicModule, FormsModule]
})
export class LoginPage {

  email: string = '';
  password: string = '';
  isLoading: boolean = false;
  showPwd: boolean = false;

  private navCtrl = inject(NavController);
  private authService = inject(AuthService);
  private toastCtrl = inject(ToastController);

  togglePwd() {
    this.showPwd = !this.showPwd;
  }

  async login() {

    if (!this.email || !this.password) {
      await this.mostrarError('Email y contraseña son requeridos');
      return;
    }

    this.isLoading = true;

    try {

      const success = await this.authService.login(this.email, this.password);

      if (!success) {
        await this.mostrarError('No tienes permisos para acceder');
        return;
      }

      await this.mostrarExito('Bienvenido');

      this.navCtrl.navigateRoot('/dashboard');

    } catch (error) {

      console.error(error);
      await this.mostrarError('Credenciales incorrectas');

    } finally {

      this.isLoading = false;

    }

  }

  private async mostrarError(mensaje: string) {
    const toast = await this.toastCtrl.create({
      message: mensaje,
      duration: 3000,
      color: 'danger',
      position: 'bottom'
    });
    await toast.present();
  }

  private async mostrarExito(mensaje: string) {
    const toast = await this.toastCtrl.create({
      message: mensaje,
      duration: 2000,
      color: 'success',
      position: 'top'
    });
    await toast.present();
  }
}