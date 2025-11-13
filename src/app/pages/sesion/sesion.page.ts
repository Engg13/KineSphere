import { Component } from '@angular/core';
import { NavController } from '@ionic/angular'; // ← AGREGAR ESTE IMPORT

@Component({
  selector: 'app-sesion',
  templateUrl: './sesion.page.html',
  styleUrls: ['./sesion.page.scss'],
  standalone: false
})
export class SesionPage {
  // INTERPOLACIÓN: Datos de la sesión
  pacienteNombre: string = 'Juan Pérez';
  numeroSesion: number = 4;
  
  // Formulario
  eva: number = 0;
  observaciones: string = '';
  ejerciciosRealizados: boolean = true;
  sueno: string = 'bueno';

  constructor(private navCtrl: NavController) {} // ← YA ESTÁ BIEN

  guardarSesion() {
    alert(`Sesión ${this.numeroSesion} guardada para ${this.pacienteNombre}`);
    // Aquí iría la lógica para guardar
  }

  // AGREGAR MÉTODOS DE NAVEGACIÓN
  volverAPaciente() {
    this.navCtrl.navigateRoot('/paciente-detalle');
  }

  volverAlDashboard() {
    this.navCtrl.navigateRoot('/dashboard');
  }
}