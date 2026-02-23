import { Component, OnDestroy } from '@angular/core';
import { NavController, IonicModule } from '@ionic/angular';
import { DatabaseService } from '../../services/database.service';
import { AuthService } from '../../services/auth.service';
import { Subscription, combineLatest } from 'rxjs';
import { CommonModule } from '@angular/common';
import { EjerciciosSeederService } from 'src/app/services/ejercicios-seeder.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule]
})
export class DashboardPage implements OnDestroy {

  usuarioNombre: string = '';
  totalPacientes = 0;
  pacientesActivos = 0;
  sesionesHoy = 0;
  evaluacionesPendientes = 0;
  pacientesRecientes: any[] = [];
  estaCargando = true;

  private sub?: Subscription;

  user$ = this.authService.user$;

  constructor(
    private navCtrl: NavController,
    private databaseService: DatabaseService,
    private authService: AuthService,
    private ejerciciosSeeder: EjerciciosSeederService,
  ) {}

  ionViewDidEnter() {
    this.usuarioNombre = this.authService.getNombreCompleto();

    this.sub = combineLatest([
      this.databaseService.getPacientesRealtime(),
      this.databaseService.getSesionesRealtime()
    ]).subscribe(([pacientes, sesiones]) => {

      this.totalPacientes = pacientes.length;
      this.pacientesActivos = pacientes.filter(p => p.activo).length;

      const hoy = new Date().toDateString();

      this.sesionesHoy = sesiones.filter(s =>
        s.fecha && new Date(s.fecha).toDateString() === hoy
      ).length;

      this.evaluacionesPendientes = pacientes.filter(p =>
        p.necesitaEvaluacion && !p.evaluacionCompletada
      ).length;

      this.pacientesRecientes = [...pacientes]
        .sort((a, b) =>
          (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
        )
        .slice(0, 5);

      this.estaCargando = false;
    });
  }

  ionViewWillLeave() {
    this.sub?.unsubscribe();
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  // 🔄 Si el HTML tiene refresher
  recargarDashboard(event: any) {
    event.target.complete();
  }

  // ======================
  // NAV
  // ======================

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

  agregarPaciente() {
    this.navCtrl.navigateRoot('/agregar-paciente');
  }

  irAPerfil() {
    this.navCtrl.navigateRoot('/perfil-profesional');
  }

  verDetallePaciente(paciente: any) {
    localStorage.setItem('ver_paciente_id', paciente.id);
    this.navCtrl.navigateRoot('/paciente-detalle');
  }

  irAEvaluacionesClinicas() {
  this.navCtrl.navigateRoot('/tests-config');
  }
}