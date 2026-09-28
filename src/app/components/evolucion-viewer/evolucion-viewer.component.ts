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

  get esInicial(): boolean {
    return this.evolucion?.tipoEvolucion === 'initial';
  }

  get titulo(): string {
    if (this.evolucion?.tipoEvolucion === 'initial') return 'Evaluación inicial';
    if (this.evolucion?.tipoEvolucion === 'discharge') return 'Evaluación de alta';
    return `Sesión ${this.evolucion?.sessionNumber ?? '-'}`;
  }

  tieneTexto(valor: unknown): boolean {
    return typeof valor === 'string' && valor.trim().length > 0;
  }

  String(valor: unknown): string {
    return String(valor ?? '');
  }

  cerrar() {
    this.modalCtrl.dismiss();
  }
}
