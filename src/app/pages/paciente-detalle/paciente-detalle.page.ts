import { Component, OnInit } from '@angular/core';
import { NavController } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { JsonServerService } from '../../services/json-server.service';
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

  constructor(
    private navCtrl: NavController,
    private route: ActivatedRoute,
    private jsonServerService: JsonServerService
  ) { }

  ngOnInit() {
    this.cargarPacienteDesdeParams();
  }

  private async cargarPacienteDesdeParams() {
    this.estaCargando = true;
    
    this.route.queryParams.subscribe(async (params: any) => {
      const pacienteId = params['id'];
      
      if (pacienteId && pacienteId !== 'undefined' && pacienteId !== 'null') {
        //  GUARDAR EL ID EN LOCALSTORAGE
        localStorage.setItem('ultimoPacienteId', pacienteId);
        this.pacienteId = pacienteId;
        await this.cargarPaciente(pacienteId);
      } else {
        //  INTENTAR CARGAR DESDE LOCALSTORAGE SI NO HAY PARÁMETROS
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
      
      // ✅ Cargar paciente específico por ID
      const paciente = await firstValueFrom(this.jsonServerService.getPaciente(id));
      
      if (paciente) {
        console.log('✅ Paciente encontrado:', paciente);
        this.paciente = paciente;
        
        // Cargar historial de sesiones
        await this.cargarHistorialSesiones(id);
      } else {
        console.log('❌ Paciente no encontrado. ID:', id);
        
        // ✅ FALLBACK: Buscar en todos los pacientes
        const todosPacientes = await firstValueFrom(this.jsonServerService.getPacientes());
        const pacienteEncontrado = todosPacientes.find((p: any) => p.id === id);
        
        if (pacienteEncontrado) {
          console.log('✅ Paciente encontrado en lista completa:', pacienteEncontrado);
          this.paciente = pacienteEncontrado;
        } else {
          console.log('❌ Paciente no existe en la base de datos');
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
      const sesiones = await firstValueFrom(this.jsonServerService.getSesionesPorPaciente(pacienteId));
      this.historialSesiones = sesiones || [];
      console.log('📊 Historial cargado:', this.historialSesiones.length, 'sesiones');
    } catch (error) {
      console.error('❌ Error cargando historial:', error);
      this.historialSesiones = [];
    }
  }

  nuevaSesion() {
    if (!this.paciente) return;
    console.log('➕ Nueva sesión para:', this.paciente.nombre);
    this.navCtrl.navigateForward('/sesion', {
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
}