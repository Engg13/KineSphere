import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RutinasService } from '../../services/rutinas.service';
import { Rutina } from '../../models/rutina.model';
import { ActivatedRoute } from '@angular/router';
import { NavController } from '@ionic/angular';
import { AlertController } from '@ionic/angular';

@Component({
  selector: 'app-asignar-rutina',
  templateUrl: './asignar-rutina.page.html',
  styleUrls: ['./asignar-rutina.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class AsignarRutinaPage {

  templates: Rutina[] = [];
  patientId: string = '';
  templateSeleccionado?: Rutina;
  tipoSeleccionado: 'clinica' | 'domiciliaria' | null = null;

  constructor(
    private rutinasService: RutinasService,
    private route: ActivatedRoute,
    private navCtrl: NavController,
    private alertCtrl: AlertController
  ) {
    this.patientId =
    this.route.snapshot.queryParamMap.get('patientId') || '';
    this.cargarTemplates();
  }

  cargarTemplates() {

    this.rutinasService.getTemplates().subscribe(data => {
      this.templates = data;
    });

  }

  seleccionarTemplate(template: Rutina) {
    this.templateSeleccionado = template;
  }

  async asignar() {

    if (!this.templateSeleccionado || !this.patientId || !this.tipoSeleccionado) return;

    await this.rutinasService.asignarTemplateAPaciente(
      this.patientId,
      this.templateSeleccionado,
      this.tipoSeleccionado
    );

    this.volver();

  }

    volver() {

      this.navCtrl.navigateRoot('/paciente-detalle', {
        queryParams: {
          patientId: this.patientId,
          tab: 'rutinas'
        }
      });

    }

  seleccionarTipo(tipo: 'clinica' | 'domiciliaria') {
    this.tipoSeleccionado = tipo;
  }

}
