import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';
import { jsPDF } from 'jspdf';

export interface InformeData {
  paciente: any;
  sesiones: any[];
  resumen: any;
  testResults?: any[];
  kinesiologo?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PdfService {
  // Colors
  private readonly TEAL = [13, 148, 136];
  private readonly DARK = [31, 41, 55];
  private readonly GRAY = [107, 114, 128];
  private readonly LIGHT_BG = [249, 250, 251];
  private readonly WHITE = [255, 255, 255];
  private readonly GREEN = [16, 185, 129];
  private readonly RED = [239, 68, 68];
  private readonly ORANGE = [245, 158, 11];

  constructor(private platform: Platform) {}

  generarInformePaciente(data: InformeData): void {
    const doc = new jsPDF('p', 'mm', 'letter');
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 18;
    const contentWidth = pageWidth - margin * 2;
    let y = 0;

    // === HEADER ===
    y = this.dibujarHeader(doc, pageWidth, margin);

    // === DATOS DEL PACIENTE ===
    y = this.dibujarDatosPaciente(doc, data, y, margin, contentWidth);

    // === RESUMEN DEL TRATAMIENTO ===
    if (data.resumen) {
      y = this.dibujarResumen(doc, data, y, margin, contentWidth);
    }

    // === TABLA DE SESIONES ===
    if (data.sesiones.length > 0) {
      y = this.checkPageBreak(doc, y, 60, pageWidth, margin);
      y = this.dibujarTablaSesiones(doc, data, y, margin, contentWidth, pageWidth);
    }

    // === RESULTADOS DE TESTS ===
    if (data.testResults && data.testResults.length > 0) {
      y = this.checkPageBreak(doc, y, 40, pageWidth, margin);
      y = this.dibujarTestResults(doc, data.testResults, y, margin, contentWidth, pageWidth);
    }

    // === GRAFICO EVA ===
    if (data.sesiones.length >= 2) {
      y = this.checkPageBreak(doc, y, 55, pageWidth, margin);
      y = this.dibujarGraficoEva(doc, data.sesiones, y, margin, contentWidth);
    }

    // === FIRMA ===
    y = this.checkPageBreak(doc, y, 45, pageWidth, margin);
    this.dibujarFirma(doc, data, y, margin, contentWidth);

    // === FOOTER en todas las paginas ===
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      this.dibujarFooter(doc, pageWidth, i, totalPages);
    }

    // Descargar
    const nombreArchivo = `Informe_${(data.paciente.nombre || 'Paciente').replace(/\s+/g, '_')}_${this.fechaHoy()}.pdf`;
    doc.save(nombreArchivo);
  }

  // =============================================
  // SECCIONES DEL PDF
  // =============================================

  private dibujarHeader(doc: jsPDF, pageWidth: number, margin: number): number {
    // Barra teal superior
    doc.setFillColor(...this.TEAL);
    doc.rect(0, 0, pageWidth, 32, 'F');

    doc.setTextColor(...this.WHITE);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('KINESPHERE', pageWidth / 2, 14, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Informe de Tratamiento Kinesiologico', pageWidth / 2, 22, { align: 'center' });

    doc.setFontSize(8);
    doc.text(`Fecha de emision: ${this.fechaHoyFormateada()}`, pageWidth / 2, 28, { align: 'center' });

    return 40;
  }

  private dibujarDatosPaciente(doc: jsPDF, data: InformeData, y: number, margin: number, contentWidth: number): number {
    // Titulo seccion
    y = this.tituloSeccion(doc, 'DATOS DEL PACIENTE', y, margin, contentWidth);

    const paciente = data.paciente;
    const col1 = margin + 2;
    const col2 = margin + contentWidth / 2;
    const lineH = 6;

    const campos = [
      ['Nombre:', paciente.nombre || '-', 'RUT:', paciente.rut || 'No registrado'],
      ['Diagnostico:', paciente.diagnostico || '-', 'Edad:', paciente.edad ? `${paciente.edad} anos` : '-'],
      ['Telefono:', paciente.telefono || '-', 'Email:', paciente.email || '-'],
    ];

    for (const row of campos) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...this.GRAY);
      doc.text(row[0], col1, y);
      doc.text(row[2], col2, y);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...this.DARK);
      doc.text(String(row[1]), col1 + 28, y);
      doc.text(String(row[3]), col2 + 28, y);
      y += lineH;
    }

    return y + 4;
  }

  private dibujarResumen(doc: jsPDF, data: InformeData, y: number, margin: number, contentWidth: number): number {
    y = this.tituloSeccion(doc, 'RESUMEN DEL TRATAMIENTO', y, margin, contentWidth);

    const r = data.resumen;
    const boxW = contentWidth / 4 - 3;
    const boxH = 18;

    const stats = [
      { label: 'Sesiones', value: `${r.totalSesiones}`, sub: `de ${r.planificadas} planificadas` },
      { label: 'EVA Inicial', value: r.evaPrimera !== null ? `${r.evaPrimera}/10` : '-', sub: 'Dolor inicial' },
      { label: 'EVA Final', value: r.evaUltima !== null ? `${r.evaUltima}/10` : '-', sub: 'Dolor actual' },
      { label: 'Ejercicios', value: `${r.porcentajeEjercicios}%`, sub: 'Cumplimiento' },
    ];

    stats.forEach((stat, i) => {
      const x = margin + i * (boxW + 4);

      // Box background
      doc.setFillColor(...this.LIGHT_BG);
      doc.roundedRect(x, y, boxW, boxH, 2, 2, 'F');

      // Value
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...this.TEAL);
      doc.text(stat.value, x + boxW / 2, y + 8, { align: 'center' });

      // Label
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...this.DARK);
      doc.text(stat.label, x + boxW / 2, y + 13, { align: 'center' });

      // Sub
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...this.GRAY);
      doc.text(stat.sub, x + boxW / 2, y + 17, { align: 'center' });
    });

    y += boxH + 4;

    // Cambio EVA
    if (r.cambioEva !== null) {
      const mejoro = r.cambioEva > 0;
      const color = mejoro ? this.GREEN : r.cambioEva < 0 ? this.RED : this.GRAY;
      const texto = mejoro ? `Dolor disminuyo ${r.cambioEva} puntos en escala EVA` :
                    r.cambioEva < 0 ? `Dolor aumento ${Math.abs(r.cambioEva)} puntos en escala EVA` :
                    'Sin cambio en escala de dolor EVA';

      doc.setFillColor(color[0], color[1], color[2]);
      doc.roundedRect(margin, y, contentWidth, 8, 2, 2, 'F');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...this.WHITE);
      doc.text(texto, margin + contentWidth / 2, y + 5.5, { align: 'center' });
      y += 12;
    }

    // Periodo
    if (r.fechaInicio || r.fechaFin) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...this.GRAY);
      const periodo = `Periodo: ${this.formatearFecha(r.fechaInicio)} - ${this.formatearFecha(r.fechaFin)}`;
      doc.text(periodo, margin + 2, y);
      y += 6;
    }

    return y + 2;
  }

  private dibujarTablaSesiones(doc: jsPDF, data: InformeData, y: number, margin: number, contentWidth: number, pageWidth: number): number {
    y = this.tituloSeccion(doc, 'HISTORIAL DE SESIONES', y, margin, contentWidth);

    // Table header
    const colWidths = [16, 30, 20, 22, 24, contentWidth - 112];
    const headers = ['N', 'Fecha', 'EVA', 'Sueno', 'Ejercicios', 'Observaciones'];

    doc.setFillColor(...this.TEAL);
    doc.rect(margin, y, contentWidth, 7, 'F');
    doc.setTextColor(...this.WHITE);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');

    let xPos = margin + 2;
    headers.forEach((h, i) => {
      doc.text(h, xPos, y + 5);
      xPos += colWidths[i];
    });
    y += 7;

    // Table rows
    const sesiones = data.sesiones;
    doc.setFontSize(7);

    for (let idx = 0; idx < sesiones.length; idx++) {
      const s = sesiones[idx];

      // Check page break
      if (y > doc.internal.pageSize.getHeight() - 30) {
        doc.addPage();
        y = this.dibujarHeaderContinuacion(doc, pageWidth, margin);
      }

      // Alternating row color
      if (idx % 2 === 0) {
        doc.setFillColor(...this.LIGHT_BG);
        doc.rect(margin, y, contentWidth, 7, 'F');
      }

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...this.DARK);

      xPos = margin + 2;

      // Numero sesion
      doc.setFont('helvetica', 'bold');
      doc.text(`S${s.numero_sesion || idx + 1}`, xPos, y + 5);
      xPos += colWidths[0];

      doc.setFont('helvetica', 'normal');

      // Fecha
      doc.text(this.formatearFecha(s.fecha || s.fecha_creacion), xPos, y + 5);
      xPos += colWidths[1];

      // EVA
      const eva = s.eva ?? s.nivelDolor ?? '-';
      const evaNum = Number(eva);
      if (!isNaN(evaNum)) {
        doc.setTextColor(...(evaNum <= 3 ? this.GREEN : evaNum <= 6 ? this.ORANGE : this.RED));
      }
      doc.text(String(eva), xPos, y + 5);
      xPos += colWidths[2];
      doc.setTextColor(...this.DARK);

      // Sueno
      const sueno = s['sue\u00f1o'] ?? s.calidadSueno ?? s.sueno ?? '-';
      doc.text(String(sueno), xPos, y + 5);
      xPos += colWidths[3];

      // Ejercicios
      const ejercicios = (s.ejercicios === 'Realizados' || s.ejerciciosRealizados === true) ? 'Si' : 'No';
      doc.setTextColor(...(ejercicios === 'Si' ? this.GREEN : this.GRAY));
      doc.text(ejercicios, xPos, y + 5);
      xPos += colWidths[4];
      doc.setTextColor(...this.DARK);

      // Observaciones (truncated)
      const obs = (s.observaciones || '-').substring(0, 40);
      doc.text(obs, xPos, y + 5);

      y += 7;
    }

    return y + 4;
  }

  private dibujarTestResults(doc: jsPDF, testResults: any[], y: number, margin: number, contentWidth: number, pageWidth: number): number {
    y = this.tituloSeccion(doc, 'RESULTADOS DE TESTS', y, margin, contentWidth);

    for (const tr of testResults) {
      if (y > doc.internal.pageSize.getHeight() - 30) {
        doc.addPage();
        y = this.dibujarHeaderContinuacion(doc, pageWidth, margin);
      }

      // Test row background
      doc.setFillColor(...this.LIGHT_BG);
      doc.roundedRect(margin, y, contentWidth, 12, 2, 2, 'F');

      // Left border accent
      doc.setFillColor(...this.TEAL);
      doc.rect(margin, y, 2, 12, 'F');

      // Session badge
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...this.TEAL);
      doc.text(`S${tr.sesionNumero}`, margin + 6, y + 5);

      // Test name
      doc.setFontSize(9);
      doc.setTextColor(...this.DARK);
      doc.text(tr.testNombre || '-', margin + 18, y + 5);

      // Date
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...this.GRAY);
      doc.text(this.formatearFecha(tr.fecha), margin + 18, y + 10);

      // Score
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...this.TEAL);
      const scoreX = margin + contentWidth - 50;
      doc.text(String(tr.puntajeTotal), scoreX, y + 7);

      // Result badge
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      const resultado = tr.resultado || '-';
      const badgeX = margin + contentWidth - 35;
      const badgeW = 33;
      doc.setFillColor(...this.TEAL);
      doc.roundedRect(badgeX, y + 2, badgeW, 8, 2, 2, 'F');
      doc.setTextColor(...this.WHITE);
      doc.text(resultado, badgeX + badgeW / 2, y + 7.5, { align: 'center' });

      y += 15;
    }

    return y + 2;
  }

  private dibujarGraficoEva(doc: jsPDF, sesiones: any[], y: number, margin: number, contentWidth: number): number {
    y = this.tituloSeccion(doc, 'EVOLUCION DEL DOLOR (EVA)', y, margin, contentWidth);

    const chartX = margin + 10;
    const chartW = contentWidth - 20;
    const chartH = 35;
    const chartY = y;

    // Background
    doc.setFillColor(...this.LIGHT_BG);
    doc.roundedRect(margin, y - 2, contentWidth, chartH + 12, 2, 2, 'F');

    // Y-axis labels
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...this.GRAY);
    doc.text('10', margin + 3, chartY + 3);
    doc.text('5', margin + 5, chartY + chartH / 2 + 1);
    doc.text('0', margin + 5, chartY + chartH + 1);

    // Grid lines
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.2);
    doc.line(chartX, chartY, chartX + chartW, chartY);
    doc.line(chartX, chartY + chartH / 2, chartX + chartW, chartY + chartH / 2);
    doc.line(chartX, chartY + chartH, chartX + chartW, chartY + chartH);

    // Plot points
    const points: { x: number; y: number; val: number }[] = [];
    sesiones.forEach((s, i) => {
      const eva = s.eva ?? s.nivelDolor ?? 0;
      const px = sesiones.length === 1 ? chartX + chartW / 2 :
        chartX + (i / (sesiones.length - 1)) * chartW;
      const py = chartY + ((10 - eva) / 10) * chartH;
      points.push({ x: px, y: py, val: eva });
    });

    // Draw line
    if (points.length >= 2) {
      doc.setDrawColor(...this.RED);
      doc.setLineWidth(0.8);
      for (let i = 0; i < points.length - 1; i++) {
        doc.line(points[i].x, points[i].y, points[i + 1].x, points[i + 1].y);
      }
    }

    // Draw points and labels
    points.forEach((p, i) => {
      const color = p.val <= 3 ? this.GREEN : p.val <= 6 ? this.ORANGE : this.RED;
      doc.setFillColor(...color);
      doc.circle(p.x, p.y, 1.5, 'F');

      doc.setFontSize(6);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...this.DARK);
      doc.text(String(p.val), p.x, p.y - 3, { align: 'center' });

      // X-axis label
      doc.setFontSize(5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...this.GRAY);
      doc.text(`S${sesiones[i].numero_sesion || i + 1}`, p.x, chartY + chartH + 6, { align: 'center' });
    });

    return chartY + chartH + 12;
  }

  private dibujarFirma(doc: jsPDF, data: InformeData, y: number, margin: number, contentWidth: number): void {
    y += 8;
    const centerX = margin + contentWidth / 2;

    // Line
    doc.setDrawColor(...this.GRAY);
    doc.setLineWidth(0.3);
    doc.line(centerX - 35, y, centerX + 35, y);

    y += 5;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...this.DARK);
    doc.text('Firma del Kinesiologo', centerX, y, { align: 'center' });

    y += 5;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...this.GRAY);
    const kine = data.kinesiologo || localStorage.getItem('nombreCompleto') || 'Kinesiologo';
    doc.text(kine, centerX, y, { align: 'center' });

    y += 4;
    doc.text(`Fecha: ${this.fechaHoyFormateada()}`, centerX, y, { align: 'center' });
  }

  private dibujarFooter(doc: jsPDF, pageWidth: number, pageNum: number, totalPages: number): void {
    const pageHeight = doc.internal.pageSize.getHeight();
    const y = pageHeight - 8;

    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...this.GRAY);
    doc.text('Documento generado por KineSphere App', pageWidth / 2, y, { align: 'center' });
    doc.text(`Pagina ${pageNum} de ${totalPages}`, pageWidth - 18, y, { align: 'right' });
  }

  // =============================================
  // HELPERS
  // =============================================

  private tituloSeccion(doc: jsPDF, titulo: string, y: number, margin: number, contentWidth: number): number {
    // Accent bar
    doc.setFillColor(...this.TEAL);
    doc.rect(margin, y, 3, 7, 'F');

    // Title text
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...this.DARK);
    doc.text(titulo, margin + 6, y + 5);

    // Underline
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.3);
    doc.line(margin, y + 8, margin + contentWidth, y + 8);

    return y + 13;
  }

  private dibujarHeaderContinuacion(doc: jsPDF, pageWidth: number, margin: number): number {
    doc.setFillColor(...this.TEAL);
    doc.rect(0, 0, pageWidth, 12, 'F');
    doc.setTextColor(...this.WHITE);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('KINESPHERE - Informe de Tratamiento (cont.)', pageWidth / 2, 8, { align: 'center' });
    return 20;
  }

  private checkPageBreak(doc: jsPDF, y: number, needed: number, pageWidth: number, margin: number): number {
    if (y + needed > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      return this.dibujarHeaderContinuacion(doc, pageWidth, margin);
    }
    return y;
  }

  private fechaHoy(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private fechaHoyFormateada(): string {
    return new Date().toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  private formatearFecha(fechaString: string | undefined | null): string {
    if (!fechaString) return '-';
    try {
      if (fechaString.includes('/')) return fechaString;
      const fecha = new Date(fechaString);
      if (isNaN(fecha.getTime())) return fechaString;
      return fecha.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return String(fechaString);
    }
  }
}
