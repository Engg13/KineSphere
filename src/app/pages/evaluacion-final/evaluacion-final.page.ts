import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { NavController, AlertController, Platform } from '@ionic/angular';

@Component({
  selector: 'app-evaluacion-final',
  templateUrl: './evaluacion-final.page.html',
  styleUrls: ['./evaluacion-final.page.scss'],
  standalone: false
})
export class EvaluacionFinalPage implements OnInit {
  paciente: any = null;
  private pdfUrl: string = '';
  mostrarConfirmacion: boolean = false;
  fechaActual = new Date();
  
  evaluacionForm: FormGroup = this.fb.group({
    eva: [null, [Validators.required, Validators.min(0), Validators.max(10)]],
    movilidad: ['', Validators.required],
    actividadesDiarias: ['', Validators.required],
    fortaleza: [null, [Validators.required, Validators.min(0), Validators.max(5)]],
    sueño: [5, [Validators.min(1), Validators.max(10)]],
    observaciones: [''],
    recomendacion: ['', Validators.required]
  });

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private navCtrl: NavController,
    private alertController: AlertController,
    private platform: Platform
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['pacienteId']) {
        this.crearPacienteDemo(params['pacienteId']);
      }
    });
    
    // Inicializar con valores por defecto
    this.rellenarDemo();
  }

  // MÉTODOS PARA PDF
  descargarPDF() {
    if (!this.evaluacionForm.valid) {
      const camposFaltantes = this.obtenerCamposFaltantes();
      this.mostrarError(`Complete estos campos antes de descargar:\n${camposFaltantes}`);
      return;
    }

    const evaluacionData = this.prepararDatosPDF();
    
    // Generar contenido HTML para el PDF
    const contenidoHTML = this.generarContenidoHTML(evaluacionData);
    
    // Liberar blob URL anterior si existe
    if (this.pdfUrl) {
      URL.revokeObjectURL(this.pdfUrl);
    }

    // Crear el Blob y descargar
    const blob = new Blob([contenidoHTML], { type: 'text/html' });
    this.pdfUrl = URL.createObjectURL(blob);

    // Crear enlace de descarga
    const link = document.createElement('a');
    link.href = this.pdfUrl;
    link.download = `Evaluacion_${this.paciente.nombre.replace(/\s+/g, '_')}_${this.fechaActual.toISOString().split('T')[0]}.html`;

    // Simular clic para descargar
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Liberar blob URL después de descarga
    URL.revokeObjectURL(this.pdfUrl);
    this.pdfUrl = '';
    
    this.mostrarExito('✅ PDF descargado correctamente');
  }

  async compartirPDF() {
    if (!this.evaluacionForm.valid) {
      const camposFaltantes = this.obtenerCamposFaltantes();
      await this.mostrarError(`Complete estos campos antes de compartir:\n${camposFaltantes}`);
      return;
    }

    const evaluacionData = this.prepararDatosPDF();
    const contenidoHTML = this.generarContenidoHTML(evaluacionData);
    
    // Para dispositivos móviles
    if (this.platform.is('cordova') || this.platform.is('capacitor')) {
      await this.compartirEnMovil(contenidoHTML);
    } else {
      // Para navegadores web
      await this.compartirEnNavegador(contenidoHTML);
    }
  }

  private escapeHtml(text: string | undefined | null): string {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private prepararDatosPDF() {
    return {
      paciente: this.paciente,
      evaluacion: this.evaluacionForm.value,
      fecha: this.fechaActual.toLocaleDateString('es-CL'),
      hora: this.fechaActual.toLocaleTimeString('es-CL'),
      kinesiologo: 'Lic. KineSphere App',
      progreso: this.calcularProgreso()
    };
  }

  private generarContenidoHTML(data: any): string {
    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Evaluación Final - ${this.escapeHtml(data.paciente.nombre)}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 40px;
            line-height: 1.6;
            color: #333;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo {
            color: #2dd36f;
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
          }
          .titulo {
            color: #3880ff;
            border-bottom: 2px solid #3880ff;
            padding-bottom: 10px;
            margin-bottom: 20px;
          }
          .seccion {
            margin-bottom: 25px;
          }
          .datos-paciente {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
          }
          .datos-paciente h3 {
            margin-top: 0;
            color: #555;
          }
          .campo {
            margin-bottom: 10px;
          }
          .etiqueta {
            font-weight: bold;
            color: #666;
          }
          .valor {
            color: #333;
          }
          .resultado {
            background-color: #e8f5e9;
            padding: 15px;
            border-left: 4px solid #2dd36f;
            margin: 15px 0;
          }
          .recomendacion {
            background-color: #e3f2fd;
            padding: 15px;
            border-left: 4px solid #3880ff;
            margin: 15px 0;
          }
          .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            color: #666;
            font-size: 14px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 10px;
            text-align: left;
          }
          th {
            background-color: #f2f2f2;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">KINESPHERE</div>
          <h1 class="titulo">Evaluación Final de Kinesiología</h1>
          <p>Documento generado automáticamente - ${data.fecha} ${data.hora}</p>
        </div>

        <div class="datos-paciente">
          <h3>📋 Datos del Paciente</h3>
          <div class="campo">
            <span class="etiqueta">Nombre:</span>
            <span class="valor">${this.escapeHtml(data.paciente.nombre)}</span>
          </div>
          <div class="campo">
            <span class="etiqueta">RUT:</span>
            <span class="valor">${this.escapeHtml(data.paciente.rut)}</span>
          </div>
          <div class="campo">
            <span class="etiqueta">Diagnóstico:</span>
            <span class="valor">${this.escapeHtml(data.paciente.diagnostico)}</span>
          </div>
          <div class="campo">
            <span class="etiqueta">Fecha de ingreso:</span>
            <span class="valor">${this.escapeHtml(data.paciente.fechaIngreso)}</span>
          </div>
          <div class="campo">
            <span class="etiqueta">Contacto:</span>
            <span class="valor">${data.paciente.telefono} | ${data.paciente.email}</span>
          </div>
        </div>

        <div class="seccion">
          <h3>📊 Resultados de la Evaluación</h3>
          
          <table>
            <thead>
              <tr>
                <th>Parámetro</th>
                <th>Valor</th>
                <th>Comentarios</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Escala de dolor (EVA)</strong></td>
                <td>${data.evaluacion.eva}/10</td>
                <td>${this.interpretarEVA(data.evaluacion.eva)}</td>
              </tr>
              <tr>
                <td><strong>Movilidad articular</strong></td>
                <td>${data.evaluacion.movilidad}</td>
                <td>${this.interpretarMovilidad(data.evaluacion.movilidad)}</td>
              </tr>
              <tr>
                <td><strong>Actividades diarias</strong></td>
                <td>${data.evaluacion.actividadesDiarias}</td>
                <td>${this.interpretarActividades(data.evaluacion.actividadesDiarias)}</td>
              </tr>
              <tr>
                <td><strong>Fortaleza muscular</strong></td>
                <td>${data.evaluacion.fortaleza}/5</td>
                <td>${this.interpretarFortaleza(data.evaluacion.fortaleza)}</td>
              </tr>
              <tr>
                <td><strong>Calidad del sueño</strong></td>
                <td>${data.evaluacion.sueño}/10</td>
                <td>${this.interpretarSueño(data.evaluacion.sueño)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="seccion">
          <h3>💡 Observaciones</h3>
          <div class="resultado">
            <p>${data.evaluacion.observaciones || 'No se registraron observaciones adicionales.'}</p>
          </div>
        </div>

        <div class="seccion">
          <h3>✅ Recomendación Final</h3>
          <div class="recomendacion">
            <h4>${this.getRecomendacionTexto()}</h4>
            <p><strong>Detalles:</strong> ${this.getDetallesRecomendacion(data.evaluacion.recomendacion)}</p>
          </div>
        </div>

        <div class="footer">
          <p>Evaluación realizada por: <strong>${data.kinesiologo}</strong></p>
          <p>Completitud del formulario: <strong>${data.progreso}%</strong></p>
          <p>© ${new Date().getFullYear()} KineSphere - Sistema de gestión kinesiológica</p>
        </div>
      </body>
      </html>
    `;
  }

  private interpretarEVA(valor: number): string {
    if (valor <= 3) return 'Dolor leve';
    if (valor <= 6) return 'Dolor moderado';
    return 'Dolor intenso';
  }

  private interpretarMovilidad(valor: string): string {
    const map: any = {
      'excelente': 'Amplitud completa sin dolor',
      'buena': 'Amplitud casi completa, mínima molestia',
      'regular': 'Amplitud limitada con dolor',
      'mala': 'Amplitud severamente limitada'
    };
    return map[valor] || 'No especificado';
  }

  private interpretarActividades(valor: string): string {
    const map: any = {
      'independiente': 'Realiza todas las actividades sin ayuda',
      'con_ayuda': 'Requiere asistencia para algunas actividades',
      'dependiente': 'Requiere ayuda para la mayoría de actividades'
    };
    return map[valor] || 'No especificado';
  }

  private interpretarFortaleza(valor: number): string {
    if (valor >= 4) return 'Fuerza adecuada';
    if (valor >= 2) return 'Fuerza moderada';
    return 'Fuerza deficiente';
  }

  private interpretarSueño(valor: number): string {
    if (valor >= 8) return 'Sueño reparador';
    if (valor >= 5) return 'Sueño interrumpido';
    return 'Sueño no reparador';
  }

  getRecomendacionTexto(): string {
    const map: any = {
      'alta': '🏥 Alta del tratamiento',
      'continuar': '🔄 Continuar tratamiento actual',
      'derivar': '👨‍⚕️ Derivar a especialista',
      'revision': '📅 Revisión en 1 mes'
    };
    return map[this.evaluacionForm.get('recomendacion')?.value] || 'No especificada';
  }

  private getDetallesRecomendacion(recomendacion: string): string {
    const detalles: any = {
      'alta': 'Paciente ha alcanzado los objetivos terapéuticos. Continuar con ejercicios domiciliarios.',
      'continuar': 'Mantener frecuencia actual de sesiones. Re-evaluar en 4 semanas.',
      'derivar': 'Se sugiere evaluación por traumatología/neurología según corresponda.',
      'revision': 'Programar control para evaluar progreso y ajustar tratamiento.'
    };
    return detalles[recomendacion] || 'Seguir indicaciones del kinesiólogo tratante.';
  }

  private async compartirEnNavegador(contenidoHTML: string) {
    const blob = new Blob([contenidoHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `Evaluacion_${this.paciente.nombre.replace(/\s+/g, '_')}_${this.fechaActual.toISOString().split('T')[0]}.html`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);

    await this.mostrarExito('Archivo guardado para compartir');
  }

  private async compartirEnMovil(contenidoHTML: string) {
    // Para dispositivos móviles
    try {
      // Convertir a PDF si es posible, o compartir como texto
      const textoParaCompartir = `
        📋 Evaluación Final - ${this.paciente.nombre}
        
        Paciente: ${this.paciente.nombre}
        Fecha: ${this.fechaActual.toLocaleDateString('es-CL')}
        EVA: ${this.evaluacionForm.get('eva')?.value}/10
        Recomendación: ${this.getRecomendacionTexto()}
        
        Observaciones: ${this.evaluacionForm.get('observaciones')?.value}
        
        Documento completo disponible en la aplicación.
      `;
      
      if ((navigator as any).share) {
        await (navigator as any).share({
          title: `Evaluación ${this.paciente.nombre}`,
          text: textoParaCompartir,
        });
      } else {
        await this.mostrarExito('Copie el texto para compartir: ' + textoParaCompartir);
      }
    } catch (error) {
      console.error('Error al compartir:', error);
      await this.mostrarError('No se pudo compartir el documento');
    }
  }

  // ... (el resto de tus métodos existentes se mantienen igual)
  // MÉTODOS DE VALIDACIÓN VISUAL
  actualizarEstado() {
    // Este método se llama cada vez que cambia un campo
    console.log('Estado del formulario:', this.evaluacionForm.valid);
  }

  formularioCompleto(): boolean {
    return this.evaluacionForm.valid;
  }

  camposFaltantes(): number {
    let faltantes = 0;
    const controles = this.evaluacionForm.controls;
    
    // Solo contar campos requeridos
    if (!controles['eva'].valid) faltantes++;
    if (!controles['movilidad'].valid) faltantes++;
    if (!controles['actividadesDiarias'].valid) faltantes++;
    if (!controles['fortaleza'].valid) faltantes++;
    if (!controles['recomendacion'].valid) faltantes++;
    
    return faltantes;
  }

  calcularProgreso(): number {
    const totalCampos = 5; // Campos requeridos
    const completados = totalCampos - this.camposFaltantes();
    return Math.round((completados / totalCampos) * 100);
  }

  // MÉTODO PARA VERIFICAR ANTES DE GENERAR
  async verificarYGenerarPDF() {
  if (!this.evaluacionForm.valid) {
    const camposFaltantes = this.obtenerCamposFaltantes();
    await this.mostrarError(`Complete estos campos:\n${camposFaltantes}`);
    return;
  }
  
  // Mostrar modal de confirmación
  this.mostrarConfirmacion = true;
}

cerrarConfirmacion() {
  this.mostrarConfirmacion = false;
}

  obtenerCamposFaltantes(): string {
    const faltantes: string[] = [];
    const controles = this.evaluacionForm.controls;
    
    if (!controles['eva'].valid) faltantes.push('• Escala de dolor (EVA)');
    if (!controles['movilidad'].valid) faltantes.push('• Movilidad articular');
    if (!controles['actividadesDiarias'].valid) faltantes.push('• Actividades diarias');
    if (!controles['fortaleza'].valid) faltantes.push('• Fortaleza muscular');
    if (!controles['recomendacion'].valid) faltantes.push('• Recomendación final');
    
    return faltantes.join('\n');
  }

  // GENERAR PDF 

  async generarPDFDirecto() {
  console.log('Botón presionado - generarPDFDirecto');
  
  // Validación rápida
  if (this.camposFaltantes() > 0) {
    await this.mostrarError(`Faltan ${this.camposFaltantes()} campos requeridos`);
    return;
  }
  
  // Generar PDF
  this.descargarPDF();
}

  async generarPDFConfirmado() {
  // Cerrar el modal
  this.mostrarConfirmacion = false;
  
  // Pequeña pausa para que se cierre el modal
  await new Promise(resolve => setTimeout(resolve, 300));
  
  try {
    // Lógica de generación de PDF
    this.descargarPDF();
    
  } catch (error) {
    console.error('Error generando PDF:', error);
    await this.mostrarError('❌ Error generando el PDF');
  }
}

  // MÉTODOS AUXILIARES
  rellenarDemo() {
    this.evaluacionForm.patchValue({
      eva: 3,
      movilidad: 'buena',
      actividadesDiarias: 'independiente',
      fortaleza: 4,
      sueño: 7,
      observaciones: 'Paciente con buena evolución. Se recomienda continuar con ejercicios de fortalecimiento.',
      recomendacion: 'continuar'
    });
  }

  limpiarFormulario() {
    this.evaluacionForm.reset({
      eva: null,
      movilidad: '',
      actividadesDiarias: '',
      fortaleza: null,
      sueño: 5,
      observaciones: '',
      recomendacion: ''
    });
  }

  private crearPacienteDemo(id: string) {
    this.paciente = {
      id: id,
      nombre: 'Ana González',
      rut: '12.345.678-9',
      diagnostico: 'Lumbalgia crónica',
      fechaIngreso: '15/01/2024',
      telefono: '+56 9 1234 5678',
      email: 'ana.gonzalez@email.com'
    };
  }

  private async mostrarExito(mensaje: string) {
    const alert = await this.alertController.create({
      header: 'Éxito',
      message: mensaje,
      buttons: ['OK']
    });
    await alert.present();
  }

  private async mostrarError(mensaje: string) {
    const alert = await this.alertController.create({
      header: 'Atención',
      message: mensaje,
      buttons: ['OK']
    });
    await alert.present();
  }

  volverAtras() {
  this.navCtrl.back();
}
}