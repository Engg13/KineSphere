import { Component } from '@angular/core';
import { NavController, ViewWillEnter, ToastController, IonicModule } from '@ionic/angular';
import { DatabaseService } from '../../services/database.service';
import { PdfService } from '../../services/pdf.services';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TestTemplatesFirestoreService } from '../../services/test-templates-firestore.service';
import { TestTemplate } from '../../models/test-template.model';

@Component({
    selector: 'app-evaluacion-final',
    templateUrl: './evaluacion-final.page.html',
    styleUrls: ['./evaluacion-final.page.scss'],
    standalone: true,
    imports: [IonicModule, NgFor, NgIf, FormsModule]
})
export class EvaluacionFinalPage implements ViewWillEnter {
  pacientes: any[] = [];
  pacienteSeleccionado: any = null;
  sesiones: any[] = [];
  cargando = false;
  resumen: any = null;
  testResults: any[] = [];
  testTemplates: TestTemplate[] = [];

  // Clinical narrative fields for PDF
  evaluacionInicial = '';
  respuestaTratamiento = '';
  planTratamiento = '';

  constructor(
    private navCtrl: NavController,
    private databaseService: DatabaseService,
    private pdfService: PdfService,
    private testTemplatesService: TestTemplatesFirestoreService,
    private toastCtrl: ToastController
  ) {}

  async ionViewWillEnter() {
    this.pacienteSeleccionado = null;
    this.sesiones = [];
    this.resumen = null;
    this.testResults = [];
    this.evaluacionInicial = '';
    this.respuestaTratamiento = '';
    this.planTratamiento = '';
    this.testTemplates = await this.testTemplatesService.getTests();
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
      this.extraerTestResults();
      this.autoRellenarNarrativas();
    } catch (error) {
      console.error('Error cargando sesiones:', error);
      this.sesiones = [];
      this.resumen = null;
      this.testResults = [];
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

    const suenoPrimero = primera['sue\u00f1o'] ?? primera.calidadSueno ?? primera.sueno ?? null;
    const suenoUltimo = ultima['sue\u00f1o'] ?? ultima.calidadSueno ?? ultima.sueno ?? null;
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

  private extraerTestResults() {
    this.testResults = this.sesiones
      .filter(s => s.test && s.test.testNombre)
      .map(s => ({
        sesionNumero: s.numero_sesion,
        fecha: s.fecha || s.fecha_creacion,
        testNombre: s.test.testNombre,
        puntajeTotal: s.test.puntajeTotal,
        resultado: s.test.resultado,
        respuestas: s.test.respuestas || []
      }));
  }

  private autoRellenarNarrativas() {
    if (!this.resumen || !this.pacienteSeleccionado) return;
    const p = this.pacienteSeleccionado;
    const r = this.resumen;

    // Auto-populate evaluacion inicial with available data
    const evaInicial = r.evaPrimera !== null ? `EVA inicial: ${r.evaPrimera}/10.` : '';
    this.evaluacionInicial = `Paciente ingresa con diagnostico de ${p.diagnostico || '...'}.${evaInicial ? ' ' + evaInicial : ''} `;

    // Auto-populate respuesta al tratamiento
    const numSesiones = r.totalSesiones;
    let evolucion = '';
    if (r.cambioEva !== null) {
      if (r.cambioEva > 0) evolucion = `EVA disminuye de ${r.evaPrimera} a ${r.evaUltima}.`;
      else if (r.cambioEva < 0) evolucion = `EVA aumenta de ${r.evaPrimera} a ${r.evaUltima}.`;
      else evolucion = `EVA se mantiene en ${r.evaUltima}.`;
    }
    this.respuestaTratamiento = `Se realizan ${numSesiones} sesiones de KNT. ${evolucion} Ejercicios domiciliarios: ${r.porcentajeEjercicios}% cumplimiento. `;

    this.planTratamiento = '';
  }

  getTestResultColor(resultado: string): string {
    for (const t of this.testTemplates) {
      const rango = (t.rangos || []).find((r: any) => r.nombre === resultado);
      if (rango && rango.color) return rango.color;
    }
    // Default colors based on common result patterns
    if (resultado.toLowerCase().includes('normal') || resultado.toLowerCase().includes('leve')) return '#10b981';
    if (resultado.toLowerCase().includes('moderado') || resultado.toLowerCase().includes('medio')) return '#f59e0b';
    if (resultado.toLowerCase().includes('severo') || resultado.toLowerCase().includes('grave')) return '#ef4444';
    return '#0d9488';
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
      const val = s['sue\u00f1o'] ?? s.calidadSueno ?? s.sueno ?? 0;
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
    return s['sue\u00f1o'] ?? s.calidadSueno ?? s.sueno ?? null;
  }

  async generarPDF() {
    if (!this.pacienteSeleccionado || !this.resumen) return;
    try {
      this.pdfService.generarInformePaciente({
        paciente: this.pacienteSeleccionado,
        sesiones: this.sesiones,
        resumen: this.resumen,
        testResults: this.testResults,
        evaluacionInicial: this.evaluacionInicial,
        respuestaTratamiento: this.respuestaTratamiento,
        planTratamiento: this.planTratamiento
      });
      const toast = await this.toastCtrl.create({
        message: 'PDF generado correctamente',
        duration: 2000,
        color: 'success',
        position: 'bottom'
      });
      await toast.present();
    } catch (error) {
      console.error('Error generando PDF:', error);
      const toast = await this.toastCtrl.create({
        message: 'Error al generar el PDF',
        duration: 2000,
        color: 'danger',
        position: 'bottom'
      });
      await toast.present();
    }
  }

  async generarDetalleSesionesPDF() {
    if (!this.pacienteSeleccionado || !this.sesiones.length) return;
    try {
      await this.pdfService.generarDetalleSesiones({
        paciente: this.pacienteSeleccionado,
        sesiones: this.sesiones,
        resumen: this.resumen,
        testResults: this.testResults
      });
      const toast = await this.toastCtrl.create({
        message: 'Carta ISAPRE generada (.docx)',
        duration: 2000,
        color: 'success',
        position: 'bottom'
      });
      await toast.present();
    } catch (error) {
      console.error('Error generando carta ISAPRE:', error);
      const toast = await this.toastCtrl.create({
        message: 'Error al generar la carta ISAPRE',
        duration: 2000,
        color: 'danger',
        position: 'bottom'
      });
      await toast.present();
    }
  }

  volverAtras() {
    this.navCtrl.navigateRoot('/dashboard');
  }
}
