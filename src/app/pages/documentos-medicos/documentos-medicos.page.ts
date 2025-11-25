import { Component, OnInit } from '@angular/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { NavController, AlertController } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router'; 

@Component({
  selector: 'app-documentos-medicos',
  templateUrl: './documentos-medicos.page.html',
  styleUrls: ['./documentos-medicos.page.scss'],
  standalone: false
})
export class DocumentosMedicosPage implements OnInit {
  documentos: any[] = [];
  pacienteId: number = 0;
  pacienteNombre: string = 'Paciente';

  constructor(
    private navCtrl: NavController,
    private alertController: AlertController,
    private route: ActivatedRoute 
  ) {}

  ngOnInit() {
    
    this.route.paramMap.subscribe(params => {
      // Intentar obtener de queryParams primero
      const pacienteIdParam = history.state?.pacienteId || params.get('pacienteId');
      const pacienteNombreParam = history.state?.pacienteNombre || params.get('pacienteNombre');
      
      if (pacienteIdParam) {
        this.pacienteId = Number(pacienteIdParam);
        this.pacienteNombre = pacienteNombreParam || 'Paciente';
        console.log('📄 Documentos médicos para paciente:', this.pacienteId, this.pacienteNombre);
      }
    });

    // También verificar en queryParams
    this.route.queryParams.subscribe(params => {
      if (params['pacienteId'] && !this.pacienteId) {
        this.pacienteId = Number(params['pacienteId']);
        this.pacienteNombre = params['pacienteNombre'] || 'Paciente';
        console.log('📄 Documentos desde queryParams:', this.pacienteId);
      }
    });
  }

  // Obtener datos de la navegación
  private obtenerDatosNavegacion() {
    // Intentar obtener de state (navegación con state)
    if (history.state) {
      if (history.state.pacienteId) {
        this.pacienteId = history.state.pacienteId;
        this.pacienteNombre = history.state.pacienteNombre || 'Paciente';
        return true;
      }
    }
    return false;
  }

  async tomarFoto() {
    try {
      console.log('📸 Abriendo cámara...');
      const imagen = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        promptLabelHeader: 'Tomar Documento Médico',
        promptLabelPhoto: 'Desde Galería',
        promptLabelPicture: 'Usar Cámara'
      });

      if (imagen.dataUrl) {
        console.log('✅ Foto tomada exitosamente');
        await this.guardarDocumento(imagen.dataUrl, 'foto_camara');
      }
    } catch (error) {
      console.error('❌ Error tomando foto:', error);
      this.mostrarError('No se pudo tomar la foto. Verifica los permisos de la cámara.');
    }
  }

  async abrirGaleria() {
    try {
      console.log('🖼️ Abriendo galería...');
      const imagen = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos,
        promptLabelHeader: 'Seleccionar Documento',
        promptLabelPhoto: 'Desde Galería',
        promptLabelPicture: 'Usar Cámara'
      });

      if (imagen.dataUrl) {
        console.log('✅ Imagen seleccionada de galería');
        await this.guardarDocumento(imagen.dataUrl, 'desde_galeria');
      }
    } catch (error) {
      console.error('❌ Error abriendo galería:', error);
      this.mostrarError('No se pudo acceder a la galería. Verifica los permisos.');
    }
  }

  private async guardarDocumento(dataUrl: string, tipo: string) {
    try {
      const nuevoDocumento = {
        id: Date.now(),
        imagen: dataUrl,
        fecha: new Date().toLocaleString('es-CL'),
        tipo: tipo,
        pacienteId: this.pacienteId,
        descripcion: `Documento médico - ${new Date().toLocaleDateString('es-CL')}`
      };

      this.documentos.unshift(nuevoDocumento);
      console.log('💾 Documento guardado:', nuevoDocumento);
      this.mostrarMensaje('Documento guardado exitosamente');
    } catch (error) {
      console.error('❌ Error guardando documento:', error);
      this.mostrarError('Error al guardar el documento');
    }
  }

  async eliminarDocumento(documento: any) {
    const alert = await this.alertController.create({
      header: 'Confirmar Eliminación',
      message: '¿Estás seguro de que quieres eliminar este documento médico?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => {
            this.documentos = this.documentos.filter(doc => doc.id !== documento.id);
            this.mostrarMensaje('Documento eliminado');
          }
        }
      ]
    });
    await alert.present();
  }

  async verDocumento(documento: any) {
    const alert = await this.alertController.create({
      header: 'Documento Médico',
      message: `
        <div style="text-align: center;">
          <img src="${documento.imagen}" style="max-width: 100%; border-radius: 8px;" />
          <p><strong>Fecha:</strong> ${documento.fecha}</p>
          <p><strong>Tipo:</strong> ${documento.tipo === 'foto_camara' ? 'Foto de cámara' : 'Desde galería'}</p>
        </div>
      `,
      buttons: ['Cerrar']
    });
    await alert.present();
  }

  private async mostrarMensaje(mensaje: string) {
    const alert = await this.alertController.create({
      header: 'Éxito',
      message: mensaje,
      buttons: ['OK']
    });
    await alert.present();
  }

  private async mostrarError(mensaje: string) {
    const alert = await this.alertController.create({
      header: 'Error',
      message: mensaje,
      buttons: ['OK']
    });
    await alert.present();
  }

  volverAlPaciente() {
  
  this.navCtrl.navigateBack('/paciente-detalle', {
    queryParams: { id: this.pacienteId }
    });
  }
}