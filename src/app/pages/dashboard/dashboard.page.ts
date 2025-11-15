import { Component, OnInit } from '@angular/core';
import { NavController } from '@ionic/angular';
import { DatabaseService } from '../../services/database.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: false
})
export class DashboardPage implements OnInit {
  usuarioNombre: string = 'Klgo. Esteban Gomez';
  totalPacientes: number = 0;
  sesionesHoy: number = 0;
  evaluacionesPendientes: number = 0;

  pacientesRecientes: any[] = [];

  constructor(
    private navCtrl: NavController,
    private databaseService: DatabaseService
  ) {}

  ngOnInit() {
    this.cargarDatosDashboard();
  }

  ionViewDidEnter() {
    this.cargarDatosDashboard();
  }

  cargarDatosDashboard() {
    // Cargar estadísticas
    this.databaseService.getEstadisticas().then(estadisticas => {
      this.totalPacientes = estadisticas.totalPacientes;
      this.sesionesHoy = estadisticas.sesionesHoy;
      this.evaluacionesPendientes = estadisticas.totalEvaluaciones;
    }).catch(error => {
      console.log('Error cargando estadísticas:', error);
    });

    // Cargar pacientes recientes
    this.databaseService.getPacientes().then(pacientes => {
      this.pacientesRecientes = pacientes.slice(0, 5);
    }).catch(error => {
      console.log('Error cargando pacientes:', error);
    });
  }

  // MÉTODOS DE NAVEGACIÓN
  irAPacientes() {
    this.navCtrl.navigateRoot('/pacientes-lista');
  }

  irASesion() {
    this.navCtrl.navigateRoot('/sesion');
  }

  irAEvaluaciones() {
    this.navCtrl.navigateRoot('/evaluacion-final');
  }

  irAEjercicios() {
    this.navCtrl.navigateRoot('/ejercicios');
  }

  verDetallePaciente(paciente: any) {
    // Navegar al detalle del paciente
    this.navCtrl.navigateForward('/paciente-detalle', {
      queryParams: { id: paciente.id }
    });
  }
}