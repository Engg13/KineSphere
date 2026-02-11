import { Component, OnInit } from '@angular/core';
import { NavController } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { JsonServerService } from '../../services/json-server.service';
import { DatabaseService } from '../../services/database.service';

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
  fechaActual = new Date().toISOString();

  constructor(
    private navCtrl: NavController,
    private route: ActivatedRoute,
    private jsonServerService: JsonServerService,
    private databaseService: DatabaseService
  ) { }

  async ngOnInit() {
    await this.cargarPacienteDesdeParams();
    if (this.paciente && !this.paciente.fechaIngreso && !this.paciente.fechaCreacion) {
      this.paciente.fechaIngreso = this.fechaActual;
    }
  }

  private async cargarPacienteDesdeParams() {
    this.estaCargando = true;
    
    this.route.queryParams.subscribe(async (params: any) => {
      const pacienteId = params['id'];
      
      if (pacienteId && pacienteId !== 'undefined' && pacienteId !== 'null') {
        this.pacienteId = pacienteId;
        await this.cargarPacienteSQLite(pacienteId);
      } else {
        console.log('❌ No hay ID de paciente disponible');
        this.estaCargando = false;
      }
    });
  }

  //  MÉTODO PRINCIPAL: CARGAR DESDE SQLite 
  private async cargarPacienteSQLite(id: string) { 
    try {
      console.log('📱 Cargando paciente desde SQLite, ID:', id);
      
      // Intentar convertir ID a número (SQLite usa números)
      const idNumero = parseInt(id);
      
      if (isNaN(idNumero)) {
        console.log('⚠️ ID no es número, buscando por ID string');
        // Si el ID no es número, buscar en todos los pacientes
        await this.buscarPacientePorIdString(id);
        return;
      }
      
      // Cargar desde SQLite
      const paciente = await this.databaseService.getPaciente(idNumero);
      
      if (paciente) {
        console.log('✅ Paciente cargado desde SQLite:', paciente);
        this.paciente = paciente;
        
        //  ASEGURAR QUE LA EDAD SE MUESTRE
        this.verificarYCorregirEdad();
        
        // Cargar historial de sesiones
        await this.cargarHistorialSesionesSQLite(idNumero);
        
      } else {
        console.log('❌ Paciente no encontrado en SQLite');
        // Fallback a datos de demostración
        await this.cargarPacienteDemo();
      }
      
    } catch (error) {
      console.error('❌ Error cargando paciente desde SQLite:', error);
      // Fallback a datos de demostración
      await this.cargarPacienteDemo();
    } finally {
      this.estaCargando = false;
    }
  }

  //  VERIFICAR Y CORREGIR EDAD SI ES NECESARIO
  private verificarYCorregirEdad() {
    if (!this.paciente) return;
    
    console.log('🔍 Verificando edad del paciente:', {
      nombre: this.paciente.nombre,
      edadActual: this.paciente.edad,
      fechaNacimiento: this.paciente.fechaNacimiento,
      tieneEdad: !!this.paciente.edad,
      tieneFechaNac: !!this.paciente.fechaNacimiento
    });
    
    // Caso 1: Ya tiene edad válida
    if (this.paciente.edad && this.paciente.edad > 0) {
      console.log(`✅ Edad ya existe: ${this.paciente.edad} años`);
      return;
    }
    
    // Caso 2: Tiene fecha de nacimiento pero no edad
    if (this.paciente.fechaNacimiento && (!this.paciente.edad || this.paciente.edad === 0)) {
      const edadCalculada = this.calcularEdad(this.paciente.fechaNacimiento);
      if (edadCalculada > 0) {
        console.log(`📅 Calculando edad desde ${this.paciente.fechaNacimiento}: ${edadCalculada} años`);
        this.paciente.edad = edadCalculada;
      }
    }
    
    // Caso 3: No tiene nada
    if (!this.paciente.edad || this.paciente.edad === 0) {
      console.log('⚠️ Asignando edad por defecto: 30 años');
      this.paciente.edad = 30; // Edad por defecto para demostración
    }
  }

  //  MÉTODO PARA CALCULAR EDAD (IGUAL QUE EN AGREGAR-PACIENTE)
  private calcularEdad(fechaNacimiento: string): number {
    if (!fechaNacimiento) return 0;
    
    try {
      const nacimiento = new Date(fechaNacimiento);
      const hoy = new Date();
      
      if (isNaN(nacimiento.getTime())) return 0;
      
      let edad = hoy.getFullYear() - nacimiento.getFullYear();
      const mes = hoy.getMonth();
      const dia = hoy.getDate();
      
      if (mes < nacimiento.getMonth() || 
          (mes === nacimiento.getMonth() && dia < nacimiento.getDate())) {
        edad--;
      }
      
      return edad > 0 ? edad : 0;
    } catch {
      return 0;
    }
  }

  //  BUSCAR PACIENTE POR ID STRING (SI SQLite GUARDÓ COMO TEXTO)
  private async buscarPacientePorIdString(id: string) {
    try {
      const todosPacientes = await this.databaseService.getPacientes();
      console.log(`🔍 Buscando paciente ID "${id}" entre ${todosPacientes.length} pacientes`);
      
      const pacienteEncontrado = todosPacientes.find(p => 
        p.id === id || 
        p.id?.toString() === id ||
        p.pacienteId === id
      );
      
      if (pacienteEncontrado) {
        console.log('✅ Paciente encontrado por ID string:', pacienteEncontrado);
        this.paciente = pacienteEncontrado;
        this.verificarYCorregirEdad();
        await this.cargarHistorialSesionesSQLite(pacienteEncontrado.id);
      } else {
        console.log('❌ Paciente no encontrado, cargando demo');
        await this.cargarPacienteDemo();
      }
    } catch (error) {
      console.error('Error buscando paciente:', error);
      await this.cargarPacienteDemo();
    }
  }

  //  DATOS DE DEMOSTRACIÓN 
  private async cargarPacienteDemo() {
    console.log('🎭 Cargando paciente de demostración');
    
    this.paciente = {
      id: this.pacienteId || 'demo-1',
      nombre: 'Juan Pérez González',
      rut: '12.345.678-9',
      edad: 35,
      fechaNacimiento: '1988-05-15',
      email: 'juan.perez@email.com',
      telefono: '+56 9 1234 5678',
      diagnostico: 'Lumbalgia crónica',
      direccion: 'Av. Principal 123, Santiago',
      fechaIngreso: '2024-01-15',
      sesionesPlanificadas: 10,
      sesionesCompletadas: 3,
      activo: true
    };
    
    this.historialSesiones = [
      {
        id: 1,
        fecha: '2024-01-20',
        fecha_registro: '20/01/2024',
        nivel_dolor: 7,
        calidad_sueno: 3,
        observaciones: 'Primera sesión, dolor moderado'
      },
      {
        id: 2,
        fecha: '2024-01-27',
        fecha_registro: '27/01/2024',
        nivel_dolor: 6,
        calidad_sueno: 4,
        observaciones: 'Mejoría leve, sigue con dolor'
      },
      {
        id: 3,
        fecha: '2024-02-03',
        fecha_registro: '03/02/2024',
        nivel_dolor: 5,
        calidad_sueno: 4,
        observaciones: 'Progreso significativo'
      }
    ];
    
    console.log('✅ Paciente demo cargado');
  }

  //  CARGAR HISTORIAL DE SESIONES DESDE SQLite
  private async cargarHistorialSesionesSQLite(pacienteId: number) {
    try {
      console.log('📱 Cargando sesiones desde SQLite para paciente:', pacienteId);
      
      const sesiones = await this.databaseService.getSesionesByPaciente(pacienteId);
      this.historialSesiones = sesiones || [];
      
      console.log('📊 Historial cargado:', this.historialSesiones.length, 'sesiones');
      
      //  ACTUALIZAR CONTADOR DE SESIONES EN EL PACIENTE
      if (this.paciente) {
        this.paciente.sesionesCompletadas = this.historialSesiones.length;
        console.log(`🔄 Sesiones completadas actualizadas: ${this.paciente.sesionesCompletadas}`);
      }
      
    } catch (error) {
      console.error('❌ Error cargando historial:', error);
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

  // ✅ AGREGAR MÉTODO PARA REFRESCAR
  async refrescarDatos(event?: any) {
    console.log('🔄 Refrescando datos del paciente...');
    
    if (this.pacienteId) {
      await this.cargarPacienteSQLite(this.pacienteId);
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