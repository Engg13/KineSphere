import { Component, OnInit, ViewChild, ElementRef, ViewChildren, QueryList } from '@angular/core';
import { NavController, AnimationController, ToastController, IonicModule } from '@ionic/angular';
import { DatabaseService } from '../../services/database.service';
import { JsonServerService } from '../../services/json-server.service';
import { firstValueFrom } from 'rxjs';
import { PlatformService } from '../../services/platform.service';
import { BackupService } from '../../services/backup.service';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-dashboard',
    templateUrl: './dashboard.page.html',
    styleUrls: ['./dashboard.page.scss'],
    standalone: true,
    imports: [IonicModule]
})
export class DashboardPage implements OnInit {

  @ViewChildren('dashboardCard', { read: ElementRef }) dashboardCards!: QueryList<ElementRef>;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  usuarioNombre: string = 'Klgo. Esteban Gomez';
  totalPacientes: number = 0;
  sesionesHoy: number = 0;
  evaluacionesPendientes: number = 0;
  pacientesRecientes: any[] = [];
  estaCargando: boolean = false;
  plataformaUsada: string = '';
  pacientesActivos: number = 0;
  backupStats: { pacientes: number; sesiones: number; documentos: number } = {
    pacientes: 0, sesiones: 0, documentos: 0
  };

  constructor(
    private navCtrl: NavController,
    private databaseService: DatabaseService,
    private jsonServerService: JsonServerService,
    private platformService: PlatformService,
    private animationCtrl: AnimationController,
    private backupService: BackupService,
    private toastCtrl: ToastController,
    private authService: AuthService
  ) {}

  ngOnInit() {}

  ionViewDidEnter() {
    this.usuarioNombre = this.authService.getNombreCompleto();
    this.cargarDatosDashboard();
    this.actualizarBackupStats();
  }

  actualizarBackupStats() {
    this.backupStats = this.backupService.obtenerEstadisticasLocales();
  }

  async cargarDatosDashboard() {
    this.estaCargando = true;

    const platformInfo = this.platformService.getDebugInfo();
    this.plataformaUsada = platformInfo.descripcion;

    try {
      // Siempre usar DatabaseService: maneja localStorage (web) y SQLite (nativo)
      const pacientes = await this.databaseService.getPacientes();

      if (pacientes && pacientes.length > 0) {
        this.actualizarContadores(pacientes);
        this.pacientesRecientes = [...pacientes]
          .sort((a: any, b: any) => {
            const fechaA = a.fechaCreacion || a.fecha_creacion || '';
            const fechaB = b.fechaCreacion || b.fecha_creacion || '';
            return new Date(fechaB).getTime() - new Date(fechaA).getTime();
          })
          .slice(0, 5);
      } else {
        this.reiniciarContadores();
      }
    } catch (error) {
      console.error('Error cargando dashboard:', error);
      this.reiniciarContadores();
    } finally {
      this.estaCargando = false;
    }
  }

  private actualizarContadores(pacientes: any[]) {
    this.totalPacientes = pacientes.length;
    this.pacientesActivos = pacientes.filter(p => p.activo).length;
    this.sesionesHoy = this.calcularSesionesHoy(pacientes);
    this.evaluacionesPendientes = this.calcularEvaluacionesPendientes(pacientes);
  }

  private reiniciarContadores() {
    this.totalPacientes = 0;
    this.pacientesActivos = 0;
    this.sesionesHoy = 0;
    this.evaluacionesPendientes = 0;
    this.pacientesRecientes = [];
  }

  private calcularSesionesHoy(pacientes: any[]): number {
    const hoy = new Date().toDateString();
    return pacientes.filter(paciente => {
      if (paciente.ultimaSesion) {
        const fechaSesion = new Date(paciente.ultimaSesion).toDateString();
        return fechaSesion === hoy;
      }
      return false;
    }).length;
  }

  private calcularEvaluacionesPendientes(pacientes: any[]): number {
    return pacientes.filter(paciente =>
      paciente.necesitaEvaluacion && !paciente.evaluacionCompletada
    ).length;
  }

  async recargarDashboard(event?: any) {
    await this.cargarDatosDashboard();
    this.actualizarBackupStats();
    if (event) {
      event.target.complete();
    }
  }

  // BACKUP METHODS
  async exportarBackup() {
    const result = await this.backupService.exportarDatos();
    const toast = await this.toastCtrl.create({
      message: result.message,
      duration: 3000,
      position: 'bottom',
      color: result.success ? 'success' : 'danger'
    });
    await toast.present();
  }

  triggerImport() {
    this.fileInput.nativeElement.click();
  }

  async onFileSelected(event: any) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const jsonString = await this.backupService.leerArchivoWeb(file);
      const result = await this.backupService.importarDatos(jsonString);

      const toast = await this.toastCtrl.create({
        message: result.message,
        duration: 3000,
        position: 'bottom',
        color: result.success ? 'success' : 'danger'
      });
      await toast.present();

      if (result.success) {
        await this.cargarDatosDashboard();
        this.actualizarBackupStats();
      }
    } catch (error) {
      const toast = await this.toastCtrl.create({
        message: 'Error al leer el archivo',
        duration: 3000,
        position: 'bottom',
        color: 'danger'
      });
      await toast.present();
    }

    // Reset file input
    this.fileInput.nativeElement.value = '';
  }

  // NAVIGATION
  irAPacientes() {
    this.navCtrl.navigateRoot('/pacientes-lista');
  }

  irASesion() {
    this.navCtrl.navigateRoot('/sesion');
  }

  irAEvaluaciones() {
    this.navCtrl.navigateRoot('/evaluacion-final');
  }

  irAEjercicios() {
    this.navCtrl.navigateRoot('/ejercicios');
  }

  verDetallePaciente(paciente: any) {
    localStorage.setItem('ver_paciente_id', String(paciente.id));
    this.navCtrl.navigateRoot('/paciente-detalle');
  }

  crearSesionParaPaciente(paciente: any) {
    this.navCtrl.navigateRoot('/sesion', {
      queryParams: { pacienteId: paciente.id, pacienteNombre: paciente.nombre }
    });
  }

  irATests() {
    this.navCtrl.navigateRoot('/tests-config');
  }

  agregarPaciente() {
    this.navCtrl.navigateRoot('/agregar-paciente');
  }

  irAPerfil() {
    this.navCtrl.navigateRoot('/perfil-profesional');
  }

  async cargarPacienteEjemplo() {
    const EJEMPLO_ID = 'ejemplo_maria_gonzalez';

    // Verificar si ya existe
    const pacientes = this.getUserPacientes();
    if (pacientes.some((p: any) => p.id === EJEMPLO_ID)) {
      const toast = await this.toastCtrl.create({
        message: 'La paciente ejemplo ya existe',
        duration: 2000, position: 'bottom', color: 'warning'
      });
      await toast.present();
      return;
    }

    // Fecha base: 5 semanas atras
    const hoy = new Date();
    const fechaInicio = new Date(hoy);
    fechaInicio.setDate(fechaInicio.getDate() - 35);

    const paciente = {
      id: EJEMPLO_ID,
      nombre: 'Maria Gonzalez Soto',
      rut: '12.345.678-9',
      fechaNacimiento: '1973-06-15',
      edad: 52,
      email: 'maria.gonzalez@email.com',
      telefono: '+56912345678',
      diagnostico: 'Gonartrosis bilateral - Predominio derecho',
      direccion: 'Av. Providencia 1234, Santiago',
      sesionesPlanificadas: 10,
      sesionesCompletadas: 10,
      activo: false,
      es_demo: false,
      fechaIngreso: fechaInicio.toISOString(),
      fechaCreacion: fechaInicio.toISOString(),
      observaciones: 'Paciente derivada por traumatologo. Dolor cronico de rodillas hace 2 anios.'
    };

    // Datos de las 10 sesiones con progresion clinica realista
    const sesionesData = [
      {
        n: 1, diasOffset: 0, eva: 7, sueno: 2, ejercicios: false,
        obs: 'Evaluacion inicial. Dolor bilateral predominio derecho. ROM flexion 90 grados. Fuerza cuadriceps 3/5. Se inicia plan con isometricos y crioterapia.'
      },
      {
        n: 2, diasOffset: 3, eva: 7, sueno: 2, ejercicios: false,
        obs: 'Persiste dolor importante. Educacion sobre manejo del dolor y actividad fisica. Crioterapia post ejercicio. Se entregan ejercicios domiciliarios.'
      },
      {
        n: 3, diasOffset: 7, eva: 6, sueno: 3, ejercicios: true,
        obs: 'Leve mejoria subjetiva. Tolera mejor ejercicios en cadena cerrada. Se agrega bicicleta estatica 10 min sin carga. ROM flexion 95 grados.'
      },
      {
        n: 4, diasOffset: 10, eva: 6, sueno: 3, ejercicios: true,
        obs: 'Reporta mejor descanso nocturno. Avanza en ROM flexion 100 grados. Fuerza cuadriceps 3+/5. Buena tolerancia a bicicleta.'
      },
      {
        n: 5, diasOffset: 14, eva: 5, sueno: 3, ejercicios: true,
        obs: 'Mejoria progresiva. Se agregan sentadillas parciales asistidas. Camina 20 min en plano sin dolor. Test EVA Funcional: 28/50 (moderado).',
        test: { testId: 'predefinido_eva_funcional', testNombre: 'EVA Funcional', puntajeTotal: 28, resultado: 'Moderado' }
      },
      {
        n: 6, diasOffset: 17, eva: 4, sueno: 4, ejercicios: true,
        obs: 'Buena adherencia a ejercicios domiciliarios. ROM flexion 110 grados. Se progresa carga en sentadillas. Fuerza cuadriceps 4/5.'
      },
      {
        n: 7, diasOffset: 21, eva: 4, sueno: 4, ejercicios: true,
        obs: 'Estable. Tolera subir escaleras con menos dolor. Se inicia trabajo de propiocepcion basica. Bicicleta 15 min con carga leve.'
      },
      {
        n: 8, diasOffset: 24, eva: 3, sueno: 4, ejercicios: true,
        obs: 'Mejoria notable. Propiocepcion en superficie inestable. Sentadilla a 70 grados sin dolor. Se educa sobre actividad fisica a largo plazo.'
      },
      {
        n: 9, diasOffset: 28, eva: 2, sueno: 5, ejercicios: true,
        obs: 'Funcionalidad recuperada para AVD. ROM flexion 118 grados. Fuerza cuadriceps 4+/5. Se planifica alta para proxima sesion.'
      },
      {
        n: 10, diasOffset: 31, eva: 2, sueno: 5, ejercicios: true,
        obs: 'Alta kinesiologica. ROM flexion 120 grados. Fuerza 4+/5 bilateral. Se entrega plan de ejercicios domiciliarios para mantenimiento. Control en 1 mes.',
        test: { testId: 'predefinido_eva_funcional', testNombre: 'EVA Funcional', puntajeTotal: 12, resultado: 'Leve' }
      }
    ];

    const sesiones = sesionesData.map(s => {
      const fechaSesion = new Date(fechaInicio);
      fechaSesion.setDate(fechaSesion.getDate() + s.diasOffset);
      const fechaStr = fechaSesion.toISOString().split('T')[0];

      const sesion: any = {
        id: Date.now() + s.n,
        paciente_id: EJEMPLO_ID,
        paciente_nombre: paciente.nombre,
        numero_sesion: s.n,
        fecha: fechaStr,
        ejercicios: s.ejercicios ? 'Realizados' : 'No realizados',
        ejercicios_realizados: s.ejercicios,
        observaciones: s.obs,
        eva: s.eva,
        sueno: s.sueno,
        enviado_whatsapp: false,
        fecha_creacion: fechaSesion.toISOString(),
        creado_en: fechaSesion.toISOString()
      };

      if (s.test) {
        sesion.test = s.test;
      }

      return sesion;
    });

    // Guardar en localStorage
    pacientes.push(paciente);
    localStorage.setItem('user_pacientes', JSON.stringify(pacientes));
    localStorage.setItem(`sesiones_${EJEMPLO_ID}`, JSON.stringify(sesiones));

    const toast = await this.toastCtrl.create({
      message: 'Paciente ejemplo creada con 10 sesiones',
      duration: 2500, position: 'bottom', color: 'success'
    });
    await toast.present();

    await this.cargarDatosDashboard();
    this.actualizarBackupStats();
  }

  private getUserPacientes(): any[] {
    try {
      const stored = localStorage.getItem('user_pacientes');
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  }
}
