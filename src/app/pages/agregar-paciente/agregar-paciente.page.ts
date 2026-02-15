import { Component, ViewChild, ElementRef } from '@angular/core';
import { NavController, ToastController, Platform } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { DatabaseService } from '../../services/database.service';

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

  modoEdicion = false;
  pacienteIdOriginal: string = '';

  // Propiedades para control del teclado
  tecladoVisible = false;
  @ViewChild('diagnosticoTextarea') diagnosticoTextarea!: ElementRef;

  constructor(
    private navCtrl: NavController,
    private toastController: ToastController,
    private platform: Platform,
    private route: ActivatedRoute,
    private router: Router,
    private databaseService: DatabaseService
  ) {}

  // === MÉTODOS PARA MANEJAR EL TECLADO ===

  async ionViewDidEnter() {
    this.configurarEventosTeclado();

    // Leer params desde la URL actual (no snapshot, que puede estar cacheado por Ionic)
    const urlTree = this.router.parseUrl(this.router.url);
    const params = urlTree.queryParams;
    const id = params['id'];
    const modoEdicion = params['modoEdicion'];

    console.log('ionViewDidEnter - URL actual:', this.router.url);
    console.log('ionViewDidEnter - params:', { id, modoEdicion });

    if (id && modoEdicion === 'true') {
      this.modoEdicion = true;
      this.pacienteIdOriginal = id;
      await this.cargarPacienteParaEditar(id);
    } else {
      this.modoEdicion = false;
      this.pacienteIdOriginal = '';
      this.resetFormulario();
    }
  }

  private async cargarPacienteParaEditar(id: string) {
    try {
      const todosPacientes = await this.databaseService.getPacientes();
      const paciente = todosPacientes.find(p =>
        String(p.id) === String(id) || p.pacienteId === id
      );

      if (paciente) {
        this.paciente = { ...paciente };
        console.log('Paciente cargado para editar:', paciente.nombre);
      } else {
        this.mostrarToast('Paciente no encontrado', 'warning');
        this.modoEdicion = false;
      }
    } catch (error) {
      console.error('Error cargando paciente:', error);
      this.mostrarToast('Error cargando datos del paciente', 'danger');
    }
  }

  private resetFormulario() {
    this.paciente = {
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

  async guardarPaciente() {
    if (!this.formularioValido()) {
      this.mostrarToast('Por favor completa los campos obligatorios', 'warning');
      return;
    }

    try {
      const edadCalculada = this.calcularEdad();
      this.paciente.edad = edadCalculada;

      if (this.modoEdicion) {
        // MODO EDICION: actualizar paciente existente en localStorage
        await this.actualizarPacienteEnStorage();
        this.mostrarToast('Paciente actualizado exitosamente', 'success');
      } else {
        // MODO NUEVO: crear paciente
        const pacienteCompleto = {
          ...this.paciente,
          fechaCreacion: new Date().toISOString(),
          fechaIngreso: new Date().toLocaleDateString('es-CL')
        };

        await this.databaseService.addPaciente(pacienteCompleto);
        this.mostrarToast('Paciente guardado exitosamente', 'success');
      }

      setTimeout(() => {
        if (this.modoEdicion) {
          this.navCtrl.navigateRoot('/paciente-detalle', {
            queryParams: { id: this.pacienteIdOriginal, timestamp: Date.now() }
          });
        } else {
          this.navCtrl.navigateRoot('/pacientes-lista');
        }
      }, 800);

    } catch (error) {
      console.error('Error guardando paciente:', error);
      this.mostrarToast('Error al guardar el paciente', 'danger');
    }
  }

  private async actualizarPacienteEnStorage() {
    // Actualizar en localStorage
    const userPacientes = JSON.parse(localStorage.getItem('user_pacientes') || '[]');
    const index = userPacientes.findIndex((p: any) =>
      String(p.id) === String(this.pacienteIdOriginal)
    );

    if (index !== -1) {
      userPacientes[index] = {
        ...userPacientes[index],
        nombre: this.paciente.nombre,
        rut: this.paciente.rut,
        fechaNacimiento: this.paciente.fechaNacimiento,
        edad: this.paciente.edad,
        email: this.paciente.email,
        telefono: this.paciente.telefono,
        diagnostico: this.paciente.diagnostico,
        sesionesPlanificadas: this.paciente.sesionesPlanificadas
      };
      localStorage.setItem('user_pacientes', JSON.stringify(userPacientes));
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

  volverAPacientes() {
    this.navCtrl.navigateRoot('/pacientes-lista');
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
    
    return true; 
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