import { Component } from '@angular/core';
import { NavController, ToastController, Platform } from '@ionic/angular';
import { JsonServerService } from '../../services/json-server.service';
import { DatabaseService } from '../../services/database.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-agregar-paciente',
  templateUrl: './agregar-paciente.page.html',
  styleUrls: ['./agregar-paciente.page.scss'],
  standalone: false
})
export class AgregarPacientePage {
  paciente: any = {
    nombre: '',
    rut: '',
    fechaNacimiento: '',
    edad: 0,
    email: '',
    telefono: '',
    diagnostico: '',
    sesionesPlanificadas: 10,
    sesionesCompletadas: 0,
    activo: true,
    fechaCreacion: new Date().toISOString()
  };

  constructor(
    private navCtrl: NavController,
    private toastController: ToastController,
    private platform: Platform,
    private jsonServerService: JsonServerService,
    private databaseService: DatabaseService
  ) {}

  //  Actualizar edad automáticamente cuando cambia la fecha
  actualizarEdad() {
    this.paciente.edad = this.calcularEdad();
  }

  // Generar ID único basado en RUT
  generarIdPaciente(): string {
    if (!this.paciente.rut) return 'ID-XXXX';
    
    const rutLimpio = this.paciente.rut.replace(/[\.\-]/g, '');
    const ultimosDigitos = rutLimpio.slice(-4);
    return `PAC-${ultimosDigitos}`;
  }

  // Validar formulario
  formularioValido(): boolean {
    return !!(
      this.paciente.nombre && 
      this.paciente.rut && 
      this.paciente.telefono && 
      this.paciente.diagnostico
    );
  }

  // Calcular edad desde fecha de nacimiento
  calcularEdad(): number {
    if (!this.paciente.fechaNacimiento) return 0;
    
    const nacimiento = new Date(this.paciente.fechaNacimiento);
    const hoy = new Date();
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    
    const mes = hoy.getMonth();
    const dia = hoy.getDate();
    if (mes < nacimiento.getMonth() || 
        (mes === nacimiento.getMonth() && dia < nacimiento.getDate())) {
      edad--;
    }
    
    return edad;
  }

  //  Intentar ambas plataformas inteligentemente
  async guardarPaciente() {
    if (!this.formularioValido()) {
      this.mostrarToast('Por favor completa los campos obligatorios', 'warning');
      return;
    }

    try {
      // Agregar ID único y asegurar edad actualizada
      const pacienteCompleto = {
        ...this.paciente,
        id: this.generarIdPaciente(),
        edad: this.calcularEdad()
      };

      console.log('🔄 Iniciando guardado de paciente:', pacienteCompleto);

      // ESTRATEGIA INTELIGENTE: Intentar ambas plataformas
      const resultado = await this.intentarGuardadoEnAmbasPlataformas(pacienteCompleto);

      if (resultado.exito) {
        this.mostrarToast(resultado.mensaje, 'success');
        this.navCtrl.navigateRoot('/pacientes-lista');
      } else {
        this.mostrarToast(resultado.mensaje, 'warning');
      }
      
    } catch (error) {
      console.error('❌ Error crítico guardando paciente:', error);
      this.mostrarToast('Error crítico al guardar el paciente', 'danger');
    }
  }

  // Método inteligente que intenta ambas plataformas
  private async intentarGuardadoEnAmbasPlataformas(paciente: any): Promise<{exito: boolean, mensaje: string}> {
    const resultados = {
      web: { exito: false, error: '' },
      movil: { exito: false, error: '' }
    };

    console.log('🔍 Evaluando plataformas disponibles...');

    // 1. PRIMERO intentar JSON Server (Web)
    try {
      console.log('🌐 Intentando guardar en JSON Server...');
      await this.guardarEnJsonServer(paciente);
      resultados.web.exito = true;
      console.log('✅ JSON Server: Éxito');
    } catch (errorWeb) {
      resultados.web.error = errorWeb as any|| 'Error desconocido';
      console.log('❌ JSON Server falló:', resultados.web.error);
    }

    // 2. LUEGO intentar SQLite (Móvil)
    try {
      console.log('📱 Intentando guardar en SQLite...');
      await this.guardarEnSQLite(paciente);
      resultados.movil.exito = true;
      console.log('✅ SQLite: Éxito');
    } catch (errorMovil) {
      resultados.movil.error = errorMovil as any || 'Error desconocido';
      console.log('❌ SQLite falló:', resultados.movil.error);
    }

    // 3. ANALIZAR RESULTADOS
    return this.analizarResultadosGuardado(resultados);
  }

  // Analizar resultados y determinar mensaje
  private analizarResultadosGuardado(resultados: any): {exito: boolean, mensaje: string} {
    const plataformasExitosas = [];
    if (resultados.web.exito) plataformasExitosas.push('web');
    if (resultados.movil.exito) plataformasExitosas.push('móvil');

    if (plataformasExitosas.length > 0) {
      const plataformasTexto = plataformasExitosas.join(' y ');
      return {
        exito: true,
        mensaje: `✅ Paciente guardado exitosamente (${plataformasTexto})`
      };
    }

    // Si ambas fallaron
    const esModoWeb = !this.platform.is('cordova') && !this.platform.is('capacitor');
    
    if (esModoWeb) {
      return {
        exito: false,
        mensaje: '❌ No se pudo guardar. Asegúrate de tener json-server corriendo en puerto 3000'
      };
    } else {
      return {
        exito: false,
        mensaje: '❌ Error en el dispositivo. Reinicia la aplicación e intenta nuevamente'
      };
    }
  }

  // Guardar en JSON Server (Web)
  private async guardarEnJsonServer(paciente: any): Promise<void> {
    try {
      const respuesta = await firstValueFrom(this.jsonServerService.createPaciente(paciente));
      console.log('✅ Guardado exitoso en JSON Server:', respuesta);
    } catch (error) {
      console.error('❌ Error guardando en JSON Server:', error);
      throw new Error('JSON Server no disponible');
    }
}

  // Guardar en SQLite (Móvil)
  private async guardarEnSQLite(paciente: any): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        // Verificar si SQLite está disponible
        if (!await this.sqliteDisponible()) {
          reject(new Error('SQLite no inicializado'));
          return;
        }

        await this.databaseService.addPaciente(paciente);
        console.log('✅ Guardado exitoso en SQLite');
        resolve();
      } catch (error) {
        console.error('❌ Error guardando en SQLite:', error);
        reject(new Error('Error en base de datos local'));
      }
    });
  }

  // Verificar si SQLite está disponible
  private async sqliteDisponible(): Promise<boolean> {
    try {
      // Intentar una operación simple de SQLite
      await this.databaseService.getPacientes();
      return true;
    } catch (error) {
      console.log('ℹ️ SQLite no disponible (modo web):', (error as any).message);
      return false;
    }
  }

  // Mostrar notificación
  async mostrarToast(mensaje: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 4000,
      color: color,
      position: 'bottom',
      buttons: [
        {
          side: 'end',
          icon: 'close',
          role: 'cancel'
        }
      ]
    });
    await toast.present();
  }

  volverAPacientes() {
    this.navCtrl.navigateRoot('/pacientes-lista');
  }

  // Formatear RUT automáticamente
  formatearRut() {
    if (!this.paciente.rut) return;
    
    // Limpiar el RUT (solo números y K)
    let rutLimpio = this.paciente.rut.replace(/[^0-9kK]/g, '');
    
    if (rutLimpio.length > 0) {
      // Separar número y dígito verificador
      let cuerpo = rutLimpio.slice(0, -1);
      let dv = rutLimpio.slice(-1).toUpperCase();
      
      // Formatear con puntos
      if (cuerpo.length > 0) {
        cuerpo = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      }
      
      // Asignar el RUT formateado
      this.paciente.rut = cuerpo + '-' + dv;
    }
  }

  // Validar formato de RUT
  validarRut(): boolean {
    if (!this.paciente.rut) return false;
    
    const rutLimpio = this.paciente.rut.replace(/[^0-9kK]/g, '');
    if (rutLimpio.length < 2) return false;
    
    return true; 
  }

  // Formatear teléfono automáticamente
  formatearTelefono() {
    if (!this.paciente.telefono) return;
    
    // Limpiar el teléfono 
    let telefonoLimpio = this.paciente.telefono.replace(/[^0-9]/g, '');
    
    if (telefonoLimpio.length > 0) {
      // Si empieza con 9, asumir que es celular y agregar +56
      if (telefonoLimpio.startsWith('9') && telefonoLimpio.length === 9) {
        this.paciente.telefono = '+56 ' + telefonoLimpio;
      }
      // Si ya tiene código de país, formatear con espacios
      else if (telefonoLimpio.startsWith('569') && telefonoLimpio.length === 11) {
        this.paciente.telefono = '+56 9 ' + telefonoLimpio.slice(3);
      }
      // Si ya tiene +56, mantenerlo
      else if (telefonoLimpio.startsWith('56') && telefonoLimpio.length === 11) {
        this.paciente.telefono = '+56 9 ' + telefonoLimpio.slice(2);
      }
    }
  }

  // Validar teléfono chileno
  validarTelefonoChileno(): boolean {
    if (!this.paciente.telefono) return false;
    
    const telefonoLimpio = this.paciente.telefono.replace(/[^0-9]/g, '');
    
    // Validar formatos chilenos:
    // - Celular: 9XXXXXXXX (9 dígitos)
    // - Celular con código: 569XXXXXXXX (11 dígitos)
    // - Fijo: 2XXXXXXXX (9 dígitos)
    return telefonoLimpio.length === 9 || telefonoLimpio.length === 11;
    }
  }
