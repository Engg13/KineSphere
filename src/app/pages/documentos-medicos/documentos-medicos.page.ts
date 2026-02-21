import { Component, OnInit } from '@angular/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { NavController, AlertController, IonicModule } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';

@Component({
    selector: 'app-documentos-medicos',
    templateUrl: './documentos-medicos.page.html',
    styleUrls: ['./documentos-medicos.page.scss'],
    standalone: true,
    imports: [IonicModule]
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
    this.route.queryParams.subscribe(params => {
      if (params['pacienteId']) {
        this.pacienteId = Number(params['pacienteId']);
        this.pacienteNombre = params['pacienteNombre'] || 'Paciente';
        this.cargarDocumentos();
      }
    });
  }

  private cargarDocumentos() {
    try {
      const stored = localStorage.getItem(`documentos_${this.pacienteId}`);
      this.documentos = stored ? JSON.parse(stored) : [];
    } catch {
      this.documentos = [];
    }
  }

  private persistirDocumentos() {
    try {
      localStorage.setItem(`documentos_${this.pacienteId}`, JSON.stringify(this.documentos));
    } catch (error) {
      console.error('Error persistiendo documentos:', error);
    }
  }

  async tomarFoto() {
    try {
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
        await this.guardarDocumento(imagen.dataUrl, 'foto_camara');
      }
    } catch (error) {
      console.error('Error tomando foto:', error);
      this.mostrarError('No se pudo tomar la foto. Verifica los permisos de la cámara.');
    }
  }

  async abrirGaleria() {
    try {
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
        await this.guardarDocumento(imagen.dataUrl, 'desde_galeria');
      }
    } catch (error) {
      console.error('Error abriendo galería:', error);
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
      this.persistirDocumentos();
      this.mostrarMensaje('Documento guardado exitosamente');
    } catch (error) {
      console.error('Error guardando documento:', error);
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
            this.persistirDocumentos();
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
    if (this.pacienteId) {
      localStorage.setItem('ver_paciente_id', String(this.pacienteId));
    }
    this.navCtrl.navigateBack('/paciente-detalle');
  }
}
