import { Component, Input } from '@angular/core';
import { IonicModule, ModalController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { EvolucionDocument } from '../../services/evoluciones.service';

@Component({
  selector: 'app-evolucion-viewer',
  standalone: true,
  imports: [IonicModule, CommonModule],
  templateUrl: './evolucion-viewer.component.html',
  styleUrls: ['./evolucion-viewer.component.scss']
})
export class EvolucionViewerComponent {

  @Input() evolucion!: EvolucionDocument;

  constructor(private modalCtrl: ModalController) {}

  cerrar() {
    this.modalCtrl.dismiss();
  }

}