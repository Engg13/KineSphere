import { Component, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { NavController } from '@ionic/angular';

import { RutinasTemplatesService } from '../../services/rutinas-templates.service';
import { RutinaTemplate } from '../../models/rutina-template.model';

@Component({
  selector: 'app-rutinas-templates',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './rutinas-templates.page.html'
})
export class RutinasTemplatesPage implements OnInit {

  templates: RutinaTemplate[] = [];

  constructor(
    private templatesService: RutinasTemplatesService,
    private navCtrl: NavController
  ) {}

  ngOnInit() {
    this.templatesService.getTemplates().subscribe(data => {
      this.templates = data;
    });
  }

  nuevaPlantilla() {
    this.navCtrl.navigateRoot('/rutina-template-editor');
  }

  editarTemplate(id: string) {
    this.navCtrl.navigateRoot(`/rutina-template-editor/${id}`);
  }

}