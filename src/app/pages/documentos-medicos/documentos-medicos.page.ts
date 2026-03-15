import { Component, OnInit, inject } from '@angular/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { NavController, AlertController, IonicModule } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { DocumentosService } from '../../services/documentos.service';
import { ClinicContextService } from '../../core/tenancy/clinic-context.service';

@Component({
    selector: 'app-documentos-medicos',
    templateUrl: './documentos-medicos.page.html',
    styleUrls: ['./documentos-medicos.page.scss'],
    standalone: true,
    imports: [IonicModule]
})
export class DocumentosMedicosPage implements OnInit {

  private clinicContext = inject(ClinicContextService);
  
  documentos: any[] = [];
  patientId: string = "";
  pacienteNombre: string = 'Paciente';

  clinicId: string = '';
  professionalId: string = '';

  

  constructor(
    private navCtrl: NavController,
    private alertController: AlertController,
    private route: ActivatedRoute,
    private documentosService: DocumentosService
  ) {}

  async ngOnInit() {

    this.clinicId = this.clinicContext.clinicId;
    this.professionalId = this.clinicContext.uid;

    this.route.queryParams.subscribe(params => {
      if (params['patientId']) {
        this.patientId = String(params['patientId']);
        this.pacienteNombre = params['pacienteNombre'] || 'Paciente';
        this.cargarDocumentos();
      }
    });

  }

  private cargarDocumentos() {
    if (!this.patientId) {
      this.documentos = [];
      return;
    }

    this.documentosService.getDocumentosByPaciente(this.patientId).subscribe({
      next: documentos => {
        this.documentos = documentos || [];
      },
      error: error => {
        console.error('Error cargando documentos desde Firestore:', error);
        this.documentos = [];
      }
    });
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

      await this.documentosService.addDocumento({
        patientId: this.patientId,
        nombre: `Documento médico - ${new Date().toLocaleDateString('es-CL')}`,
        url: dataUrl,
        tipo,
        professionalId: this.professionalId,
        createdAt: new Date()
      });

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
            this.documentosService.deleteDocumento(documento.id)
              .then(() => this.mostrarMensaje('Documento eliminado'))
              .catch(error => {
                console.error('Error eliminando documento en Firestore:', error);
                this.mostrarError('No se pudo eliminar el documento');
              });
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
    this.navCtrl.navigateRoot('/paciente-detalle', {
      queryParams: { patientId: this.patientId }
    });
  }
}
