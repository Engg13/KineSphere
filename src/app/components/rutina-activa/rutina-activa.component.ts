import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';

import { RutinaPaciente } from '../../models/rutina-paciente.model';
import { RutinaTemplateEjercicio } from '../../models/rutina-ejercicio.model';
import { Ejercicio } from '../../models/ejercicio.model';

import { RutinasPacienteService } from '../../services/rutinas-paciente.service';
import { EjercicioPickerComponent } from '../ejercicio-picker/ejercicio-picker.component';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-rutina-activa',
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule],
  templateUrl: './rutina-activa.component.html',
  styleUrls: ['./rutina-activa.component.scss']
})
export class RutinaActivaComponent {

  @Input() rutina: RutinaPaciente | null = null;

  constructor(
    private modalCtrl: ModalController,
    private rutinasPacienteService: RutinasPacienteService
  ) {}

  // ================================
  // AGREGAR EJERCICIO
  // ================================

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

  // ================================
  // GUARDAR EJERCICIO EN RUTINA
  // ================================

  async agregarEjercicio(ejercicio: Ejercicio) {

    if (!this.rutina?.id) return;

    const nuevo: RutinaTemplateEjercicio = {
      ejercicioId: ejercicio.id!,
      nombre: ejercicio.nombre,
      orden: (this.rutina.ejercicios?.length || 0) + 1,
      series: 3,
      repeticiones: 10
    };

    const ejerciciosActualizados = [
      ...(this.rutina.ejercicios || []),
      nuevo
    ];

    await this.rutinasPacienteService.actualizarRutina(
      this.rutina.id,
      {
        ejercicios: ejerciciosActualizados
      }
    );

  }

  async reordenarEjercicios(event: any) {

  if (!this.rutina?.ejercicios || !this.rutina.id) {
    event.detail.complete();
    return;
  }

  const ejercicios = [...this.rutina.ejercicios];

  const item = ejercicios.splice(event.detail.from, 1)[0];

  ejercicios.splice(event.detail.to, 0, item);

  // recalcular orden
  ejercicios.forEach((ej, index) => {
    ej.orden = index + 1;
  });

  event.detail.complete();

  await this.rutinasPacienteService.actualizarRutina(
    this.rutina.id,
    { ejercicios }
  );

}

  async eliminarEjercicio(ejercicioId: string) {

    if (!this.rutina?.id) return;

    const ejercicios = this.rutina.ejercicios
      .filter(e => e.ejercicioId !== ejercicioId);

    ejercicios.forEach((ej, index) => {
      ej.orden = index + 1;
    });

    await this.rutinasPacienteService.actualizarRutina(
      this.rutina.id,
      { ejercicios }
    );

  }

  editando = false;

  activarEdicion() {
    this.editando = true;
  }

  cancelarEdicion() {
    this.editando = false;
  }

  async guardarCambios() {

    if (!this.rutina?.id) return;

    await this.rutinasPacienteService.actualizarRutina(
      this.rutina.id,
      {
        nombre: this.rutina.nombre,
        ejercicios: this.rutina.ejercicios
      }
    );

    this.editando = false;

  }

}