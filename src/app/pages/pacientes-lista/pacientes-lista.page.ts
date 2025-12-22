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

  async ngOnInit() {
    this.plataformaInfo = this.platformService.getDebugInfo();
    
    console.log('🚀 Iniciando app - Plataforma:', this.plataformaInfo.descripcion);
    console.log('🔍 Información completa:', this.plataformaInfo);
    
    await this.cargarPacientes();
  }

  async cargarPacientes() {
    this.estaCargando = true;
    
    try {
      console.log('🔄 Cargando pacientes - Estrategia mejorada');
      
      if (this.platformService.shouldUseSQLite()) {
        console.log('📱 Entorno nativo detectado - usando SQLite');
        await this.cargarDesdeSQLite();
      } else {
        console.log('🌐 Entorno web detectado - usando JSON Server');
        await this.cargarDesdeJsonServer();
      }
      
    } catch (error) {
      console.error('❌ Error cargando pacientes:', error);
      this.pacientes = [];
      this.mostrarToast('Error cargando pacientes', 'danger');
    } finally {
      this.estaCargando = false;
    }
  }

  private async cargarDesdeSQLite() {
    try {
      // USAR ESTE MÉTODO QUE INCLUYE EL NÚMERO DE SESIONES
      this.pacientes = await this.databaseService.getPacientesConConteoSesiones();
      
      console.log(`📊 ${this.pacientes.length} pacientes cargados desde SQLite (NATIVO)`, this.pacientes);
      
      // Si aún no tiene num_sesiones, asignar 0
      this.pacientes = this.pacientes.map(paciente => ({
        ...paciente,
        num_sesiones: paciente.num_sesiones || 0
      }));
      
    } catch (error) {
      console.error('Error cargando desde SQLite:', error);
      this.pacientes = [];
      throw error;
    }
  }

  private async cargarDesdeJsonServer() {
    try {
      this.pacientes = await firstValueFrom(this.jsonServerService.getPacientes());
      console.log(`📊 ${this.pacientes.length} pacientes cargados desde JSON Server (WEB)`);
      
      // Para JSON Server, también necesitamos obtener el número de sesiones
      await this.cargarNumeroSesionesParaJsonServer();
      
    } catch (error) {
      console.error('Error cargando desde JSON Server:', error);
      this.pacientes = [];
      throw error;
    }
  }

  // Método para cargar número de sesiones en modo JSON Server
  private async cargarNumeroSesionesParaJsonServer() {
    for (const paciente of this.pacientes) {
      try {
        // Obtener sesiones para cada paciente
        const sesiones = await firstValueFrom(
          this.jsonServerService.getSesionesPorPaciente(paciente.id)
        );
        
        // Asignar número de sesiones
        paciente.num_sesiones = sesiones ? sesiones.length : 0;
      } catch (error) {
        console.log(`No se pudieron obtener sesiones para paciente ${paciente.id}:`, error);
        paciente.num_sesiones = 0;
      }
    }
  }

  async recargarPacientes(event?: any) {
    await this.cargarPacientes();
    if (event) {
      event.target.complete();
    }
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
          
          if (this.platformService.shouldUseSQLite()) {
            await this.guardarPacienteEnSQLite(paciente);
            console.log(`✅ Guardado en SQLite: ${paciente.nombre}`);
          } else {
            await this.guardarPacienteEnJsonServer(paciente);
            console.log(`✅ Guardado en JSON Server: ${paciente.nombre}`);
          }
          
          cargadosExitosos++;
          
        } catch (error) {
          const errorMsg = `Error con ${paciente.nombre}: ${error}`;
          console.error(`❌ ${errorMsg}`);
          errores.push(errorMsg);
        }
      }

      await loading.dismiss();
      
      if (cargadosExitosos > 0) {
        const plataforma = this.platformService.shouldUseSQLite() ? 'SQLite' : 'JSON Server';
        this.mostrarToast(`${cargadosExitosos} pacientes cargados en ${plataforma}`, 'success');
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
      
      if (this.platformService.shouldUseSQLite()) {
        console.log('📱 Borrando de SQLite (NATIVO)...');
        const pacientesSqlite = await this.databaseService.getPacientes();
        for (const paciente of pacientesSqlite) {
          try {
            await this.databaseService.deletePaciente(paciente.id);
            eliminadosExitosos++;
          } catch (error) {
            console.error(`❌ Error eliminando de SQLite ${paciente.id}:`, error);
          }
        }
      } else {
        console.log('🌐 Borrando de JSON Server (WEB)...');
        try {
          const pacientesJson = await firstValueFrom(this.jsonServerService.getPacientes());
          for (const paciente of pacientesJson) {
            try {
              await firstValueFrom(this.jsonServerService.deletePaciente(paciente.id));
              eliminadosExitosos++;
            } catch (error) {
              console.error(`❌ Error eliminando de JSON Server ${paciente.id}:`, error);
            }
          }
        } catch (error) {
          console.log('ℹ️ JSON Server no disponible para borrado');
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