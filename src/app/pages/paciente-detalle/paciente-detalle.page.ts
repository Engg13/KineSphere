import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AlertController, NavController, IonicModule, ModalController } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { PacientesService } from '../../services/pacientes.service';
import { EvolucionesService } from '../../services/evoluciones.service';
import { EvolucionPage } from '../evolucion/evolucion.page';
import { Subscription } from 'rxjs';
import { FlujoClinicoService } from 'src/app/services/flujoclinico.service';
import { Rutina } from '../../models/rutina.model';
import { RutinasService } from '../../services/rutinas.service';
import { RutinaActivaComponent } from '../../components/rutina-activa/rutina-activa.component';
import { RutinasSesionesService } from '../../services/rutinas-sesiones.service';
import { EvolucionViewerComponent } from '../../components/evolucion-viewer/evolucion-viewer.component';
import { EvolucionDocument } from '../../services/evoluciones.service';
import { TreatmentProgressComponent } from 'src/app/components/treatment-progress/treatment-progress.component';

interface TratamientoHistorial {
  treatmentId: string
  sesiones: EvolucionDocument[]
  expandido: boolean
  activo: boolean
  fechaInicio?: any
  diagnostico?: string
}
@Component({
  selector: 'app-paciente-detalle',
  templateUrl: './paciente-detalle.page.html',
  styleUrls: ['./paciente-detalle.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, RutinaActivaComponent, TreatmentProgressComponent]
})
export class PacienteDetallePage implements OnDestroy {

  paciente: any = null;
  estaCargando: boolean = true;
  historialSesiones: any[] = [];
  rutinasCompletadas: Rutina[] = [];
  rutinasDomiciliarias: Rutina[] = [];
  sesionesExpandidas: Set<string | number> = new Set();
  pacienteId: string = '';
  fechaActual = new Date();
  esAdmin: boolean = false;
  historialVisual: any[] = [];
  tratamientoActivo: any | null = null;
  rutinaClinicaActiva: Rutina | null = null;
  rutinaDomiciliariaActiva: Rutina | null = null;
  tabActual: 'info' | 'sesiones' | 'rutinas' = 'info';
  adherenciaDomiciliaria: number | null = null;
  sesionesDomiciliarias: any[] = [];
  rutinaAbiertaId: string | null = null;
  tratamientosHistorial: TratamientoHistorial[] = [];

  private rutinasSub?: Subscription;
  private evolucionesSub?: Subscription;
  private rutinaClinicaSub?: Subscription;
  private rutinaDomiciliariaSub?: Subscription;
  private adherenciaSub?: Subscription;


  constructor(
    private navCtrl: NavController,
    private route: ActivatedRoute,
    private pacientesService: PacientesService,
    private evolucionesService: EvolucionesService,
    private alertCtrl: AlertController,
    private flujoClinicoService: FlujoClinicoService,
    private rutinasService: RutinasService,
    private rutinasSesionesService: RutinasSesionesService,
    private modalCtrl: ModalController
  ) {}

  // ==============================
  // CICLO DE VIDA
  // ==============================

  async ionViewDidEnter() {

    const queryId =
      this.route.snapshot.queryParamMap.get('pacienteId') ||
      this.route.snapshot.queryParamMap.get('id');
      const tab = this.route.snapshot.queryParamMap.get('tab');

    if (tab === 'rutinas') {
      this.tabActual = 'rutinas';
    }

    if (queryId) {
      this.pacienteId = queryId;
    }

    if (this.pacienteId) {

      this.cancelarSuscripciones();

      await this.cargarPaciente(this.pacienteId);

      this.tratamientoActivo =
        await this.flujoClinicoService.getTratamientoActivo(this.pacienteId);

    } else {

      this.estaCargando = false;

    }

  }

  ionViewWillLeave() {
    this.cancelarSuscripciones();
  }

  ngOnDestroy() {
    this.cancelarSuscripciones();
  }

  private cancelarSuscripciones() {
    if (this.rutinasSub) {
      this.rutinasSub.unsubscribe();
      this.rutinasSub = undefined;
    }

    if (this.adherenciaSub) {
      this.adherenciaSub.unsubscribe();
      this.adherenciaSub = undefined;
    }

    if (this.evolucionesSub) {
      this.evolucionesSub.unsubscribe();
      this.evolucionesSub = undefined;
    }

    if (this.rutinaClinicaSub) {
      this.rutinaClinicaSub.unsubscribe();
      this.rutinaClinicaSub = undefined;
    }

    if (this.rutinaDomiciliariaSub) {
      this.rutinaDomiciliariaSub.unsubscribe();
      this.rutinaDomiciliariaSub = undefined;
    }
  }

  // ==============================
  // CARGA PACIENTE
  // ==============================

  private async cargarPaciente(id: string) {
  this.estaCargando = true;

  try {

    const paciente = await this.pacientesService.getById(id);

    if (paciente) {

      this.paciente = paciente;

      this.verificarYCorregirEdad();

      const pacienteIdReal = paciente.id;

      this.cargarHistorialSesiones(pacienteIdReal);
      this.cargarRutinasCompletadas(pacienteIdReal);
      this.cargarRutinasActivas(pacienteIdReal);
      this.cargarSesionesDomiciliarias(pacienteIdReal);

    } else {
      this.paciente = null;
    }

  } catch (error) {
    console.error('Error cargando paciente:', error);
    this.paciente = null;
  } finally {
    this.estaCargando = false;
  }
}
  // ==============================
  // RUTINAS (REALTIME)
  // ==============================

  private cargarRutinasCompletadas(pacienteId: string) {

    if (this.rutinasSub) {
      this.rutinasSub.unsubscribe();
    }

    this.rutinasSub = this.rutinasService
      .getRutinasPaciente(pacienteId)
      .subscribe({
        next: (rutinas: Rutina[]) => {

          const rutinasCerradas = rutinas
            .filter(r => r.estado === 'cerrada')
            .sort((a, b) => {

              const fechaA = a.createdAt instanceof Date
                ? a.createdAt.getTime()
                : (a.createdAt as any)?.toDate?.().getTime() || 0;

              const fechaB = b.createdAt instanceof Date
                ? b.createdAt.getTime()
                : (b.createdAt as any)?.toDate?.().getTime() || 0;

              return fechaB - fechaA;

            });

          // 🏋 Rutinas clínicas realizadas
          this.rutinasCompletadas = rutinasCerradas
            .filter(r => r.tipoRutina === 'clinica');

          // 🏠 Rutinas domiciliarias realizadas
          this.rutinasDomiciliarias = rutinasCerradas
            .filter(r => r.tipoRutina === 'domiciliaria');

        },
        error: (error) => {
          console.error('Error cargando rutinas:', error);
          this.rutinasCompletadas = [];
          this.rutinasDomiciliarias = [];
        }
      });

  }

  // ==============================
  // HISTORIAL SESIONES
  // ==============================

  private cargarHistorialSesiones(pacienteId: string) {

    if (this.evolucionesSub) {
      this.evolucionesSub.unsubscribe();
    }

    this.evolucionesSub = this.evolucionesService
      .getEvolucionesByPacienteRealtime(pacienteId)
      .subscribe({
        next: (evoluciones) => {

          this.historialSesiones = evoluciones || [];

          // Agrupar por tratamiento
          this.agruparSesionesPorTratamiento();

        },
        error: (error) => {
          console.error('Error cargando historial:', error);
          this.historialSesiones = [];
          this.tratamientosHistorial = [];
        }
      });

}

  // ==============================
  // EDAD
  // ==============================

  private verificarYCorregirEdad() {
    if (!this.paciente) return;

    if (this.paciente.edad && this.paciente.edad > 0) return;

    if (this.paciente.fechaNacimiento) {
      const edadCalculada = this.calcularEdad(this.paciente.fechaNacimiento);
      if (edadCalculada > 0) {
        this.paciente.edad = edadCalculada;
      }
    }
  }

  private calcularEdad(fechaNacimiento: string): number {
    if (!fechaNacimiento) return 0;

    const nacimiento = new Date(fechaNacimiento);
    if (isNaN(nacimiento.getTime())) return 0;

    const hoy = new Date();
    let edad = hoy.getFullYear() - nacimiento.getFullYear();

    if (
      hoy.getMonth() < nacimiento.getMonth() ||
      (hoy.getMonth() === nacimiento.getMonth() &&
        hoy.getDate() < nacimiento.getDate())
    ) {
      edad--;
    }

    return edad > 0 ? edad : 0;
  }

  // ==============================
  // REFRESH
  // ==============================

  async refrescarDatos(event?: any) {
    if (this.pacienteId) {
      await this.cargarPaciente(this.pacienteId);
    }

    if (event) {
      event.target.complete();
    }
  }

  // ==============================
  // UI HELPERS
  // ==============================

  toggleSesionExpandida(sesionId: string | number) {
    if (this.sesionesExpandidas.has(sesionId)) {
      this.sesionesExpandidas.delete(sesionId);
    } else {
      this.sesionesExpandidas.add(sesionId);
    }
  }

  toggleRutina(rutinaId: string) {

    if (this.rutinaAbiertaId === rutinaId) {
      this.rutinaAbiertaId = null;
    } else {
      this.rutinaAbiertaId = rutinaId;
    }

  }

  isSesionExpandida(sesionId: string | number): boolean {
    return this.sesionesExpandidas.has(sesionId);
  }

  formatearFecha(fechaInput: any): string {
    if (!fechaInput) return 'No registrada';

    // Firestore Timestamp
    if (fechaInput?.toDate) {
      return fechaInput.toDate().toLocaleDateString('es-CL');
    }

    // Si ya es Date
    if (fechaInput instanceof Date) {
      return fechaInput.toLocaleDateString('es-CL');
    }

    // Si es string formato DD-MM-YYYY o DD/MM/YYYY
    if (typeof fechaInput === 'string') {
      const partes = fechaInput.split(/[-\/]/);
      if (partes.length === 3) {
        const [dia, mes, anio] = partes;
        const fecha = new Date(Number(anio), Number(mes) - 1, Number(dia));
        return fecha.toLocaleDateString('es-CL');
      }

      const fecha = new Date(fechaInput);
      if (!isNaN(fecha.getTime())) {
        return fecha.toLocaleDateString('es-CL');
      }
    }

    return 'No registrada';
  }
  // ==============================
  // NAVEGACION
  // ==============================

  nuevaSesion() {

    if (!this.tratamientoActivo) return;

    this.navCtrl.navigateRoot('/evolucion', {
      queryParams: {
        patientId: this.pacienteId,
        treatmentId: this.tratamientoActivo.id,
        mode: 'progress'
      }
    });
  }

  volverALista() {
    this.navCtrl.navigateBack('/pacientes-lista');
  }


  irADocumentos() {
    if (!this.paciente) return;

    this.navCtrl.navigateRoot('/documentos-medicos', {
      queryParams: {
        pacienteId: this.paciente.id,
        pacienteNombre: this.paciente.nombre
      }
    });
  }

  crearRutina() {

    if (!this.pacienteId) return;

    this.navCtrl.navigateRoot('/rutina-editor', {
      queryParams: {
        tipo: 'paciente',
        pacienteId: this.pacienteId
      }
    });

  }

  editarPaciente() {
    if (!this.paciente) return;

    this.navCtrl.navigateRoot('/agregar-paciente', {
      queryParams: {
        pacienteId: this.pacienteId,
        modoEdicion: 'true'
      }
    });
  }

  llamarPaciente() {
    if (!this.paciente?.telefono) return;
    window.open(`tel:${this.paciente.telefono}`, '_system');
  }

  enviarEmail() {
    if (!this.paciente?.email) return;
    window.open(`mailto:${this.paciente.email}`, '_system');
  }

  async confirmarEliminacion(evolucionId: string) {
    const alert = await this.alertCtrl.create({
      header: 'Eliminar evolucion',
      message: 'Esta accion la quitara del historial. Desea continuar?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => {
            try {
              await this.evolucionesService.softDelete(evolucionId);
            } catch (error) {
              console.error('Error eliminando evolucion:', error);
            }
          }
        }
      ]
    });

    await alert.present();
  }

  iniciarTratamiento(event: Event) {
    const button = event.currentTarget as HTMLElement;
    button?.blur();

    this.navCtrl.navigateRoot('/evolucion', {
      queryParams: {
        patientId: this.pacienteId,
        mode: 'initial'
      }
    });
  }

  finalizarTratamiento() {
    if (!this.tratamientoActivo) return;

    this.navCtrl.navigateRoot('/evolucion', {
      queryParams: {
        patientId: this.pacienteId,
        treatmentId: this.tratamientoActivo.id,
        mode: 'discharge'
      }
    });
  }

  async confirmarHardDelete(id: string) {

    const confirmar = confirm('Eliminar esta sesion?');

    if (!confirmar) return;

    try {

      await this.evolucionesService.softDelete(id);

      console.log('Sesion eliminada');

    } catch (error) {

      console.error('Error eliminando sesion', error);

    }

  }

  private cargarRutinasActivas(pacienteId: string) {

    if (this.rutinaClinicaSub) {
      this.rutinaClinicaSub.unsubscribe();
    }

    if (this.rutinaDomiciliariaSub) {
      this.rutinaDomiciliariaSub.unsubscribe();
    }

    // =========================
    // Rutina clínica
    // =========================

    this.rutinaClinicaSub = this.rutinasService
      .getRutinaClinicaActiva(pacienteId)
      .subscribe({
        next: rutina => {

          this.rutinaClinicaActiva = rutina;

        },
        error: err => {

          console.error('Error cargando rutina clinica', err);
          this.rutinaClinicaActiva = null;

        }
      });

    // =========================
    // Rutina domiciliaria
    // =========================

    this.rutinaDomiciliariaSub = this.rutinasService
      .getRutinaDomiciliariaActiva(pacienteId)
      .subscribe({
        next: rutina => {

          this.rutinaDomiciliariaActiva = rutina;

          // Cancelar suscripción anterior
          if (this.adherenciaSub) {
            this.adherenciaSub.unsubscribe();
            this.adherenciaSub = undefined;
          }

          // Si no hay rutina domiciliaria
          if (!rutina) {

            this.adherenciaDomiciliaria = null;
            return;

          }

          // Calcular adherencia
          this.adherenciaSub = this.rutinasSesionesService
            .getAdherenciaRutina(rutina)
            .subscribe(valor => {

              this.adherenciaDomiciliaria = valor;

            });

        },
        error: err => {

          console.error('Error cargando rutina domiciliaria', err);

          this.rutinaDomiciliariaActiva = null;
          this.adherenciaDomiciliaria = null;

          if (this.adherenciaSub) {
            this.adherenciaSub.unsubscribe();
            this.adherenciaSub = undefined;
          }

        }
      });

  }

  cambiarTab(tab: 'info' | 'sesiones' | 'rutinas') {
      this.tabActual = tab;
  }

  seleccionarPlantilla() {

    this.navCtrl.navigateRoot(
      '/asignar-rutina',
      {
        queryParams: {
          pacienteId: this.paciente.id
        }
      }
    );

  }

  editarRutina(rutinaId: string) {

    this.navCtrl.navigateRoot('/rutina-editor', {
      queryParams: {
        tipo: 'paciente',
        id: rutinaId,
        pacienteId: this.pacienteId
      }
    });

  }

  private cargarSesionesDomiciliarias(pacienteId: string) {

    this.rutinasSesionesService
      .getSesionesPaciente(pacienteId)
      .subscribe({
        next: sesiones => {

          this.sesionesDomiciliarias = sesiones
            .filter(s => s.tipoSesion === 'domiciliaria')
            .sort((a, b) => this.getTime(b.fecha) - this.getTime(a.fecha));

        },
        error: err => {
          console.error('Error cargando sesiones domiciliarias', err);
          this.sesionesDomiciliarias = [];
        }
      });

  }


  private getTime(fecha: any): number {

    if (!fecha) return 0;

    if (fecha.toDate) {
      return fecha.toDate().getTime();
    }

    if (fecha instanceof Date) {
      return fecha.getTime();
    }

    return new Date(fecha).getTime() || 0;

  }
  
  recargarRutinas() {

    if (!this.paciente?.id) return;

    this.cargarRutinasCompletadas(this.paciente.id);
    this.cargarSesionesDomiciliarias(this.paciente.id);

  }

  async abrirSesion(sesion: any) {

    const modal = await this.modalCtrl.create({
      component: EvolucionViewerComponent,
      componentProps: {
        evolucion: sesion
      }
    });

    await modal.present();

  }

  private agruparSesionesPorTratamiento() {

    const mapa = new Map<string, TratamientoHistorial>();

    for (const sesion of this.historialSesiones) {

      const treatmentId = sesion.treatmentId || 'sin-tratamiento';

      if (!mapa.has(treatmentId)) {

        mapa.set(treatmentId, {
          treatmentId,
          sesiones: [],
          expandido: false,
          activo: treatmentId === this.tratamientoActivo?.id,
          fechaInicio: null,
          diagnostico: this.paciente?.diagnostico
        });

      }

      const tratamiento = mapa.get(treatmentId)!;

      tratamiento.sesiones.push(sesion);

      // 🔹 Detectar fecha de inicio desde la evaluación inicial
      if (sesion.tipoEvolucion === 'initial') {
        tratamiento.fechaInicio = sesion.createdAt;
      }

    }

    this.tratamientosHistorial = Array.from(mapa.values()).map(tratamiento => {

      tratamiento.sesiones.sort((a, b) => {

        const aNum = a.sessionNumber ?? 0;
        const bNum = b.sessionNumber ?? 0;

        return aNum - bNum;

      });

      this.tratamientosHistorial.sort((a, b) => {

        const aTime = a.fechaInicio?.toMillis?.() ?? 0;
        const bTime = b.fechaInicio?.toMillis?.() ?? 0;

        return bTime - aTime;

      });

      return tratamiento;

    });

  }

  toggleTratamiento(tratamiento: TratamientoHistorial) {
    tratamiento.expandido = !tratamiento.expandido;
  }

  get sesionesTratamientoActivo() {

    return this.historialSesiones.filter(
      s => s.treatmentId === this.tratamientoActivo?.id
    );

  }
}
