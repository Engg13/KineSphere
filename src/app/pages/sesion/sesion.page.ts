import { Component, Inject } from '@angular/core';
import { NavController } from '@ionic/angular';
import { JsonServerService } from 'src/app/services/json-server.service';

@Component({
  selector: 'app-sesion',
  templateUrl: './sesion.page.html',
  styleUrls: ['./sesion.page.scss'],
  standalone: false
})
export class SesionPage {
  // Datos de la sesión
  pacienteNombre: string = 'Juan Perez';
  numeroSesion: number = 4;
  
  // Objeto principal de datos de la sesión
  sesionData = {
    nivelDolor: 0,
    calidadSueno: 0,
    ejerciciosRealizados: true,
    observaciones: ''
  };

  constructor(
    private navCtrl: NavController,
    private jsonServerService: JsonServerService
  ) {}

  // Validación del formulario
  esFormularioValido(): boolean {
    return this.sesionData.nivelDolor !== null && 
            this.sesionData.nivelDolor >= 0 &&
           this.sesionData.calidadSueno > 0;
  }

  async guardarSesion() {
    if (!this.esFormularioValido()) {
      alert('Por favor, complete la evaluación de dolor y calidad de sueño');
      return;
    }

    try {
      // Preparar datos para JSON-Server
      const datosSesion = {
        paciente_id: 1, 
        numero_sesion: this.numeroSesion,
        nivel_dolor: this.sesionData.nivelDolor,
        calidad_sueno: this.sesionData.calidadSueno,
        ejercicios_realizados: this.sesionData.ejerciciosRealizados,
        observaciones: this.sesionData.observaciones,
        fecha: new Date().toISOString()
      };

      //  GUARDAR EN JSON-SERVER
      const respuesta = await this.jsonServerService.createSesion(datosSesion).toPromise();

      console.log('✅ Sesión guardada en JSON-Server:', respuesta);
      
      // Mostrar resumen
      const mensaje = `
        ✅ Sesión guardada exitosamente en JSON-Server
        
        Paciente: ${this.pacienteNombre}
        Sesión: ${this.numeroSesion}
        
        📊 Evaluación:
        • Dolor EVA: ${this.sesionData.nivelDolor}/10 ${this.sesionData.nivelDolor === 0 ? ' (Sin dolor)' : ''}
        • Calidad sueño: ${this.sesionData.calidadSueno}/5
        • Ejercicios: ${this.sesionData.ejerciciosRealizados ? '✅ Realizados' : '❌ No realizados'}
        ${this.sesionData.observaciones ? `• Observaciones: ${this.sesionData.observaciones}` : ''}
      `;

        alert(mensaje.trim());

    } catch (error) {
      console.error('❌ Error al guardar sesión:', error);
      alert('❌ Error al guardar la sesión. Verifica que json-server esté corriendo en http://localhost:3000');
    }
  }

  volverAPaciente() {
    this.navCtrl.navigateBack('/paciente-detalle');
  }

  volverAlDashboard() {
    this.navCtrl.navigateRoot('/dashboard');
  }
}