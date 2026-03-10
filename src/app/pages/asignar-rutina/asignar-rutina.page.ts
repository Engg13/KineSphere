import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RutinasService } from '../../services/rutinas.service';
import { Rutina } from '../../models/rutina.model';
import { ActivatedRoute } from '@angular/router';
import { NavController } from '@ionic/angular';

@Component({
  selector: 'app-asignar-rutina',
  templateUrl: './asignar-rutina.page.html',
  styleUrls: ['./asignar-rutina.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class AsignarRutinaPage {

  templates: Rutina[] = [];

  pacienteId: string = '';

  templateSeleccionado?: Rutina;

  constructor(
    private rutinasService: RutinasService,
    private route: ActivatedRoute,
    private navCtrl: NavController
  ) {
    this.pacienteId =
    this.route.snapshot.queryParamMap.get('pacienteId') || '';
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

    if (!this.templateSeleccionado || !this.pacienteId) return;

    await this.rutinasService.asignarTemplateAPaciente(
      this.pacienteId,
      this.templateSeleccionado
    );

    this.navCtrl.back();

  }

}
