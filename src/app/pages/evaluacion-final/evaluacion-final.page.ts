import { Component } from '@angular/core';
import { NavController, ViewWillEnter, ToastController, IonicModule } from '@ionic/angular';
import { EvolucionesService, EvolucionDocument } from '../../services/evoluciones.service';
import { PacientesService, PacienteDocument } from '../../services/pacientes.service';
import { PdfService } from '../../services/pdf.services';
import { NgFor, NgIf, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TestTemplatesFirestoreService } from '../../services/test-templates-firestore.service';
import { TestTemplate } from '../../models/test-template.model';
import { Timestamp } from '@angular/fire/firestore';

type ResumenPaciente = {
  totalSesiones: number;
  fechaInicio: string;
  fechaFin: string;
  evaPrimera: number | null;
  evaUltima: number | null;
  cambioEva: number | null;
  suenoPrimero: number | null;
  suenoUltimo: number | null;
  cambioSueno: number | null;
  totalEjercicios: number;
  porcentajeEjercicios: number;
  planificadas: number;
};


@Component({
    selector: 'app-evaluacion-final',
    templateUrl: './evaluacion-final.page.html',
    styleUrls: ['./evaluacion-final.page.scss'],
    standalone: true,
    imports: [IonicModule, NgFor, NgIf, NgClass, FormsModule]
})
export class EvaluacionFinalPage implements ViewWillEnter {
  pacientes: PacienteDocument[] = [];
  pacienteSeleccionado: PacienteDocument | null = null;
  sesiones: EvolucionDocument[] = [];
  cargando = false;
  resumen: ResumenPaciente | null = null;
  testResults: EvolucionDocument[] = [];
  testTemplates: TestTemplate[] = [];

  // Clinical narrative fields for PDF
  evaluacionInicial = '';
  respuestaTratamiento = '';
  planTratamiento = '';

  constructor(
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private pacientesService: PacientesService,
    private evolucionesService: EvolucionesService,
    private testTemplatesService: TestTemplatesFirestoreService,
    private pdfService: PdfService
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
      this.pacientes = await this.pacientesService.list();
    } catch (error) {
      console.error('Error cargando pacientes:', error);
      this.pacientes = [];
    }
  }

  async seleccionarPaciente(event: any) {
    const patientId = event?.detail?.value;
    if (!patientId) {
      this.pacienteSeleccionado = null;
      this.sesiones = [];
      this.resumen = null;
      return;
    }

    this.cargando = true;
    try {
      this.pacienteSeleccionado =
      this.pacientes.find(p => p.id === patientId) ?? null;
      if (!this.pacienteSeleccionado) return;

      const sesiones = await this.evolucionesService.listByPaciente(patientId);
      this.sesiones = sesiones.sort((a, b) =>
        (a.sessionNumber ?? 0) - (b.sessionNumber ?? 0)
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

    const evaPrimera = primera.painScale ?? null;
    const evaUltima = ultima.painScale ?? null;
    const cambioEva = (evaPrimera !== null && evaUltima !== null) ? evaPrimera - evaUltima : null;

    const suenoPrimero = primera.sleepQuality ?? null;
    const suenoUltimo = ultima.sleepQuality ?? null;
    const cambioSueno = (suenoPrimero !== null && suenoUltimo !== null) ? suenoUltimo - suenoPrimero : null;

    const totalEjercicios = this.sesiones.filter(
      s => s.ejerciciosRealizados === true
    ).length;

    const porcentajeEjercicios =
      this.sesiones.length > 0
        ? Math.round((totalEjercicios / this.sesiones.length) * 100)
        : 0;
    const fechaInicio = this.formatTimestamp(primera.createdAt);
    const fechaFin = this.formatTimestamp(ultima.createdAt);    

    this.resumen = {
      totalSesiones: this.sesiones.length,
      fechaInicio,
      fechaFin,
      evaPrimera,
      evaUltima,
      cambioEva,
      suenoPrimero,
      suenoUltimo,
      cambioSueno,
      totalEjercicios,
      porcentajeEjercicios: porcentajeEjercicios,
      planificadas: this.pacienteSeleccionado?.sesionesPlanificadas || 10
   };
  }

  private extraerTestResults() {
    this.testResults = this.sesiones.filter(s => s.test !== null);
  }

  private formatTimestamp(ts?: Timestamp | any): string {
    if (ts instanceof Timestamp) {
      return ts.toDate().toLocaleDateString('es-CL');
    }
    return '';
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

  getTestResultColor(resultado?: string): string {

    if (!resultado) return '#0d9488';

    const r = resultado.toLowerCase();

    for (const t of this.testTemplates) {
      const rango = (t.rangos || []).find((x: any) => x.nombre === resultado);
      if (rango?.color) return rango.color;
    }

    if (r.includes('normal') || r.includes('leve')) return '#10b981';
    if (r.includes('moderado') || r.includes('medio')) return '#f59e0b';
    if (r.includes('severo') || r.includes('grave')) return '#ef4444';

    return '#0d9488';
  }

  // SVG chart helpers
  getEvaCircles(): { cx: number; cy: number; value: number }[] {
    if (!this.sesiones.length) return [];

    const w = 280, h = 140, pad = 20;

    return this.sesiones.map((s, i) => {
      const cx =
        this.sesiones.length === 1
          ? w / 2
          : pad + (i / (this.sesiones.length - 1)) * (w - 2 * pad);

      const eva = s.painScale ?? 0;

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
      const val = s.sleepQuality ?? 0;
      const cy = pad + ((10 - val) / 10) * (h - 2 * pad);
      return { cx, cy, value: val };
    });
  }

  getSuenoPolyline(): string {
    return this.getSuenoCircles().map(p => `${p.cx},${p.cy}`).join(' ');
  }

  formatearFecha(fecha: any): string {

    if (!fecha) return '-';

    // Firestore Timestamp
    if (fecha?.toDate) {
      return fecha.toDate().toLocaleDateString('es-CL');
    }

    // string
    if (typeof fecha === 'string') {
      if (fecha.includes('/')) return fecha;

      const d = new Date(fecha);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('es-CL');
      }
    }

    return '-';
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

  
  getSuenoValue(s: EvolucionDocument): number | null {
    return s.sleepQuality;
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
