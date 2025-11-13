import { Component } from '@angular/core';
import { NavController } from '@ionic/angular';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: false
})
export class DashboardPage {
  // INTERPOLACIÓN: Datos dinámicos para mostrar
  usuarioNombre: string = 'Klgo. Esteban Gomez';
  totalPacientes: number = 8;
  sesionesHoy: number = 3;
  evaluacionesPendientes: number = 2;

  constructor(private navCtrl: NavController) {}

  // MÉTODOS DE NAVEGACIÓN
  irAPacientes() {
    this.navCtrl.navigateRoot('/pacientes-lista');
  }

  irASesion() {
    this.navCtrl.navigateRoot('/sesion');
  }
}