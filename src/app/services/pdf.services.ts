import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class PdfService {

  constructor(private platform: Platform) {}

  // GENERAR PDF BÁSICO (simulación para demo)
  async generarEvaluacionPDF(data: any): Promise<string> {
    // Para DEMO, generamos un HTML que simula un PDF
    const contenidoHTML = this.generarHTMLParaPDF(data);
    
    if (this.platform.is('hybrid')) {
      // En dispositivo: usar Filesystem
      return await this.generarPDFEnDispositivo(contenidoHTML, data);
    } else {
      // En web: generar blob URL
      return this.generarPDFEnWeb(contenidoHTML, data);
    }
  }

  private generarHTMLParaPDF(data: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Evaluación Final - ${data.paciente.nombre}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
          .title { color: #2dd36f; font-size: 24px; margin: 0; }
          .subtitle { color: #666; font-size: 14px; }
          .section { margin: 20px 0; }
          .section-title { background: #f5f5f5; padding: 10px; font-weight: bold; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
          .info-item { margin: 5px 0; }
          .score { font-weight: bold; color: #2dd36f; }
          .signature { margin-top: 50px; text-align: center; }
          .footer { margin-top: 30px; font-size: 12px; color: #999; text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="title">KINESPHEERE</h1>
          <p class="subtitle">Centro de Kinesiología y Rehabilitación</p>
          <h2>EVALUACIÓN FINAL DE PACIENTE</h2>
        </div>

        <div class="section">
          <div class="section-title">DATOS DEL PACIENTE</div>
          <div class="info-grid">
            <div class="info-item"><strong>Nombre:</strong> ${data.paciente.nombre}</div>
            <div class="info-item"><strong>RUT:</strong> ${data.paciente.rut || 'No registrado'}</div>
            <div class="info-item"><strong>Diagnóstico:</strong> ${data.paciente.diagnostico}</div>
            <div class="info-item"><strong>Fecha Ingreso:</strong> ${data.paciente.fechaIngreso || 'No registrada'}</div>
            <div class="info-item"><strong>Fecha Evaluación:</strong> ${data.fecha}</div>
            <div class="info-item"><strong>Kinesiólogo:</strong> ${data.kinesiologo}</div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">RESULTADOS DE LA EVALUACIÓN</div>
          <div class="info-grid">
            <div class="info-item"><strong>Escala de Dolor (EVA):</strong> <span class="score">${data.evaluacion.eva}/10</span></div>
            <div class="info-item"><strong>Movilidad Articular:</strong> ${this.formatearMovilidad(data.evaluacion.movilidad)}</div>
            <div class="info-item"><strong>Actividades Diarias:</strong> ${data.evaluacion.actividadesDiarias}</div>
            <div class="info-item"><strong>Fortaleza Muscular:</strong> <span class="score">${data.evaluacion.fortaleza}/5</span></div>
            <div class="info-item"><strong>Calidad de Sueño:</strong> <span class="score">${data.evaluacion.sueño}/10</span></div>
            <div class="info-item"><strong>Recomendación:</strong> ${this.formatearRecomendacion(data.evaluacion.recomendacion)}</div>
          </div>
        </div>

        ${data.evaluacion.observaciones ? `
        <div class="section">
          <div class="section-title">OBSERVACIONES</div>
          <p>${data.evaluacion.observaciones}</p>
        </div>
        ` : ''}

        <div class="section">
          <div class="section-title">CONCLUSIÓN</div>
          <p>El paciente ${data.paciente.nombre} ha ${this.generarConclusion(data.evaluacion)} durante el tratamiento.</p>
          <p>Se recomienda ${data.evaluacion.recomendacion === 'alta' ? 'dar de alta' : data.evaluacion.recomendacion}.</p>
        </div>

        <div class="signature">
          <p>_________________________</p>
          <p><strong>Firma del Kinesiólogo</strong></p>
          <p>${data.kinesiologo}</p>
          <p>Fecha: ${data.fecha}</p>
        </div>

        <div class="footer">
          <p>Documento generado automáticamente por KineSphere App</p>
          <p>ID del documento: EVAL_${Date.now()}</p>
        </div>
      </body>
      </html>
    `;
  }

  private formatearMovilidad(valor: string): string {
    const map: any = {
      'excelente': 'Excelente (100% de movilidad)',
      'buena': 'Buena (75-99% de movilidad)',
      'regular': 'Regular (50-74% de movilidad)',
      'limitada': 'Limitada (25-49% de movilidad)',
      'muy-limitada': 'Muy Limitada (0-24% de movilidad)'
    };
    return map[valor] || valor;
  }

  private formatearRecomendacion(valor: string): string {
    const map: any = {
      'alta': 'Alta del tratamiento',
      'continuar': 'Continuar tratamiento',
      'derivar': 'Derivar a especialista',
      'revision': 'Revisión en 1 mes'
    };
    return map[valor] || valor;
  }

  private generarConclusion(evaluacion: any): string {
    if (evaluacion.eva <= 3 && evaluacion.fortaleza >= 4) {
      return 'mostrado una excelente evolución';
    } else if (evaluacion.eva <= 5 && evaluacion.fortaleza >= 3) {
      return 'tenido una buena evolución';
    } else {
      return 'tenido una evolución regular';
    }
  }

  private generarPDFEnWeb(html: string, data: any): string {
    // Para DEMO: crear un blob con el HTML
    const blob = new Blob([html], { type: 'text/html' });
    return URL.createObjectURL(blob);
  }

  private async generarPDFEnDispositivo(html: string, data: any): Promise<string> {
    // Para DEMO en dispositivo: simular generación
    return 'https://ejemplo.com/pdf-simulado.pdf';
  }

  async descargarPDF(pdfUrl: string, nombreArchivo: string): Promise<void> {
    if (this.platform.is('hybrid')) {
      // En dispositivo: usar Filesystem
      await this.descargarEnDispositivo(pdfUrl, nombreArchivo);
    } else {
      // En web: descarga normal
      this.descargarEnWeb(pdfUrl, nombreArchivo);
    }
  }

  private descargarEnWeb(pdfUrl: string, nombreArchivo: string): void {
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = nombreArchivo;
    link.click();
  }

  private async descargarEnDispositivo(pdfUrl: string, nombreArchivo: string): Promise<void> {
    // Simulación para demo
    console.log('Descargando PDF en dispositivo:', nombreArchivo);
  }
}