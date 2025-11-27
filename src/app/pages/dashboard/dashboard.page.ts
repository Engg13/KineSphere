import { Component, OnInit } from '@angular/core';
import { NavController } from '@ionic/angular';
import { DatabaseService } from '../../services/database.service';
import { JsonServerService } from '../../services/json-server.service';
import { firstValueFrom } from 'rxjs';
import { PlatformService } from '../../services/platform.service';

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
  estaCargando: boolean = false;
  plataformaUsada: string = '';
  pacientesActivos: number = 0; 

  constructor(
    private navCtrl: NavController,
    private databaseService: DatabaseService,
    private jsonServerService: JsonServerService,
    private platformService: PlatformService
  ) {}

  ngOnInit() {
    console.log('🎯 KineSphere DEBUG: ngOnInit ejecutado');
    this.cargarDatosDashboard();
  }

  ionViewDidEnter() {
    console.log('🎯 KineSphere DEBUG: ionViewDidEnter - Dashboard visible');
    this.cargarDatosDashboard();
  }

  async cargarDatosDashboard() {
    // ✅ USAR INFORMACIÓN DE PLATAFORMA
    const platformInfo = this.platformService.getDebugInfo();
    this.plataformaUsada = platformInfo.descripcion;
    
    console.log('🎯 Dashboard usando plataforma:', platformInfo);

    if (this.platformService.shouldUseSQLite()) {
      console.log('📱 Cargando dashboard desde SQLite');
      await this.cargarDesdeSQLite();
    } else {
      console.log('🌐 Cargando dashboard desde JSON Server');
      await this.cargarDesdeJsonServer();
    }
  }

  // ✅ MÉTODOS DE CARGA ESPECÍFICOS (FALTABAN)
  private async cargarDesdeJsonServer() {
    try {
      const pacientes = await firstValueFrom(this.jsonServerService.getPacientes());
      
      if (pacientes && pacientes.length > 0) {
        this.actualizarContadores(pacientes);
        
        this.pacientesRecientes = pacientes
          .sort((a: any, b: any) => new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime())
          .slice(0, 5);
      } else {
        this.reiniciarContadores();
      }
    } catch (error) {
      console.error('❌ Error cargando desde JSON Server:', error);
      throw new Error('JSON Server no disponible');
    }
  }

  private async cargarDesdeSQLite() {
    try {
      const pacientes = await this.databaseService.getPacientes();
      
      if (pacientes && pacientes.length > 0) {
        this.actualizarContadores(pacientes);
        this.pacientesRecientes = pacientes.slice(0, 5);
      } else {
        this.reiniciarContadores();
      }
    } catch (error) {
      console.error('❌ Error cargando desde SQLite:', error);
      throw new Error('SQLite no disponible');
    }
  }

  private actualizarContadores(pacientes: any[]) {
    this.totalPacientes = pacientes.length;
    this.pacientesActivos = pacientes.filter(p => p.activo).length;
    this.sesionesHoy = this.calcularSesionesHoy(pacientes);
    this.evaluacionesPendientes = this.calcularEvaluacionesPendientes(pacientes);
    
    console.log(`📈 KineSphere: Resumen - Pacientes: ${this.totalPacientes}, Activos: ${this.pacientesActivos}, Sesiones Hoy: ${this.sesionesHoy}, Evaluaciones: ${this.evaluacionesPendientes}`);
  }

  private reiniciarContadores() {
    this.totalPacientes = 0;
    this.pacientesActivos = 0;
    this.sesionesHoy = 0;
    this.evaluacionesPendientes = 0;
    this.pacientesRecientes = [];
  }

  private calcularSesionesHoy(pacientes: any[]): number {
    const hoy = new Date().toDateString();
    return pacientes.filter(paciente => {
      if (paciente.ultimaSesion) {
        const fechaSesion = new Date(paciente.ultimaSesion).toDateString();
        return fechaSesion === hoy;
      }
      return false;
    }).length;
  }

  private calcularEvaluacionesPendientes(pacientes: any[]): number {
    return pacientes.filter(paciente => 
      paciente.necesitaEvaluacion && !paciente.evaluacionCompletada
    ).length;
  }

  async recargarDashboard(event?: any) {
    console.log('🔄 KineSphere: Recargando dashboard manualmente');
    await this.cargarDatosDashboard();
    
    if (event) {
      event.target.complete();
    }
  }

  // MÉTODOS DE NAVEGACIÓN
  irAPacientes() {
    console.log('🧭 KineSphere: Navegando a lista de pacientes');
    this.navCtrl.navigateRoot('/pacientes-lista');
  }

  irASesion() {
    console.log('🧭 KineSphere: Navegando a nueva sesión');
    this.navCtrl.navigateRoot('/sesion');
  }

  irAEvaluaciones() {
    console.log('🧭 KineSphere: Navegando a evaluaciones');
    this.navCtrl.navigateRoot('/evaluacion-final');
  }

  irAEjercicios() {
    console.log('🧭 KineSphere: Navegando a ejercicios');
    this.navCtrl.navigateRoot('/ejercicios');
  }

  verDetallePaciente(paciente: any) {
    console.log('👤 KineSphere: Viendo detalle del paciente:', paciente);
    console.log('🆔 ID del paciente:', paciente.id);
    console.log('📝 Datos completos del paciente:', JSON.stringify(paciente, null, 2));
    
    this.navCtrl.navigateRoot('/paciente-detalle', {
      queryParams: { id: paciente.id }
    });
  }

  crearSesionParaPaciente(paciente: any) {
    console.log('🧭 KineSphere: Creando sesión para paciente:', paciente.nombre);
    this.navCtrl.navigateForward('/sesion', {
      queryParams: { pacienteId: paciente.id, pacienteNombre: paciente.nombre }
    });
  }

  agregarPaciente() {
    this.navCtrl.navigateRoot('/agregar-paciente');
  }
} // ✅ CIERRE DE CLASE AÑADIDO