import { Component, OnInit } from '@angular/core';
import { NavController } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { JsonServerService } from '../../services/json-server.service';
import { DatabaseService } from '../../services/database.service'; // ✅ AÑADIR
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-paciente-detalle',
  templateUrl: './paciente-detalle.page.html',
  styleUrls: ['./paciente-detalle.page.scss'],
  standalone: false
})
export class PacienteDetallePage implements OnInit {
  paciente: any = null;
  estaCargando: boolean = true;
  historialSesiones: any[] = [];
  pacienteId: string = '';
  usandoSQLite: boolean = false; // ✅ PARA SABER QUÉ SERVICIO USA

  constructor(
    private navCtrl: NavController,
    private route: ActivatedRoute,
    private jsonServerService: JsonServerService,
    private databaseService: DatabaseService // ✅ INYECTAR
  ) { }

  ngOnInit() {
    this.cargarPacienteDesdeParams();
  }

  private async cargarPacienteDesdeParams() {
    this.estaCargando = true;
    
    this.route.queryParams.subscribe(async (params: any) => {
      const pacienteId = params['id'];
      
      if (pacienteId && pacienteId !== 'undefined' && pacienteId !== 'null') {
        localStorage.setItem('ultimoPacienteId', pacienteId);
        this.pacienteId = pacienteId;
        await this.cargarPaciente(pacienteId);
      } else {
        const ultimoPacienteId = localStorage.getItem('ultimoPacienteId');
        if (ultimoPacienteId) {
          console.log('🔄 Cargando paciente desde localStorage:', ultimoPacienteId);
          this.pacienteId = ultimoPacienteId;
          await this.cargarPaciente(ultimoPacienteId);
        } else {
          console.log('❌ No hay ID de paciente disponible');
          this.estaCargando = false;
        }
      }
    });
  }

  private async cargarPaciente(id: string) { 
    try {
      console.log('📥 Intentando cargar paciente ID:', id, 'Tipo:', typeof id);
      
      let paciente = null;
      
      // ✅ ESTRATEGIA HÍBRIDA: PRIMERO INTENTAR SQLite
      try {
        console.log('📱 Intentando cargar desde SQLite...');
        paciente = await this.databaseService.getPaciente(parseInt(id));
        
        if (paciente) {
          console.log('✅ Paciente cargado desde SQLite:', paciente);
          this.usandoSQLite = true;
          this.paciente = paciente;
          await this.cargarHistorialSesiones(id);
          return;
        }
      } catch (sqliteError) {
        console.log('📱 SQLite no disponible, intentando JSON Server...');
      }
      
      // ✅ FALLBACK A JSON SERVER
      console.log('🌐 Intentando cargar desde JSON Server...');
      paciente = await firstValueFrom(this.jsonServerService.getPaciente(id));
      
      if (paciente) {
        console.log('✅ Paciente encontrado en JSON Server:', paciente);
        this.usandoSQLite = false;
        this.paciente = paciente;
        await this.cargarHistorialSesiones(id);
      } else {
        console.log('❌ Paciente no encontrado. ID:', id);
        
        // ✅ ÚLTIMO FALLBACK: Buscar en todos los pacientes
        const todosPacientes = await firstValueFrom(this.jsonServerService.getPacientes());
        const pacienteEncontrado = todosPacientes.find((p: any) => p.id === id);
        
        if (pacienteEncontrado) {
          console.log('✅ Paciente encontrado en lista completa:', pacienteEncontrado);
          this.paciente = pacienteEncontrado;
          this.usandoSQLite = false;
        } else {
          console.log('❌ Paciente no existe en ninguna base de datos');
        }
      }
      
    } catch (error) {
      console.error('❌ Error cargando paciente:', error);
    } finally {
      this.estaCargando = false;
    }
  }

  private async cargarHistorialSesiones(pacienteId: string) { 
    try {
      let sesiones = [];
      
      // ✅ ESTRATEGIA HÍBRIDA PARA SESIONES
      if (this.usandoSQLite) {
        console.log('📱 Cargando sesiones desde SQLite...');
        sesiones = await this.databaseService.getSesionesByPaciente(parseInt(pacienteId));
      } else {
        console.log('🌐 Cargando sesiones desde JSON Server...');
        sesiones = await firstValueFrom(this.jsonServerService.getSesionesPorPaciente(pacienteId));
      }
      
      this.historialSesiones = sesiones || [];
      console.log('📊 Historial cargado:', this.historialSesiones.length, 'sesiones');
      
    } catch (error) {
      console.error('❌ Error cargando historial:', error);
      this.historialSesiones = [];
    }
  }

  // ✅ AGREGAR MÉTODO PARA REFRESCAR
  async refrescarDatos(event?: any) {
    console.log('🔄 Refrescando datos del paciente...');
    
    if (this.pacienteId) {
      await this.cargarPaciente(this.pacienteId);
    }
    
    if (event) {
      event.target.complete();
    }
  }

  nuevaSesion() {
    if (!this.paciente) return;
    console.log('➕ Nueva sesión para:', this.paciente.nombre);
    this.navCtrl.navigateRoot('/sesion', {
      queryParams: { 
        pacienteId: this.paciente.id,
        pacienteNombre: this.paciente.nombre 
      }
    });
  }

  volverALista() {
    this.navCtrl.navigateBack('/pacientes-lista');
  }

  irADocumentos() {
    if (!this.paciente) return;
    console.log('📄 Navegando a documentos:', this.paciente.nombre);
    this.navCtrl.navigateRoot('/documentos-medicos', {
      queryParams: { 
        pacienteId: this.paciente.id,
        pacienteNombre: this.paciente.nombre 
      }
    });
  }

  editarPaciente() {
    if (!this.paciente) return;
    console.log('✏️ Editando paciente:', this.paciente.nombre);
    this.navCtrl.navigateRoot('/agregar-paciente', {
      queryParams: { 
        id: this.paciente.id,
        modoEdicion: true 
      }
    });
  }

  llamarPaciente() {
    if (!this.paciente || !this.paciente.telefono) return;
    window.open(`tel:${this.paciente.telefono}`, '_system');
  }

  enviarEmail() {
    if (!this.paciente || !this.paciente.email) return;
    window.open(`mailto:${this.paciente.email}`, '_system');
  }

  irAVisitaDomiciliaria() {
    if (!this.paciente) return;
    
    console.log('🏠 Navegando a visita domiciliaria:', this.paciente.nombre);
    this.navCtrl.navigateRoot('/visita-domiciliaria', {
      queryParams: { 
        pacienteId: this.paciente.id,
        pacienteNombre: this.paciente.nombre 
      }
    });
  }
}