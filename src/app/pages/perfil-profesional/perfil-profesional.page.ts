import { Component } from '@angular/core';
import { NavController, ToastController, AlertController, IonicModule } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { FormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';

@Component({
    selector: 'app-perfil-profesional',
    templateUrl: './perfil-profesional.page.html',
    styleUrls: ['./perfil-profesional.page.scss'],
    standalone: true,
    imports: [IonicModule, FormsModule, NgIf]
})
export class PerfilProfesionalPage {

  nombreCompleto: string = '';
  username: string = '';
  rutProfesional: string = '';
  telefonoProfesional: string = '';
  emailProfesional: string = '';

  passwordActual: string = '';
  passwordNueva: string = '';
  passwordConfirmar: string = '';

  constructor(
    private navCtrl: NavController,
    private authService: AuthService,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController
  ) {}

  ionViewDidEnter() {
    this.nombreCompleto = this.authService.getNombreCompleto();
    this.username = this.authService.getUsername();
    this.rutProfesional = localStorage.getItem('rutProfesional') || '';
    this.telefonoProfesional = localStorage.getItem('telefonoProfesional') || '';
    this.emailProfesional = localStorage.getItem('emailProfesional') || '';
    this.passwordActual = '';
    this.passwordNueva = '';
    this.passwordConfirmar = '';
  }

  async guardarDatosProfesionales() {
    if (!this.nombreCompleto || this.nombreCompleto.trim().length < 2) {
      this.mostrarToast('El nombre debe tener al menos 2 caracteres', 'warning');
      return;
    }

    this.authService.cambiarNombre(this.nombreCompleto.trim());

    // Save professional details for ISAPRE PDF
    if (this.rutProfesional.trim()) {
      localStorage.setItem('rutProfesional', this.rutProfesional.trim());
    }
    if (this.telefonoProfesional.trim()) {
      localStorage.setItem('telefonoProfesional', this.telefonoProfesional.trim());
    }
    if (this.emailProfesional.trim()) {
      localStorage.setItem('emailProfesional', this.emailProfesional.trim());
    }

    this.mostrarToast('Datos profesionales guardados', 'success');
  }

  async cambiarPassword() {
    if (!this.passwordActual) {
      this.mostrarToast('Ingresa tu contrasena actual', 'warning');
      return;
    }

    if (!this.passwordNueva || this.passwordNueva.length !== 4 || !/^\d+$/.test(this.passwordNueva)) {
      this.mostrarToast('La nueva contrasena debe ser 4 digitos numericos', 'warning');
      return;
    }

    if (this.passwordNueva !== this.passwordConfirmar) {
      this.mostrarToast('Las contrasenas no coinciden', 'warning');
      return;
    }

    const resultado = this.authService.cambiarPassword(this.passwordActual, this.passwordNueva);
    if (resultado.success) {
      this.mostrarToast(resultado.message, 'success');
      this.passwordActual = '';
      this.passwordNueva = '';
      this.passwordConfirmar = '';
    } else {
      this.mostrarToast(resultado.message, 'danger');
    }
  }

  async cerrarSesion() {
    const alert = await this.alertCtrl.create({
      header: 'Cerrar Sesion',
      message: 'Estas seguro que deseas cerrar sesion?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Cerrar Sesion',
          role: 'destructive',
          handler: () => {
            this.authService.logout();
            this.navCtrl.navigateRoot('/login');
          }
        }
      ]
    });
    await alert.present();
  }

  volver() {
    this.navCtrl.navigateRoot('/dashboard');
  }

  private async mostrarToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      position: 'bottom',
      color
    });
    await toast.present();
  }
}
