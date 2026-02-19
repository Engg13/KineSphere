import { Component, OnInit, ViewChild, ElementRef, ViewChildren, QueryList } from '@angular/core';
import { NavController, AnimationController, ToastController } from '@ionic/angular';
import { DatabaseService } from '../../services/database.service';
import { JsonServerService } from '../../services/json-server.service';
import { firstValueFrom } from 'rxjs';
import { PlatformService } from '../../services/platform.service';
import { BackupService } from '../../services/backup.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: false
})
export class DashboardPage implements OnInit {

  @ViewChildren('dashboardCard', { read: ElementRef }) dashboardCards!: QueryList<ElementRef>;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  usuarioNombre: string = 'Klgo. Esteban Gomez';
  totalPacientes: number = 0;
  sesionesHoy: number = 0;
  evaluacionesPendientes: number = 0;
  pacientesRecientes: any[] = [];
  estaCargando: boolean = false;
  plataformaUsada: string = '';
  pacientesActivos: number = 0;
  backupStats: { pacientes: number; sesiones: number; documentos: number } = {
    pacientes: 0, sesiones: 0, documentos: 0
  };

  constructor(
    private navCtrl: NavController,
    private databaseService: DatabaseService,
    private jsonServerService: JsonServerService,
    private platformService: PlatformService,
    private animationCtrl: AnimationController,
    private backupService: BackupService,
    private toastCtrl: ToastController,
    private authService: AuthService
  ) {}

  ngOnInit() {}

  ionViewDidEnter() {
    this.usuarioNombre = this.authService.getNombreCompleto();
    this.cargarDatosDashboard();
    this.actualizarBackupStats();
  }

  actualizarBackupStats() {
    this.backupStats = this.backupService.obtenerEstadisticasLocales();
  }

  async cargarDatosDashboard() {
    this.estaCargando = true;

    const platformInfo = this.platformService.getDebugInfo();
    this.plataformaUsada = platformInfo.descripcion;

    try {
      // Siempre usar DatabaseService: maneja localStorage (web) y SQLite (nativo)
      const pacientes = await this.databaseService.getPacientes();

      if (pacientes && pacientes.length > 0) {
        this.actualizarContadores(pacientes);
        this.pacientesRecientes = [...pacientes]
          .sort((a: any, b: any) => {
            const fechaA = a.fechaCreacion || a.fecha_creacion || '';
            const fechaB = b.fechaCreacion || b.fecha_creacion || '';
            return new Date(fechaB).getTime() - new Date(fechaA).getTime();
          })
          .slice(0, 5);
      } else {
        this.reiniciarContadores();
      }
    } catch (error) {
      console.error('Error cargando dashboard:', error);
      this.reiniciarContadores();
    } finally {
      this.estaCargando = false;
    }
  }

  private actualizarContadores(pacientes: any[]) {
    this.totalPacientes = pacientes.length;
    this.pacientesActivos = pacientes.filter(p => p.activo).length;
    this.sesionesHoy = this.calcularSesionesHoy(pacientes);
    this.evaluacionesPendientes = this.calcularEvaluacionesPendientes(pacientes);
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
    await this.cargarDatosDashboard();
    this.actualizarBackupStats();
    if (event) {
      event.target.complete();
    }
  }

  // BACKUP METHODS
  async exportarBackup() {
    const result = await this.backupService.exportarDatos();
    const toast = await this.toastCtrl.create({
      message: result.message,
      duration: 3000,
      position: 'bottom',
      color: result.success ? 'success' : 'danger'
    });
    await toast.present();
  }

  triggerImport() {
    this.fileInput.nativeElement.click();
  }

  async onFileSelected(event: any) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const jsonString = await this.backupService.leerArchivoWeb(file);
      const result = await this.backupService.importarDatos(jsonString);

      const toast = await this.toastCtrl.create({
        message: result.message,
        duration: 3000,
        position: 'bottom',
        color: result.success ? 'success' : 'danger'
      });
      await toast.present();

      if (result.success) {
        await this.cargarDatosDashboard();
        this.actualizarBackupStats();
      }
    } catch (error) {
      const toast = await this.toastCtrl.create({
        message: 'Error al leer el archivo',
        duration: 3000,
        position: 'bottom',
        color: 'danger'
      });
      await toast.present();
    }

    // Reset file input
    this.fileInput.nativeElement.value = '';
  }

  // NAVIGATION
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
    this.navCtrl.navigateRoot('/paciente-detalle', {
      queryParams: { id: paciente.id }
    });
  }

  crearSesionParaPaciente(paciente: any) {
    this.navCtrl.navigateRoot('/sesion', {
      queryParams: { pacienteId: paciente.id, pacienteNombre: paciente.nombre }
    });
  }

  irATests() {
    this.navCtrl.navigateRoot('/tests-config');
  }

  agregarPaciente() {
    this.navCtrl.navigateRoot('/agregar-paciente');
  }

  irAPerfil() {
    this.navCtrl.navigateRoot('/perfil-profesional');
  }
}
