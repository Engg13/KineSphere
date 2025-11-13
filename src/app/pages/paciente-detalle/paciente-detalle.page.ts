import { Component } from '@angular/core';
import { NavController } from '@ionic/angular';

@Component({
  selector: 'app-paciente-detalle',
  templateUrl: './paciente-detalle.page.html',
  styleUrls: ['./paciente-detalle.page.scss'],
  standalone: false
})
export class PacienteDetallePage {
  paciente = {
    nombre: 'Juan Pérez',
    edad: 45,
    diagnostico: 'Lumbalgia crónica',
    telefono: '+56912345678',
    fechaIngreso: '2024-10-15',
    evaActual: 4,
    sesionesCompletadas: 3
  };

  historialSesiones = [
    { fecha: '2024-11-10', eva: 6, observaciones: 'Mejoría en movilidad' },
    { fecha: '2024-11-03', eva: 7, observaciones: 'Dolor persistente' }
  ];

  constructor(private navCtrl: NavController) { }

    nuevaSesion() {
    setTimeout(() => {
      this.navCtrl.navigateRoot('/sesion');
    }, 10);
  }

  volverALista() {
    setTimeout(() => {
      this.navCtrl.navigateRoot('/pacientes-lista');
    }, 10);
  }
}