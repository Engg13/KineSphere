import { Component, ViewChild, ElementRef } from '@angular/core';
import { NavController, ToastController, AlertController, Platform } from '@ionic/angular';
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

  // Propiedades para control del teclado
  tecladoVisible = false;
  @ViewChild('diagnosticoTextarea') diagnosticoTextarea!: ElementRef;

  constructor(
    private navCtrl: NavController,
    private toastController: ToastController,
    private alertController: AlertController,
    private platform: Platform,
    private jsonServerService: JsonServerService,
    private databaseService: DatabaseService
  ) {}

  // === MÉTODOS PARA MANEJAR EL TECLADO ===

  ionViewDidEnter() {
    this.configurarEventosTeclado();
  }

  configurarEventosTeclado() {
    if (typeof (window as any).Keyboard !== 'undefined') {
      (window as any).Keyboard.addListener('keyboardWillShow', () => {
        this.tecladoVisible = true;
      });
      
      (window as any).Keyboard.addListener('keyboardWillHide', () => {
        this.tecladoVisible = false;
      });
    }
    
    else if ((window as any).cordova?.plugins?.Keyboard) {
      (window as any).cordova.plugins.Keyboard.showFormAccessoryBar(false);
    }
  }

  onEnterDiagnostico(event: KeyboardEvent | any) {
    event.preventDefault();
    this.cerrarTeclado();
    
    setTimeout(() => {
      this.moverFocoAlBotonGuardar();
    }, 100);
  }

  cerrarTeclado() {
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement) {
      activeElement.blur();
    }
    
    if (typeof (window as any).Keyboard !== 'undefined') {
      try {
        (window as any).Keyboard.hide();
      } catch (error) {}
    }
    
    else if ((window as any).cordova?.plugins?.Keyboard) {
      try {
        (window as any).cordova.plugins.Keyboard.hide();
      } catch (error) {}
    }
    
    else {
      const inputs = document.querySelectorAll('ion-input, ion-textarea');
      inputs.forEach(input => {
        (input as HTMLElement).blur();
      });
    }
  }

  moverFocoAlBotonGuardar() {
    const guardarBtn = document.querySelector('ion-button[expand="block"]') as HTMLElement;
    if (guardarBtn) {
      guardarBtn.focus();
    }
  }

  onTapOutside(event: any) {
    const clickedElement = event.target as HTMLElement;
    const esCampoTexto = clickedElement.closest('ion-input') || 
                         clickedElement.closest('ion-textarea') ||
                         clickedElement.closest('ion-range');
    
    if (!esCampoTexto) {
      this.cerrarTeclado();
    }
  }

  // === MÉTODOS DEL FORMULARIO ===

  actualizarEdad() {
    this.paciente.edad = this.calcularEdad();
  }

  generarIdPaciente(): string {
    if (!this.paciente.rut) return 'ID-XXXX';
    
    const rutLimpio = this.paciente.rut.replace(/[\.\-]/g, '');
    const ultimosDigitos = rutLimpio.slice(-4);
    return `PAC-${ultimosDigitos}`;
  }

  formularioValido(): boolean {
    return !!(
      this.paciente.nombre && 
      this.paciente.rut && 
      this.paciente.telefono && 
      this.paciente.diagnostico
    );
  }

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

  // === MÉTODO PRINCIPAL - SIMPLIFICADO Y FUNCIONAL ===
  async guardarPaciente() {
    if (!this.formularioValido()) {
      this.mostrarToast('Por favor completa los campos obligatorios', 'warning');
      return;
    }

    try {
      // 1. CALCULAR EDAD (CRÍTICO)
      const edadCalculada = this.calcularEdad();
      console.log(`📅 Edad calculada para guardar: ${edadCalculada} años`);
      
      // 2. GENERAR ID ÚNICO
      const idPaciente = this.generarIdPaciente();
      
      // 3. CREAR OBJETO COMPLETO DEL PACIENTE CON EDAD INCLUIDA
      const pacienteCompleto = {
        ...this.paciente,
        id: idPaciente,
        edad: edadCalculada, // ← ¡ESTA ES LA CLAVE! La edad calculada se guarda aquí
        fechaCreacion: new Date().toISOString(),
        // Campos adicionales para compatibilidad
        pacienteId: idPaciente,
        fechaIngreso: new Date().toLocaleDateString('es-CL')
      };

      console.log('💾 Paciente completo para guardar:', pacienteCompleto);
      console.log('🔍 Verificando campo "edad":', pacienteCompleto.edad, 'tipo:', typeof pacienteCompleto.edad);

      // 4. GUARDAR PACIENTE (DatabaseService maneja localStorage en web y SQLite en nativo)
      let guardadoExitoso = false;
      let mensajeFinal = '';

      try {
        await this.databaseService.addPaciente(pacienteCompleto);
        guardadoExitoso = true;
        mensajeFinal = 'Paciente guardado exitosamente';
        console.log('✅ Paciente guardado');
      } catch (error) {
        console.error('❌ Error guardando paciente:', error);
        mensajeFinal = 'Error: No se pudo guardar el paciente';
      }

      // 5. MOSTRAR RESULTADO
      if (guardadoExitoso) {
        this.mostrarToast(mensajeFinal, 'success');
        
        // 6. NAVEGACIÓN DESPUÉS DE ÉXITO
        setTimeout(() => {
          this.navCtrl.navigateRoot('/pacientes-lista');
        }, 1200);
        
      } else {
        this.mostrarToast(mensajeFinal, 'danger');
      }
      
    } catch (error) {
      console.error('❌ Error crítico en guardarPaciente:', error);
      this.mostrarToast('Error crítico al procesar el paciente', 'danger');
    }
  }

  // === MÉTODOS AUXILIARES ===

  async mostrarToast(mensaje: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 3000,
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

  async volverAPacientes() {
    if (this.hayUnsavedChanges()) {
      const alert = await this.alertController.create({
        header: 'Cambios sin guardar',
        message: '¿Deseas salir? Se perderán los datos ingresados.',
        buttons: [
          { text: 'Cancelar', role: 'cancel' },
          {
            text: 'Salir',
            role: 'destructive',
            handler: () => { this.navCtrl.navigateRoot('/pacientes-lista'); }
          }
        ]
      });
      await alert.present();
    } else {
      this.navCtrl.navigateRoot('/pacientes-lista');
    }
  }

  private hayUnsavedChanges(): boolean {
    return !!(
      this.paciente.nombre ||
      this.paciente.rut ||
      this.paciente.telefono ||
      this.paciente.diagnostico ||
      this.paciente.email ||
      this.paciente.fechaNacimiento
    );
  }

  // === MÉTODOS DE FORMATEO (MANTENIDOS) ===

  formatearRut() {
    if (!this.paciente.rut) return;
    
    let rutLimpio = this.paciente.rut.replace(/[^0-9kK]/g, '');
    
    if (rutLimpio.length > 0) {
      let cuerpo = rutLimpio.slice(0, -1);
      let dv = rutLimpio.slice(-1).toUpperCase();
      
      if (cuerpo.length > 0) {
        cuerpo = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      }
      
      this.paciente.rut = cuerpo + '-' + dv;
    }
  }

  validarRut(): boolean {
    if (!this.paciente.rut) return false;

    const rutLimpio = this.paciente.rut.replace(/[^0-9kK]/g, '');
    if (rutLimpio.length < 2) return false;

    const num = rutLimpio.slice(0, -1);
    const dv = rutLimpio.slice(-1).toUpperCase();

    if (!num || isNaN(Number(num))) return false;

    let suma = 0;
    let multiplicador = 2;
    for (let i = num.length - 1; i >= 0; i--) {
      suma += parseInt(num[i]) * multiplicador;
      multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
    }
    const dvEsperado = 11 - (suma % 11);
    const dvCalculado = dvEsperado === 11 ? '0' : dvEsperado === 10 ? 'K' : String(dvEsperado);

    return dv === dvCalculado;
  }

  formatearTelefono() {
    if (!this.paciente.telefono) return;
    
    let telefonoLimpio = this.paciente.telefono.replace(/[^0-9]/g, '');
    
    if (telefonoLimpio.length > 0) {
      if (telefonoLimpio.startsWith('9') && telefonoLimpio.length === 9) {
        this.paciente.telefono = '+56 ' + telefonoLimpio;
      }
      else if (telefonoLimpio.startsWith('569') && telefonoLimpio.length === 11) {
        this.paciente.telefono = '+56 9 ' + telefonoLimpio.slice(3);
      }
      else if (telefonoLimpio.startsWith('56') && telefonoLimpio.length === 11) {
        this.paciente.telefono = '+56 9 ' + telefonoLimpio.slice(2);
      }
    }
  }

  validarTelefonoChileno(): boolean {
    if (!this.paciente.telefono) return false;
    
    const telefonoLimpio = this.paciente.telefono.replace(/[^0-9]/g, '');
    return telefonoLimpio.length === 9 || telefonoLimpio.length === 11;
  }

  // === MÉTODO DE DEPURACIÓN (OPCIONAL) ===
  
  async verificarGuardado() {
    try {
      console.log('🔍 Verificando guardado en SQLite...');
      const pacientes = await this.databaseService.getPacientes();
      console.log(`📊 Total pacientes en SQLite: ${pacientes.length}`);
      
      if (pacientes.length > 0) {
        console.log('📋 Últimos 3 pacientes:');
        pacientes.slice(-3).forEach((p, i) => {
          console.log(`${i+1}. ${p.nombre} - Edad: ${p.edad} - ID: ${p.id}`);
        });
      }
    } catch (error) {
      console.error('❌ Error verificando SQLite:', error);
    }
  }
}