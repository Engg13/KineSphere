import { Component } from '@angular/core';
import { NavController, IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';

import { PacientesService } from '../../services/pacientes.service';
import { TratamientosService } from '../../services/tratamientos.service';
import { EvolucionesService } from '../../services/evoluciones.service';
import { AuthService } from '../../services/auth.service';
import { PacienteDocument } from '../../services/pacientes.service';
import { TratamientoDocument } from '../../services/tratamientos.service';
import { Router } from '@angular/router';


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
    private authService: AuthService,
    private router: Router
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

      const [
        pacientes,
        tratamientosActivos,
        evolucionesHoy,
        evolucionesIniciales
      ] = await Promise.all([
        this.pacientesService.list(),
        this.tratamientosService.listActivos(),
        this.evolucionesService.listHoy(),
        this.evolucionesService.listIniciales()
      ]);

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
      queryParams: { patientId: paciente.id }
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

    (document.activeElement as HTMLElement)?.blur();

    this.navCtrl.navigateRoot('/rutinas-templates').then(r => {
      console.log('NAVIGATION RESULT', r);
    });

  }

  irAEvaluacionesClinicas() {
    this.navCtrl.navigateRoot('/tests-config');
  }
}