import { Component } from '@angular/core';
import { NavController } from '@ionic/angular';

@Component({
  selector: 'app-pacientes-lista',
  templateUrl: './pacientes-lista.page.html',
  styleUrls: ['./pacientes-lista.page.scss'],
  standalone: false
})
export class PacientesListaPage {
  // INTERPOLACIÓN: Título dinámico
  tituloPagina: string = 'Lista de Pacientes';
  
  // DATOS PARA *ngFor
  pacientes: any[] = [
    { 
      id: 1, 
      nombre: 'Juan Pérez', 
      diagnostico: 'Lumbalgia crónica', 
      sesiones: 3,
      eva: 4,
      activo: true,
      proximaSesion: '2024-11-15'
    },
    { 
      id: 2, 
      nombre: 'María González', 
      diagnostico: 'Artrosis rodilla', 
      sesiones: 1,
      eva: 7,
      activo: true,
      proximaSesion: '2024-11-16'
    },
    { 
      id: 3, 
      nombre: 'Carlos López', 
      diagnostico: 'Esguince tobillo', 
      sesiones: 5,
      eva: 3,
      activo: false,
      proximaSesion: '2024-11-14'
    },
    { 
      id: 4, 
      nombre: 'Ana Silva', 
      diagnostico: 'Cervicalgia', 
      sesiones: 2,
      eva: 5,
      activo: true,
      proximaSesion: '2024-11-17'
    }
  ];

  // INTERPOLACIÓN: Contador dinámico
  get totalPacientes(): number {
    return this.pacientes.length;
  }

  get pacientesActivos(): number {
    return this.pacientes.filter(p => p.activo).length;
  }

  constructor(private navCtrl: NavController) {}

  
  verDetallePaciente(paciente: any) {
    // Usar navigateRoot con un pequeño delay
    setTimeout(() => {
      this.navCtrl.navigateRoot('/paciente-detalle');
    }, 10);
  }

  volverAlDashboard() {
    setTimeout(() => {
      this.navCtrl.navigateRoot('/dashboard');
    }, 10);
  }
}