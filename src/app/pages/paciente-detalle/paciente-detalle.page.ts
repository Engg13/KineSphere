import { Component, OnDestroy } from '@angular/core';
import { NavController, IonicModule } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { DatabaseService } from '../../services/database.service';
import { RutinaEjercicios } from '../../models/interfaces';
import { RutinasFirestoreService } from '../../services/rutinas-firestore.service';
import { EvolucionesFirestoreService } from '../../services/evoluciones-firestore.service';
import { Subscription } from 'rxjs';

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
  fechaActual = new Date().toISOString();

  private rutinasSub?: Subscription;
  private evolucionesSub?: Subscription;

  constructor(
    private navCtrl: NavController,
    private route: ActivatedRoute,
    private databaseService: DatabaseService,
    private rutinasService: RutinasFirestoreService,
    private evolucionesService: EvolucionesFirestoreService
  ) {}

  // ==============================
  // 🔥 CICLO DE VIDA
  // ==============================

  async ionViewDidEnter() {
    const queryId = this.route.snapshot.queryParamMap.get('pacienteId')
      || this.route.snapshot.queryParamMap.get('id');

    if (queryId) {
      this.pacienteId = queryId;
    }

    if (this.pacienteId) {
      await this.cargarPaciente(this.pacienteId);
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
        this.cargarHistorialSesiones(id);
        this.cargarRutinasCompletadas(id);
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

    this.cancelarSuscripciones();

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

          if (this.paciente) {
            this.paciente.sesionesCompletadas =
              evoluciones.filter(e => e.tipoEvolucion === 'progress').length;
          }
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

  formatearFecha(fechaString: string): string {
    if (!fechaString) return 'No registrada';

    const fecha = new Date(fechaString);
    if (isNaN(fecha.getTime())) return fechaString;

    return fecha.toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  // ==============================
  // 🧭 NAVEGACIÓN
  // ==============================

  nuevaSesion() {
    if (!this.paciente) return;

    const proximaSesion = (this.paciente.sesionesCompletadas || 0) + 1;

    this.navCtrl.navigateRoot('/evolucion', {
      queryParams: {
        patientId: this.paciente.id,
        pacienteId: this.paciente.id,
        pacienteNombre: this.paciente.nombre,
        numeroSesion: proximaSesion
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
}
