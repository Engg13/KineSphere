import { Component, signal, computed, HostListener, OnDestroy } from '@angular/core';
import {
  NavController,
  LoadingController,
  ToastController,
  AlertController,
  IonicModule
} from '@ionic/angular';
import { DatePipe } from '@angular/common';
import { DatabaseService } from '../../services/database.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-pacientes-lista',
  templateUrl: './pacientes-lista.page.html',
  styleUrls: ['./pacientes-lista.page.scss'],
  standalone: true,
  imports: [IonicModule, DatePipe]
})
export class PacientesListaPage implements OnDestroy {

  tituloPagina: string = 'Lista de Pacientes';
  pacientes: any[] = [];
  estaCargando: boolean = false;

  private pacientesSub?: Subscription;

  // 🔎 SEARCH PROFESIONAL
  busqueda = signal('');
  mostrarResultados = signal(false);

  pacientesFiltrados = computed(() => {
    const texto = this.busqueda().toLowerCase().trim();

    if (!texto) return [];

    return this.pacientes.filter(p =>
      (p.nombre || '')
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
    private loadingController: LoadingController,
    private toastController: ToastController,
    private alertController: AlertController
  ) {}

  // ==============================
  // 🔥 REALTIME LOAD
  // ==============================

  ionViewDidEnter() {
    this.estaCargando = true;

    this.pacientesSub = this.databaseService
      .getPacientesRealtime()
      .subscribe({
        next: pacientes => {
          this.pacientes = pacientes;
          this.estaCargando = false;
        },
        error: err => {
          console.error('Error realtime:', err);
          this.estaCargando = false;
          this.mostrarToast('Error cargando pacientes', 'danger');
        }
      });
  }

  ionViewWillLeave() {
    this.pacientesSub?.unsubscribe();
  }

  ngOnDestroy() {
    this.pacientesSub?.unsubscribe();
  }

  async recargarPacientes(event?: any) {
    // En realtime no hace falta recargar,
    // pero lo dejamos para UX pull-to-refresh
    if (event) {
      setTimeout(() => {
        event.target.complete();
      }, 600);
    }
  }

  // ==============================
  // SEARCH
  // ==============================

  seleccionarDesdeBusqueda(paciente: any) {
    this.busqueda.set(paciente.nombre);
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

      for (const paciente of copiaPacientes) {
        await this.databaseService.deletePaciente(paciente.id);
      }

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