import { Component } from '@angular/core';
import { NavController, ViewWillEnter } from '@ionic/angular';
import { DatabaseService } from '../../services/database.service';

@Component({
  selector: 'app-evaluacion-final',
  templateUrl: './evaluacion-final.page.html',
  styleUrls: ['./evaluacion-final.page.scss'],
  standalone: false
})
export class EvaluacionFinalPage implements ViewWillEnter {
  pacientes: any[] = [];
  pacienteSeleccionado: any = null;
  sesiones: any[] = [];
  cargando = false;
  resumen: any = null;

  constructor(
    private navCtrl: NavController,
    private databaseService: DatabaseService
  ) {}

  async ionViewWillEnter() {
    this.pacienteSeleccionado = null;
    this.sesiones = [];
    this.resumen = null;
    await this.cargarPacientes();
  }

  async cargarPacientes() {
    try {
      this.pacientes = await this.databaseService.getPacientes();
    } catch (error) {
      console.error('Error cargando pacientes:', error);
      this.pacientes = [];
    }
  }

  async seleccionarPaciente(event: any) {
    const pacienteId = event?.detail?.value;
    if (!pacienteId) {
      this.pacienteSeleccionado = null;
      this.sesiones = [];
      this.resumen = null;
      return;
    }

    this.cargando = true;
    try {
      this.pacienteSeleccionado = this.pacientes.find(
        p => String(p.id) === String(pacienteId)
      );

      const sesiones = await this.databaseService.getSesionesByPaciente(pacienteId);
      this.sesiones = sesiones.sort((a: any, b: any) =>
        (a.numero_sesion || 0) - (b.numero_sesion || 0)
      );

      this.calcularResumen();
    } catch (error) {
      console.error('Error cargando sesiones:', error);
      this.sesiones = [];
      this.resumen = null;
    } finally {
      this.cargando = false;
    }
  }

  private calcularResumen() {
    if (!this.sesiones.length) {
      this.resumen = null;
      return;
    }

    const primera = this.sesiones[0];
    const ultima = this.sesiones[this.sesiones.length - 1];

    const evaPrimera = primera.eva ?? primera.nivelDolor ?? null;
    const evaUltima = ultima.eva ?? ultima.nivelDolor ?? null;
    const cambioEva = (evaPrimera !== null && evaUltima !== null) ? evaPrimera - evaUltima : null;

    const suenoPrimero = primera.sueño ?? primera.calidadSueno ?? null;
    const suenoUltimo = ultima.sueño ?? ultima.calidadSueno ?? null;
    const cambioSueno = (suenoPrimero !== null && suenoUltimo !== null) ? suenoUltimo - suenoPrimero : null;

    const totalEjercicios = this.sesiones.filter(s =>
      s.ejercicios === 'Realizados' || s.ejerciciosRealizados === true
    ).length;

    this.resumen = {
      totalSesiones: this.sesiones.length,
      fechaInicio: primera.fecha || primera.fecha_creacion,
      fechaFin: ultima.fecha || ultima.fecha_creacion,
      evaPrimera,
      evaUltima,
      cambioEva,
      suenoPrimero,
      suenoUltimo,
      cambioSueno,
      totalEjercicios,
      porcentajeEjercicios: Math.round((totalEjercicios / this.sesiones.length) * 100),
      planificadas: this.pacienteSeleccionado?.sesionesPlanificadas || 10
    };
  }

  // SVG chart helpers
  getEvaCircles(): { cx: number; cy: number; value: number }[] {
    if (!this.sesiones.length) return [];
    const w = 280, h = 140, pad = 20;
    return this.sesiones.map((s, i) => {
      const cx = this.sesiones.length === 1 ? w / 2 : pad + (i / (this.sesiones.length - 1)) * (w - 2 * pad);
      const eva = s.eva ?? s.nivelDolor ?? 0;
      const cy = pad + ((10 - eva) / 10) * (h - 2 * pad);
      return { cx, cy, value: eva };
    });
  }

  getEvaPolyline(): string {
    return this.getEvaCircles().map(p => `${p.cx},${p.cy}`).join(' ');
  }

  getSuenoCircles(): { cx: number; cy: number; value: number }[] {
    if (!this.sesiones.length) return [];
    const w = 280, h = 140, pad = 20;
    return this.sesiones.map((s, i) => {
      const cx = this.sesiones.length === 1 ? w / 2 : pad + (i / (this.sesiones.length - 1)) * (w - 2 * pad);
      const val = s.sueño ?? s.calidadSueno ?? 0;
      const cy = pad + ((10 - val) / 10) * (h - 2 * pad);
      return { cx, cy, value: val };
    });
  }

  getSuenoPolyline(): string {
    return this.getSuenoCircles().map(p => `${p.cx},${p.cy}`).join(' ');
  }

  formatearFecha(fechaString: string): string {
    if (!fechaString) return '-';
    try {
      if (fechaString.includes('/')) return fechaString;
      const fecha = new Date(fechaString);
      if (isNaN(fecha.getTime())) return fechaString;
      return fecha.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return fechaString;
    }
  }

  getEvaColor(valor: number): string {
    if (valor <= 3) return '#10b981';
    if (valor <= 6) return '#f59e0b';
    return '#ef4444';
  }

  getSuenoColor(valor: number): string {
    if (valor >= 7) return '#10b981';
    if (valor >= 4) return '#f59e0b';
    return '#ef4444';
  }

  // Helper to access sueño without ñ in templates (Angular lexer doesn't support ñ)
  getSuenoValue(s: any): number | null {
    return s['sue\u00f1o'] ?? s.calidadSueno ?? null;
  }

  volverAtras() {
    this.navCtrl.navigateRoot('/dashboard');
  }
}
