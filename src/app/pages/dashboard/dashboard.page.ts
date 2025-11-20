import { Component, OnInit } from '@angular/core';
import { NavController } from '@ionic/angular';
import { DatabaseService } from '../../services/database.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: false
})
export class DashboardPage implements OnInit {
  usuarioNombre: string = 'Klgo. Esteban Gomez';
  totalPacientes: number = 0;
  sesionesHoy: number = 0;
  evaluacionesPendientes: number = 0;


  pacientesRecientes: any[] = [];

  constructor(
    private navCtrl: NavController,
    private databaseService: DatabaseService
  ) {}

  ngOnInit() {
    console.log('🎯 KineSphere DEBUG: ngOnInit ejecutado');
    this.cargarDatosDashboard();
  }

  ionViewDidEnter() {
    console.log('🎯 KineSphere DEBUG: ionViewDidEnter - Dashboard visible');
    this.cargarDatosDashboard();
  }

  cargarDatosDashboard() {
    console.log('📊 KineSphere: Cargando datos del dashboard...');
    
    // Cargar estadísticas
    this.databaseService.getEstadisticas().then(estadisticas => {
      console.log('✅ KineSphere: Estadísticas cargadas:', estadisticas);
      this.totalPacientes = estadisticas.totalPacientes;
      this.sesionesHoy = estadisticas.sesionesHoy;
      this.evaluacionesPendientes = estadisticas.totalEvaluaciones;
      
      console.log(`📈 KineSphere: Resumen - Pacientes: ${this.totalPacientes}, Sesiones Hoy: ${this.sesionesHoy}, Evaluaciones: ${this.evaluacionesPendientes}`);
    }).catch(error => {
      console.log('❌ KineSphere ERROR: cargando estadísticas:', error);
    });

    // Cargar pacientes recientes
    this.databaseService.getPacientes().then(pacientes => {
      console.log('✅ KineSphere: Pacientes cargados:', pacientes.length, 'encontrados');
      console.log('👥 KineSphere: Lista completa de pacientes:', pacientes);
      
      this.pacientesRecientes = pacientes.slice(0, 5);
      console.log('⭐ KineSphere: Pacientes recientes (primeros 5):', this.pacientesRecientes);
    }).catch(error => {
      console.log('❌ KineSphere ERROR: cargando pacientes:', error);
    });
  }

  // MÉTODOS DE NAVEGACIÓN
  irAPacientes() {
    console.log('🧭 KineSphere: Navegando a lista de pacientes');
    this.navCtrl.navigateRoot('/pacientes-lista');
  }

  irASesion() {
    console.log('🧭 KineSphere: Navegando a nueva sesión');
    this.navCtrl.navigateRoot('/sesion');
  }

  irAEvaluaciones() {
    console.log('🧭 KineSphere: Navegando a evaluaciones');
    this.navCtrl.navigateRoot('/evaluacion-final');
  }

  irAEjercicios() {
    console.log('🧭 KineSphere: Navegando a ejercicios');
    this.navCtrl.navigateRoot('/ejercicios');
  }

  verDetallePaciente(paciente: any) {
    console.log('👤 KineSphere: Viendo detalle del paciente:', paciente);
    // Navegar al detalle del paciente
    this.navCtrl.navigateForward('/paciente-detalle', {
      queryParams: { id: paciente.id }
    });
  }

  crearSesionParaPaciente(paciente: any) {
  console.log('🧭 KineSphere: Creando sesión para paciente:', paciente.nombre);
  // Navegar a la página de sesión con el paciente seleccionado
  this.navCtrl.navigateForward('/sesion', {
    queryParams: { pacienteId: paciente.id, pacienteNombre: paciente.nombre }
    });
  }
  goToPosts() {
  console.log('🎯 DEBUG: goToPosts() ejecutado');
  console.log('🎯 DEBUG: NavController:', this.navCtrl);
  this.navCtrl.navigateRoot('/posts');
  console.log('🎯 DEBUG: Navegación enviada');
}
}