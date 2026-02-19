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

const TESTS_PREDETERMINADOS: TestTemplate[] = [
  {
    id: 'predefinido_groc',
    nombre: 'GROC - Escala Global de Cambio',
    descripcion: 'Global Rating of Change. Mide la percepcion del paciente sobre su cambio global desde el inicio del tratamiento. Escala de -7 (mucho peor) a +7 (mucho mejor).',
    preguntas: [
      {
        texto: 'En comparacion con el inicio del tratamiento, como describiria su condicion actual?',
        puntajeMin: -7,
        puntajeMax: 7
      }
    ],
    rangos: [
      { nombre: 'Mucho peor', min: -7, max: -5, color: '#ef4444' },
      { nombre: 'Peor', min: -4, max: -2, color: '#f97316' },
      { nombre: 'Sin cambio significativo', min: -1, max: 1, color: '#6b7280' },
      { nombre: 'Mejor', min: 2, max: 4, color: '#22c55e' },
      { nombre: 'Mucho mejor', min: 5, max: 7, color: '#10b981' }
    ],
    fechaCreacion: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 'predefinido_barthel',
    nombre: 'Indice de Barthel',
    descripcion: 'Mide la capacidad funcional para actividades basicas de la vida diaria (ABVD). Puntaje de 0 (dependencia total) a 100 (independencia).',
    preguntas: [
      { texto: 'Comer (0=incapaz, 5=necesita ayuda, 10=independiente)', puntajeMin: 0, puntajeMax: 10 },
      { texto: 'Trasladarse sillon-cama (0=incapaz, 5=gran ayuda, 10=minima ayuda, 15=independiente)', puntajeMin: 0, puntajeMax: 15 },
      { texto: 'Aseo personal (0=necesita ayuda, 5=independiente)', puntajeMin: 0, puntajeMax: 5 },
      { texto: 'Uso del retrete (0=dependiente, 5=necesita ayuda, 10=independiente)', puntajeMin: 0, puntajeMax: 10 },
      { texto: 'Banarse/ducharse (0=dependiente, 5=independiente)', puntajeMin: 0, puntajeMax: 5 },
      { texto: 'Desplazarse (0=inmovil, 5=silla de ruedas, 10=ayuda de una persona, 15=independiente)', puntajeMin: 0, puntajeMax: 15 },
      { texto: 'Subir/bajar escaleras (0=incapaz, 5=necesita ayuda, 10=independiente)', puntajeMin: 0, puntajeMax: 10 },
      { texto: 'Vestirse/desvestirse (0=dependiente, 5=necesita ayuda, 10=independiente)', puntajeMin: 0, puntajeMax: 10 },
      { texto: 'Control de heces (0=incontinente, 5=accidente ocasional, 10=continente)', puntajeMin: 0, puntajeMax: 10 },
      { texto: 'Control de orina (0=incontinente, 5=accidente ocasional, 10=continente)', puntajeMin: 0, puntajeMax: 10 }
    ],
    rangos: [
      { nombre: 'Dependencia total', min: 0, max: 20, color: '#ef4444' },
      { nombre: 'Dependencia grave', min: 21, max: 60, color: '#f97316' },
      { nombre: 'Dependencia moderada', min: 61, max: 90, color: '#f59e0b' },
      { nombre: 'Dependencia escasa', min: 91, max: 99, color: '#22c55e' },
      { nombre: 'Independencia', min: 100, max: 100, color: '#10b981' }
    ],
    fechaCreacion: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 'predefinido_eva_funcional',
    nombre: 'EVA Funcional',
    descripcion: 'Escala Visual Analogica aplicada a multiples dimensiones funcionales del paciente. Evalua dolor, funcion y satisfaccion.',
    preguntas: [
      { texto: 'Dolor en reposo (0=sin dolor, 10=maximo dolor)', puntajeMin: 0, puntajeMax: 10 },
      { texto: 'Dolor en movimiento (0=sin dolor, 10=maximo dolor)', puntajeMin: 0, puntajeMax: 10 },
      { texto: 'Dificultad para actividades cotidianas (0=ninguna, 10=imposible)', puntajeMin: 0, puntajeMax: 10 },
      { texto: 'Dificultad para actividad laboral (0=ninguna, 10=imposible)', puntajeMin: 0, puntajeMax: 10 },
      { texto: 'Dificultad para actividad deportiva/recreativa (0=ninguna, 10=imposible)', puntajeMin: 0, puntajeMax: 10 }
    ],
    rangos: [
      { nombre: 'Leve', min: 0, max: 15, color: '#10b981' },
      { nombre: 'Moderado', min: 16, max: 30, color: '#f59e0b' },
      { nombre: 'Severo', min: 31, max: 40, color: '#f97316' },
      { nombre: 'Muy severo', min: 41, max: 50, color: '#ef4444' }
    ],
    fechaCreacion: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 'predefinido_tinetti_marcha',
    nombre: 'Tinetti - Marcha',
    descripcion: 'Evaluacion de la marcha del test de Tinetti. Detecta riesgo de caidas en adultos mayores. Puntaje marcha: 0-12.',
    preguntas: [
      { texto: 'Inicio de la marcha (0=vacilacion/varios intentos, 1=sin vacilacion)', puntajeMin: 0, puntajeMax: 1 },
      { texto: 'Longitud y altura del paso derecho (0=no sobrepasa pie izq, 1=sobrepasa, pie se levanta)', puntajeMin: 0, puntajeMax: 1 },
      { texto: 'Longitud y altura del paso izquierdo (0=no sobrepasa pie der, 1=sobrepasa, pie se levanta)', puntajeMin: 0, puntajeMax: 1 },
      { texto: 'Simetria del paso (0=desigual, 1=igual)', puntajeMin: 0, puntajeMax: 1 },
      { texto: 'Continuidad de los pasos (0=discontinuos, 1=continuos)', puntajeMin: 0, puntajeMax: 1 },
      { texto: 'Trayectoria (0=desviacion marcada, 1=desviacion leve, 2=recta sin ayuda)', puntajeMin: 0, puntajeMax: 2 },
      { texto: 'Tronco (0=balanceo marcado, 1=no balancea pero flexiona, 2=sin balanceo ni flexion)', puntajeMin: 0, puntajeMax: 2 },
      { texto: 'Postura al caminar (0=talones separados, 1=talones casi juntos)', puntajeMin: 0, puntajeMax: 1 }
    ],
    rangos: [
      { nombre: 'Alto riesgo de caidas', min: 0, max: 5, color: '#ef4444' },
      { nombre: 'Riesgo moderado', min: 6, max: 9, color: '#f59e0b' },
      { nombre: 'Bajo riesgo', min: 10, max: 12, color: '#10b981' }
    ],
    fechaCreacion: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 'predefinido_ndi',
    nombre: 'NDI - Indice de Discapacidad Cervical',
    descripcion: 'Neck Disability Index. Evalua como el dolor de cuello afecta las actividades diarias. 10 secciones, puntaje 0-50.',
    preguntas: [
      { texto: 'Intensidad del dolor de cuello (0=sin dolor, 5=el peor imaginable)', puntajeMin: 0, puntajeMax: 5 },
      { texto: 'Cuidado personal (0=sin problemas, 5=necesita ayuda en todo)', puntajeMin: 0, puntajeMax: 5 },
      { texto: 'Levantar objetos (0=puedo levantar pesados, 5=no puedo levantar nada)', puntajeMin: 0, puntajeMax: 5 },
      { texto: 'Lectura (0=sin problemas, 5=no puedo leer)', puntajeMin: 0, puntajeMax: 5 },
      { texto: 'Dolor de cabeza (0=sin cefalea, 5=cefalea constante)', puntajeMin: 0, puntajeMax: 5 },
      { texto: 'Concentracion (0=puedo concentrarme, 5=no puedo concentrarme)', puntajeMin: 0, puntajeMax: 5 },
      { texto: 'Trabajo (0=puedo trabajar normal, 5=no puedo trabajar)', puntajeMin: 0, puntajeMax: 5 },
      { texto: 'Conducir (0=sin problemas, 5=no puedo conducir)', puntajeMin: 0, puntajeMax: 5 },
      { texto: 'Dormir (0=sin problemas, 5=no puedo dormir)', puntajeMin: 0, puntajeMax: 5 },
      { texto: 'Recreacion (0=sin limitacion, 5=no puedo hacer nada)', puntajeMin: 0, puntajeMax: 5 }
    ],
    rangos: [
      { nombre: 'Sin discapacidad', min: 0, max: 4, color: '#10b981' },
      { nombre: 'Discapacidad leve', min: 5, max: 14, color: '#22c55e' },
      { nombre: 'Discapacidad moderada', min: 15, max: 24, color: '#f59e0b' },
      { nombre: 'Discapacidad severa', min: 25, max: 34, color: '#f97316' },
      { nombre: 'Discapacidad completa', min: 35, max: 50, color: '#ef4444' }
    ],
    fechaCreacion: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 'predefinido_oswestry',
    nombre: 'Oswestry - Discapacidad Lumbar',
    descripcion: 'Oswestry Disability Index (ODI). Evalua como el dolor lumbar afecta las actividades diarias. 10 secciones, puntaje 0-50.',
    preguntas: [
      { texto: 'Intensidad del dolor (0=sin dolor, 5=el peor imaginable)', puntajeMin: 0, puntajeMax: 5 },
      { texto: 'Cuidado personal (0=normal, 5=necesita ayuda en todo)', puntajeMin: 0, puntajeMax: 5 },
      { texto: 'Levantar objetos (0=puedo levantar pesados, 5=no puedo levantar nada)', puntajeMin: 0, puntajeMax: 5 },
      { texto: 'Caminar (0=sin limite, 5=cama/silla todo el dia)', puntajeMin: 0, puntajeMax: 5 },
      { texto: 'Sentarse (0=sin limite, 5=no puedo sentarme)', puntajeMin: 0, puntajeMax: 5 },
      { texto: 'Estar de pie (0=sin limite, 5=no puedo estar de pie)', puntajeMin: 0, puntajeMax: 5 },
      { texto: 'Dormir (0=sin problemas, 5=no puedo dormir)', puntajeMin: 0, puntajeMax: 5 },
      { texto: 'Vida social (0=normal, 5=sin vida social)', puntajeMin: 0, puntajeMax: 5 },
      { texto: 'Viajar (0=sin problemas, 5=solo voy al medico)', puntajeMin: 0, puntajeMax: 5 },
      { texto: 'Empleo/Tareas del hogar (0=normal, 5=no puedo hacer nada)', puntajeMin: 0, puntajeMax: 5 }
    ],
    rangos: [
      { nombre: 'Discapacidad minima', min: 0, max: 4, color: '#10b981' },
      { nombre: 'Discapacidad moderada', min: 5, max: 14, color: '#22c55e' },
      { nombre: 'Discapacidad intensa', min: 15, max: 24, color: '#f59e0b' },
      { nombre: 'Discapacidad severa', min: 25, max: 34, color: '#f97316' },
      { nombre: 'Maxima discapacidad', min: 35, max: 50, color: '#ef4444' }
    ],
    fechaCreacion: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 'predefinido_koos',
    nombre: 'KOOS - Rodilla',
    descripcion: 'Knee injury and Osteoarthritis Outcome Score. Evalua dolor, sintomas, funcion en AVD, deporte/recreacion y calidad de vida en patologias de rodilla. 42 items, cada uno 0 (sin problemas) a 4 (problemas extremos). Puntaje total 0-168.',
    preguntas: [
      // SINTOMAS (7 items)
      { texto: 'S1. Tiene inflamacion en la rodilla? (0=nunca, 4=siempre)', puntajeMin: 0, puntajeMax: 4 },
      { texto: 'S2. Siente crujidos o chasquidos al mover la rodilla? (0=nunca, 4=siempre)', puntajeMin: 0, puntajeMax: 4 },
      { texto: 'S3. Se le traba o bloquea la rodilla? (0=nunca, 4=siempre)', puntajeMin: 0, puntajeMax: 4 },
      { texto: 'S4. Puede estirar la rodilla completamente? (0=siempre, 4=nunca)', puntajeMin: 0, puntajeMax: 4 },
      { texto: 'S5. Puede doblar la rodilla completamente? (0=siempre, 4=nunca)', puntajeMin: 0, puntajeMax: 4 },
      { texto: 'S6. Rigidez matutina de rodilla (0=ninguna, 4=extrema)', puntajeMin: 0, puntajeMax: 4 },
      { texto: 'S7. Rigidez durante el dia tras estar sentado/acostado (0=ninguna, 4=extrema)', puntajeMin: 0, puntajeMax: 4 },
      // DOLOR (9 items)
      { texto: 'D1. Frecuencia del dolor de rodilla (0=nunca, 4=siempre)', puntajeMin: 0, puntajeMax: 4 },
      { texto: 'D2. Dolor al girar/rotar sobre la rodilla (0=ninguno, 4=extremo)', puntajeMin: 0, puntajeMax: 4 },
      { texto: 'D3. Dolor al estirar la rodilla completamente (0=ninguno, 4=extremo)', puntajeMin: 0, puntajeMax: 4 },
      { texto: 'D4. Dolor al doblar la rodilla completamente (0=ninguno, 4=extremo)', puntajeMin: 0, puntajeMax: 4 },
      { texto: 'D5. Dolor al caminar en superficie plana (0=ninguno, 4=extremo)', puntajeMin: 0, puntajeMax: 4 },
      { texto: 'D6. Dolor al subir o bajar escaleras (0=ninguno, 4=extremo)', puntajeMin: 0, puntajeMax: 4 },
      { texto: 'D7. Dolor durante la noche en cama (0=ninguno, 4=extremo)', puntajeMin: 0, puntajeMax: 4 },
      { texto: 'D8. Dolor al estar sentado o acostado (0=ninguno, 4=extremo)', puntajeMin: 0, puntajeMax: 4 },
      { texto: 'D9. Dolor al estar de pie (0=ninguno, 4=extremo)', puntajeMin: 0, puntajeMax: 4 },
      // AVD - ACTIVIDADES VIDA DIARIA (17 items)
      { texto: 'A1. Bajar escaleras (0=ninguna dificultad, 4=extrema)', puntajeMin: 0, puntajeMax: 4 },
      { texto: 'A2. Subir escaleras (0=ninguna dificultad, 4=extrema)', puntajeMin: 0, puntajeMax: 4 },
      { texto: 'A3. Levantarse de estar sentado (0=ninguna dificultad, 4=extrema)', puntajeMin: 0, puntajeMax: 4 },
      { texto: 'A4. Estar de pie (0=ninguna dificultad, 4=extrema)', puntajeMin: 0, puntajeMax: 4 },
      { texto: 'A5. Agacharse al suelo/recoger objeto (0=ninguna dificultad, 4=extrema)', puntajeMin: 0, puntajeMax: 4 },
      { texto: 'A6. Caminar en superficie plana (0=ninguna dificultad, 4=extrema)', puntajeMin: 0, puntajeMax: 4 },
      { texto: 'A7. Entrar/salir del auto (0=ninguna dificultad, 4=extrema)', puntajeMin: 0, puntajeMax: 4 },
      { texto: 'A8. Ir de compras (0=ninguna dificultad, 4=extrema)', puntajeMin: 0, puntajeMax: 4 },
      { texto: 'A9. Ponerse calcetines/medias (0=ninguna dificultad, 4=extrema)', puntajeMin: 0, puntajeMax: 4 },
      { texto: 'A10. Levantarse de la cama (0=ninguna dificultad, 4=extrema)', puntajeMin: 0, puntajeMax: 4 },
      { texto: 'A11. Quitarse calcetines/medias (0=ninguna dificultad, 4=extrema)', puntajeMin: 0, puntajeMax: 4 },
      { texto: 'A12. Girar/darse vuelta en la cama (0=ninguna dificultad, 4=extrema)', puntajeMin: 0, puntajeMax: 4 },
      { texto: 'A13. Entrar/salir de la banera o ducha (0=ninguna dificultad, 4=extrema)', puntajeMin: 0, puntajeMax: 4 },
      { texto: 'A14. Sentarse (0=ninguna dificultad, 4=extrema)', puntajeMin: 0, puntajeMax: 4 },
      { texto: 'A15. Sentarse/levantarse del retrete (0=ninguna dificultad, 4=extrema)', puntajeMin: 0, puntajeMax: 4 },
      { texto: 'A16. Tareas domesticas pesadas (0=ninguna dificultad, 4=extrema)', puntajeMin: 0, puntajeMax: 4 },
      { texto: 'A17. Tareas domesticas ligeras (0=ninguna dificultad, 4=extrema)', puntajeMin: 0, puntajeMax: 4 },
      // DEPORTE Y RECREACION (5 items)
      { texto: 'R1. Ponerse en cuclillas (0=ninguna dificultad, 4=extrema)', puntajeMin: 0, puntajeMax: 4 },
      { texto: 'R2. Correr (0=ninguna dificultad, 4=extrema)', puntajeMin: 0, puntajeMax: 4 },
      { texto: 'R3. Saltar (0=ninguna dificultad, 4=extrema)', puntajeMin: 0, puntajeMax: 4 },
      { texto: 'R4. Girar/rotar sobre la rodilla afectada (0=ninguna dificultad, 4=extrema)', puntajeMin: 0, puntajeMax: 4 },
      { texto: 'R5. Arrodillarse (0=ninguna dificultad, 4=extrema)', puntajeMin: 0, puntajeMax: 4 },
      // CALIDAD DE VIDA (4 items)
      { texto: 'Q1. Con que frecuencia es consciente de su problema de rodilla? (0=nunca, 4=siempre)', puntajeMin: 0, puntajeMax: 4 },
      { texto: 'Q2. Ha modificado su estilo de vida para evitar actividades daninas? (0=nada, 4=totalmente)', puntajeMin: 0, puntajeMax: 4 },
      { texto: 'Q3. Cuanta falta de confianza siente en su rodilla? (0=ninguna, 4=extrema)', puntajeMin: 0, puntajeMax: 4 },
      { texto: 'Q4. En general, cuanta dificultad tiene con su rodilla? (0=ninguna, 4=extrema)', puntajeMin: 0, puntajeMax: 4 }
    ],
    rangos: [
      { nombre: 'Sin problemas / Normal', min: 0, max: 33, color: '#10b981' },
      { nombre: 'Leve', min: 34, max: 67, color: '#22c55e' },
      { nombre: 'Moderada', min: 68, max: 101, color: '#f59e0b' },
      { nombre: 'Severa', min: 102, max: 134, color: '#f97316' },
      { nombre: 'Extrema', min: 135, max: 168, color: '#ef4444' }
    ],
    fechaCreacion: '2025-01-01T00:00:00.000Z'
  }
];

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

  // === TESTS PREDETERMINADOS ===

  testsPredeterminados = TESTS_PREDETERMINADOS;

  testYaAgregado(testId: string): boolean {
    return this.tests.some(t => t.id === testId);
  }

  agregarTestPredeterminado(test: TestTemplate) {
    if (this.testYaAgregado(test.id)) return;
    this.tests.push({
      ...test,
      preguntas: test.preguntas.map(p => ({ ...p })),
      rangos: test.rangos.map(r => ({ ...r })),
      fechaCreacion: new Date().toISOString()
    });
    this.guardarTests();
  }

  agregarTodosPredeterminados() {
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
    if (agregados > 0) this.guardarTests();
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
