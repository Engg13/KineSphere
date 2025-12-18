import { Component, OnInit,  ViewChild, ElementRef } from '@angular/core';
import { NavController } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { JsonServerService } from 'src/app/services/json-server.service';
import { DatabaseService } from 'src/app/services/database.service';
import { firstValueFrom } from 'rxjs';

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
  
  // Objeto principal de datos de la sesión
  sesionData = {
    nivelDolor: null as number | null,
    calidadSueno: 3,
    ejerciciosRealizados: false,
    observaciones: ''
  };

  // Referencias para los textarea
  @ViewChild('observacionesTextarea') observacionesTextarea!: ElementRef;

  constructor(
    private navCtrl: NavController,
    private route: ActivatedRoute,
    private router: Router,
    private jsonServerService: JsonServerService,
    private databaseService: DatabaseService 
  ) {}

  async ngOnInit() {
    console.log('🔄 Inicializando página de sesión...');
    
    // Obtener parámetros de la URL
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
        this.pacienteNombre = 'Juan Perez (prueba)'; // Solo para desarrollo
      }
    });
  }

  // Calcular el número de la próxima sesión
  async calcularNumeroSesion() {
    if (!this.pacienteId) {
      this.numeroSesion = 1;
      return;
    }

    try {
      // Obtener sesiones existentes del paciente
      const sesiones = await firstValueFrom(
        this.jsonServerService.getSesionesPorPaciente(this.pacienteId)
      );
      
      // Calcular próximo número de sesión
      if (sesiones && Array.isArray(sesiones)) {
        this.numeroSesion = sesiones.length + 1;
      } else {
        this.numeroSesion = 1;
      }
      
      console.log(`📊 Sesiones existentes: ${sesiones?.length || 0}, Próxima sesión: ${this.numeroSesion}`);
    } catch (error) {
      console.log('❌ Error obteniendo sesiones, usando sesión 1:', error);
      this.numeroSesion = 1;
    }
  }

// === NUEVO MÉTODO PARA MANEJAR ENTER EN OBSERVACIONES ===
  onEnterObservaciones(event: any) {
    // Prevenir el comportamiento por defecto (salto de línea)
    if (event.preventDefault) {
      event.preventDefault();
    }
    
    // Cerrar el teclado
    this.cerrarTeclado();
    
    // Opcional: Mover foco al botón Guardar
    setTimeout(() => {
      this.moverFocoAlBotonGuardar();
    }, 100);
    
    return false;
  }

  // Método para cerrar teclado (puedes reusar o modificar)
  cerrarTeclado() {
    console.log('Cerrando teclado...');
    
    // Método 1: Blur del elemento activo
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement) {
      activeElement.blur();
    }
    
    // Método 2: Para Capacitor
    if (typeof (window as any).Keyboard !== 'undefined') {
      try {
        (window as any).Keyboard.hide();
      } catch (error) {
        console.log('Keyboard plugin no disponible:', error);
      }
    }
    
    // Método 3: Para Cordova
    else if ((window as any).cordova?.plugins?.Keyboard) {
      try {
        (window as any).cordova.plugins.Keyboard.hide();
      } catch (error) {
        console.log('Cordova Keyboard plugin no disponible:', error);
      }
    }
  }

  // Mover foco al botón Guardar
  moverFocoAlBotonGuardar() {
    const guardarBtn = document.querySelector('ion-button[expand="block"]') as HTMLElement;
    if (guardarBtn) {
      guardarBtn.focus();
    }
  }

  // También puedes agregar un método para cerrar teclado al hacer tap fuera
  onContentClick(event: any) {
    const clickedElement = event.target as HTMLElement;
    const esCampoTexto = clickedElement.closest('ion-input') || 
                         clickedElement.closest('ion-textarea') ||
                         clickedElement.closest('ion-range') ||
                         clickedElement.closest('ion-checkbox');
    
    // Si se hizo click fuera de un campo de entrada, cerrar teclado
    if (!esCampoTexto) {
      this.cerrarTeclado();
    }
  }


  // Validación del formulario
  esFormularioValido(): boolean {
    return this.sesionData.nivelDolor !== null && 
           this.sesionData.nivelDolor >= 0;
           // Removí la validación de calidadSueno > 0 si acepta 0
  }

  async guardarSesion() {
    if (!this.esFormularioValido()) {
      alert('Por favor, complete la evaluación de dolor (EVA)');
      return;
    }

    // Verificar que tenemos datos del paciente
    if (!this.pacienteId) {
      alert('Error: No se identificó al paciente. Regrese y seleccione un paciente.');
      return;
    }

    try {
      // Preparar datos para JSON-Server (con datos reales y estructura correcta)
      const datosSesion = {
        paciente_id: this.pacienteId, // Usa el ID real
        paciente_nombre: this.pacienteNombre, // Nombre real
        numero_sesion: this.numeroSesion,
        nivel_dolor: this.sesionData.nivelDolor,
        calidad_sueno: this.sesionData.calidadSueno,
        ejercicios_realizados: this.sesionData.ejerciciosRealizados,
        observaciones: this.sesionData.observaciones,
        fecha: new Date().toISOString(),
        fecha_registro: new Date().toLocaleDateString('es-CL'),
        hora_registro: new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
      };

      console.log('💾 Guardando sesión:', datosSesion);

      // ESTRATEGIA DE GUARDADO
      let exitoWeb = false;
      let exitoMovil = false;
      let respuestaJsonServer: any = null;

      // 1. Intentar JSON-Server (Web)
      try {
        respuestaJsonServer = await firstValueFrom(
          this.jsonServerService.createSesion(datosSesion)
        );
        console.log('✅ Sesión guardada en JSON-Server:', respuestaJsonServer);
        exitoWeb = true;
      } catch (errorWeb) {
        console.log('❌ Error en JSON-Server:', errorWeb);
      }

      // 2. Intentar SQLite (Móvil) - opcional
      try {
        // Descomenta si tienes método en DatabaseService
         const respuestaSQLite = await this.databaseService.addSesion(datosSesion);
         console.log('✅ Sesión guardada en SQLite:', respuestaSQLite);
         exitoMovil = true;
      } catch (errorMovil) {
        console.log('📱 SQLite no disponible para sesiones:', errorMovil);
      }

      // Mostrar mensaje según resultado
      let titulo = '';
      let mensaje = '';
      
      if (exitoWeb) {
        titulo = '✅ Éxito';
        mensaje = `Sesión ${this.numeroSesion} guardada para ${this.pacienteNombre}`;
      } else {
        titulo = '⚠️ Advertencia';
        mensaje = 'Sesión guardada localmente (sin conexión a servidor)';
      }

      // Mostrar resumen detallado
      const resumen = `
        ${titulo}
        
        📋 Resumen de Sesión:
        • Paciente: ${this.pacienteNombre}
        • Sesión N°: ${this.numeroSesion}
        • Fecha: ${new Date().toLocaleDateString('es-CL')}
        
        📊 Evaluación:
        • Dolor EVA: ${this.sesionData.nivelDolor}/10
        • Calidad sueño: ${this.sesionData.calidadSueno}/5
        • Ejercicios en casa: ${this.sesionData.ejerciciosRealizados ? '✅ Realizados' : '❌ No realizados'}
        ${this.sesionData.observaciones ? `\n📝 Observaciones:\n${this.sesionData.observaciones}` : ''}
        
        ${exitoWeb ? '✅ Datos guardados en servidor' : '⚠️ Solo guardado localmente'}
      `;

      alert(resumen.trim());

      // Redirigir a detalle del paciente
      this.navCtrl.navigateBack(['/paciente-detalle'], {
        queryParams: { 
          id: this.pacienteId,
          sesionGuardada: true,
          numeroSesion: this.numeroSesion
        }
      });

    } catch (error) {
      console.error('❌ Error crítico al guardar sesión:', error);
      alert('❌ Error al guardar la sesión. Verifica tu conexión o intente más tarde.');
    }
  }

  volverAPaciente() {
    if (this.pacienteId) {
      this.navCtrl.navigateBack(['/paciente-detalle'], {
        queryParams: { id: this.pacienteId }
      });
    } else {
      this.navCtrl.navigateBack('/pacientes-lista');
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