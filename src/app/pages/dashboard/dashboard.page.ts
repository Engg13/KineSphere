import { Component } from '@angular/core';
import { NavController, IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';

import { PacientesService } from '../../services/pacientes.service';
import { TratamientosService } from '../../services/tratamientos.service';
import { EvolucionesService } from '../../services/evoluciones.service';
import { AuthService } from '../../services/auth.service';
import { PacienteDocument } from '../../services/pacientes.service';
import { TratamientoDocument } from '../../services/tratamientos.service';


@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule]
})
export class DashboardPage {

  usuarioNombre = '';
  totalPacientes = 0;
  pacientesActivos = 0;
  tratamientosActivos = 0;
  sesionesHoy = 0;
  pacientesSinEvaluacion = 0;
  pacientesRecientes: PacienteDocument[] = [];
  evaluacionesPendientes = 0;
  user$ = this.authService.user$;
  estaCargando = true;


  constructor(
    private navCtrl: NavController,
    private pacientesService: PacientesService,
    private tratamientosService: TratamientosService,
    private evolucionesService: EvolucionesService,
    private authService: AuthService
  ) {}

  async ionViewDidEnter() {
  await this.cargarDashboard();
}

  private dashboardCache: {
    pacientes: PacienteDocument[];
    tratamientosActivos: TratamientoDocument[];
    evolucionesHoy: any[];
    evolucionesIniciales: any[];
  } | null = null;

  recargarDashboard(event: any) {

    this.dashboardCache = null;

    this.cargarDashboard().then(() => {
      event.target.complete();
    });

  }

  private async cargarDashboard() {

    if (this.dashboardCache) {
      this.aplicarDatos(this.dashboardCache);
      return;
    }

    this.estaCargando = true;

    try {

      console.log('Cargando pacientes...');
      const pacientes = await this.pacientesService.list();
      console.log('PACIENTES OK', pacientes.length);

      console.log('Cargando tratamientos activos...');
      const tratamientosActivos = await this.tratamientosService.listActivos();
      console.log('TRATAMIENTOS OK', tratamientosActivos.length);

      console.log('Cargando evoluciones hoy...');
      const evolucionesHoy = await this.evolucionesService.listHoy();
      console.log('EVOLUCIONES HOY OK', evolucionesHoy.length);

      console.log('Cargando evoluciones iniciales...');
      const evolucionesIniciales = await this.evolucionesService.listIniciales();
      console.log('EVOLUCIONES INICIALES OK', evolucionesIniciales.length);

      const nuevosDatos = {
        pacientes,
        tratamientosActivos,
        evolucionesHoy,
        evolucionesIniciales
      };

      this.dashboardCache = nuevosDatos;
      this.aplicarDatos(nuevosDatos);

    } catch (error) {
      console.error('ERROR DASHBOARD:', error);
    } finally {
      this.estaCargando = false;
    }
  }

  private aplicarDatos(data: {
    pacientes: PacienteDocument[];
    tratamientosActivos: TratamientoDocument[];
    evolucionesHoy: any[];
    evolucionesIniciales: any[];
    
  }) {

    const { pacientes, tratamientosActivos, evolucionesHoy, evolucionesIniciales } = data;

    this.totalPacientes = pacientes.length;
    this.pacientesActivos = pacientes.filter(p => p.activo === true).length;
    this.tratamientosActivos = tratamientosActivos.length;

    const pacientesConInicial = new Set(
      evolucionesIniciales
        .filter(e => e.patientId)
        .map(e => e.patientId)
    );

    this.pacientesSinEvaluacion = tratamientosActivos.filter(t =>
      !pacientesConInicial.has(t.patientId)
    ).length;

    this.evaluacionesPendientes = this.pacientesSinEvaluacion;

    this.sesionesHoy = evolucionesHoy.filter(e =>
      e.tipoEvolucion === 'progress'
    ).length;

    

    this.pacientesRecientes = [...pacientes]
      .sort((a, b) =>
        (b.createdAt?.toMillis?.() ?? 0) -
        (a.createdAt?.toMillis?.() ?? 0)
      )
      .slice(0, 5);
  }

  // NAV

  irAPacientes() {
    this.navCtrl.navigateRoot('/pacientes-lista');
  }

  agregarPaciente() {
    this.navCtrl.navigateRoot('/agregar-paciente');
  }

  verDetallePaciente(paciente: PacienteDocument) {
    this.navCtrl.navigateRoot('/paciente-detalle', {
      queryParams: { pacienteId: paciente.id }
    });
  }

  irAPerfil() {
  this.navCtrl.navigateRoot('/perfil-profesional');
  }

  irASesion() {
  this.navCtrl.navigateRoot('/sesion');
  }

  irAEvaluaciones() {
  this.navCtrl.navigateRoot('/evaluacion-final');
  }

  irAPlantillas() {

    this.navCtrl.navigateForward('/rutinas-templates');

  }

  irAEvaluacionesClinicas() {
  this.navCtrl.navigateRoot('/tests-config');
  }


}