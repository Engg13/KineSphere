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
  estaCargando = true;

  constructor(
    private navCtrl: NavController,
    private pacientesService: PacientesService,
    private tratamientosService: TratamientosService,
    private evolucionesService: EvolucionesService,
    private authService: AuthService
  ) {}

  async ionViewDidEnter() {
    this.usuarioNombre = this.authService.getNombreCompleto();
    await this.cargarDashboard();
  }

  private dashboardCache: {
    pacientes: PacienteDocument[];
    tratamientosActivos: TratamientoDocument[];
    evolucionesHoy: any[];
    evolucionesIniciales: any[];
  } | null = null;

  private async cargarDashboard() {

    if (this.dashboardCache) {
      this.aplicarDatos(this.dashboardCache);
    }

    this.estaCargando = !this.dashboardCache;

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
      console.error('Error cargando dashboard:', error);
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

    this.sesionesHoy = evolucionesHoy.filter(e =>
      e.tipoEvolucion === 'progress'
    ).length;

    const pacientesConInicial = new Set(
      evolucionesIniciales.map(e => e.patientId)
    );

    this.pacientesSinEvaluacion = tratamientosActivos.filter(t =>
      !pacientesConInicial.has(t.patientId)
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


}