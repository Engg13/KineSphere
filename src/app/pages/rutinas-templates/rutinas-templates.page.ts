import { Component, OnInit, OnDestroy } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { NavController } from '@ionic/angular';
import { Subscription } from 'rxjs';

import { RutinasTemplatesService } from '../../services/rutinas-templates.service';
import { RutinaTemplate } from '../../models/rutina-template.model';

@Component({
  selector: 'app-rutinas-templates',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './rutinas-templates.page.html',
  styleUrls: ['./rutinas-templates.page.scss']
})
export class RutinasTemplatesPage implements OnInit, OnDestroy {

  templates: RutinaTemplate[] = [];
  estaCargando = true;
  private sub?: Subscription;

  constructor(
    private templatesService: RutinasTemplatesService,
    private navCtrl: NavController
  ) {}

  ngOnInit() {
    this.sub = this.templatesService.getTemplates().subscribe(data => {
      this.templates = data;
      this.estaCargando = false;
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  nuevaPlantilla() {
    this.navCtrl.navigateForward('/rutina-template-editor');
  }

  editarTemplate(id: string) {
    this.navCtrl.navigateForward(`/rutina-template-editor/${id}`);
  }

  volver() {
    this.navCtrl.back();
  }

}
