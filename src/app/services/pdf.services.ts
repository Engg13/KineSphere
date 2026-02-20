import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';
import { jsPDF } from 'jspdf';
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, BorderStyle, HeadingLevel
} from 'docx';
import { saveAs } from 'file-saver';

export interface InformeData {
  paciente: any;
  sesiones: any[];
  resumen: any;
  testResults?: any[];
  kinesiologo?: string;
  evaluacionInicial?: string;
  respuestaTratamiento?: string;
  planTratamiento?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PdfService {
  // Colors (matching professional clinical report)
  private readonly TEAL: [number, number, number] = [13, 148, 136];
  private readonly TEAL_LIGHT: [number, number, number] = [20, 184, 166];
  private readonly DARK: [number, number, number] = [31, 41, 55];
  private readonly GRAY: [number, number, number] = [107, 114, 128];
  private readonly LIGHT_GRAY: [number, number, number] = [156, 163, 175];
  private readonly LIGHT_BG: [number, number, number] = [249, 250, 251];
  private readonly WHITE: [number, number, number] = [255, 255, 255];
  private readonly GREEN: [number, number, number] = [16, 185, 129];
  private readonly RED: [number, number, number] = [239, 68, 68];
  private readonly ORANGE: [number, number, number] = [245, 158, 11];
  private readonly TABLE_BORDER: [number, number, number] = [180, 180, 180];

  constructor(private platform: Platform) {}

  generarInformePaciente(data: InformeData): void {
    const doc = new jsPDF('p', 'mm', 'letter');
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    const m = 20; // margin
    const cw = pw - m * 2; // content width
    let y = 0;

    // === INFORME KINESICO (sin detalle de sesiones) ===
    y = this.drawHeader(doc, pw, m);
    y = this.drawTitle(doc, pw, y);
    y = this.drawPatientTable(doc, data, y, m, cw);
    y = this.drawClinicalSection(doc, 'Evaluacion Inicial', data.evaluacionInicial || '', y, m, cw, pw);
    y = this.drawClinicalSection(doc, 'Respuesta al Tratamiento', data.respuestaTratamiento || '', y, m, cw, pw);
    y = this.drawClinicalSection(doc, 'Plan', data.planTratamiento || '', y, m, cw, pw);

    // Test results inline if any
    if (data.testResults && data.testResults.length > 0) {
      y = this.checkPage(doc, y, 30, pw, m);
      y = this.drawTestResultsSection(doc, data.testResults, y, m, cw, pw);
    }

    // Signature
    y = this.checkPage(doc, y, 50, pw, m);
    this.drawSignature(doc, data, y, m, cw);

    // Footer on all pages
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      this.drawFooter(doc, pw, ph, i, totalPages);
    }

    const nombre = (data.paciente.nombre || 'Paciente').replace(/\s+/g, '_');
    doc.save(`Informe_Kinesico_${nombre}_${this.todayStr()}.pdf`);
  }

  async generarDetalleSesiones(data: InformeData): Promise<void> {
    const p = data.paciente;

    // Professional info from localStorage
    const kineNombre = (localStorage.getItem('nombreCompleto') || 'Profesional').toUpperCase();
    const kineRut = localStorage.getItem('rutProfesional') || '';
    const kineTelefono = localStorage.getItem('telefonoProfesional') || '+56932774294';
    const kineEmail = localStorage.getItem('emailProfesional') || 'kinesiologiafundadores@gmail.com';

    // Generate session dates
    const totalSesiones = p.sesionesPlanificadas || data.sesiones.length || 10;
    const sesionDates = this.generarFechasSesiones(data, totalSesiones);
    const fechaInicio = sesionDates.length > 0 ? sesionDates[0].fecha : this.todayDDMMYY();
    const diagnostico = p.diagnostico || '...';

    const thinBorder = { style: BorderStyle.SINGLE, size: 1, color: '000000' };
    const cellBorders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };

    // Build session table rows
    const headerRow = new TableRow({
      children: ['N° Sesion', 'Fecha', 'Hora', 'Detalle'].map(text =>
        new TableCell({
          borders: cellBorders,
          width: text === 'Detalle' ? { size: 4500, type: WidthType.DXA } :
                 text === 'Fecha' ? { size: 1800, type: WidthType.DXA } :
                 { size: 1200, type: WidthType.DXA },
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text, bold: true, size: 20, font: 'Calibri' })]
          })]
        })
      )
    });

    const dataRows = sesionDates.map((sd, i) =>
      new TableRow({
        children: [
          new TableCell({
            borders: cellBorders,
            width: { size: 1200, type: WidthType.DXA },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: String(i + 1), size: 20, font: 'Calibri' })]
            })]
          }),
          new TableCell({
            borders: cellBorders,
            width: { size: 1800, type: WidthType.DXA },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: sd.fecha, bold: true, size: 20, font: 'Calibri' })]
            })]
          }),
          new TableCell({
            borders: cellBorders,
            width: { size: 1200, type: WidthType.DXA },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: sd.hora, size: 20, font: 'Calibri' })]
            })]
          }),
          new TableCell({
            borders: cellBorders,
            width: { size: 4500, type: WidthType.DXA },
            children: [new Paragraph({
              children: [new TextRun({ text: sd.detalle, size: 18, font: 'Calibri' })]
            })]
          })
        ]
      })
    );

    // Build signature lines
    const signatureLines: Paragraph[] = [
      new Paragraph({ spacing: { before: 400 } }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: kineNombre, bold: true, size: 22, font: 'Calibri' })]
      })
    ];
    if (kineRut) {
      signatureLines.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: kineRut, size: 20, font: 'Calibri' })]
      }));
    }
    signatureLines.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'Kinesiologo Kinesiologia Fundadores', size: 20, font: 'Calibri' })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: `Fono contacto: ${kineTelefono}`, size: 20, font: 'Calibri' })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: `Email: ${kineEmail}`, size: 20, font: 'Calibri' })]
      })
    );

    const doc = new Document({
      sections: [{
        children: [
          // Logo header
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'Fundadores', bold: true, size: 30, color: '0B7A6E', font: 'Calibri' })]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
            children: [new TextRun({ text: 'Kinesiologia', size: 22, color: 'C89B32', font: 'Calibri' })]
          }),
          // Greeting
          new Paragraph({
            spacing: { after: 200 },
            children: [new TextRun({ text: 'Estimados/as,', size: 22, font: 'Calibri' })]
          }),
          // Formal paragraph
          new Paragraph({
            spacing: { after: 300 },
            children: [new TextRun({
              text: `Nos dirigimos a ustedes para informar formalmente que ${p.nombre || '...'}, ` +
                `Rut: ${p.rut || '...'} el dia ${fechaInicio} ha comenzado un nuevo ciclo de sesiones ` +
                `de Kinesioterapia por diagnostico de ${diagnostico} en nuestro Centro de Rehabilitacion ` +
                `ubicado en Av. Fundadores 564, Valparaiso. Detalle a continuacion:`,
              size: 22,
              font: 'Calibri'
            })]
          }),
          // Session table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [headerRow, ...dataRows]
          }),
          // Closing
          new Paragraph({ spacing: { before: 400 } }),
          new Paragraph({
            children: [new TextRun({
              text: 'Quedamos a disposicion para cualquier informacion adicional que puedan necesitar. Atentamente,',
              size: 22,
              font: 'Calibri'
            })]
          }),
          // Signature
          ...signatureLines
        ]
      }]
    });

    const blob = await Packer.toBlob(doc);
    const nombre = (p.nombre || 'Paciente').replace(/\s+/g, '_');
    saveAs(blob, `Carta_ISAPRE_${nombre}_${this.todayStr()}.docx`);
  }

  private generarFechasSesiones(data: InformeData, total: number): { fecha: string; hora: string; detalle: string }[] {
    const result: { fecha: string; hora: string; detalle: string }[] = [];
    const sesiones = (data.sesiones || []).sort((a: any, b: any) =>
      (a.numero_sesion || 0) - (b.numero_sesion || 0)
    );

    // Determine start date
    let currentDate: Date;
    if (sesiones.length > 0 && sesiones[0].fecha) {
      currentDate = new Date(sesiones[0].fecha + 'T12:00:00');
    } else {
      currentDate = new Date();
    }

    // Ensure start date is a weekday
    currentDate = this.nextWeekday(currentDate);

    // Hours pool for realistic variation
    const horas = ['19:30', '19:00', '19:45', '19:30', '19:00', '19:00', '19:00', '19:00', '19:00', '19:30'];

    for (let i = 0; i < total; i++) {
      let fecha: string;

      if (i < sesiones.length && sesiones[i].fecha) {
        // Use real session date but ensure weekday
        const d = new Date(sesiones[i].fecha + 'T12:00:00');
        const weekdayD = this.nextWeekday(d);
        fecha = this.formatDateDDMMYY(weekdayD);
        currentDate = new Date(weekdayD);
      } else if (i === 0) {
        fecha = this.formatDateDDMMYY(currentDate);
      } else {
        // Generate next date: alternate 3-4 day gaps, then ensure weekday
        const advance = (i % 2 === 0) ? 4 : 3;
        currentDate.setDate(currentDate.getDate() + advance);
        currentDate = this.nextWeekday(currentDate);
        fecha = this.formatDateDDMMYY(currentDate);
      }

      const hora = horas[i % horas.length];

      let detalle: string;
      if (i === 0 || i === total - 1) {
        detalle = 'Evaluacion Kinesiologica integral + Atencion kinesica integral';
      } else {
        detalle = 'Atencion kinesica integral';
      }

      result.push({ fecha, hora, detalle });
    }

    return result;
  }

  /** Move date forward to next weekday (Mon-Fri) if it falls on Sat or Sun */
  private nextWeekday(d: Date): Date {
    const result = new Date(d);
    const day = result.getDay();
    if (day === 0) { // Sunday -> Monday
      result.setDate(result.getDate() + 1);
    } else if (day === 6) { // Saturday -> Monday
      result.setDate(result.getDate() + 2);
    }
    return result;
  }

  private formatDateDDMMYY(d: Date): string {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    return `${dd}/${mm}/${yy}`;
  }

  private todayDDMMYY(): string {
    return this.formatDateDDMMYY(new Date());
  }

  // =============================================
  // PAGE 1: INFORME KINESICO
  // =============================================

  private drawHeader(doc: jsPDF, pw: number, m: number): number {
    // Teal gradient bar at top
    doc.setFillColor(...this.TEAL);
    doc.rect(0, 0, pw, 6, 'F');

    // Thin accent line below
    doc.setFillColor(...this.TEAL_LIGHT);
    doc.rect(0, 6, pw, 1.5, 'F');

    // Logo area
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...this.TEAL);
    doc.text('KINESIOLOGIA FUNDADORES', pw / 2, 18, { align: 'center' });

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...this.LIGHT_GRAY);
    doc.text('Kinesiologia y Rehabilitacion', pw / 2, 23, { align: 'center' });

    return 28;
  }

  private drawTitle(doc: jsPDF, pw: number, y: number): number {
    // Main title - styled like the reference image
    doc.setFontSize(22);
    doc.setFont('times', 'bolditalic');
    doc.setTextColor(...this.DARK);
    doc.text('Informe Kinesico', pw / 2, y + 10, { align: 'center' });

    // Underline decoration
    const titleW = 70;
    doc.setDrawColor(...this.TEAL);
    doc.setLineWidth(0.5);
    doc.line(pw / 2 - titleW / 2, y + 13, pw / 2 + titleW / 2, y + 13);

    return y + 20;
  }

  private drawPatientTable(doc: jsPDF, data: InformeData, y: number, m: number, cw: number): number {
    const p = data.paciente;
    const labelW = 42;
    const rowH = 8;
    const tableX = m;
    const borderColor = this.TABLE_BORDER;

    const rows = [
      ['Nombre', p.nombre || '-'],
      ['Diagnostico', p.diagnostico || '-'],
      ['Fecha de Atencion', this.todayFormatted()],
    ];

    // Add RUT if available
    if (p.rut) {
      rows.splice(1, 0, ['RUT', p.rut]);
    }

    for (let i = 0; i < rows.length; i++) {
      const ry = y + i * rowH;

      // Label cell (bold, with light bg)
      doc.setFillColor(240, 240, 240);
      doc.setDrawColor(...borderColor);
      doc.setLineWidth(0.3);
      doc.rect(tableX, ry, labelW, rowH, 'FD');

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...this.DARK);
      doc.text(rows[i][0], tableX + 3, ry + 5.5);

      // Value cell
      doc.setFillColor(...this.WHITE);
      doc.rect(tableX + labelW, ry, cw - labelW, rowH, 'FD');

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      doc.text(rows[i][1], tableX + labelW + 4, ry + 5.5);
    }

    return y + rows.length * rowH + 6;
  }

  private drawClinicalSection(doc: jsPDF, title: string, content: string, y: number, m: number, cw: number, pw: number): number {
    y = this.checkPage(doc, y, 25, pw, m);

    // Section header bar (teal, centered text - like reference image)
    const headerH = 7;
    doc.setFillColor(...this.TEAL);
    doc.rect(m, y, cw, headerH, 'F');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...this.WHITE);
    doc.text(title, m + cw / 2, y + 5, { align: 'center' });

    y += headerH;

    // Content area with border
    doc.setDrawColor(...this.TABLE_BORDER);
    doc.setLineWidth(0.3);

    if (content.trim()) {
      // Split text into lines that fit the content width
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50, 50, 50);

      const textLines = doc.splitTextToSize(content, cw - 8);
      const textH = Math.max(textLines.length * 4.5 + 6, 12);

      // Check if we need a page break for the content
      if (y + textH > doc.internal.pageSize.getHeight() - 25) {
        // Draw partial border on current page
        doc.rect(m, y, cw, 2, 'D');
        doc.addPage();
        y = this.drawContinuationHeader(doc, pw, m);
      }

      doc.setFillColor(...this.WHITE);
      doc.rect(m, y, cw, textH, 'FD');

      doc.text(textLines, m + 4, y + 5);
      y += textH;
    } else {
      // Empty content - small box with placeholder
      const emptyH = 10;
      doc.setFillColor(...this.WHITE);
      doc.rect(m, y, cw, emptyH, 'FD');

      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(...this.LIGHT_GRAY);
      doc.text('(Sin informacion)', m + 4, y + 6.5);
      y += emptyH;
    }

    return y + 4;
  }

  private drawTestResultsSection(doc: jsPDF, testResults: any[], y: number, m: number, cw: number, pw: number): number {
    // Section header
    const headerH = 7;
    doc.setFillColor(...this.TEAL);
    doc.rect(m, y, cw, headerH, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...this.WHITE);
    doc.text('Resultados de Tests Aplicados', m + cw / 2, y + 5, { align: 'center' });
    y += headerH;

    // Content border
    doc.setDrawColor(...this.TABLE_BORDER);
    doc.setLineWidth(0.3);

    const startY = y;
    let contentH = 0;

    for (const tr of testResults) {
      const rowH = 7;
      if (y + rowH > doc.internal.pageSize.getHeight() - 25) {
        doc.rect(m, startY, cw, contentH, 'D');
        doc.addPage();
        y = this.drawContinuationHeader(doc, pw, m);
      }

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...this.DARK);
      doc.text(`S${tr.sesionNumero} - ${tr.testNombre}`, m + 4, y + 5);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...this.GRAY);
      const resultText = `Puntaje: ${tr.puntajeTotal} - ${tr.resultado}`;
      doc.text(resultText, m + cw - 4, y + 5, { align: 'right' });

      y += rowH;
      contentH += rowH;
    }

    doc.rect(m, startY, cw, contentH, 'D');
    return y + 4;
  }

  private drawSignature(doc: jsPDF, data: InformeData, y: number, m: number, cw: number): void {
    const centerX = m + cw / 2;
    y += 10;

    // "Atentamente" text
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...this.DARK);
    doc.text('Atentamente', m + 4, y);

    // Signature space
    y += 25;

    // Signature line
    doc.setDrawColor(...this.DARK);
    doc.setLineWidth(0.4);
    doc.line(centerX - 40, y, centerX + 40, y);

    // Name
    y += 6;
    const kine = data.kinesiologo || localStorage.getItem('nombreCompleto') || '';
    if (kine) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...this.DARK);
      doc.text(kine.toUpperCase(), centerX, y, { align: 'center' });
    }

    // Title
    y += 5;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...this.DARK);
    doc.text('KINESIOLOGO', centerX, y, { align: 'center' });

    // RUT (if stored)
    const username = localStorage.getItem('username') || '';
    if (username) {
      y += 5;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...this.GRAY);
      doc.text(username, centerX, y, { align: 'center' });
    }
  }

  // =============================================
  // PAGE 2: ANEXO
  // =============================================

  private drawAnexoHeader(doc: jsPDF, pw: number, m: number, paciente?: any): number {
    // Same header style
    doc.setFillColor(...this.TEAL);
    doc.rect(0, 0, pw, 6, 'F');
    doc.setFillColor(...this.TEAL_LIGHT);
    doc.rect(0, 6, pw, 1.5, 'F');

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...this.TEAL);
    doc.text('KINESIOLOGIA FUNDADORES', pw / 2, 16, { align: 'center' });

    doc.setFontSize(11);
    doc.setFont('times', 'bolditalic');
    doc.setTextColor(...this.DARK);
    doc.text('Detalle de Sesiones', pw / 2, 24, { align: 'center' });

    let y = 28;
    if (paciente) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...this.GRAY);
      doc.text(`Paciente: ${paciente.nombre || '-'} | Diagnostico: ${paciente.diagnostico || '-'}`, pw / 2, y + 4, { align: 'center' });
      y += 10;
    }

    return y;
  }

  private drawSessionTable(doc: jsPDF, data: InformeData, y: number, m: number, cw: number, pw: number): number {
    // Section header
    const headerH = 7;
    doc.setFillColor(...this.TEAL);
    doc.rect(m, y, cw, headerH, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...this.WHITE);
    doc.text('Historial de Sesiones', m + cw / 2, y + 5, { align: 'center' });
    y += headerH;

    // Column headers
    const cols = [14, 28, 18, 18, 22, cw - 100];
    const hdrs = ['N', 'Fecha', 'EVA', 'Sueno', 'Ejerc.', 'Observaciones'];

    doc.setFillColor(240, 240, 240);
    doc.setDrawColor(...this.TABLE_BORDER);
    doc.setLineWidth(0.3);
    doc.rect(m, y, cw, 7, 'FD');

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...this.DARK);

    let xPos = m + 2;
    hdrs.forEach((h, i) => {
      doc.text(h, xPos, y + 5);
      xPos += cols[i];
    });
    y += 7;

    // Rows
    const sesiones = data.sesiones;
    doc.setFontSize(7.5);

    for (let idx = 0; idx < sesiones.length; idx++) {
      const s = sesiones[idx];

      if (y > doc.internal.pageSize.getHeight() - 25) {
        doc.addPage();
        y = this.drawContinuationHeader(doc, pw, m);
      }

      // Alternating bg
      if (idx % 2 === 0) {
        doc.setFillColor(...this.LIGHT_BG);
      } else {
        doc.setFillColor(...this.WHITE);
      }
      doc.rect(m, y, cw, 7, 'FD');

      xPos = m + 2;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...this.DARK);
      doc.text(`S${s.numero_sesion || idx + 1}`, xPos, y + 5);
      xPos += cols[0];

      doc.setFont('helvetica', 'normal');
      doc.text(this.formatDate(s.fecha || s.fecha_creacion), xPos, y + 5);
      xPos += cols[1];

      // EVA colored
      const eva = s.eva ?? s.nivelDolor ?? '-';
      const evaNum = Number(eva);
      if (!isNaN(evaNum)) {
        doc.setTextColor(...(evaNum <= 3 ? this.GREEN : evaNum <= 6 ? this.ORANGE : this.RED));
      }
      doc.text(String(eva), xPos, y + 5);
      xPos += cols[2];
      doc.setTextColor(...this.DARK);

      const sueno = s['sue\u00f1o'] ?? s.calidadSueno ?? s.sueno ?? '-';
      doc.text(String(sueno), xPos, y + 5);
      xPos += cols[3];

      const ej = (s.ejercicios === 'Realizados' || s.ejerciciosRealizados === true) ? 'Si' : 'No';
      doc.setTextColor(...(ej === 'Si' ? this.GREEN : this.LIGHT_GRAY));
      doc.text(ej, xPos, y + 5);
      xPos += cols[4];

      doc.setTextColor(...this.DARK);
      doc.setFont('helvetica', 'normal');
      const obs = (s.observaciones || '-').substring(0, 45);
      doc.text(obs, xPos, y + 5);

      y += 7;
    }

    return y + 6;
  }

  private drawEvaChart(doc: jsPDF, sesiones: any[], y: number, m: number, cw: number): number {
    // Chart section header
    const headerH = 7;
    doc.setFillColor(...this.TEAL);
    doc.rect(m, y, cw, headerH, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...this.WHITE);
    doc.text('Evolucion del Dolor (EVA)', m + cw / 2, y + 5, { align: 'center' });
    y += headerH + 2;

    const chartX = m + 12;
    const chartW = cw - 22;
    const chartH = 35;
    const chartY = y;

    // Chart background
    doc.setFillColor(...this.LIGHT_BG);
    doc.setDrawColor(...this.TABLE_BORDER);
    doc.setLineWidth(0.3);
    doc.roundedRect(m, y - 2, cw, chartH + 14, 2, 2, 'FD');

    // Y-axis labels
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...this.GRAY);
    doc.text('10', m + 4, chartY + 3);
    doc.text('5', m + 6, chartY + chartH / 2 + 1);
    doc.text('0', m + 6, chartY + chartH + 1);

    // Grid lines
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.15);
    doc.line(chartX, chartY, chartX + chartW, chartY);
    doc.line(chartX, chartY + chartH / 2, chartX + chartW, chartY + chartH / 2);
    doc.line(chartX, chartY + chartH, chartX + chartW, chartY + chartH);

    // Points
    const pts: { x: number; y: number; v: number }[] = [];
    sesiones.forEach((s, i) => {
      const eva = s.eva ?? s.nivelDolor ?? 0;
      const px = sesiones.length === 1 ? chartX + chartW / 2 :
        chartX + (i / (sesiones.length - 1)) * chartW;
      const py = chartY + ((10 - eva) / 10) * chartH;
      pts.push({ x: px, y: py, v: eva });
    });

    // Line
    if (pts.length >= 2) {
      doc.setDrawColor(...this.RED);
      doc.setLineWidth(0.8);
      for (let i = 0; i < pts.length - 1; i++) {
        doc.line(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
      }
    }

    // Points and labels
    pts.forEach((p, i) => {
      const c = p.v <= 3 ? this.GREEN : p.v <= 6 ? this.ORANGE : this.RED;
      doc.setFillColor(...c);
      doc.circle(p.x, p.y, 1.5, 'F');

      doc.setFontSize(6);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...this.DARK);
      doc.text(String(p.v), p.x, p.y - 3, { align: 'center' });

      doc.setFontSize(5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...this.GRAY);
      doc.text(`S${sesiones[i].numero_sesion || i + 1}`, p.x, chartY + chartH + 6, { align: 'center' });
    });

    return chartY + chartH + 14;
  }

  // =============================================
  // HELPERS
  // =============================================

  private drawContinuationHeader(doc: jsPDF, pw: number, m: number): number {
    doc.setFillColor(...this.TEAL);
    doc.rect(0, 0, pw, 6, 'F');
    doc.setFillColor(...this.TEAL_LIGHT);
    doc.rect(0, 6, pw, 1.5, 'F');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...this.TEAL);
    doc.text('KINESIOLOGIA FUNDADORES - Informe Kinesico (cont.)', pw / 2, 14, { align: 'center' });
    return 20;
  }

  private checkPage(doc: jsPDF, y: number, need: number, pw: number, m: number): number {
    if (y + need > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      return this.drawContinuationHeader(doc, pw, m);
    }
    return y;
  }

  private drawFooter(doc: jsPDF, pw: number, ph: number, page: number, total: number): void {
    // Thin teal line
    doc.setDrawColor(...this.TEAL);
    doc.setLineWidth(0.3);
    doc.line(20, ph - 12, pw - 20, ph - 12);

    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...this.LIGHT_GRAY);
    doc.text('Documento generado por Kinesiologia Fundadores', 20, ph - 8);
    doc.text(`Pagina ${page} de ${total}`, pw - 20, ph - 8, { align: 'right' });
  }

  private todayStr(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private todayFormatted(): string {
    return new Date().toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  private formatDate(s: string | undefined | null): string {
    if (!s) return '-';
    try {
      if (s.includes('/')) return s;
      const d = new Date(s);
      if (isNaN(d.getTime())) return s;
      return d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return String(s);
    }
  }
}
