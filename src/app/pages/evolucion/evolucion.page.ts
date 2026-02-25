import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { IonicModule, ModalController, NavController, ToastController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { SleepQualityComponent } from '../../components/sleep-quality/sleep-quality.component';
import { ArticulacionRom, RomEntry, TipoEvolucion } from '../../models/evolucion.model';
import { TestTemplate } from '../../models/test-template.model';
import { DatabaseService } from '../../services/database.service';
import { EvolucionesFirestoreService } from '../../services/evoluciones-firestore.service';
import { RutinasFirestoreService } from '../../services/rutinas-firestore.service';
import { TestTemplatesFirestoreService } from '../../services/test-templates-firestore.service';
import { EjerciciosPage } from '../ejercicios/ejercicios.page';

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
  standalone: true,
  imports: [IonicModule, CommonModule, ReactiveFormsModule, SleepQualityComponent]
})
export class EvolucionPage implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private navCtrl = inject(NavController);
  private modalCtrl = inject(ModalController);
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
  modulosColapsablesAbiertos: string[] = [];

  rutinasDisponibles: any[] = [];
  rutinaSeleccionada: any = null;
  testsDisponibles: TestTemplate[] = [];
  testSeleccionado: TestTemplate | null = null;
  respuestasTest: number[] = [];
  pacienteActual: any | null = null;
  articulacionNuevaControl = this.fb.control<string | null>(null);

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

  ngOnInit(): void {

    const params = this.route.snapshot.queryParamMap;

    this.patientId = params.get('patientId') || params.get('pacienteId') || '';
    this.pacienteNombre = params.get('pacienteNombre') || 'Paciente';
    this.pacienteDiagnostico = params.get('diagnostico') || '';

    // 👇 Bloqueo dinámico zona principal
    this.setupZonaPrincipalLock();

    // Aplicar estado inicial correctamente
    const tipoActual = this.form.get('tipoEvolucion')?.value;
    this.applyZonaLock(tipoActual);

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
    this.actualizarModulosColapsablesAbiertos();
  }

  async cargarDatosPaciente(): Promise<void> {
    if (!this.patientId) return;

    const p = await this.databaseService.getPaciente(this.patientId);
    if (!p) return;

    this.pacienteActual = p;
    this.pacienteNombre = p.nombre || this.pacienteNombre;
    this.pacienteDiagnostico = p.diagnostico || '';
    this.sesionesPlanificadas = p.sesionesPlanificadas || 10;

    const zonaPrincipal = p.zonaPrincipal || '';
    this.form.patchValue({ zonaTratamiento: zonaPrincipal });

    this.romArray.clear();
    if (zonaPrincipal) {
      this.agregarArticulacionARom(zonaPrincipal);
    }

    const secundarias: string[] = Array.isArray(p.articulacionesSecundarias) ? p.articulacionesSecundarias : [];
    secundarias.forEach((art) => this.agregarArticulacionARom(art));
  }

  async cargarNumeroSesion(): Promise<void> {
    if (!this.patientId) return;
    this.numeroSesion = await this.evolucionesService.getNextSessionNumber(this.patientId);
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

  onTipoEvolucionChange(event: Event): void {
    const tipo = (event as CustomEvent).detail?.value as TipoEvolucion;
    this.form.controls.tipoEvolucion.setValue(tipo);

    if (tipo !== 'initial') {
      this.form.controls.zonaTratamiento.disable({ emitEvent: false });
    } else {
      this.form.controls.zonaTratamiento.enable({ emitEvent: false });
    }
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

  async onZonaPrincipalChange(event: Event): Promise<void> {
    if (this.zonaPrincipalBloqueada) return;

    const zona = (event as CustomEvent).detail?.value as string;
    this.form.controls.zonaTratamiento.setValue(zona || '');

    if (!zona) return;

    if (!this.existeArticulacionEnRom(zona)) {
      this.agregarArticulacionARom(zona);
    }

    await this.persistirArticulacionesPaciente();
    this.actualizarModulosColapsablesAbiertos();
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

  private async persistirArticulacionPacienteConVerificacion(articulacion: string): Promise<void> {
    if (!this.patientId) return;

    const existeEnOtra = await this.evolucionesService.existsArticulacionEnOtrasEvoluciones(
      this.patientId,
      articulacion
    );

    if (existeEnOtra) {
      await this.mostrarToast('La articulación se mantiene en paciente por historial clínico existente.', 'warning');
      return;
    }

    await this.persistirArticulacionesPaciente();
    this.actualizarModulosColapsablesAbiertos();
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
    if (!this.patientId) return;

    const zonaPrincipal = this.form.controls.zonaTratamiento.getRawValue() || '';
    const todas = this.romArray.controls.map((ctrl) => ctrl.controls['articulacion'].value);
    const secundarias = todas.filter((art) => art !== zonaPrincipal);

    await this.databaseService.updatePaciente(this.patientId, {
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

    if (value.tipoEvolucion === 'progress') {
      const existeInitial = await this.evolucionesService.existeEvaluacionInicial(this.patientId);
      if (!existeInitial) {
        await this.mostrarToast('Primero debes registrar una evaluación inicial para este paciente.', 'warning');
        return;
      }
    }

    const testValue = value.test;
    const romPayload = this.sanitizarRom(this.construirRomPayload());

    this.guardando = true;

    try {
      await this.evolucionesService.createEvolucion({
        patientId: this.patientId,
        tipoEvolucion: value.tipoEvolucion,
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
      const message = error instanceof Error && error.message.includes('evaluación inicial')
        ? 'Primero debes registrar una evaluación inicial para este paciente.'
        : 'No se pudo guardar la evolución.';
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
    this.form.get('tipoEvolucion')?.valueChanges.subscribe((tipo) => {
      this.applyZonaLock(tipo);
    });
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
}
