import { Component, OnDestroy } from '@angular/core';
import { AlertController, NavController, IonicModule } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { DatabaseService } from '../../services/database.service';
import { RutinaEjercicios } from '../../models/interfaces';
import { RutinasFirestoreService } from '../../services/rutinas-firestore.service';
import { EvolucionesFirestoreService } from '../../services/evoluciones-firestore.service';
import { Subscription } from 'rxjs';
import { AuthService } from 'src/app/services/auth.service';
import { TreatmentService } from 'src/app/services/treatment.service';

@Component({
  selector: 'app-paciente-detalle',
  templateUrl: './paciente-detalle.page.html',
  styleUrls: ['./paciente-detalle.page.scss'],
  standalone: true,
  imports: [IonicModule]
})
export class PacienteDetallePage implements OnDestroy {

  paciente: any = null;
  estaCargando: boolean = true;
  historialSesiones: any[] = [];
  rutinasCompletadas: RutinaEjercicios[] = [];
  sesionesExpandidas: Set<string | number> = new Set();
  pacienteId: string = '';
  fechaActual = new Date;
  esAdmin: boolean = false;
  historialVisual: any[] = [];
  tratamientoActivo: any | null = null;

  private rutinasSub?: Subscription;
  private evolucionesSub?: Subscription;
  constructor(
    private navCtrl: NavController,
    private route: ActivatedRoute,
    private databaseService: DatabaseService,
    private rutinasService: RutinasFirestoreService,
    private evolucionesService: EvolucionesFirestoreService,
    private alertCtrl: AlertController,
    private authService: AuthService,
    private treatmentService: TreatmentService
  ) {}

  // ==============================
  // 🔥 CICLO DE VIDA
  // ==============================

  async ionViewDidEnter() {

    await this.authService.refreshRole();
    this.esAdmin = this.authService.isAdmin();

    const queryId = this.route.snapshot.queryParamMap.get('pacienteId')
      || this.route.snapshot.queryParamMap.get('id');

    if (queryId) {
      this.pacienteId = queryId;
    }

    if (this.pacienteId) {

      await this.cargarPaciente(this.pacienteId);

      // 🔥 NUEVO: cargar tratamiento activo
      this.tratamientoActivo =
        await this.treatmentService.getTratamientoActivo(this.pacienteId);

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

    if (this.evolucionesSub) {
      this.evolucionesSub.unsubscribe();
      this.evolucionesSub = undefined;
    }
  }

  // ==============================
  // 👤 CARGA PACIENTE
  // ==============================

  private async cargarPaciente(id: string) {
    this.estaCargando = true;

    try {
      const todosPacientes = await this.databaseService.getPacientes();
      const paciente = todosPacientes.find(p =>
        String(p.id) === String(id) || p.pacienteId === id
      );

      if (paciente) {
        this.paciente = paciente;
        this.verificarYCorregirEdad();

        const pacienteIdReal = paciente.id ?? paciente.pacienteId;

        
        this.cargarHistorialSesiones(pacienteIdReal);
        this.cargarRutinasCompletadas(pacienteIdReal);
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
  // 📚 RUTINAS (REALTIME PRO)
  // ==============================

  private cargarRutinasCompletadas(pacienteId: string) {

    if (this.rutinasSub) {
      this.rutinasSub.unsubscribe();
    }

    this.rutinasSub = this.rutinasService
      .getRutinasPorPacienteRealtime(pacienteId)
      .subscribe({
        next: (rutinas: RutinaEjercicios[]) => {
          this.rutinasCompletadas = rutinas
            .filter(r => r.estado === 'completed')
            .sort((a, b) =>
              (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
            );
        },
        error: (error) => {
          console.error('Error cargando rutinas:', error);
          this.rutinasCompletadas = [];
        }
      });
  }

  // ==============================
  // 📅 HISTORIAL SESIONES
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

          let contadorProgress = 0;

          this.historialVisual = this.historialSesiones.map(e => {

            if (e.tipoEvolucion === 'progress') {
              contadorProgress++;
              return {
                ...e,
                numeroVisual: contadorProgress
              };
            }

            if (e.tipoEvolucion === 'initial') {
              return {
                ...e,
                numeroVisual: 'E'
              };
            }

            if (e.tipoEvolucion === 'discharge') {
              return {
                ...e,
                numeroVisual: 'A'
              };
            }

            return e;
          });
        },
        error: (error) => {
          console.error('Error cargando historial:', error);
          this.historialSesiones = [];
        }
      });
  }

  // ==============================
  // 🎂 EDAD
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
  // 🔄 REFRESH
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
  // 🔽 UI HELPERS
  // ==============================

  toggleSesionExpandida(sesionId: string | number) {
    if (this.sesionesExpandidas.has(sesionId)) {
      this.sesionesExpandidas.delete(sesionId);
    } else {
      this.sesionesExpandidas.add(sesionId);
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
  // 🧭 NAVEGACIÓN
  // ==============================

  nuevaSesion() {

    if (!this.tratamientoActivo) return;

    this.navCtrl.navigateForward('/evolucion', {
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

  irAEjercicios() {
    if (!this.paciente) return;

    this.navCtrl.navigateRoot('/ejercicios', {
      queryParams: {
        pacienteId: this.paciente.id,
        pacienteNombre: this.paciente.nombre
      }
    });
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
      header: 'Eliminar evolución',
      message: 'Esta acción la quitará del historial. ¿Desea continuar?',
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
              await this.evolucionesService.softDeleteEvolucion(evolucionId);
            } catch (error) {
              console.error('Error eliminando evolución:', error);
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async confirmarHardDelete(evolucionId: string) {
    const alert = await this.alertCtrl.create({
      header: 'Eliminar definitivamente',
      message: 'Esta acción eliminará permanentemente la evolución. No se puede deshacer.',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Eliminar definitivamente',
          role: 'destructive',
          handler: async () => {
            try {
              await this.evolucionesService.hardDeleteEvolucion(evolucionId);
            } catch (error) {
              console.error('Error eliminando definitivamente:', error);
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

    this.navCtrl.navigateForward('/evolucion', {
      queryParams: {
        patientId: this.pacienteId,
        mode: 'initial'
      }
    });
  }

  finalizarTratamiento() {
    if (!this.tratamientoActivo) return;

    this.navCtrl.navigateForward('/evolucion', {
      queryParams: {
        patientId: this.pacienteId,
        treatmentId: this.tratamientoActivo.id,
        mode: 'discharge'
      }
    });
  }
}
