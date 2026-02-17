import { Component } from '@angular/core';
import { NavController, AlertController, ViewWillEnter } from '@ionic/angular';

export interface TestPregunta {
  texto: string;
  puntajeMin: number;
  puntajeMax: number;
}

export interface TestRangoResultado {
  nombre: string;
  min: number;
  max: number;
  color: string;
}

export interface TestTemplate {
  id: string;
  nombre: string;
  descripcion: string;
  preguntas: TestPregunta[];
  rangos: TestRangoResultado[];
  fechaCreacion: string;
}

const STORAGE_KEY = 'test_templates';

@Component({
  selector: 'app-tests-config',
  templateUrl: './tests-config.page.html',
  styleUrls: ['./tests-config.page.scss'],
  standalone: false
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
    private alertCtrl: AlertController
  ) {}

  ionViewWillEnter() {
    this.cargarTests();
  }

  cargarTests() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      this.tests = data ? JSON.parse(data) : [];
    } catch {
      this.tests = [];
    }
  }

  guardarTests() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.tests));
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

  guardarTest() {
    if (!this.formularioValido()) return;

    if (this.modoEditar) {
      const index = this.tests.findIndex(t => t.id === this.testEditandoId);
      if (index !== -1) {
        this.tests[index] = {
          ...this.tests[index],
          nombre: this.nuevoTest.nombre.trim(),
          descripcion: this.nuevoTest.descripcion.trim(),
          preguntas: [...this.preguntas],
          rangos: [...this.rangos]
        };
      }
    } else {
      const test: TestTemplate = {
        id: 'test_' + Date.now(),
        nombre: this.nuevoTest.nombre.trim(),
        descripcion: this.nuevoTest.descripcion.trim(),
        preguntas: [...this.preguntas],
        rangos: [...this.rangos],
        fechaCreacion: new Date().toISOString()
      };
      this.tests.push(test);
    }

    this.guardarTests();
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
          handler: () => {
            this.tests = this.tests.filter(t => t.id !== test.id);
            this.guardarTests();
          }
        }
      ]
    });
    await alert.present();
  }

  // === PUNTAJE MAXIMO CALCULADO ===

  getPuntajeMaximo(): number {
    return this.preguntas.reduce((sum, p) => sum + p.puntajeMax, 0);
  }

  volverAtras() {
    this.navCtrl.navigateRoot('/dashboard');
  }
}
