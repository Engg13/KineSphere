import { Component } from '@angular/core';
import { NavController, AlertController, ViewWillEnter, IonicModule } from '@ionic/angular';
import { NgIf, NgFor } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TestPregunta, TestRangoResultado, TestTemplate } from '../../models/test-template.model';
import { TestTemplatesFirestoreService } from '../../services/test-templates-firestore.service';
import { TESTS_PREDETERMINADOS } from '../../core/constant/clinical-tests.constants'


@Component({
    selector: 'app-tests-config',
    templateUrl: './tests-config.page.html',
    styleUrls: ['./tests-config.page.scss'],
    standalone: true,
    imports: [IonicModule, NgIf, NgFor, FormsModule]
})
export class TestsConfigPage implements ViewWillEnter {
  tests: TestTemplate[] = [];
  modoCrear = false;
  modoEditar = false;
  testEditandoId = '';

  // Formulario nuevo test
  nuevoTest = {
    nombre: '',
    descripcion: ''
  };

  preguntas: TestPregunta[] = [];
  rangos: TestRangoResultado[] = [];

  coloresDisponibles = ['#10b981', '#f59e0b', '#ef4444', '#6366f1', '#3b82f6'];

  constructor(
    private navCtrl: NavController,
    private alertCtrl: AlertController,
    private testTemplatesService: TestTemplatesFirestoreService
  ) {}

  async ionViewWillEnter() {
    await this.cargarTests();
  }

  async cargarTests() {

    this.tests = await this.testTemplatesService.getTests();

    // 🔥 Si no hay tests en Firestore, cargar los predeterminados
    if (this.tests.length === 0) {

      console.log('No hay tests en Firestore. Cargando predeterminados...');

      for (const test of TESTS_PREDETERMINADOS) {
        await this.testTemplatesService.upsertTest({
          ...test,
          fechaCreacion: new Date().toISOString()
        });
      }

      // volver a cargar
      this.tests = await this.testTemplatesService.getTests();
    }

  }

  // === CREAR / EDITAR TEST ===

  iniciarCreacion() {
    this.modoCrear = true;
    this.modoEditar = false;
    this.testEditandoId = '';
    this.nuevoTest = { nombre: '', descripcion: '' };
    this.preguntas = [{ texto: '', puntajeMin: 0, puntajeMax: 10 }];
    this.rangos = [
      { nombre: 'Normal', min: 0, max: 5, color: '#10b981' },
      { nombre: 'Alterado', min: 6, max: 10, color: '#ef4444' }
    ];
  }

  editarTest(test: TestTemplate) {
    this.modoCrear = true;
    this.modoEditar = true;
    this.testEditandoId = test.id;
    this.nuevoTest = { nombre: test.nombre, descripcion: test.descripcion };
    this.preguntas = test.preguntas.map(p => ({ ...p }));
    this.rangos = test.rangos.map(r => ({ ...r }));
  }

  cancelarCreacion() {
    this.modoCrear = false;
    this.modoEditar = false;
    this.testEditandoId = '';
  }

  // === PREGUNTAS ===

  agregarPregunta() {
    this.preguntas.push({ texto: '', puntajeMin: 0, puntajeMax: 10 });
  }

  eliminarPregunta(index: number) {
    if (this.preguntas.length > 1) {
      this.preguntas.splice(index, 1);
    }
  }

  // === RANGOS ===

  agregarRango() {
    const ultimoMax = this.rangos.length > 0 ? this.rangos[this.rangos.length - 1].max + 1 : 0;
    const colorIndex = this.rangos.length % this.coloresDisponibles.length;
    this.rangos.push({
      nombre: '',
      min: ultimoMax,
      max: ultimoMax + 10,
      color: this.coloresDisponibles[colorIndex]
    });
  }

  eliminarRango(index: number) {
    if (this.rangos.length > 1) {
      this.rangos.splice(index, 1);
    }
  }

  // === GUARDAR ===

  formularioValido(): boolean {
    if (!this.nuevoTest.nombre.trim()) return false;
    if (this.preguntas.length === 0) return false;
    if (this.preguntas.some(p => !p.texto.trim())) return false;
    if (this.rangos.length === 0) return false;
    if (this.rangos.some(r => !r.nombre.trim())) return false;
    return true;
  }

  async guardarTest() {
    if (!this.formularioValido()) return;

    let testGuardado: TestTemplate | null = null;

    if (this.modoEditar) {
      const index = this.tests.findIndex(t => t.id === this.testEditandoId);
      if (index !== -1) {
        testGuardado = {
          ...this.tests[index],
          nombre: this.nuevoTest.nombre.trim(),
          descripcion: this.nuevoTest.descripcion.trim(),
          preguntas: [...this.preguntas],
          rangos: [...this.rangos]
        };
        this.tests[index] = testGuardado;
      }
    } else {
      testGuardado = {
        id: 'test_' + Date.now(),
        nombre: this.nuevoTest.nombre.trim(),
        descripcion: this.nuevoTest.descripcion.trim(),
        preguntas: [...this.preguntas],
        rangos: [...this.rangos],
        fechaCreacion: new Date().toISOString()
      };
      this.tests.push(testGuardado);
    }

    if (testGuardado) {
      await this.testTemplatesService.upsertTest(testGuardado);
    }

    this.guardarTest();
    this.modoCrear = false;
    this.modoEditar = false;
  }

  // === ELIMINAR ===

  async confirmarEliminar(test: TestTemplate) {
    const alert = await this.alertCtrl.create({
      header: 'Eliminar Test',
      message: `Eliminar "${test.nombre}"? Los resultados ya registrados se mantienen.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => {
            this.tests = this.tests.filter(t => t.id !== test.id);
            this.guardarTest();
            try {
              await this.testTemplatesService.deleteTest(test.id);
            } catch (error) {
              console.warn('No se pudo eliminar en Firestore. Se eliminó solo localmente.', error);
            }
          }
        }
      ]
    });
    await alert.present();
  }

  // === TESTS PREDETERMINADOS ===

  testsPredeterminados = TESTS_PREDETERMINADOS;

  testYaAgregado(testId: string): boolean {
    return this.tests.some(t => t.id === testId);
  }

  async agregarTestPredeterminado(test: TestTemplate) {
    if (this.testYaAgregado(test.id)) return;
    this.tests.push({
      ...test,
      preguntas: test.preguntas.map(p => ({ ...p })),
      rangos: test.rangos.map(r => ({ ...r })),
      fechaCreacion: new Date().toISOString()
    });
    await this.testTemplatesService.upsertTest(this.tests[this.tests.length - 1]);
    this.guardarTest();
  }

  async agregarTodosPredeterminados() {
    let agregados = 0;
    for (const test of TESTS_PREDETERMINADOS) {
      if (!this.testYaAgregado(test.id)) {
        this.tests.push({
          ...test,
          preguntas: test.preguntas.map(p => ({ ...p })),
          rangos: test.rangos.map(r => ({ ...r })),
          fechaCreacion: new Date().toISOString()
        });
        agregados++;
      }
    }
    if (agregados > 0) {
      for (const test of this.tests) {
        await this.testTemplatesService.upsertTest(test);
      }
      this.guardarTest();
    }
    return agregados;
  }

  // === PUNTAJE MAXIMO CALCULADO ===

  getPuntajeMaximo(): number {
    return this.preguntas.reduce((sum, p) => sum + p.puntajeMax, 0);
  }

  volverAtras() {
    this.navCtrl.navigateRoot('/dashboard');
  }
}
