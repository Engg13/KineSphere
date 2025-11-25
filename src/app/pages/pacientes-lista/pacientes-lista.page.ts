import { Component } from '@angular/core';
import { NavController, LoadingController, ToastController, AlertController } from '@ionic/angular';
import { JsonServerService } from '../../services/json-server.service';
import { DatabaseService } from '../../services/database.service';
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

  constructor(
    private navCtrl: NavController,
    private jsonServerService: JsonServerService,
    private databaseService: DatabaseService,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private alertController: AlertController
  ) {}

  async ngOnInit() {
    console.log('🚀 Iniciando app - Entorno:', this.isAndroid() ? 'ANDROID' : 'NAVEGADOR');
    console.log('📍 User Agent:', navigator.userAgent);
    
    await this.cargarPacientes();
  }

  // ✅ DETECTAR SI ESTAMOS EN ANDROID O NAVEGADOR
  private isAndroid(): boolean {
    // Verificar si estamos en Cordova/Capacitor (Android)
    const isCordova = typeof window !== 'undefined' && (window as any).cordova;
    const isCapacitor = typeof window !== 'undefined' && (window as any).Capacitor;
    
    // Verificar si estamos en un dispositivo móvil
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
    
    return isCordova || isCapacitor || isMobile;
  }

  // ✅ DETECTAR SI ESTAMOS EN NAVEGADOR (DESARROLLO)
  private isWebBrowser(): boolean {
    return typeof window !== 'undefined' && 
           (window.location.hostname === 'localhost' || 
            window.location.hostname === '127.0.0.1');
  }

  async cargarPacientes() {
    this.estaCargando = true;
    
    try {
      console.log('🔄 Cargando pacientes - Entorno:', this.isAndroid() ? 'Android' : 'Navegador');
      
      let pacientesCargados: any[] = [];
      
      // ✅ ESTRATEGIA HÍBRIDA PARA CARGAR
      if (this.isAndroid()) {
        // Android: Intentar SQLite primero
        try {
          pacientesCargados = await this.databaseService.getPacientes();
          console.log('📱 Cargados desde SQLite (Android):', pacientesCargados.length);
        } catch (errorSqlite) {
          console.log('❌ SQLite falló, intentando JSON Server...', errorSqlite);
          try {
            pacientesCargados = await firstValueFrom(this.jsonServerService.getPacientes());
            console.log('🌐 Cargados desde JSON Server (fallback):', pacientesCargados.length);
          } catch (errorJson) {
            console.log('❌ JSON Server también falló');
            pacientesCargados = [];
          }
        }
      } else {
        // Navegador: Intentar JSON Server primero
        try {
          pacientesCargados = await firstValueFrom(this.jsonServerService.getPacientes());
          console.log('🌐 Cargados desde JSON Server (Web):', pacientesCargados.length);
        } catch (errorJson) {
          console.log('❌ JSON Server falló, intentando SQLite...', errorJson);
          try {
            pacientesCargados = await this.databaseService.getPacientes();
            console.log('💾 Cargados desde SQLite (fallback):', pacientesCargados.length);
          } catch (errorSqlite) {
            console.log('❌ SQLite también falló');
            pacientesCargados = [];
          }
        }
      }
      
      this.pacientes = pacientesCargados || [];
      console.log(`📊 Total de pacientes cargados: ${this.pacientes.length}`);
      
    } catch (error) {
      console.error('❌ Error cargando pacientes:', error);
      this.pacientes = [];
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
    
    this.navCtrl.navigateForward('/paciente-detalle', {
      queryParams: { id: paciente.id }
    });
  }

  volverAlDashboard() {
    this.navCtrl.navigateRoot('/dashboard');
  }

  async cargarPacientesEjemplo() {
    const pacientesEjemplo = [
      {
        id: this.generarIdUnico(),
        nombre: "Ana González López",
        rut: "12.345.678-9",
        fechaNacimiento: "1985-03-15",
        edad: 39,
        email: "ana.gonzalez@email.com",
        telefono: "+56 9 8765 4321",
        diagnostico: "Lumbalgia aguda",
        sesionesPlanificadas: 8,
        sesionesCompletadas: 3,
        activo: true,
        fechaCreacion: new Date().toISOString()
      },
      {
        id: this.generarIdUnico(),
        nombre: "Carlos Méndez Rojas", 
        rut: "23.456.789-0",
        fechaNacimiento: "1978-11-22",
        edad: 46,
        email: "carlos.mendez@email.com",
        telefono: "+56 9 7654 3210",
        diagnostico: "Artrosis de rodilla derecha",
        sesionesPlanificadas: 10,
        sesionesCompletadas: 6,
        activo: true,
        fechaCreacion: new Date().toISOString()
      },
      {
        id: this.generarIdUnico(),
        nombre: "María Silva Pérez",
        rut: "34.567.890-1",
        fechaNacimiento: "1992-07-08",
        edad: 32,
        email: "maria.silva@email.com",
        telefono: "+56 9 6543 2109",
        diagnostico: "Esguince de tobillo izquierdo",
        sesionesPlanificadas: 6,
        sesionesCompletadas: 2,
        activo: true,
        fechaCreacion: new Date().toISOString()
      },
      {
        id: this.generarIdUnico(),
        nombre: "Roberto Navarro Díaz",
        rut: "45.678.901-2", 
        fechaNacimiento: "1965-12-30",
        edad: 59,
        email: "roberto.navarro@email.com",
        telefono: "+56 9 5432 1098",
        diagnostico: "Cervicalgia crónica",
        sesionesPlanificadas: 12,
        sesionesCompletadas: 8,
        activo: false,
        fechaCreacion: new Date().toISOString()
      },
      {
        id: this.generarIdUnico(),
        nombre: "Fernanda Torres Castro",
        rut: "56.789.012-3",
        fechaNacimiento: "1988-05-18",
        edad: 36,
        email: "fernanda.torres@email.com",
        telefono: "+56 9 4321 0987",
        diagnostico: "Tendinitis de hombro",
        sesionesPlanificadas: 7, 
        sesionesCompletadas: 4,
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
      let plataformasUsadas: string[] = [];
      
      for (const paciente of pacientesEjemplo) {
        try {
          const plataforma = await this.guardarPacienteEnPlataformaDisponible(paciente);
          cargadosExitosos++;
          
          if (!plataformasUsadas.includes(plataforma)) {
            plataformasUsadas.push(plataforma);
          }
          
          console.log(`✅ Cargado en ${plataforma}: ${paciente.nombre}`);
        } catch (error) {
          console.error(`❌ Error cargando ${paciente.nombre}:`, error);
        }
      }

      await loading.dismiss();
      
      if (cargadosExitosos > 0) {
        const plataformasTexto = plataformasUsadas.join(' y ');
        this.mostrarToast(`${cargadosExitosos} pacientes cargados en ${plataformasTexto}`, 'success');
        await this.cargarPacientes(); // Recargar la lista
      } else {
        this.mostrarToast('No se pudieron cargar los pacientes de ejemplo', 'warning');
      }
      
    } catch (error) {
      await loading.dismiss();
      this.mostrarToast('Error cargando pacientes de ejemplo', 'danger');
    }
  }

  // ✅ ESTRATEGIA HÍBRIDA INTELIGENTE
  private async guardarPacienteEnPlataformaDisponible(paciente: any): Promise<string> {
    console.log('🔄 Estrategia híbrida para:', paciente.nombre);
    
    // ✅ ESTRATEGIA: Android → SQLite primero, Navegador → JSON Server primero
    if (this.isAndroid()) {
      console.log('📱 Entorno Android detectado - Priorizando SQLite');
      return await this.guardarAndroidStrategy(paciente);
    } else {
      console.log('🌐 Entorno Navegador detectado - Priorizando JSON Server');
      return await this.guardarWebStrategy(paciente);
    }
  }

  // ✅ ESTRATEGIA PARA ANDROID: SQLite primero
  private async guardarAndroidStrategy(paciente: any): Promise<string> {
    try {
      console.log('📱 Intentando SQLite (Android)...');
      await this.databaseService.addPaciente(paciente);
      console.log('💾 Éxito en SQLite:', paciente.nombre);
      return 'SQLite (Android)';
    } catch (errorSqlite) {
      console.log('❌ SQLite falló, intentando JSON Server...', errorSqlite);
      
      // Fallback a JSON Server en Android
      try {
        await firstValueFrom(this.jsonServerService.createPaciente(paciente));
        console.log('🌐 Éxito en JSON Server (fallback):', paciente.nombre);
        return 'JSON Server (fallback)';
      } catch (errorJson) {
        console.log('❌ Ambas fallaron en Android');
        throw new Error('No se pudo guardar en Android');
      }
    }
  }

  // ✅ ESTRATEGIA PARA NAVEGADOR: JSON Server primero
  private async guardarWebStrategy(paciente: any): Promise<string> {
    try {
      console.log('🌐 Intentando JSON Server (Navegador)...');
      await firstValueFrom(this.jsonServerService.createPaciente(paciente));
      console.log('🌐 Éxito en JSON Server:', paciente.nombre);
      return 'JSON Server (Web)';
    } catch (errorJson) {
      console.log('❌ JSON Server falló, intentando SQLite...', errorJson);
      
      // Fallback a SQLite en navegador (si está disponible)
      try {
        await this.databaseService.addPaciente(paciente);
        console.log('💾 Éxito en SQLite (fallback):', paciente.nombre);
        return 'SQLite (fallback)';
      } catch (errorSqlite) {
        console.log('❌ Ambas fallaron en Navegador');
        throw new Error('No se pudo guardar en Navegador');
      }
    }
  }

  // ✅ GENERAR ID ÚNICO
  private generarIdUnico(): string {
    return 'P' + Date.now() + Math.random().toString(36).substr(2, 5);
  }

  // ✅ MÉTODO PARA BORRAR TODOS LOS PACIENTES
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

  // ✅ CONFIRMAR Y EJECUTAR BORRADO (HÍBRIDO)
  private async confirmarBorradoCompleto() {
    const loading = await this.loadingController.create({
      message: 'Eliminando todos los pacientes...'
    });
    
    await loading.present();

    try {
      let eliminadosExitosos = 0;
      
      // ✅ ESTRATEGIA HÍBRIDA: Intentar borrar de ambas plataformas
      try {
        // Borrar de JSON Server
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

      try {
        // Borrar de SQLite
        const pacientesSqlite = await this.databaseService.getPacientes();
        for (const paciente of pacientesSqlite) {
          try {
            await this.databaseService.deletePaciente(paciente.id);
            eliminadosExitosos++;
          } catch (error) {
            console.error(`❌ Error eliminando de SQLite ${paciente.id}:`, error);
          }
        }
      } catch (error) {
        console.log('ℹ️ SQLite no disponible para borrado');
      }

      await loading.dismiss();
      
      if (eliminadosExitosos > 0) {
        this.mostrarToast(`${eliminadosExitosos} pacientes eliminados exitosamente`, 'success');
        await this.cargarPacientes(); // Recargar lista vacía
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

  // MÉTODO PARA DEBUG
  async probarEntorno() {
    console.log('🐛 === DEBUG ENTORNO ===');
    console.log('¿Es Android?:', this.isAndroid());
    console.log('¿Es Navegador?:', this.isWebBrowser());
    console.log('User Agent:', navigator.userAgent);
    
    // Probar SQLite
    try {
      const pacientesSqlite = await this.databaseService.getPacientes();
      console.log('✅ SQLite funciona:', pacientesSqlite.length, 'pacientes');
    } catch (error) {
      console.log('❌ SQLite no funciona:', error);
    }
    
    // Probar JSON Server
    try {
      const pacientesJson = await firstValueFrom(this.jsonServerService.getPacientes());
      console.log('✅ JSON Server funciona:', pacientesJson.length, 'pacientes');
    } catch (error) {
      console.log('❌ JSON Server no funciona:', error);
    }
  }
}