import { Component } from '@angular/core';
import { NavController } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { DatabaseService } from '../../services/database.service';

@Component({
  selector: 'app-paciente-detalle',
  templateUrl: './paciente-detalle.page.html',
  styleUrls: ['./paciente-detalle.page.scss'],
  standalone: false
})
export class PacienteDetallePage {
  paciente: any = null;
  estaCargando: boolean = true;
  historialSesiones: any[] = [];
  pacienteId: string = '';
  fechaActual = new Date().toISOString();

  constructor(
    private navCtrl: NavController,
    private route: ActivatedRoute,
    private router: Router,
    private databaseService: DatabaseService
  ) { }

  async ionViewDidEnter() {
    // 1. Intentar leer nuevo ID desde localStorage (cuando viene de otra página)
    const storedId = localStorage.getItem('ver_paciente_id');
    if (storedId) {
      this.pacienteId = storedId;
      // NO borrar: lo dejamos para re-enters (back navigation)
    }

    // 2. Si ya tenemos pacienteId en memoria (re-enter desde back), usarlo directamente
    if (this.pacienteId) {
      await this.cargarPaciente(this.pacienteId);
    } else {
      this.estaCargando = false;
    }
  }

  ionViewWillLeave() {
    // Limpiar localStorage solo al salir, no al entrar
    // Así el ID persiste durante re-enters por back navigation
  }

  private async cargarPaciente(id: string) {
    this.estaCargando = true;

    try {
      // Buscar paciente - getPacientes funciona con cualquier tipo de ID
      const todosPacientes = await this.databaseService.getPacientes();
      const paciente = todosPacientes.find(p =>
        String(p.id) === String(id) ||
        p.pacienteId === id
      );

      if (paciente) {
        this.paciente = paciente;
        this.verificarYCorregirEdad();
        await this.cargarHistorialSesiones(id);
      } else {
        console.log('Paciente no encontrado con ID:', id);
        this.paciente = null;
      }
    } catch (error) {
      console.error('Error cargando paciente:', error);
      this.paciente = null;
    } finally {
      this.estaCargando = false;
    }
  }

  private verificarYCorregirEdad() {
    if (!this.paciente) return;

    if (this.paciente.edad && this.paciente.edad > 0) return;

    if (this.paciente.fechaNacimiento) {
      const edadCalculada = this.calcularEdad(this.paciente.fechaNacimiento);
      if (edadCalculada > 0) {
        this.paciente.edad = edadCalculada;
      }
    }
  }

  private calcularEdad(fechaNacimiento: string): number {
    if (!fechaNacimiento) return 0;

    try {
      const nacimiento = new Date(fechaNacimiento);
      if (isNaN(nacimiento.getTime())) return 0;

      const hoy = new Date();
      let edad = hoy.getFullYear() - nacimiento.getFullYear();
      if (hoy.getMonth() < nacimiento.getMonth() ||
          (hoy.getMonth() === nacimiento.getMonth() && hoy.getDate() < nacimiento.getDate())) {
        edad--;
      }
      return edad > 0 ? edad : 0;
    } catch {
      return 0;
    }
  }

  private async cargarHistorialSesiones(pacienteId: string) {
    try {
      const sesiones = await this.databaseService.getSesionesByPaciente(pacienteId);
      this.historialSesiones = sesiones || [];

      if (this.paciente) {
        this.paciente.sesionesCompletadas = this.historialSesiones.length;
      }
    } catch (error) {
      console.error('Error cargando historial:', error);
      this.historialSesiones = [];
    }
  }

  //  MÉTODO PARA FORMATEAR FECHA 
  formatearFecha(fechaString: string): string {
    if (!fechaString) return 'No registrada';
    
    try {
      // Si ya está en formato legible, devolverlo
      if (fechaString.includes('/') || (fechaString.includes('-') && !fechaString.includes('T'))) {
        return fechaString;
      }
      
      // Si es ISO string, formatear
      const fecha = new Date(fechaString);
      if (isNaN(fecha.getTime())) {
        return fechaString;
      }
      
      return fecha.toLocaleDateString('es-CL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      return fechaString;
    }
  }

  async refrescarDatos(event?: any) {
    if (this.pacienteId) {
      await this.cargarPaciente(this.pacienteId);
    }

    if (event) {
      event.target.complete();
    }
  }

  // ✅ MÉTODOS DE NAVEGACIÓN (MANTENER TUS MÉTODOS ORIGINALES)
  nuevaSesion() {
    if (!this.paciente) return;
    
    console.log('➕ Nueva sesión para:', this.paciente.nombre);
    
    const proximaSesion = (this.paciente.sesionesCompletadas || 0) + 1;
    
    this.navCtrl.navigateRoot('/sesion', {
      queryParams: { 
        pacienteId: this.paciente.id,
        pacienteNombre: this.paciente.nombre,
        numeroSesion: proximaSesion
      }
    });
  }

  volverALista() {
    this.navCtrl.navigateBack('/pacientes-lista');
  }

  irAEjercicios() {
    if (!this.paciente) return;
    this.navCtrl.navigateRoot('/ejercicios', {
      queryParams: {
        pacienteId: this.paciente.id,
        pacienteNombre: this.paciente.nombre
      }
    });
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
    // Pasar datos por localStorage Y query params (doble seguro contra Ionic caching)
    localStorage.setItem('editar_paciente_id', String(this.pacienteId));
    console.log('editarPaciente - ID:', this.pacienteId);
    this.navCtrl.navigateRoot('/agregar-paciente', {
      queryParams: {
        id: this.pacienteId,
        modoEdicion: 'true'
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