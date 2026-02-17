import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { NavController } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { DatabaseService } from 'src/app/services/database.service';

@Component({
  selector: 'app-sesion',
  templateUrl: './sesion.page.html',
  styleUrls: ['./sesion.page.scss'],
  standalone: false
})
export class SesionPage implements OnInit {
  // Datos del paciente
  pacienteId: string = '';
  pacienteNombre: string = '';
  numeroSesion: number = 1;

  // Objeto principal de datos de la sesion
  sesionData = {
    nivelDolor: null as number | null,
    calidadSueno: 3,
    ejerciciosRealizados: false,
    observaciones: ''
  };

  // Tests predeterminados
  testsDisponibles: any[] = [];
  testSeleccionado: any = null;
  respuestasTest: number[] = [];
  puntajeTotal = 0;
  resultadoTest = '';

  // Referencias para los textarea
  @ViewChild('observacionesTextarea') observacionesTextarea!: ElementRef;

  constructor(
    private navCtrl: NavController,
    private route: ActivatedRoute,
    private databaseService: DatabaseService
  ) {}

  async ngOnInit() {
    console.log('Inicializando pagina de sesion...');
    this.cargarTestsDisponibles();

    // Obtener parametros de la URL
    this.route.queryParams.subscribe(async params => {
      console.log('📋 Parámetros recibidos:', params);
      
      this.pacienteId = params['pacienteId'] || '';
      this.pacienteNombre = params['pacienteNombre'] || 'Paciente';
      
      // Calcular número de sesión basado en sesiones existentes
      await this.calcularNumeroSesion();
      
      console.log(`📝 Configurando sesión ${this.numeroSesion} para:`, this.pacienteNombre);
      
      // Si no hay pacienteId, mostrar advertencia
      if (!this.pacienteId) {
        console.warn('⚠️ No se recibió pacienteId. Usando datos de prueba.');
        this.pacienteNombre = 'Juan Perez (prueba)';
      }
    });
  }

  async calcularNumeroSesion() {
    if (!this.pacienteId) {
      this.numeroSesion = 1;
      return;
    }

    try {
      const sesiones = await this.databaseService.getSesionesByPaciente(this.pacienteId);
      this.numeroSesion = sesiones.length + 1;
      console.log(`📊 ${sesiones.length} sesiones existentes, próxima: ${this.numeroSesion}`);
    } catch (error) {
      console.log('Error obteniendo sesiones, usando sesión 1:', error);
      this.numeroSesion = 1;
    }
  }

  // === NUEVO MÉTODO PARA MANEJAR ENTER EN OBSERVACIONES ===
  onEnterObservaciones(event: any) {
    if (event.preventDefault) {
      event.preventDefault();
    }
    
    this.cerrarTeclado();
    
    setTimeout(() => {
      this.moverFocoAlBotonGuardar();
    }, 100);
    
    return false;
  }

  cerrarTeclado() {
    console.log('Cerrando teclado...');
    
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement) {
      activeElement.blur();
    }
    
    if (typeof (window as any).Keyboard !== 'undefined') {
      try {
        (window as any).Keyboard.hide();
      } catch (error) {
        console.log('Keyboard plugin no disponible:', error);
      }
    }
    
    else if ((window as any).cordova?.plugins?.Keyboard) {
      try {
        (window as any).cordova.plugins.Keyboard.hide();
      } catch (error) {
        console.log('Cordova Keyboard plugin no disponible:', error);
      }
    }
  }

  moverFocoAlBotonGuardar() {
    const guardarBtn = document.querySelector('ion-button[expand="block"]') as HTMLElement;
    if (guardarBtn) {
      guardarBtn.focus();
    }
  }

  onContentClick(event: any) {
    const clickedElement = event.target as HTMLElement;
    const esCampoTexto = clickedElement.closest('ion-input') || 
                         clickedElement.closest('ion-textarea') ||
                         clickedElement.closest('ion-range') ||
                         clickedElement.closest('ion-checkbox');
    
    if (!esCampoTexto) {
      this.cerrarTeclado();
    }
  }

  // Validación del formulario
  esFormularioValido(): boolean {
    return this.sesionData.nivelDolor !== null && 
           this.sesionData.nivelDolor >= 0;
  }

  async guardarSesion() {
    if (!this.esFormularioValido()) {
      alert('Por favor, complete la evaluación de dolor (EVA)');
      return;
    }

    if (!this.pacienteId) {
      alert('Error: No se identificó al paciente. Regrese y seleccione un paciente.');
      return;
    }

    try {
      const datosSesion: any = {
        paciente_id: this.pacienteId,
        paciente_nombre: this.pacienteNombre,
        numero_sesion: this.numeroSesion,
        fecha: new Date().toISOString().split('T')[0],
        ejercicios: this.sesionData.ejerciciosRealizados ? 'Realizados' : 'No realizados',
        observaciones: this.sesionData.observaciones,
        eva: this.sesionData.nivelDolor,
        sueno: this.sesionData.calidadSueno,
        enviado_whatsapp: false
      };

      // Incluir resultados del test si se aplico uno
      if (this.testSeleccionado) {
        datosSesion.test = {
          testId: this.testSeleccionado.id,
          testNombre: this.testSeleccionado.nombre,
          respuestas: [...this.respuestasTest],
          puntajeTotal: this.puntajeTotal,
          resultado: this.resultadoTest
        };
      }

      console.log('💾 Guardando sesión:', datosSesion);

      await this.databaseService.addSesion(datosSesion);
      console.log('✅ Sesión guardada exitosamente');

      alert(`Sesión ${this.numeroSesion} guardada para ${this.pacienteNombre}`);

      // Volver al detalle del paciente
      localStorage.setItem('ver_paciente_id', String(this.pacienteId));
      this.navCtrl.navigateRoot('/paciente-detalle');

    } catch (error) {
      console.error('Error al guardar sesión:', error);
      alert('Error al guardar la sesión. Intente nuevamente.');
    }
  }

  // === TESTS PREDETERMINADOS ===

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

    // Buscar rango
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
      this.navCtrl.navigateRoot('/pacientes-lista');
    }
  }

  volverAlDashboard() {
    this.navCtrl.navigateRoot('/dashboard');
  }

  // Método para limpiar formulario
  limpiarFormulario() {
    this.sesionData = {
      nivelDolor: null,
      calidadSueno: 3,
      ejerciciosRealizados: false,
      observaciones: ''
    };
  }
}