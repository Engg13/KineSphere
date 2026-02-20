import { Component } from '@angular/core';
import { NavController, LoadingController, ToastController, AlertController } from '@ionic/angular';
import { JsonServerService } from '../../services/json-server.service';
import { DatabaseService } from '../../services/database.service';
import { PlatformService } from '../../services/platform.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-pacientes-lista',
  templateUrl: './pacientes-lista.page.html',
  styleUrls: ['./pacientes-lista.page.scss'],
  standalone: false
})
export class PacientesListaPage {
  tituloPagina: string = 'Lista de Pacientes';
  pacientes: any[] = [];
  pacientesFiltrados: any[] = [];
  terminoBusqueda: string = '';
  estaCargando: boolean = false;
  plataformaInfo: any;

  constructor(
    private navCtrl: NavController,
    private jsonServerService: JsonServerService,
    private databaseService: DatabaseService,
    private platformService: PlatformService,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    this.plataformaInfo = this.platformService.getDebugInfo();
  }

  ionViewDidEnter() {
    this.cargarPacientes();
  }

  async cargarPacientes() {
    this.estaCargando = true;

    try {
      // Siempre usar DatabaseService: maneja localStorage (web) y SQLite (nativo)
      this.pacientes = await this.databaseService.getPacientesConConteoSesiones();
      this.pacientesFiltrados = [...this.pacientes];
      console.log(`📊 ${this.pacientes.length} pacientes cargados`);
    } catch (error) {
      console.error('❌ Error cargando pacientes:', error);
      this.pacientes = [];
      this.pacientesFiltrados = [];
      this.mostrarToast('Error cargando pacientes', 'danger');
    } finally {
      this.estaCargando = false;
    }
  }

  async recargarPacientes(event?: any) {
    await this.cargarPacientes();
    if (event) {
      event.target.complete();
    }
  }

  filtrarPacientes() {
    const termino = this.terminoBusqueda.toLowerCase().trim();
    if (!termino) {
      this.pacientesFiltrados = [...this.pacientes];
      return;
    }
    this.pacientesFiltrados = this.pacientes.filter(p =>
      p.nombre?.toLowerCase().includes(termino) ||
      p.diagnostico?.toLowerCase().includes(termino) ||
      p.rut?.toLowerCase().includes(termino)
    );
  }

  get totalPacientes(): number {
    return this.pacientes.length;
  }

  get pacientesActivos(): number {
    return this.pacientes.filter(p => p.activo).length;
  }

  agregarPaciente() {
    console.log('Navegando a agregar paciente...');
    this.navCtrl.navigateRoot('/agregar-paciente');
  }

  verDetallePaciente(paciente: any) {
    console.log('👤 Ver detalle del paciente:', paciente);
    console.log('🆔 ID del paciente:', paciente.id);
    console.log('📊 Número de sesiones:', paciente.num_sesiones || 0);
    
    this.navCtrl.navigateRoot('/paciente-detalle', {
      queryParams: { 
        id: paciente.id,
        numSesiones: paciente.num_sesiones || 0
      }
    });
  }

  volverAlDashboard() {
    this.navCtrl.navigateRoot('/dashboard');
  }

  // CARGAR PACIENTES DE EJEMPLO - FUNCIONA EN AMBOS ENTORNOS
  async cargarPacientesEjemplo() {
    const pacientesEjemplo = [
      {
        nombre: "Ana González López",
        rut: "12.345.678-9",
        edad: 39,
        email: "ana.gonzalez@email.com",
        telefono: "+56 9 8765 4321",
        diagnostico: "Lumbalgia aguda",
        sesionesPlanificadas: 8,
        sesionesCompletadas: 3,
        num_sesiones: 6,
        activo: true,
        fechaCreacion: new Date().toISOString()
      },
      {
        nombre: "Carlos Méndez Rojas", 
        rut: "23.456.789-0",
        edad: 46,
        email: "carlos.mendez@email.com",
        telefono: "+56 9 7654 3210",
        diagnostico: "Artrosis de rodilla derecha",
        sesionesPlanificadas: 10,
        sesionesCompletadas: 6,
        num_sesiones: 6,
        activo: true,
        fechaCreacion: new Date().toISOString()
      },
      {
        nombre: "María Silva Pérez",
        rut: "34.567.890-1",
        edad: 32,
        email: "maria.silva@email.com",
        telefono: "+56 9 6543 2109",
        diagnostico: "Esguince de tobillo izquierdo",
        sesionesPlanificadas: 6,
        sesionesCompletadas: 2,
        num_sesiones: 6,
        activo: true,
        fechaCreacion: new Date().toISOString()
      }
    ];

    const loading = await this.loadingController.create({
      message: 'Cargando pacientes de ejemplo...'
    });
    
    await loading.present();

    try {
      let cargadosExitosos = 0;
      let errores: string[] = [];
      
      console.log('🎯 INICIANDO CARGA DE EJEMPLO...');
      console.log('📱 Entorno:', this.platformService.getDebugInfo().descripcion);
      
      for (const paciente of pacientesEjemplo) {
        try {
          console.log(`🔄 Procesando: ${paciente.nombre}`);
          await this.databaseService.addPaciente(paciente);
          console.log(`✅ Guardado: ${paciente.nombre}`);
          cargadosExitosos++;
          
        } catch (error) {
          const errorMsg = `Error con ${paciente.nombre}: ${error}`;
          console.error(`❌ ${errorMsg}`);
          errores.push(errorMsg);
        }
      }

      await loading.dismiss();
      
      if (cargadosExitosos > 0) {
        this.mostrarToast(`${cargadosExitosos} pacientes cargados`, 'success');
        await this.cargarPacientes(); // Recargar la lista
      } else {
        let mensajeError = 'No se pudieron cargar los pacientes. ';
        if (errores.length > 0) {
          mensajeError += 'Errores: ' + errores.join('; ');
        }
        this.mostrarToast(mensajeError, 'warning');
      }
      
    } catch (error) {
      await loading.dismiss();
      console.error('❌ Error general en carga de ejemplo:', error);
      this.mostrarToast('Error cargando pacientes de ejemplo: ' + error, 'danger');
    }
  }

  // ✅ GUARDAR EN SQLite (PARA NATIVO)
  private async guardarPacienteEnSQLite(paciente: any): Promise<string> {
    console.log('📱 Guardando en SQLite:', paciente.nombre);
    
    const pacienteSQLite = {
      nombre: paciente.nombre,
      rut: paciente.rut,
      edad: paciente.edad,
      email: paciente.email,
      telefono: paciente.telefono,
      diagnostico: paciente.diagnostico,
      sesionesPlanificadas: paciente.sesionesPlanificadas || 0,
      sesionesCompletadas: paciente.sesionesCompletadas || 0,
      num_sesiones: paciente.sesionesCompletadas || 0,
      activo: paciente.activo !== undefined ? paciente.activo : true,
      fechaCreacion: paciente.fechaCreacion || new Date().toISOString(),
      observaciones: paciente.observaciones || null
    };

    try {
      await this.databaseService.addPaciente(pacienteSQLite);
      console.log('✅ Éxito en SQLite:', paciente.nombre);
      return 'SQLite';
      
    } catch (error) {
      console.error('❌ Error en SQLite:', error);
      throw new Error('No se pudo guardar en SQLite: ' + error);
    }
  }

  // ✅ GUARDAR EN JSON SERVER (PARA WEB)
  private async guardarPacienteEnJsonServer(paciente: any): Promise<string> {
    console.log('🌐 Guardando en JSON Server:', paciente.nombre);
    
    const pacienteJson = {
      nombre: paciente.nombre,
      rut: paciente.rut,
      edad: paciente.edad,
      email: paciente.email,
      telefono: paciente.telefono,
      diagnostico: paciente.diagnostico,
      sesionesPlanificadas: paciente.sesionesPlanificadas || 0,
      sesionesCompletadas: paciente.sesionesCompletadas || 0,
      num_sesiones: paciente.sesionesCompletadas || 0,
      activo: paciente.activo !== undefined ? paciente.activo : true,
      fechaCreacion: paciente.fechaCreacion || new Date().toISOString(),
      observaciones: paciente.observaciones || null
    };

    try {
      await firstValueFrom(this.jsonServerService.createPaciente(pacienteJson));
      console.log('✅ Éxito en JSON Server:', paciente.nombre);
      return 'JSON Server';
      
    } catch (error) {
      console.error('❌ Error en JSON Server:', error);
      throw new Error('No se pudo guardar en JSON Server: ' + error);
    }
  }

  // ✅ BORRAR TODOS LOS PACIENTES
  async borrarTodosLosPacientes() {
    const alert = await this.alertController.create({
      header: '⚠️ Confirmar Eliminación',
      message: '¿Estás seguro de que quieres eliminar todos los pacientes? Esta acción no se puede deshacer.',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          cssClass: 'secondary'
        },
        {
          text: 'Sí, Eliminar Todo',
          role: 'destructive',
          handler: () => {
            this.confirmarBorradoCompleto();
          }
        }
      ]
    });

    await alert.present();
  }

  // ✅ CONFIRMAR Y EJECUTAR BORRADO
  private async confirmarBorradoCompleto() {
    const loading = await this.loadingController.create({
      message: 'Eliminando todos los pacientes...'
    });
    
    await loading.present();

    try {
      let eliminadosExitosos = 0;

      const todosLosPacientes = await this.databaseService.getPacientes();
      for (const paciente of todosLosPacientes) {
        try {
          await this.databaseService.deletePaciente(paciente.id);
          eliminadosExitosos++;
        } catch (error) {
          console.error(`❌ Error eliminando paciente ${paciente.id}:`, error);
        }
      }

      await loading.dismiss();
      
      if (eliminadosExitosos > 0) {
        this.mostrarToast(`${eliminadosExitosos} pacientes eliminados exitosamente`, 'success');
        await this.cargarPacientes();
      } else {
        this.mostrarToast('No había pacientes para eliminar', 'warning');
      }
      
    } catch (error) {
      await loading.dismiss();
      this.mostrarToast('Error eliminando pacientes', 'danger');
    }
  }

  // ✅ MOSTRAR TOAST
  async mostrarToast(mensaje: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 3000,
      color: color,
      position: 'bottom'
    });
    await toast.present();
  }

  // ✅ MÉTODO PARA DEBUG
  async probarEntorno() {
    console.log('🐛 === DEBUG ENTORNO ===');
    const platformInfo = this.platformService.getDebugInfo();
    console.log('Plataforma:', platformInfo);
    
    try {
      const pacientesSqlite = await this.databaseService.getPacientes();
      console.log('✅ SQLite funciona:', pacientesSqlite.length, 'pacientes');
      
      // Probar también el método con conteo de sesiones
      const pacientesConSesiones = await this.databaseService.getPacientesConConteoSesiones();
      console.log('✅ Método con sesiones:', pacientesConSesiones.length, 'pacientes con sesiones');
      
    } catch (error) {
      console.log('❌ SQLite no funciona:', error);
    }
    
    if (!this.platformService.shouldUseSQLite()) {
      try {
        const pacientesJson = await firstValueFrom(this.jsonServerService.getPacientes());
        console.log('✅ JSON Server funciona:', pacientesJson.length, 'pacientes');
      } catch (error) {
        console.log('❌ JSON Server no funciona:', error);
      }
    }
  }
}