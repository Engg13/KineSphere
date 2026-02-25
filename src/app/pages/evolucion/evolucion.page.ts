import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { IonicModule, NavController, ToastController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { SleepQualityComponent } from '../../components/sleep-quality/sleep-quality.component';
import { TipoEvolucion } from '../../models/evolucion.model';
import { TestTemplate } from '../../models/test-template.model';
import { DatabaseService } from '../../services/database.service';
import { EvolucionesFirestoreService } from '../../services/evoluciones-firestore.service';
import { RutinasFirestoreService } from '../../services/rutinas-firestore.service';
import { TestTemplatesFirestoreService } from '../../services/test-templates-firestore.service';

@Component({
  selector: 'app-evolucion',
  templateUrl: './evolucion.page.html',
  styleUrls: ['./evolucion.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, ReactiveFormsModule, SleepQualityComponent]
})
export class EvolucionPage implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private navCtrl = inject(NavController);
  private toastCtrl = inject(ToastController);
  private evolucionesService = inject(EvolucionesFirestoreService);
  private databaseService = inject(DatabaseService);
  private rutinasService = inject(RutinasFirestoreService);
  private testTemplatesService = inject(TestTemplatesFirestoreService);

  patientId = '';
  pacienteNombre = 'Paciente';
  pacienteDiagnostico = '';
  numeroSesion = 1;
  sesionesPlanificadas = 10;
  guardando = false;

  rutinasDisponibles: any[] = [];
  rutinaSeleccionada: any = null;
  testsDisponibles: TestTemplate[] = [];
  testSeleccionado: TestTemplate | null = null;
  respuestasTest: number[] = [];

  private rutinasSub?: Subscription;

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

  tecnicasDisponibles: string[] = [
    'Masoterapia',
    'Movilización articular',
    'Ejercicio terapéutico',
    'Electroterapia',
    'Termoterapia',
    'Crioterapia',
    'Punción seca',
    'Vendaje neuromuscular',
    'Estiramiento',
    'Educación al paciente'
  ];

  form = this.fb.group({
    tipoEvolucion: this.fb.nonNullable.control<TipoEvolucion>('progress'),
    painScale: this.fb.control<number | null>(null, Validators.required),
    sleepQuality: this.fb.nonNullable.control(3),
    zonaTratamiento: this.fb.nonNullable.control(''),
    tecnicasAplicadas: this.fb.nonNullable.control<string[]>([]),
    rom: this.fb.nonNullable.control(''),
    ejerciciosRealizados: this.fb.nonNullable.control(false),
    subjective: this.fb.nonNullable.control('', Validators.required),
    objective: this.fb.nonNullable.control('', Validators.required),
    assessment: this.fb.nonNullable.control(''),
    plan: this.fb.nonNullable.control(''),
    rutinaId: this.fb.control<string | null>(null),
    rutinaNombre: this.fb.nonNullable.control(''),
    test: this.fb.group({
      testId: this.fb.nonNullable.control(''),
      testNombre: this.fb.nonNullable.control(''),
      puntajeTotal: this.fb.nonNullable.control(0),
      resultado: this.fb.nonNullable.control('')
    })
  });

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    this.patientId = params.get('patientId') || params.get('pacienteId') || '';
    this.pacienteNombre = params.get('pacienteNombre') || 'Paciente';
    this.pacienteDiagnostico = params.get('diagnostico') || '';

    this.cargarContexto();
  }

  ngOnDestroy(): void {
    this.rutinasSub?.unsubscribe();
  }

  async cargarContexto(): Promise<void> {
    if (!this.patientId) return;

    await Promise.all([
      this.cargarDatosPaciente(),
      this.cargarNumeroSesion(),
      this.cargarTestsDisponibles()
    ]);

    this.cargarRutinasDisponibles();
  }

  async cargarDatosPaciente(): Promise<void> {
    if (!this.patientId) return;

    const pacientes = await this.databaseService.getPacientes();
    const p = pacientes.find((pac: any) => String(pac.id) === String(this.patientId));

    if (p) {
      this.pacienteNombre = p.nombre || this.pacienteNombre;
      this.pacienteDiagnostico = p.diagnostico || '';
      this.sesionesPlanificadas = p.sesionesPlanificadas || 10;
    }
  }

  async cargarNumeroSesion(): Promise<void> {
    if (!this.patientId) return;
    this.numeroSesion = await this.evolucionesService.getNextSessionNumber(this.patientId);
  }

  cargarRutinasDisponibles(): void {
    if (!this.patientId) return;

    this.rutinasSub = this.rutinasService.getRutinasPorPacienteRealtime(this.patientId).subscribe((rutinas) => {
      this.rutinasDisponibles = rutinas.filter((r) => r.estado === 'active');
    });
  }

  async cargarTestsDisponibles(): Promise<void> {
    this.testsDisponibles = await this.testTemplatesService.getTests();
  }

  toggleTecnica(tecnica: string): void {
    const actuales = [...(this.form.controls.tecnicasAplicadas.value || [])];
    const existe = actuales.includes(tecnica);
    const nuevas = existe ? actuales.filter((t) => t !== tecnica) : [...actuales, tecnica];
    this.form.controls.tecnicasAplicadas.setValue(nuevas);
  }

  tecnicaActiva(tecnica: string): boolean {
    return (this.form.controls.tecnicasAplicadas.value || []).includes(tecnica);
  }

  actualizarSueno(valor: number): void {
    this.form.controls.sleepQuality.setValue(valor);
  }

  seleccionarRutina(event: Event): void {
    const rutinaId = (event as CustomEvent).detail?.value;
    this.rutinaSeleccionada = this.rutinasDisponibles.find((r) => r.id === rutinaId) || null;

    this.form.patchValue({
      rutinaId: this.rutinaSeleccionada?.id || null,
      rutinaNombre: this.rutinaSeleccionada?.nombre || ''
    });
  }

  seleccionarTest(event: Event): void {
    const testId = (event as CustomEvent).detail?.value;
    this.testSeleccionado = this.testsDisponibles.find((t) => t.id === testId) || null;

    if (!this.testSeleccionado) {
      this.respuestasTest = [];
      this.form.controls.test.patchValue({
        testId: '',
        testNombre: '',
        puntajeTotal: 0,
        resultado: ''
      });
      return;
    }

    this.respuestasTest = this.testSeleccionado.preguntas.map(() => 0);
    this.calcularPuntajeTest();
  }

  actualizarRespuestaTest(index: number, event: Event): void {
    const value = Number((event as CustomEvent).detail?.value || 0);
    this.respuestasTest[index] = value;
    this.calcularPuntajeTest();
  }

  calcularPuntajeTest(): void {
    const puntajeTotal = this.respuestasTest.reduce((sum, val) => sum + (val || 0), 0);

    const rango = this.testSeleccionado?.rangos.find(
      (r) => puntajeTotal >= r.min && puntajeTotal <= r.max
    );

    this.form.controls.test.patchValue({
      testId: this.testSeleccionado?.id || '',
      testNombre: this.testSeleccionado?.nombre || '',
      puntajeTotal,
      resultado: rango?.nombre || 'Sin clasificación'
    });
  }

  getResultadoColor(): string {
    const puntaje = this.form.controls.test.controls.puntajeTotal.value;
    const rango = this.testSeleccionado?.rangos.find((r) => puntaje >= r.min && puntaje <= r.max);
    return rango?.color || '#6b7280';
  }

  getProgresoSesiones(): number {
    return Math.min((this.numeroSesion / this.sesionesPlanificadas) * 100, 100);
  }

  async guardarEvolucion(): Promise<void> {
    if (!this.patientId) {
      await this.mostrarToast('Falta patientId para guardar evolución.', 'danger');
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      await this.mostrarToast('Completa EVA, Subjetivo y Objetivo.', 'warning');
      return;
    }

    const value = this.form.getRawValue();
    const testValue = value.test;

    this.guardando = true;

    try {
      await this.evolucionesService.createEvolucion({
        patientId: this.patientId,
        tipoEvolucion: value.tipoEvolucion,
        painScale: value.painScale,
        sleepQuality: value.sleepQuality,
        zonaTratamiento: value.zonaTratamiento || null,
        tecnicasAplicadas: value.tecnicasAplicadas,
        rom: value.rom || null,
        ejerciciosRealizados: value.ejerciciosRealizados,
        subjective: value.subjective.trim(),
        objective: value.objective.trim(),
        assessment: value.assessment.trim(),
        plan: value.plan.trim(),
        rutinaId: value.rutinaId || undefined,
        rutinaNombre: value.rutinaNombre || undefined,
        test: testValue.testId
          ? {
              testId: testValue.testId,
              testNombre: testValue.testNombre,
              puntajeTotal: testValue.puntajeTotal,
              resultado: testValue.resultado
            }
          : undefined
      });

      await this.mostrarToast('Evolución guardada correctamente.', 'success');
      this.volver();
    } catch (error) {
      console.error('Error guardando evolución:', error);
      await this.mostrarToast('No se pudo guardar la evolución.', 'danger');
    } finally {
      this.guardando = false;
    }
  }

  irACrearRutina(): void {
    this.navCtrl.navigateRoot('/ejercicios', {
      queryParams: {
        pacienteId: this.patientId,
        pacienteNombre: this.pacienteNombre
      }
    });
  }

  volver(): void {
    this.navCtrl.navigateBack('/paciente-detalle', {
      queryParams: { pacienteId: this.patientId }
    });
  }

  onContentClick(event: Event): void {
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

  private async mostrarToast(message: string, color: 'success' | 'warning' | 'danger'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      color,
      position: 'bottom'
    });

    await toast.present();
  }
}
