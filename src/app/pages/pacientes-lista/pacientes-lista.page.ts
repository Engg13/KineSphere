import { Component } from '@angular/core';
import { NavController, LoadingController, ToastController, AlertController } from '@ionic/angular';
import { DatabaseService } from '../../services/database.service';
import { PlatformService } from '../../services/platform.service';

@Component({
  selector: 'app-pacientes-lista',
  templateUrl: './pacientes-lista.page.html',
  styleUrls: ['./pacientes-lista.page.scss'],
  standalone: false
})
export class PacientesListaPage {
  tituloPagina: string = 'Lista de Pacientes';
  pacientes: any[] = [];
  estaCargando: boolean = false;
  plataformaInfo: any;

  constructor(
    private navCtrl: NavController,
    private databaseService: DatabaseService,
    private platformService: PlatformService,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    this.plataformaInfo = this.platformService.getDebugInfo();
  }

  ionViewDidEnter() {
    this.cargarPacientes();
  }

  async cargarPacientes() {
    this.estaCargando = true;

    try {
      // Siempre usar DatabaseService: maneja localStorage (web) y SQLite (nativo)
      this.pacientes = await this.databaseService.getPacientesConConteoSesiones();
      console.log(`📊 ${this.pacientes.length} pacientes cargados`);
    } catch (error) {
      console.error('❌ Error cargando pacientes:', error);
      this.pacientes = [];
      this.mostrarToast('Error cargando pacientes', 'danger');
    } finally {
      this.estaCargando = false;
    }
  }

  async recargarPacientes(event?: any) {
    await this.cargarPacientes();
    if (event) {
      event.target.complete();
    }
  }

  get totalPacientes(): number {
    return this.pacientes.length;
  }

  get pacientesActivos(): number {
    return this.pacientes.filter(p => p.activo).length;
  }

  agregarPaciente() {
    console.log('Navegando a agregar paciente...');
    this.navCtrl.navigateRoot('/agregar-paciente');
  }

  verDetallePaciente(paciente: any) {
    console.log('👤 Ver detalle del paciente:', paciente);
    console.log('🆔 ID del paciente:', paciente.id);
    console.log('📊 Número de sesiones:', paciente.num_sesiones || 0);

    // Pasar ID por localStorage (Ionic cachea páginas y query params pueden ser stale)
    localStorage.setItem('ver_paciente_id', String(paciente.id));
    this.navCtrl.navigateRoot('/paciente-detalle');
  }

  volverAlDashboard() {
    this.navCtrl.navigateRoot('/dashboard');
  }

  // BORRAR TODOS LOS PACIENTES
  async borrarTodosLosPacientes() {
    const alert = await this.alertController.create({
      header: '⚠️ Confirmar Eliminación',
      message: '¿Estás seguro de que quieres eliminar todos los pacientes? Esta acción no se puede deshacer.',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          cssClass: 'secondary'
        },
        {
          text: 'Sí, Eliminar Todo',
          role: 'destructive',
          handler: () => {
            this.confirmarBorradoCompleto();
          }
        }
      ]
    });

    await alert.present();
  }

  // CONFIRMAR Y EJECUTAR BORRADO
  private async confirmarBorradoCompleto() {
    const loading = await this.loadingController.create({
      message: 'Eliminando todos los pacientes...'
    });

    await loading.present();

    try {
      const todosLosPacientes = [...this.pacientes];
      let eliminadosExitosos = 0;

      // Eliminar uno por uno de Firestore/localStorage
      for (const paciente of todosLosPacientes) {
        try {
          await this.databaseService.deletePaciente(paciente.id);
          eliminadosExitosos++;
        } catch (error) {
          console.error(`Error eliminando paciente ${paciente.id}:`, error);
        }
      }

      // Limpiar también todo localStorage por seguridad
      await this.databaseService.clearAllData();

      this.pacientes = [];
      await loading.dismiss();

      if (eliminadosExitosos > 0) {
        this.mostrarToast(`${eliminadosExitosos} pacientes eliminados exitosamente`, 'success');
      } else {
        this.mostrarToast('Datos limpiados', 'success');
      }

    } catch (error) {
      console.error('Error en borrado completo:', error);
      await loading.dismiss();
      this.mostrarToast('Error eliminando pacientes', 'danger');
    }
  }

  // ✅ MOSTRAR TOAST
  async mostrarToast(mensaje: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 3000,
      color: color,
      position: 'bottom'
    });
    await toast.present();
  }
}