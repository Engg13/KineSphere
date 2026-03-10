import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import { FormsModule } from '@angular/forms';

import { Rutina } from '../../models/rutina.model';
import { RutinaTemplateEjercicio } from '../../models/rutina-ejercicio.model';
import { Ejercicio } from '../../models/ejercicio.model';
import { EjercicioPickerComponent } from '../ejercicio-picker/ejercicio-picker.component';

@Component({
  selector: 'app-rutina-builder',
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule],
  templateUrl: './rutina-builder.component.html',
  styleUrls: ['./rutina-builder.component.scss']
})
export class RutinaBuilderComponent {

  @Input() rutina!: Rutina;

  @Input() mostrarNombre = true;

  @Input() mostrarDescripcion = true;

  @Output() rutinaChange = new EventEmitter<Rutina>();

  @Output() ejercicioVideoPreview = new EventEmitter<string>();

  videoPreview?: string;

  constructor(
    private modalCtrl: ModalController
  ) {}

  // ========================================
  // ADD EXERCISE
  // ========================================

  async abrirSelectorEjercicios() {

    const modal = await this.modalCtrl.create({
      component: EjercicioPickerComponent
    });

    await modal.present();

    const { data } = await modal.onDidDismiss();

    if (data?.ejercicio) {
      this.agregarEjercicio(data.ejercicio);
    }

  }

  agregarEjercicio(ejercicio: Ejercicio) {

    const nuevo: RutinaTemplateEjercicio = {
      ejercicioId: ejercicio.id!,
      nombre: ejercicio.nombre,
      orden: (this.rutina.ejercicios?.length || 0) + 1,
      series: 3,
      repeticiones: 10
    };

    this.rutina.ejercicios = [
      ...(this.rutina.ejercicios || []),
      nuevo
    ];

    this.recalcularOrden();
    this.emitir();

  }

  // ========================================
  // REMOVE EXERCISE
  // ========================================

  eliminarEjercicio(index: number) {

    this.rutina.ejercicios.splice(index, 1);
    this.recalcularOrden();
    this.emitir();

  }

  // ========================================
  // DUPLICATE EXERCISE
  // ========================================

  duplicarEjercicio(index: number) {

    const original = this.rutina.ejercicios[index];

    const copia: RutinaTemplateEjercicio = { ...original };

    this.rutina.ejercicios.splice(index + 1, 0, copia);

    this.recalcularOrden();
    this.emitir();

  }

  // ========================================
  // DRAG & DROP REORDER
  // ========================================

  reordenar(event: any) {

    const ejercicios = [...this.rutina.ejercicios];

    const item = ejercicios.splice(event.detail.from, 1)[0];

    ejercicios.splice(event.detail.to, 0, item);

    ejercicios.forEach((ej, i) => {
      ej.orden = i + 1;
    });

    this.rutina.ejercicios = ejercicios;

    event.detail.complete();

    this.emitir();

  }

  // ========================================
  // FIELD CHANGES
  // ========================================

  onFieldChange() {
    this.emitir();
  }

  // ========================================
  // VIDEO PREVIEW
  // ========================================

  abrirPreview(url?: string) {

    if (!url) return;
    this.videoPreview = url;

  }

  cerrarPreview() {
    this.videoPreview = undefined;
  }

  // ========================================
  // PRIVATE
  // ========================================

  private recalcularOrden() {

    this.rutina.ejercicios.forEach((ej, i) => {
      ej.orden = i + 1;
    });

  }

  private emitir() {
    this.rutinaChange.emit({ ...this.rutina });
  }

}
