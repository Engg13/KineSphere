import { Component } from '@angular/core';
import { NavController, ToastController, IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgIf, NgFor } from '@angular/common';
import { EvolucionesFirestoreService } from '../../services/evoluciones-firestore.service';
import { RutinasFirestoreService } from '../../services/rutinas-firestore.service';
import { TestTemplatesFirestoreService } from '../../services/test-templates-firestore.service';
import { DatabaseService } from '../../services/database.service';
import { SleepQualityComponent } from '../../components/sleep-quality/sleep-quality.component';
import { TipoEvolucion } from '../../models/evolucion.model';
import { TestTemplate } from '../../models/test-template.model';

@Component({
  selector: 'app-evolucion',
  templateUrl: './evolucion.page.html',
  styleUrls: ['./evolucion.page.scss'],
  standalone: true,
  imports: [IonicModule, NgIf, NgFor, FormsModule, SleepQualityComponent]
})
export class EvolucionPage {

  // ===============================
  // DATOS PACIENTE
  // ===============================

  patientId = '';
  pacienteNombre = '';
  pacienteDiagnostico = '';
  sessionNumber = 1;

  // ===============================
  // FORMULARIO EVOLUCION
  // ===============================

  tipoEvolucion: TipoEvolucion = 'progress';

  subjective = '';
  objective = '';
  assessment = '';
  plan = '';

  painScale: number | null = null;
  sleepQuality = 3;
  rom = '';
  zonaTratamiento = '';
  tecnicasAplicadas: string[] = [];
  ejerciciosRealizados = false;

  // ===============================
  // ZONAS
  // ===============================

  zonasTratamiento: string[] = [
    'Columna cervical',
    'Columna dorsal',
    'Columna lumbar',
    'Hombro',
    'Codo',
    'Muneca/Mano',
    'Cadera',
    'Rodilla',
    'Tobillo/Pie',
    'ATM',
    'Otra'
  ];

  // ===============================
  // TECNICAS
  // ===============================

  tecnicasDisponibles: { nombre: string; seleccionada: boolean }[] = [
    { nombre: 'Masoterapia', seleccionada: false },
    { nombre: 'Movilizacion articular', seleccionada: false },
    { nombre: 'Ejercicio terapeutico', seleccionada: false },
    { nombre: 'Electroterapia', seleccionada: false },
    { nombre: 'Termoterapia', seleccionada: false },
    { nombre: 'Crioterapia', seleccionada: false },
    { nombre: 'Puncion seca', seleccionada: false },
    { nombre: 'Vendaje neuromuscular', seleccionada: false },
    { nombre: 'Estiramiento', seleccionada: false },
    { nombre: 'Educacion al paciente', seleccionada: false }
  ];

  // ===============================
  // TESTS
  // ===============================

  testsDisponibles: TestTemplate[] = [];
  testSeleccionado: TestTemplate | null = null;
  respuestasTest: number[] = [];
  puntajeTotal = 0;
  resultadoTest = '';

  // ===============================
  // RUTINAS
  // ===============================

  rutinasDisponibles: any[] = [];
  rutinaSeleccionada: any = null;

  // ===============================
  // ESTADO
  // ===============================

  guardando = false;

  constructor(
    private navCtrl: NavController,
    private router: Router,
    private evolucionesService: EvolucionesFirestoreService,
    private rutinasService: RutinasFirestoreService,
    private testTemplatesService: TestTemplatesFirestoreService,
    private databaseService: DatabaseService,
    private toastCtrl: ToastController
  ) {}

  // =====================================================
  // INIT
  // =====================================================

  async ionViewDidEnter() {
    const tree = this.router.parseUrl(this.router.url);
    const params = tree.queryParams;

    this.patientId = params['patientId'] || '';
    this.pacienteNombre = params['pacienteNombre'] || 'Paciente';
    this.pacienteDiagnostico = params['diagnostico'] || '';

    this.resetFormulario();

    await this.cargarTestsDisponibles();
    await this.calcularNumeroSesion();
    this.cargarDatosPaciente();
    this.cargarRutinasDisponibles();
  }

  resetFormulario() {
    this.tipoEvolucion = 'progress';
    this.subjective = '';
    this.objective = '';
    this.assessment = '';
    this.plan = '';
    this.painScale = null;
    this.sleepQuality = 3;
    this.rom = '';
    this.zonaTratamiento = '';
    this.tecnicasAplicadas = [];
    this.ejerciciosRealizados = false;
    this.tecnicasDisponibles.forEach(t => t.seleccionada = false);
    this.testSeleccionado = null;
    this.respuestasTest = [];
    this.puntajeTotal = 0;
    this.resultadoTest = '';
    this.rutinaSeleccionada = null;
    this.guardando = false;
  }

  // =====================================================
  // PACIENTE
  // =====================================================

  async cargarDatosPaciente() {
    if (!this.patientId) return;

    const pacientes = await this.databaseService.getPacientes();
    const p = pacientes.find((pac: any) => String(pac.id) === String(this.patientId));

    if (p) {
      this.pacienteNombre = p.nombre || this.pacienteNombre;
      this.pacienteDiagnostico = p.diagnostico || '';
    }
  }

  async calcularNumeroSesion() {
    if (!this.patientId) return;
    this.sessionNumber = await this.evolucionesService.getNextSessionNumber(this.patientId);
  }

  // =====================================================
  // RUTINAS
  // =====================================================

  cargarRutinasDisponibles() {
    if (!this.patientId) return;

    this.rutinasService
      .getRutinasPorPacienteRealtime(this.patientId)
      .subscribe(rutinas => {
        this.rutinasDisponibles = rutinas.filter(r => r.estado === 'active');
      });
  }

  seleccionarRutina(event: any) {
    const rutinaId = event?.detail?.value;
    this.rutinaSeleccionada =
      this.rutinasDisponibles.find(r => r.id === rutinaId) || null;
  }

  // =====================================================
  // TECNICAS
  // =====================================================

  toggleTecnica(tecnica: any) {
    tecnica.seleccionada = !tecnica.seleccionada;
    this.tecnicasAplicadas =
      this.tecnicasDisponibles
        .filter(t => t.seleccionada)
        .map(t => t.nombre);
  }

  // =====================================================
  // TESTS
  // =====================================================

  async cargarTestsDisponibles() {
    this.testsDisponibles = await this.testTemplatesService.getTests();
  }

  seleccionarTest(event: any) {
    const testId = event?.detail?.value;

    this.testSeleccionado =
      this.testsDisponibles.find((t: any) => t.id === testId) || null;

    if (this.testSeleccionado) {
      this.respuestasTest = this.testSeleccionado.preguntas.map(() => 0);
      this.calcularPuntajeTest();
    }
  }

  calcularPuntajeTest() {
    this.puntajeTotal =
      this.respuestasTest.reduce((sum, val) => sum + (val || 0), 0);

    const rango =
      this.testSeleccionado?.rangos.find((r: any) =>
        this.puntajeTotal >= r.min && this.puntajeTotal <= r.max
      );

    this.resultadoTest = rango ? rango.nombre : 'Sin clasificacion';
  }

  getResultadoColor(): string {
    const rango =
      this.testSeleccionado?.rangos.find((r: any) =>
        this.puntajeTotal >= r.min && this.puntajeTotal <= r.max
      );

    return rango ? rango.color : '#6b7280';
  }

  // =====================================================
  // VALIDACION
  // =====================================================

  esFormularioValido(): boolean {
    return this.subjective.trim().length >= 3 && this.objective.trim().length >= 3;
  }

  // =====================================================
  // GUARDAR EVOLUCION
  // =====================================================

  async guardarEvolucion() {
    if (!this.esFormularioValido()) {
      this.mostrarToast('Completa los campos Subjetivo y Objetivo (minimo 3 caracteres)', 'warning');
      return;
    }

    if (this.guardando) return;
    this.guardando = true;

    try {
      const evolucionData: any = {
        patientId: this.patientId,
        tipoEvolucion: this.tipoEvolucion,
        sessionNumber: this.sessionNumber,
        subjective: this.subjective.trim(),
        objective: this.objective.trim(),
        assessment: this.assessment.trim(),
        plan: this.plan.trim(),
        painScale: this.painScale,
        sleepQuality: this.sleepQuality,
        rom: this.rom.trim() || null,
        zonaTratamiento: this.zonaTratamiento || null,
        tecnicasAplicadas: this.tecnicasAplicadas,
        ejerciciosRealizados: this.ejerciciosRealizados
      };

      if (this.rutinaSeleccionada) {
        evolucionData.rutinaId = this.rutinaSeleccionada.id;
        evolucionData.rutinaNombre = this.rutinaSeleccionada.nombre;
      }

      if (this.testSeleccionado) {
        evolucionData.test = {
          testId: this.testSeleccionado.id,
          testNombre: this.testSeleccionado.nombre,
          puntajeTotal: this.puntajeTotal,
          resultado: this.resultadoTest
        };
      }

      await this.evolucionesService.createEvolucion(evolucionData);

      this.mostrarToast(`Evolucion #${this.sessionNumber} guardada correctamente`, 'success');

      this.navCtrl.navigateRoot('/paciente-detalle', {
        queryParams: { pacienteId: this.patientId }
      });

    } catch (error) {
      console.error('Error guardando evolucion:', error);
      this.mostrarToast('Error al guardar la evolucion. Intenta nuevamente.', 'danger');
      this.guardando = false;
    }
  }

  // =====================================================
  // NAVEGACION
  // =====================================================

  volverAPaciente() {
    this.navCtrl.navigateRoot('/paciente-detalle', {
      queryParams: { pacienteId: this.patientId }
    });
  }

  // =====================================================
  // UTIL
  // =====================================================

  getTipoLabel(): string {
    switch (this.tipoEvolucion) {
      case 'initial': return 'Evaluacion Inicial';
      case 'progress': return 'Progreso';
      case 'discharge': return 'Alta';
      default: return 'Evolucion';
    }
  }

  private async mostrarToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      position: 'bottom',
      color
    });
    await toast.present();
  }

  onContentClick(event: any) {
    const el = event.target as HTMLElement;

    const esInput =
      el.closest('ion-input') ||
      el.closest('ion-textarea') ||
      el.closest('ion-select') ||
      el.closest('input') ||
      el.closest('textarea');

    if (!esInput) {
      const active = document.activeElement as HTMLElement;
      active?.blur();
    }
  }
}
