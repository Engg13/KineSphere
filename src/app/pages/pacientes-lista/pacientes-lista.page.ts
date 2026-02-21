import { Component, signal, computed, HostListener } from '@angular/core';
import {
  NavController,
  LoadingController,
  ToastController,
  AlertController,
  IonicModule
} from '@ionic/angular';
import { DatePipe } from '@angular/common';
import { DatabaseService } from '../../services/database.service';
import { PlatformService } from '../../services/platform.service';

@Component({
  selector: 'app-pacientes-lista',
  templateUrl: './pacientes-lista.page.html',
  styleUrls: ['./pacientes-lista.page.scss'],
  standalone: true,
  imports: [IonicModule, DatePipe]
})
export class PacientesListaPage {

  tituloPagina: string = 'Lista de Pacientes';
  pacientes: any[] = [];
  estaCargando: boolean = false;
  plataformaInfo: any;

  // 🔎 SEARCH PROFESIONAL
  busqueda = signal('');
  mostrarResultados = signal(false);

  pacientesFiltrados = computed(() => {
    const texto = this.busqueda().toLowerCase().trim();

    if (!texto) return [];

    return this.pacientes.filter(p =>
      (p.nombre || p.nombre_completo || '')
        .toLowerCase()
        .includes(texto)
      ||
      (p.rut || '')
        .toLowerCase()
        .includes(texto)
    );
  });

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

  // ==============================
  // CARGAR PACIENTES
  // ==============================

  async cargarPacientes() {
    this.estaCargando = true;

    try {
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

  // ==============================
  // SEARCH SELECCIÓN
  // ==============================

  seleccionarDesdeBusqueda(paciente: any) {
    this.busqueda.set(paciente.nombre || paciente.nombre_completo);
    this.mostrarResultados.set(false);
    this.verDetallePaciente(paciente);
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.search-container')) {
      this.mostrarResultados.set(false);
    }
  }

  // ==============================
  // MÉTRICAS
  // ==============================

  get totalPacientes(): number {
    return this.pacientes.length;
  }

  get pacientesActivos(): number {
    return this.pacientes.filter(p => p.activo).length;
  }

  // ==============================
  // NAVEGACIÓN
  // ==============================

  agregarPaciente() {
    this.navCtrl.navigateRoot('/agregar-paciente');
  }

  verDetallePaciente(paciente: any) {
    localStorage.setItem('ver_paciente_id', String(paciente.id));
    this.navCtrl.navigateRoot('/paciente-detalle');
  }

  volverAlDashboard() {
    this.navCtrl.navigateRoot('/dashboard');
  }

  // ==============================
  // BORRADO MASIVO
  // ==============================

  async borrarTodosLosPacientes() {
    const alert = await this.alertController.create({
      header: '⚠️ Confirmar Eliminación',
      message: '¿Estás seguro de que quieres eliminar todos los pacientes? Esta acción no se puede deshacer.',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Sí, Eliminar Todo',
          role: 'destructive',
          handler: () => this.confirmarBorradoCompleto()
        }
      ]
    });

    await alert.present();
  }

  private async confirmarBorradoCompleto() {
    const loading = await this.loadingController.create({
      message: 'Eliminando pacientes...'
    });

    await loading.present();

    try {
      const copiaPacientes = [...this.pacientes];

      for (const paciente of copiaPacientes) {
        await this.databaseService.deletePaciente(paciente.id);
      }

      await this.databaseService.clearAllData();
      this.pacientes = [];

      await loading.dismiss();
      this.mostrarToast('Pacientes eliminados correctamente', 'success');

    } catch (error) {
      console.error('❌ Error eliminando pacientes:', error);
      await loading.dismiss();
      this.mostrarToast('Error eliminando pacientes', 'danger');
    }
  }

  // ==============================
  // TOAST
  // ==============================

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