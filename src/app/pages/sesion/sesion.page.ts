import { Component, ViewChild, ElementRef } from '@angular/core';
import { NavController, ToastController, IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { DatabaseService } from 'src/app/services/database.service';
import { RutinasFirestoreService } from 'src/app/services/rutinas-firestore.service';
import { RutinaEjercicios } from 'src/app/models/interfaces';
import { NgIf, NgFor } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SleepQualityComponent } from '../../components/sleep-quality/sleep-quality.component';
import { TestTemplatesFirestoreService } from '../../services/test-templates-firestore.service';
import { TestTemplate } from '../../models/test-template.model';

@Component({
  selector: 'app-sesion',
  templateUrl: './sesion.page.html',
  styleUrls: ['./sesion.page.scss'],
  standalone: true,
  imports: [IonicModule, NgIf, FormsModule, SleepQualityComponent, NgFor]
})
export class SesionPage {

  // ===============================
  // DATOS PACIENTE
  // ===============================

  pacienteId = '';
  pacienteNombre = '';
  pacienteDiagnostico = '';
  numeroSesion = 1;
  sesionesPlanificadas = 10;

  // ===============================
  // DATOS SESIÓN
  // ===============================

  sesionData = {
    nivelDolor: null as number | null,
    calidadSueno: 3,
    ejerciciosRealizados: false,
    observaciones: '',
    fechaSesion: new Date().toISOString().split('T')[0],
    zonaTratamiento: '',
    tecnicasAplicadas: [] as string[],
    rom: '',
    objetivoProxima: ''
  };

  // ===============================
  // ZONAS
  // ===============================

  zonasTratamiento: string[] = [
    'Columna cervical',
    'Columna dorsal',
    'Columna lumbar',
    'Hombro',
    'Codo',
    'Muñeca/Mano',
    'Cadera',
    'Rodilla',
    'Tobillo/Pie',
    'ATM',
    'Otra'
  ];

  // ===============================
  // TÉCNICAS
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
  // TESTS (Firestore + respaldo local)
  // ===============================

  testsDisponibles: TestTemplate[] = [];
  testSeleccionado: TestTemplate | null = null;
  respuestasTest: number[] = [];
  puntajeTotal = 0;
  resultadoTest = '';

  // ===============================
  // RUTINAS (Firestore)
  // ===============================

  rutinasDisponibles: any[] = [];
  rutinaSeleccionada: any = null;

  @ViewChild('observacionesTextarea') observacionesTextarea!: ElementRef;

  constructor(
    private navCtrl: NavController,
    private router: Router,
    private databaseService: DatabaseService,
    private rutinasService: RutinasFirestoreService,
    private testTemplatesService: TestTemplatesFirestoreService,
    private toastCtrl: ToastController
  ) {}

  // =====================================================
  // INIT
  // =====================================================

  async ionViewDidEnter() {

    const tree = this.router.parseUrl(this.router.url);
    const params = tree.queryParams;

    this.pacienteId = params['pacienteId'] || '';
    this.pacienteNombre = params['pacienteNombre'] || 'Paciente';
    this.pacienteDiagnostico = params['diagnostico'] || '';

    this.resetFormulario();

    await this.cargarTestsDisponibles();
    this.calcularNumeroSesion();
    this.cargarDatosPaciente();
    this.cargarRutinasDisponibles();
  }

  resetFormulario() {
    this.sesionData = {
      nivelDolor: null,
      calidadSueno: 3,
      ejerciciosRealizados: false,
      observaciones: '',
      fechaSesion: new Date().toISOString().split('T')[0],
      zonaTratamiento: '',
      tecnicasAplicadas: [],
      rom: '',
      objetivoProxima: ''
    };

    this.tecnicasDisponibles.forEach(t => t.seleccionada = false);
    this.testSeleccionado = null;
    this.respuestasTest = [];
    this.puntajeTotal = 0;
    this.resultadoTest = '';
    this.rutinaSeleccionada = null;
  }

  // =====================================================
  // PACIENTE
  // =====================================================

  async cargarDatosPaciente() {
    if (!this.pacienteId) return;

    const pacientes = await this.databaseService.getPacientes();
    const p = pacientes.find((pac: any) => String(pac.id) === String(this.pacienteId));

    if (p) {
      this.pacienteNombre = p.nombre || this.pacienteNombre;
      this.pacienteDiagnostico = p.diagnostico || '';
      this.sesionesPlanificadas = p.sesionesPlanificadas || 10;
    }
  }

  async calcularNumeroSesion() {
    if (!this.pacienteId) return;

    const sesiones = await this.databaseService.getSesionesByPaciente(this.pacienteId);
    this.numeroSesion = sesiones.length + 1;
  }

  // =====================================================
  // RUTINAS (Firestore realtime)
  // =====================================================

  cargarRutinasDisponibles() {
    if (!this.pacienteId) return;

    this.rutinasService
      .getRutinasPorPacienteRealtime(this.pacienteId)
      .subscribe(rutinas => {
        this.rutinasDisponibles = rutinas.filter(r => r.estado === 'active');
      });
  }

  seleccionarRutina(event: any) {
    const rutinaId = event?.detail?.value;
    this.rutinaSeleccionada =
      this.rutinasDisponibles.find(r => r.id === rutinaId) || null;
  }

  irACrearRutina() {
    this.navCtrl.navigateRoot('/ejercicios', {
      queryParams: {
        pacienteId: this.pacienteId,
        pacienteNombre: this.pacienteNombre
      }
    });
  }

  // =====================================================
  // TÉCNICAS
  // =====================================================

  toggleTecnica(tecnica: any) {
    tecnica.seleccionada = !tecnica.seleccionada;
    this.sesionData.tecnicasAplicadas =
      this.tecnicasDisponibles
        .filter(t => t.seleccionada)
        .map(t => t.nombre);
  }

  // =====================================================
  // VALIDACIÓN
  // =====================================================

  esFormularioValido(): boolean {
    return this.sesionData.nivelDolor !== null;
  }

  getProgresoSesiones(): number {
    return Math.min((this.numeroSesion / this.sesionesPlanificadas) * 100, 100);
  }

  // =====================================================
  // GUARDAR SESIÓN (Firestore)
  // =====================================================

  async guardarSesion() {

    if (!this.esFormularioValido()) {
      this.mostrarToast('Completa la evaluación EVA', 'warning');
      return;
    }

    const datosSesion: any = {
      pacienteId: this.pacienteId,
      pacienteNombre: this.pacienteNombre,
      numeroSesion: this.numeroSesion,
      fecha: this.sesionData.fechaSesion,
      eva: this.sesionData.nivelDolor,
      sueno: this.sesionData.calidadSueno,
      zonaTratamiento: this.sesionData.zonaTratamiento,
      tecnicasAplicadas: this.sesionData.tecnicasAplicadas,
      rom: this.sesionData.rom,
      objetivoProxima: this.sesionData.objetivoProxima,
      observaciones: this.sesionData.observaciones,
      enviadoWhatsapp: false
    };

    if (this.rutinaSeleccionada) {
      datosSesion.rutinaId = this.rutinaSeleccionada.id;
      datosSesion.rutinaNombre = this.rutinaSeleccionada.nombre;
    }

    if (this.testSeleccionado) {
      datosSesion.test = {
        testId: this.testSeleccionado.id,
        testNombre: this.testSeleccionado.nombre,
        puntajeTotal: this.puntajeTotal,
        resultado: this.resultadoTest
      };
    }

    await this.databaseService.addSesion(datosSesion);

    this.mostrarToast(`Sesión ${this.numeroSesion} guardada`, 'success');

    this.navCtrl.navigateRoot('/paciente-detalle', {
      queryParams: { pacienteId: this.pacienteId }
    });
  }

  // =====================================================
  // TESTS (local temporal)
  // =====================================================

  async cargarTestsDisponibles() {
    this.testsDisponibles = await this.testTemplatesService.getTests();
  }

  seleccionarTest(event: any) {
    const testId = event?.detail?.value;

    this.testSeleccionado =
      this.testsDisponibles.find((t: any) => t.id === testId) || null;

    if (this.testSeleccionado) {
      this.respuestasTest =
        this.testSeleccionado.preguntas.map(() => 0);
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

    this.resultadoTest = rango ? rango.nombre : 'Sin clasificación';
  }

  getResultadoColor(): string {
    const rango =
      this.testSeleccionado?.rangos.find((r: any) =>
        this.puntajeTotal >= r.min && this.puntajeTotal <= r.max
      );

    return rango ? rango.color : '#6b7280';
  }

  // =====================================================
  // NAVEGACIÓN
  // =====================================================

  volverAPaciente() {
    this.navCtrl.navigateRoot('/paciente-detalle', {
      queryParams: { pacienteId: this.pacienteId }
    });
  }

  // =====================================================
  // UTIL
  // =====================================================

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

  onEnterObservaciones(event: any) {
    event.preventDefault();
    const active = document.activeElement as HTMLElement;
    active?.blur();
    return false;
  }
}