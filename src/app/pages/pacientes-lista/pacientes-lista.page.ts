import { Component, signal, computed, HostListener, OnDestroy } from '@angular/core';
import {
  NavController,
  LoadingController,
  ToastController,
  AlertController,
  IonicModule
} from '@ionic/angular';
import { DatePipe } from '@angular/common';
import { PacientesService } from '../../services/pacientes.service';
import { PacienteDocument } from '../../services/pacientes.service';

@Component({
  selector: 'app-pacientes-lista',
  templateUrl: './pacientes-lista.page.html',
  styleUrls: ['./pacientes-lista.page.scss'],
  standalone: true,
  imports: [IonicModule, DatePipe]
})
export class PacientesListaPage {

  tituloPagina = 'Lista de Pacientes';
  pacientes: PacienteDocument[] = [];
  estaCargando = false;


  // 🔎 SEARCH PROFESIONAL
  busqueda = signal('');
  mostrarResultados = signal(false);

  pacientesFiltrados = computed(() => {
    const texto = this.busqueda().toLowerCase().trim();

    if (!texto) return [];

      return this.pacientes.filter(p =>
      (p.nombre ?? '').toLowerCase().includes(texto) ||
      (p.rut ?? '').toLowerCase().includes(texto)
    );
  });

  constructor(
    private navCtrl: NavController,
    private pacientesService: PacientesService,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private alertController: AlertController
  ) {}

  // ==============================
  // 🔥 REALTIME LOAD
  // ==============================

  private async cargarPacientes() {
    try {
      this.pacientes = await this.pacientesService.list();
    } catch (error) {
      console.error('Error cargando pacientes:', error);
      this.mostrarToast('Error cargando pacientes', 'danger');
    }
  }

  async ionViewDidEnter() {
    this.estaCargando = true;
    await this.cargarPacientes();
    this.estaCargando = false;
  }

  async recargarPacientes(event?: any) {
    await this.cargarPacientes();

    if (event) {
      event.target.complete();
    }
  }

  // ==============================
  // SEARCH
  // ==============================

  seleccionarDesdeBusqueda(paciente: PacienteDocument) {
    this.busqueda.set(paciente.nombre ?? '');
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

  verDetallePaciente(paciente: PacienteDocument) {
    if (!paciente?.id) return;

    this.navCtrl.navigateRoot('/paciente-detalle', {
      queryParams: { pacienteId: paciente.id }
    });
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
      message: '¿Eliminar todos los pacientes? Esta acción no se puede deshacer.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
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

      await Promise.all(
        copiaPacientes.map(p => this.pacientesService.softDelete(p.id))
      );

      await loading.dismiss();
      this.mostrarToast('Pacientes eliminados correctamente', 'success');

    } catch (error) {
      console.error('Error eliminando pacientes:', error);
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
      color,
      position: 'bottom'
    });

    await toast.present();
  }
}