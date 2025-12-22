import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
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
        this.pacienteNombre = 'Juan Perez (prueba)';
      }
    });
  }

  // Calcular el número de la próxima sesión (ACTUALIZADO)
  async calcularNumeroSesion() {
    if (!this.pacienteId) {
      this.numeroSesion = 1;
      return;
    }

    try {
      let totalSesiones = 0;
      
      // 1. Intentar obtener sesiones del DatabaseService (SQLite/localStorage)
      try {
        const sesionesLocal = await this.databaseService.getSesionesByPaciente(Number(this.pacienteId));
        totalSesiones = sesionesLocal.length;
        console.log(`📊 ${totalSesiones} sesiones encontradas en DatabaseService`);
      } catch (errorLocal) {
        console.log('No hay sesiones locales:', errorLocal);
      }
      
      // 2. Intentar JSON-Server (si está disponible)
      try {
        const sesionesJsonServer = await firstValueFrom(
          this.jsonServerService.getSesionesPorPaciente(this.pacienteId)
        );
        
        if (sesionesJsonServer && Array.isArray(sesionesJsonServer)) {
          totalSesiones = Math.max(totalSesiones, sesionesJsonServer.length);
          console.log(`📊 ${sesionesJsonServer.length} sesiones en JSON-Server`);
        }
      } catch (errorServer) {
        console.log('JSON-Server no disponible:', errorServer);
      }
      
      // Calcular próximo número de sesión
      this.numeroSesion = totalSesiones + 1;
      
      console.log(`📊 Total sesiones: ${totalSesiones}, Próxima sesión: ${this.numeroSesion}`);
    } catch (error) {
      console.log('❌ Error obteniendo sesiones, usando sesión 1:', error);
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

  // MÉTODO guardarSesion ACTUALIZADO
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
      // Preparar datos para la sesión (formato compatible con DatabaseService)
      const datosSesion = {
        paciente_id: Number(this.pacienteId), // Convertir a número
        paciente_nombre: this.pacienteNombre,
        fecha: new Date().toISOString().split('T')[0], // Solo fecha YYYY-MM-DD
        ejercicios: this.sesionData.ejerciciosRealizados ? 'Realizados' : 'No realizados',
        observaciones: this.sesionData.observaciones,
        eva: this.sesionData.nivelDolor,
        sueño: this.sesionData.calidadSueno,
        enviado_whatsapp: false
      };

      console.log('💾 Preparando sesión para guardar:', datosSesion);

      // ESTRATEGIA DE GUARDADO MEJORADA
      let exitoLocal = false;
      let exitoServer = false;
      let mensajes = [];

      // 1. GUARDAR EN DatabaseService (SQLite/localStorage) - SIEMPRE
      try {
        const respuestaLocal = await this.databaseService.addSesion(datosSesion);
        console.log('✅ Sesión guardada localmente:', respuestaLocal);
        exitoLocal = true;
        mensajes.push('✅ Guardado localmente');
      } catch (errorLocal) {
        console.error('❌ Error guardando localmente:', errorLocal);
        mensajes.push('❌ No se pudo guardar localmente');
      }

      // 2. GUARDAR EN JSON-Server (OPCIONAL - solo si hay conexión)
      try {
        // Preparar datos para JSON-Server (formato diferente)
        const datosParaServer = {
          paciente_id: this.pacienteId,
          paciente_nombre: this.pacienteNombre,
          numero_sesion: this.numeroSesion,
          nivel_dolor: this.sesionData.nivelDolor,
          calidad_sueno: this.sesionData.calidadSueno,
          ejercicios_realizados: this.sesionData.ejerciciosRealizados,
          observaciones: this.sesionData.observaciones,
          fecha: new Date().toISOString(),
          fecha_registro: new Date().toLocaleDateString('es-CL'),
          hora_registro: new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
        };

        const respuestaServer = await firstValueFrom(
          this.jsonServerService.createSesion(datosParaServer)
        );
        console.log('✅ Sesión guardada en servidor:', respuestaServer);
        exitoServer = true;
        mensajes.push('✅ Sincronizado con servidor');
      } catch (errorServer) {
        console.log('⚠️ No se pudo guardar en servidor (modo offline):', errorServer);
        mensajes.push('⚠️ Modo offline - solo guardado local');
      }

      // Mostrar resumen
      const resumen = `
        📋 SESIÓN GUARDADA
        
        • Paciente: ${this.pacienteNombre}
        • Sesión N°: ${this.numeroSesion}
        • Fecha: ${new Date().toLocaleDateString('es-CL')}
        
        📊 EVALUACIÓN:
        • Dolor EVA: ${this.sesionData.nivelDolor}/10
        • Calidad sueño: ${this.sesionData.calidadSueno}/5
        • Ejercicios: ${this.sesionData.ejerciciosRealizados ? '✅ Realizados' : '❌ No realizados'}
        
        💾 ESTADO:
        ${mensajes.join('\n')}
        
        ${this.sesionData.observaciones ? `\n📝 OBSERVACIONES:\n${this.sesionData.observaciones}` : ''}
      `;

      alert(resumen.trim());

      // Redirigir a detalle del paciente con parámetros actualizados
      this.navCtrl.navigateBack(['/paciente-detalle'], {
        queryParams: { 
          id: this.pacienteId,
          sesionGuardada: true,
          numeroSesion: this.numeroSesion,
          timestamp: Date.now() // Para forzar recarga
        }
      });

    } catch (error) {
      console.error('❌ Error crítico al guardar sesión:', error);
      alert('❌ Error al guardar la sesión. Los datos se perdieron. Intente nuevamente.');
    }
  }

  volverAPaciente() {
    if (this.pacienteId) {
      this.navCtrl.navigateBack(['/paciente-detalle'], {
        queryParams: { 
          id: this.pacienteId,
          refresh: Date.now() // Forzar recarga
        }
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