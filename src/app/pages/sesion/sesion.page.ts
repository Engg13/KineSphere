import { Component, ViewChild, ElementRef } from '@angular/core';
import { NavController, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { DatabaseService } from 'src/app/services/database.service';
import { EjerciciosService } from 'src/app/services/ejercicios.service';
import { RutinaEjercicios } from 'src/app/models/interfaces';

@Component({
  selector: 'app-sesion',
  templateUrl: './sesion.page.html',
  styleUrls: ['./sesion.page.scss'],
  standalone: false
})
export class SesionPage {
  // Datos del paciente
  pacienteId: string = '';
  pacienteNombre: string = '';
  pacienteDiagnostico: string = '';
  numeroSesion: number = 1;
  sesionesPlanificadas: number = 10;

  // Datos de la sesion
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

  // Zonas de tratamiento
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

  // Técnicas kinésicas
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

  // Tests predeterminados
  testsDisponibles: any[] = [];
  testSeleccionado: any = null;
  respuestasTest: number[] = [];
  puntajeTotal = 0;
  resultadoTest = '';

  // Rutinas disponibles para asociar
  rutinasDisponibles: RutinaEjercicios[] = [];
  rutinaSeleccionada: RutinaEjercicios | null = null;

  @ViewChild('observacionesTextarea') observacionesTextarea!: ElementRef;

  constructor(
    private navCtrl: NavController,
    private router: Router,
    private databaseService: DatabaseService,
    private toastCtrl: ToastController,
    private ejerciciosService: EjerciciosService
  ) {}

  ionViewDidEnter() {
    // Read params from current URL to avoid stale cached params
    const tree = this.router.parseUrl(this.router.url);
    const params = tree.queryParams;

    this.pacienteId = params['pacienteId'] || '';
    this.pacienteNombre = params['pacienteNombre'] || 'Paciente';
    this.pacienteDiagnostico = params['diagnostico'] || '';

    // Reset form
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
    this.rutinasDisponibles = [];

    this.cargarTestsDisponibles();
    this.calcularNumeroSesion();
    this.cargarDatosPaciente();
    this.cargarRutinasDisponibles();
  }

  async cargarDatosPaciente() {
    if (!this.pacienteId) return;
    try {
      const pacientes = await this.databaseService.getPacientes();
      const p = pacientes.find((pac: any) => String(pac.id) === String(this.pacienteId));
      if (p) {
        this.pacienteNombre = p.nombre || this.pacienteNombre;
        this.pacienteDiagnostico = p.diagnostico || '';
        this.sesionesPlanificadas = p.sesionesPlanificadas || 10;
      }
    } catch {}
  }

  async calcularNumeroSesion() {
    if (!this.pacienteId) {
      this.numeroSesion = 1;
      return;
    }
    try {
      const sesiones = await this.databaseService.getSesionesByPaciente(this.pacienteId);
      this.numeroSesion = sesiones.length + 1;
    } catch {
      this.numeroSesion = 1;
    }
  }

  // Keyboard handling
  onEnterObservaciones(event: any) {
    if (event.preventDefault) event.preventDefault();
    this.cerrarTeclado();
    return false;
  }

  cerrarTeclado() {
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement) activeElement.blur();
    if (typeof (window as any).Keyboard !== 'undefined') {
      try { (window as any).Keyboard.hide(); } catch {}
    }
  }

  onContentClick(event: any) {
    const el = event.target as HTMLElement;
    const isInput = el.closest('ion-input') || el.closest('ion-textarea') ||
                    el.closest('ion-range') || el.closest('ion-checkbox') ||
                    el.closest('ion-select') || el.closest('ion-toggle') ||
                    el.closest('input') || el.closest('textarea');
    if (!isInput) this.cerrarTeclado();
  }

  // Técnicas toggle
  toggleTecnica(tecnica: { nombre: string; seleccionada: boolean }) {
    tecnica.seleccionada = !tecnica.seleccionada;
    this.sesionData.tecnicasAplicadas = this.tecnicasDisponibles
      .filter(t => t.seleccionada)
      .map(t => t.nombre);
  }

  // Form validation
  esFormularioValido(): boolean {
    return this.sesionData.nivelDolor !== null && this.sesionData.nivelDolor >= 0;
  }

  getProgresoSesiones(): number {
    return Math.min((this.numeroSesion / this.sesionesPlanificadas) * 100, 100);
  }

  async guardarSesion() {
    if (!this.esFormularioValido()) {
      this.mostrarToast('Completa la evaluacion de dolor (EVA)', 'warning');
      return;
    }

    if (!this.pacienteId) {
      this.mostrarToast('No se identifico al paciente. Regrese e intente nuevamente.', 'danger');
      return;
    }

    try {
      const datosSesion: any = {
        paciente_id: this.pacienteId,
        paciente_nombre: this.pacienteNombre,
        numero_sesion: this.numeroSesion,
        fecha: this.sesionData.fechaSesion,
        ejercicios: this.sesionData.ejerciciosRealizados ? 'Realizados' : 'No realizados',
        observaciones: this.sesionData.observaciones,
        eva: this.sesionData.nivelDolor,
        sueno: this.sesionData.calidadSueno,
        zona_tratamiento: this.sesionData.zonaTratamiento,
        tecnicas_aplicadas: this.sesionData.tecnicasAplicadas,
        rom: this.sesionData.rom,
        objetivo_proxima: this.sesionData.objetivoProxima,
        enviado_whatsapp: false
      };

      // Include linked routine if selected
      if (this.rutinaSeleccionada) {
        datosSesion.rutina = {
          rutinaId: this.rutinaSeleccionada.id,
          rutinaNombre: this.rutinaSeleccionada.nombre,
          ejercicios: this.rutinaSeleccionada.ejercicios.map(ej => ({
            nombre: ej.ejercicio.nombre,
            series: ej.series.length,
            seriesCompletadas: ej.series.filter(s => s.completada).length
          }))
        };
      }

      // Include test results if applied
      if (this.testSeleccionado) {
        datosSesion.test = {
          testId: this.testSeleccionado.id,
          testNombre: this.testSeleccionado.nombre,
          respuestas: [...this.respuestasTest],
          puntajeTotal: this.puntajeTotal,
          resultado: this.resultadoTest
        };
      }

      await this.databaseService.addSesion(datosSesion);

      this.mostrarToast(`Sesion ${this.numeroSesion} guardada correctamente`, 'success');

      // Navigate back to patient detail
      localStorage.setItem('ver_paciente_id', String(this.pacienteId));
      this.navCtrl.navigateRoot('/paciente-detalle');

    } catch (error) {
      console.error('Error al guardar sesion:', error);
      this.mostrarToast('Error al guardar la sesion. Intente nuevamente.', 'danger');
    }
  }

  // Rutinas
  cargarRutinasDisponibles() {
    if (!this.pacienteId) return;
    const rutinas = this.ejerciciosService.getRutinasPorPaciente(this.pacienteId);
    this.rutinasDisponibles = rutinas;
  }

  seleccionarRutina(event: any) {
    const rutinaId = event?.detail?.value;
    if (!rutinaId) {
      this.rutinaSeleccionada = null;
      return;
    }
    this.rutinaSeleccionada = this.rutinasDisponibles.find(r => r.id === rutinaId) || null;
  }

  irACrearRutina() {
    if (!this.pacienteId) return;
    this.navCtrl.navigateRoot('/ejercicios', {
      queryParams: {
        pacienteId: this.pacienteId,
        pacienteNombre: this.pacienteNombre
      }
    });
  }

  // Tests
  cargarTestsDisponibles() {
    try {
      const data = localStorage.getItem('test_templates');
      this.testsDisponibles = data ? JSON.parse(data) : [];
    } catch {
      this.testsDisponibles = [];
    }
  }

  seleccionarTest(event: any) {
    const testId = event?.detail?.value;
    if (!testId) {
      this.testSeleccionado = null;
      this.respuestasTest = [];
      this.puntajeTotal = 0;
      this.resultadoTest = '';
      return;
    }
    this.testSeleccionado = this.testsDisponibles.find((t: any) => t.id === testId);
    if (this.testSeleccionado) {
      this.respuestasTest = this.testSeleccionado.preguntas.map(() => 0);
      this.calcularPuntajeTest();
    }
  }

  calcularPuntajeTest() {
    if (!this.testSeleccionado) return;
    this.puntajeTotal = this.respuestasTest.reduce((sum, val) => sum + (val || 0), 0);
    const rango = this.testSeleccionado.rangos.find((r: any) =>
      this.puntajeTotal >= r.min && this.puntajeTotal <= r.max
    );
    this.resultadoTest = rango ? rango.nombre : 'Sin clasificacion';
  }

  getResultadoColor(): string {
    if (!this.testSeleccionado) return '#6b7280';
    const rango = this.testSeleccionado.rangos.find((r: any) =>
      this.puntajeTotal >= r.min && this.puntajeTotal <= r.max
    );
    return rango ? rango.color : '#6b7280';
  }

  volverAPaciente() {
    if (this.pacienteId) {
      localStorage.setItem('ver_paciente_id', String(this.pacienteId));
      this.navCtrl.navigateRoot('/paciente-detalle');
    } else {
      this.navCtrl.navigateRoot('/dashboard');
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
}
