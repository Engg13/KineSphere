import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { IonicModule, ModalController, NavController, ToastController } from '@ionic/angular';
import { Subscription, firstValueFrom } from 'rxjs';
import { SleepQualityComponent } from '../../components/sleep-quality/sleep-quality.component';
import { ArticulacionRom, RomEntry, TipoEvolucion } from '../../models/evolucion.model';
import { TestTemplate } from '../../models/test-template.model';
import { EvolucionesFirestoreService } from '../../services/evoluciones-firestore.service';
import { RutinasFirestoreService } from '../../services/rutinas-firestore.service';
import { TestTemplatesFirestoreService } from '../../services/test-templates-firestore.service';
import { FlujoClinicoService} from '../../services/flujoclinico.service';
import { PacientesService} from '../../services/pacientes.service';
import { EjerciciosPage } from '../ejercicios/ejercicios.page';
import { Chart } from 'chart.js/auto';
import { AuthService } from 'src/app/services/auth.service';
import { ObjetivoClinico } from '../../models/evolucion.model';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TratamientosService } from '../../services/tratamientos.service';

const ROM_CONFIG: Record<string, string[]> = {
  Hombro: ['Flexión', 'Extensión', 'Abducción', 'Aducción', 'Rotación interna', 'Rotación externa'],
  Codo: ['Flexión', 'Extensión', 'Pronación', 'Supinación'],
  'Muñeca/Mano': ['Flexión', 'Extensión', 'Desviación radial', 'Desviación cubital'],
  Cadera: ['Flexión', 'Extensión', 'Abducción', 'Aducción', 'Rotación interna', 'Rotación externa'],
  Rodilla: ['Flexión', 'Extensión'],
  'Tobillo/Pie': ['Dorsiflexión', 'Flexión plantar', 'Inversión', 'Eversión'],
  'Columna cervical': ['Flexión', 'Extensión', 'Rotación derecha', 'Rotación izquierda', 'Inclinación derecha', 'Inclinación izquierda'],
  'Columna dorsal': ['Flexión', 'Extensión', 'Rotación derecha', 'Rotación izquierda'],
  'Columna lumbar': ['Flexión', 'Extensión', 'Rotación derecha', 'Rotación izquierda', 'Inclinación derecha', 'Inclinación izquierda'],
  ATM: ['Apertura', 'Lateralidad derecha', 'Lateralidad izquierda', 'Protrusión']
};

@Component({
  selector: 'app-evolucion',
  templateUrl: './evolucion.page.html',
  styleUrls: ['./evolucion.page.scss'],
  imports: [IonicModule, CommonModule, ReactiveFormsModule, SleepQualityComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  standalone: true,
})
export class EvolucionPage implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private navCtrl = inject(NavController);
  private modalCtrl = inject(ModalController);
  private toastCtrl = inject(ToastController);
  private evolucionesService = inject(EvolucionesFirestoreService);
  private pacientesService = inject(PacientesService);
  private rutinasService = inject(RutinasFirestoreService);
  private testTemplatesService = inject(TestTemplatesFirestoreService);
  private flujoClinicoService = inject(FlujoClinicoService);
  private authService = inject(AuthService);
  private tratamientosService = inject(TratamientosService);
  private usarDatosDemo = true;
   // 🔥 poner en false en producción

  patientId = '';
  pacienteNombre = 'Paciente';
  pacienteDiagnostico = '';
  numeroSesion = 1;
  sesionesPlanificadas = 10;
  guardando = false;
  modulosColapsablesAbiertos: string[] = [];
  treatmentId: string | null = null;
  mode: TipoEvolucion = 'progress';

  rutinasDisponibles: any[] = [];
  rutinaSeleccionada: any = null;
  testsDisponibles: TestTemplate[] = [];
  testSeleccionado: TestTemplate | null = null;
  respuestasTest: number[] = [];
  pacienteActual: any | null = null;
  testInicial?: number;
  testFinal?: number;
  resultadoTestInicial?: string;
  resultadoTestFinal?: string;
  articulacionNuevaControl = this.fb.control<string | null>(null);
  evaChart?: Chart;
  evaData: number[] = [];
  evaLabels: string[] = [];
  cargando = true;

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
    rom: this.fb.array<FormGroup>([]),
    ejerciciosRealizados: this.fb.nonNullable.control(false),
    subjective: this.fb.nonNullable.control('', Validators.required),
    objective: this.fb.nonNullable.control('', Validators.required),
    assessment: this.fb.nonNullable.control(''),
    plan: this.fb.nonNullable.control(''),
    rutinaId: this.fb.control<string | null>(null),
    rutinaNombre: this.fb.nonNullable.control(''),
    objetivos: this.fb.array<FormGroup>([]),
    test: this.fb.group({
    testId: this.fb.nonNullable.control(''),
    testNombre: this.fb.nonNullable.control(''),
    puntajeTotal: this.fb.nonNullable.control(0),
    resultado: this.fb.nonNullable.control('')
    })
  });

  get romArray(): FormArray<FormGroup> {
    return this.form.controls.rom;
  }

  get articulacionesDisponiblesParaAgregar(): string[] {
    const usadas = new Set(this.romArray.controls.map((ctrl) => ctrl.controls['articulacion'].value));
    return Object.keys(ROM_CONFIG).filter((art) => !usadas.has(art));
  }

  get zonaPrincipalBloqueada(): boolean {
    return this.form.controls.tipoEvolucion.value !== 'initial';
  }

  get esTipoProgress(): boolean {
    return this.form.controls.tipoEvolucion.value === 'progress';
  }

  get heroTitulo(): string {
    const tipo = this.form.controls.tipoEvolucion.value;

    if (tipo === 'initial') return 'Evaluación Inicial';
    if (tipo === 'discharge') return 'Evaluación de Alta';
    return `Sesión ${this.numeroSesion}`;
  }

  get objetivosArray(): FormArray<FormGroup> {
  return this.form.controls.objetivos as FormArray<FormGroup>;
  }

  get esInitial(): boolean {
    return this.form.controls.tipoEvolucion.value === 'initial';
  }

  get esDischarge(): boolean {
    return this.form.controls.tipoEvolucion.value === 'discharge';
  }

  get diferenciaTest(): number | null {
    if (this.testInicial != null && this.testFinal != null) {
      return this.testFinal - this.testInicial;
      }
  return null;
  }

  async ngOnInit(): Promise<void> {setTimeout(() => {
  document.body.style.background = 'red';
}, 500);

    const params = this.route.snapshot.queryParamMap;

    this.patientId = params.get('patientId') || params.get('pacienteId') || '';
    this.pacienteNombre = params.get('pacienteNombre') || 'Paciente';
    this.pacienteDiagnostico = params.get('diagnostico') || '';
    this.mode = (params.get('mode') as TipoEvolucion) || 'progress';
    this.treatmentId = params.get('treatmentId');

    this.form.controls.tipoEvolucion.setValue(this.mode, { emitEvent: false });
    this.form.controls.tipoEvolucion.disable({ emitEvent: false });

    this.setupZonaPrincipalLock();

    const tipoActual = this.form.get('tipoEvolucion')?.value;
    this.applyZonaLock(tipoActual);
    this.actualizarEstadoObjetivos();

    this.form.get('tipoEvolucion')?.valueChanges.subscribe(async (tipo) => {
      this.applyZonaLock(tipo);
      this.actualizarEstadoObjetivos();

      if (tipo === 'discharge') {
        await this.cargarEvaluacionInicial();
        const evoluciones = await this.cargarEvolucionesParaGrafico();
        this.construirDatosEva(evoluciones);
        setTimeout(() => this.crearGraficoEva(), 0);
      }
    });

    this.form.get('test')?.valueChanges.subscribe((test) => {
      if (this.esDischarge && test?.puntajeTotal != null) {
        this.testFinal = test.puntajeTotal;
        this.resultadoTestFinal = test.resultado;
      }
    });
    console.log('EvolucionPage INIT');

    try {
      await this.cargarContexto();
    } catch (error) {
      console.error('Error en cargarContexto:', error);
    } finally {
      
      this.cargando = false;
      console.log('Cargando terminó:', this.cargando);
    }
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
    this.actualizarModulosColapsablesAbiertos();
  }

  async cargarDatosPaciente(): Promise<void> {
    if (!this.patientId) return;

    // 1️⃣ Cargar paciente (identidad)
    const paciente = await this.pacientesService.getById(this.patientId);
    if (!paciente) return;

    this.pacienteActual = paciente;
    this.pacienteNombre = paciente.nombre || this.pacienteNombre;
    this.pacienteDiagnostico = paciente.diagnostico || '';

    // 2️⃣ Cargar tratamiento activo
    const tratamiento = await this.tratamientosService.getActivoByPaciente(this.patientId);
    if (!tratamiento) return;

    const zonaPrincipal = tratamiento.zonaPrincipal || '';
    const secundarias = tratamiento.articulacionesSecundarias || [];

    this.form.patchValue({ zonaTratamiento: zonaPrincipal });

    this.romArray.clear();

    if (zonaPrincipal) {
      this.agregarArticulacionARom(zonaPrincipal);
    }

    secundarias.forEach((art) => this.agregarArticulacionARom(art));
  }

  async cargarNumeroSesion(): Promise<void> {
    const tipo = this.form.controls.tipoEvolucion.getRawValue();
    if (tipo !== 'progress') {
      this.numeroSesion = 0;
      return;
    }

    const totalSesiones = await this.obtenerTotalSesionesTratamiento();
    this.numeroSesion = totalSesiones + 1;
  }

  async cargarEvaluacionInicial(): Promise<void> {
    const initial = await this.evolucionesService.getEvaluacionInicial(this.patientId);

    if (!initial) return;

    // 👇 Guardar baseline del test
    if (initial.test) {
      this.testInicial = initial.test.puntajeTotal;
      this.resultadoTestInicial = initial.test.resultado;
    }

    if (!initial.objetivos) return;

    this.objetivosArray.clear();

    initial.objetivos.forEach((obj) => {
      this.objetivosArray.push(
        this.fb.group({
          descripcion: [obj.descripcion],
          indicador: [obj.indicador],
          tiempoEstimado: [obj.tiempoEstimado],
          logrado: [false]
        })
      );
    });

    this.actualizarEstadoObjetivos();
  }

  private crearObjetivoGroup(): FormGroup {
    return this.fb.group({
      descripcion: this.fb.nonNullable.control('', Validators.required),
      indicador: this.fb.nonNullable.control(''),
      tiempoEstimado: this.fb.nonNullable.control(''),
      logrado: this.fb.nonNullable.control(false)
    });
  }

  agregarObjetivo(): void {
    this.objetivosArray.push(this.crearObjetivoGroup());
  }

  eliminarObjetivo(index: number): void {
    this.objetivosArray.removeAt(index);
  }

  cargarRutinasDisponibles(): void {
    if (!this.patientId) return;

    this.rutinasSub?.unsubscribe();

    this.rutinasSub = this.rutinasService.getRutinasPorPacienteRealtime(this.patientId).subscribe((rutinas) => {
      this.rutinasDisponibles = rutinas.filter((r) => r.estado === 'active');
    });
  }

  async cargarTestsDisponibles(): Promise<void> {
    this.testsDisponibles = await this.testTemplatesService.getTests();
  }

  async onTipoEvolucionChange(event: Event): Promise<void> {
    this.form.controls.tipoEvolucion.setValue(this.mode, { emitEvent: false });
  }

  toggleTecnica(tecnica: string): void {
    const actuales = [...(this.form.controls.tecnicasAplicadas.value || [])];
    const existe = actuales.includes(tecnica);
    const nuevas = existe ? actuales.filter((t) => t !== tecnica) : [...actuales, tecnica];
    this.form.controls.tecnicasAplicadas.setValue(nuevas);
    this.actualizarModulosColapsablesAbiertos();
  }

  tecnicaActiva(tecnica: string): boolean {
    return (this.form.controls.tecnicasAplicadas.value || []).includes(tecnica);
  }

  actualizarSueno(valor: number): void {
    this.form.controls.sleepQuality.setValue(valor);
  }

  private regenerarRomPrincipal(articulacion: string): void {

    // Limpiar completamente el FormArray ROM
    while (this.romArray.length) {
      this.romArray.removeAt(0);
    }

    // Generar nueva articulación limpia
    this.agregarArticulacionARom(articulacion);
  }

  async onZonaPrincipalChange(event: Event): Promise<void> {

    if (this.zonaPrincipalBloqueada) return;

    const zona = (event as CustomEvent).detail?.value as string;
    if (!zona) return;

    this.form.controls.zonaTratamiento.setValue(zona);

    const tipo = this.form.get('tipoEvolucion')?.value;

    // 🔥 SOLO en evaluación inicial reemplazamos completamente el ROM
    if (tipo === 'initial') {

      this.regenerarRomPrincipal(zona);

    } else {

      // Comportamiento actual para otros casos
      if (!this.existeArticulacionEnRom(zona)) {
        this.agregarArticulacionARom(zona);
      }

    }

    await this.persistirArticulacionesPaciente();
  }

  async agregarArticulacionSeleccionada(): Promise<void> {
    const articulacionNueva = this.articulacionNuevaControl.value;
    if (!articulacionNueva) return;

    if (this.existeArticulacionEnRom(articulacionNueva)) {
      await this.mostrarToast('La articulación ya está agregada.', 'warning');
      return;
    }

    this.agregarArticulacionARom(articulacionNueva);
    this.articulacionNuevaControl.setValue(null);
    await this.persistirArticulacionesPaciente();
    this.actualizarModulosColapsablesAbiertos();
  }

  async eliminarArticulacion(index: number): Promise<void> {
    const artCtrl = this.romArray.at(index);
    const articulacion = artCtrl.controls['articulacion'].value;

    this.romArray.removeAt(index);

    if (articulacion === this.form.controls.zonaTratamiento.value) {
      this.form.controls.zonaTratamiento.setValue('');
    }

    await this.persistirArticulacionPacienteConVerificacion(articulacion);
    this.actualizarModulosColapsablesAbiertos();
  }

  private async persistirArticulacionPacienteConVerificacion(_: string): Promise<void> {
    await this.persistirArticulacionesPaciente();
  }

  private existeArticulacionEnRom(articulacion: string): boolean {
    return this.romArray.controls.some((ctrl) => ctrl.controls['articulacion'].value === articulacion);
  }

  private agregarArticulacionARom(articulacion: string): void {
    const movimientos = (ROM_CONFIG[articulacion] || ['Flexión']).map((mov) => this.crearMovimientoGroup(mov));

    const articulacionGroup = this.fb.group({
      articulacion: this.fb.nonNullable.control(articulacion),
      movimientos: this.fb.array(movimientos)
    });

    this.romArray.push(articulacionGroup);
  }

  private crearMovimientoGroup(movimiento: string): FormGroup {
    return this.fb.group({
      movimiento: this.fb.nonNullable.control(movimiento),
      unidad: this.fb.nonNullable.control<'grados'>('grados'),
      aromValor: this.fb.control<number | null>(null),
      aromDolor: this.fb.control<number | null>(null),
      promValor: this.fb.control<number | null>(null),
      promDolor: this.fb.control<number | null>(null),
      observacion: this.fb.nonNullable.control('')
    });
  }

  getMovimientosArray(articulacionIndex: number): FormArray<FormGroup> {
    return this.romArray.at(articulacionIndex).controls['movimientos'] as FormArray<FormGroup>;
  }

  private construirRomPayload(): ArticulacionRom[] {
    return this.romArray.controls.map((artCtrl) => {
      const articulacion = artCtrl.controls['articulacion'].value;
      const movimientosArray = artCtrl.controls['movimientos'] as FormArray<FormGroup>;

      const movimientos: RomEntry[] = movimientosArray.controls.map((movCtrl) => {
        const aromValor = movCtrl.controls['aromValor'].value;
        const aromDolor = movCtrl.controls['aromDolor'].value;
        const promValor = movCtrl.controls['promValor'].value;
        const promDolor = movCtrl.controls['promDolor'].value;
        const observacion = (movCtrl.controls['observacion'].value || '').trim();

        return {
          movimiento: movCtrl.controls['movimiento'].value,
          unidad: 'grados',
          arom: { valor: aromValor, dolor: aromDolor },
          prom: { valor: promValor, dolor: promDolor },
          observacion: observacion || undefined
        };
      });

      return { articulacion, movimientos };
    });
  }

  private sanitizarRom(rom: ArticulacionRom[]): ArticulacionRom[] {
    return rom
      .map((art) => ({
        ...art,
        movimientos: art.movimientos.filter((mov) =>
          !((mov.arom?.valor ?? null) === null && (mov.prom?.valor ?? null) === null)
        )
      }))
      .filter((art) => art.movimientos.length > 0);
  }

  private async persistirArticulacionesPaciente(): Promise<void> {
    if (!this.treatmentId) return;

    const zonaPrincipal = this.form.controls.zonaTratamiento.getRawValue() || '';
    const todas = this.romArray.controls.map((ctrl) => ctrl.controls['articulacion'].value);
    const secundarias = todas.filter((art) => art !== zonaPrincipal);

    await this.tratamientosService.update(this.treatmentId, {
      zonaPrincipal,
      articulacionesSecundarias: secundarias
    });
  }

  seleccionarRutina(event: Event): void {
    const rutinaId = (event as CustomEvent).detail?.value;
    this.rutinaSeleccionada = this.rutinasDisponibles.find((r) => r.id === rutinaId) || null;

    this.form.patchValue({
      rutinaId: this.rutinaSeleccionada?.id || null,
      rutinaNombre: this.rutinaSeleccionada?.nombre || ''
    });
    this.actualizarModulosColapsablesAbiertos();
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
      this.actualizarModulosColapsablesAbiertos();
      return;
    }

    this.respuestasTest = this.testSeleccionado.preguntas.map(() => 0);
    this.calcularPuntajeTest();
    this.actualizarModulosColapsablesAbiertos();
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
    this.actualizarModulosColapsablesAbiertos();
  }

  getResultadoColor(): string {
    const puntaje = this.form.controls.test.controls.puntajeTotal.value;
    const rango = this.testSeleccionado?.rangos.find((r) => puntaje >= r.min && puntaje <= r.max);
    return rango?.color || '#6b7280';
  }


  private tieneDatosRom(): boolean {
    return this.romArray.controls.some((artCtrl) => {
      const movimientosArray = artCtrl.controls['movimientos'] as FormArray<FormGroup>;
      return movimientosArray.controls.some((movCtrl) =>
        (movCtrl.controls['aromValor'].value ?? null) !== null ||
        (movCtrl.controls['promValor'].value ?? null) !== null ||
        !!(movCtrl.controls['observacion'].value || '').trim()
      );
    });
  }

  private tieneDatosTecnicas(): boolean {
    return (this.form.controls.tecnicasAplicadas.value || []).length > 0;
  }

  private tieneDatosRutina(): boolean {
    return !!this.form.controls.rutinaId.value;
  }

  private tieneDatosTest(): boolean {
    return !!this.form.controls.test.controls.testId.value;
  }

  private actualizarModulosColapsablesAbiertos(): void {
    const abiertos: string[] = [];

    if (this.tieneDatosRom()) abiertos.push('rom');
    if (this.tieneDatosTecnicas()) abiertos.push('tecnicas');
    if (this.tieneDatosTest()) abiertos.push('test');
    if (this.tieneDatosRutina()) abiertos.push('rutina');

    this.modulosColapsablesAbiertos = abiertos;
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
    const romPayload = this.sanitizarRom(this.construirRomPayload());
    const objetivosPayload: ObjetivoClinico[] = this.objetivosArray.controls.map(ctrl => ({
      descripcion: (ctrl.get('descripcion')?.value || '').trim(),
      indicador: ctrl.get('indicador')?.value || undefined,
      tiempoEstimado: ctrl.get('tiempoEstimado')?.value || undefined,
      logrado: ctrl.get('logrado')?.value ?? false
    }));
    const payload = {
      painScale: value.painScale,
      sleepQuality: value.sleepQuality,
      zonaTratamiento: value.zonaTratamiento || null,
      tecnicasAplicadas: value.tecnicasAplicadas,
      rom: romPayload,
      ejerciciosRealizados: value.ejerciciosRealizados,
      subjective: value.subjective.trim(),
      objective: value.objective.trim(),
      assessment: value.assessment.trim(),
      plan: value.plan.trim(),
      rutinaId: value.rutinaId || undefined,
      rutinaNombre: value.rutinaNombre || undefined,
      objetivos: objetivosPayload,
      test: value.test?.testId
        ? {
            testId: value.test.testId,
            testNombre: value.test.testNombre,
            puntajeTotal: value.test.puntajeTotal,
            resultado: value.test.resultado
          }
        : undefined
    };

    if (this.mode !== 'initial' && !this.treatmentId) {
      await this.mostrarToast('Falta treatmentId para registrar la evolución.', 'danger');
      return;
    }

    this.guardando = true;

    try {
      if (this.mode === 'initial') {
        await this.flujoClinicoService.crearEvaluacionInicial(
          this.patientId,
          payload
        );
      } else if (this.mode === 'progress') {
        await this.flujoClinicoService.crearSesionProgreso(
          this.treatmentId!,
          payload
        );
      } else {
        await this.flujoClinicoService.finalizarTratamiento(
          this.treatmentId!,
          payload
        );
      }

      await this.mostrarToast('Evolución guardada correctamente.', 'success');
      this.volver();
    } catch (error) {
      console.error('Error guardando evolución:', error);
      const message = error instanceof Error ? error.message : 'No se pudo guardar la evolución.';
      await this.mostrarToast(message, 'danger');
    } finally {
      this.guardando = false;
    }
  }

  async irACrearRutina(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: EjerciciosPage,
      componentProps: {
        pacienteId: this.patientId,
        pacienteNombre: this.pacienteNombre,
        openedAsModal: true
      }
    });

    await modal.present();

    const { data } = await modal.onDidDismiss<{ rutinaCreada?: boolean }>();

    if (data?.rutinaCreada) {
      this.cargarRutinasDisponibles();
      this.actualizarModulosColapsablesAbiertos();
      await this.mostrarToast('Rutinas actualizadas.', 'success');
    }
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

  private setupZonaPrincipalLock(): void {
    this.applyZonaLock(this.form.get('tipoEvolucion')?.getRawValue() ?? this.mode);
  }

  private applyZonaLock(tipo: TipoEvolucion | null): void {
    const zonaControl = this.form.get('zonaTratamiento');

    if (!zonaControl) return;

    if (tipo !== 'initial') {
      zonaControl.disable({ emitEvent: false });
    } else {
      zonaControl.enable({ emitEvent: false });
    }
  }

  private actualizarEstadoObjetivos(): void {
    const esInitial = this.esInitial;
    const esDischarge = this.esDischarge;

    this.objetivosArray.controls.forEach(ctrl => {
      if (esInitial) {
        ctrl.get('logrado')?.disable({ emitEvent: false });
      } else if (esDischarge) {
        ctrl.get('logrado')?.enable({ emitEvent: false });
      } else {
        ctrl.get('logrado')?.disable({ emitEvent: false });
      }
    });
  }

  private construirDatosEva(evoluciones: any[]): void {

    if (this.usarDatosDemo && evoluciones.length < 3) {
      // 🔥 Datos simulados
      this.evaLabels = ['Inicial', 'S1', 'S2', 'S3', 'S4', 'Alta'];
      this.evaData = [8, 7, 6, 4, 3, 1];
      return;
    }

    const ordenadas = evoluciones
      .filter(e => e.painScale != null)
      .sort((a, b) => a.createdAt?.seconds - b.createdAt?.seconds);

    this.evaData = ordenadas.map(e => e.painScale);

    this.evaLabels = ordenadas.map((e, index) =>
      e.tipoEvolucion === 'initial'
        ? 'Inicial'
        : e.tipoEvolucion === 'discharge'
          ? 'Alta'
          : `S${index}`
    );
  }

  private async obtenerTotalSesionesTratamiento(): Promise<number> {
    if (!this.treatmentId) return 0;

    const tratamiento = await this.tratamientosService.getById(this.treatmentId);
    return Number(tratamiento?.totalSesiones || 0);
  }

  private async cargarEvolucionesParaGrafico(): Promise<any[]> {
    const evolucionesServiceAny = this.evolucionesService as any;

    if (this.treatmentId && evolucionesServiceAny.getEvolucionesByTratamientoRealtime) {
      return firstValueFrom(evolucionesServiceAny.getEvolucionesByTratamientoRealtime(this.treatmentId));
    }

    return firstValueFrom(this.evolucionesService.getEvolucionesByPacienteRealtime(this.patientId));
  }

  private crearGraficoEva(): void {
    const ctx = document.getElementById('evaChart') as HTMLCanvasElement;
    if (!ctx) return;

    if (this.evaChart) {
      this.evaChart.destroy();
    }

    this.evaChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.evaLabels,
        datasets: [{
          label: 'EVA',
          data: this.evaData,
          tension: 0.3,
          borderWidth: 2,
          fill: true
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            min: 0,
            max: 10
          }
        }
      }
    });
  }
  
}
