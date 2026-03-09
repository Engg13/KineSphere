import { Component } from '@angular/core';
import { RutinasTemplatesService } from '../../services/rutinas-templates.service';
import { RutinasPacienteService } from '../../services/rutinas-paciente.service';
import { RutinaTemplate } from '../../models/rutina-template.model';
import { ActivatedRoute } from '@angular/router';
import { NavController } from '@ionic/angular';

@Component({
  selector: 'app-asignar-rutina',
  templateUrl: './asignar-rutina.page.html'
})
export class AsignarRutinaPage {

  templates: RutinaTemplate[] = [];

  pacienteId: string = '';

  templateSeleccionado?: RutinaTemplate;

  constructor(
    private templatesService: RutinasTemplatesService,
    private rutinasPacienteService: RutinasPacienteService,
    private route: ActivatedRoute,
    private navCtrl: NavController
  ) {
    this.cargarTemplates();
  }

  cargarTemplates() {

    this.templatesService.getTemplates().subscribe(data => {
      this.templates = data;
    });

      }

  seleccionarTemplate(template: RutinaTemplate) {
    this.templateSeleccionado = template;
  }

  async asignar() {

    if (!this.templateSeleccionado || !this.pacienteId) return;

    await this.rutinasPacienteService.asignarTemplateAPaciente(
      this.pacienteId,
      this.templateSeleccionado
    );

    this.navCtrl.back();

  }

}