import { Component, OnInit, OnDestroy } from '@angular/core';
import { IonicModule, NavController, AlertController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

import { RutinasService } from '../../services/rutinas.service';
import { Rutina } from '../../models/rutina.model';

@Component({
  selector: 'app-rutinas-templates',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './rutinas-templates.page.html',
  styleUrls: ['./rutinas-templates.page.scss']
})
export class RutinasTemplatesPage implements OnInit, OnDestroy {

  templates: Rutina[] = [];
  estaCargando = true;
  private sub?: Subscription;

  constructor(
    private rutinasService: RutinasService,
    private navCtrl: NavController,
    private alertCtrl: AlertController
  ) {}

  ngOnInit() {

    this.sub = this.rutinasService
      .getTemplates()
      .subscribe(data => {

        this.templates = data;
        this.estaCargando = false;

      });

  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  nuevaPlantilla() {
    this.navCtrl.navigateRoot('/rutina-editor', {
      queryParams: { tipo: 'template' }
    });
  }

  editarTemplate(id: string) {
    this.navCtrl.navigateRoot('/rutina-editor', {
      queryParams: { tipo: 'template', id }
    });
  }

  async eliminarTemplate(id: string) {

    const alert = await this.alertCtrl.create({
      header: 'Eliminar plantilla',
      message: 'Esta accion no se puede deshacer.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => {
            await this.rutinasService.eliminarTemplate(id);
          }
        }
      ]
    });

    await alert.present();

  }

  volver() {
    this.navCtrl.navigateRoot('/dashboard');
  }

}
