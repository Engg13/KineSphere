import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController, AlertController } from '@ionic/angular';

import { Rutina } from '../../models/rutina.model';
import { RutinaTemplateEjercicio } from '../../models/rutina-ejercicio.model';
import { Ejercicio } from '../../models/ejercicio.model';

import { RutinasService } from '../../services/rutinas.service';
import { RutinasSesionesService } from '../../services/rutinas-sesiones.service';
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

  @Input() rutina: Rutina | null = null;

  @Output() sesionClinicaIniciada = new EventEmitter<void>();

  publicLink: string | null = null;

  constructor(
    private modalCtrl: ModalController,
    private alertCtrl: AlertController,
    private rutinasService: RutinasService,
    private sesionesService: RutinasSesionesService
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

    this.rutina.ejercicios = ejerciciosActualizados;

    await this.rutinasService.guardarRutinaPaciente({
      ...this.rutina,
      ejercicios: ejerciciosActualizados
    });

  }

  async reordenarEjercicios(event: any) {

    if (!this.rutina?.ejercicios || !this.rutina.id) {
      event.detail.complete();
      return;
    }

    const ejercicios = [...this.rutina.ejercicios];

    const item = ejercicios.splice(event.detail.from, 1)[0];

    ejercicios.splice(event.detail.to, 0, item);

    ejercicios.forEach((ej, index) => {
      ej.orden = index + 1;
    });

    event.detail.complete();

    this.rutina.ejercicios = ejercicios;

    await this.rutinasService.guardarRutinaPaciente({
      ...this.rutina,
      ejercicios
    });

  }

  async eliminarEjercicio(ejercicioId: string) {

    if (!this.rutina?.id) return;

    const ejercicios = this.rutina.ejercicios
      .filter(e => e.ejercicioId !== ejercicioId);

    ejercicios.forEach((ej, index) => {
      ej.orden = index + 1;
    });

    this.rutina.ejercicios = ejercicios;

    await this.rutinasService.guardarRutinaPaciente({
      ...this.rutina,
      ejercicios
    });

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

    await this.rutinasService.guardarRutinaPaciente(this.rutina);

    this.editando = false;

  }

  async duplicarEjercicio(ejercicioId: string) {

    if (!this.rutina?.id || !this.rutina.ejercicios) return;

    const index = this.rutina.ejercicios.findIndex(
      e => e.ejercicioId === ejercicioId
    );

    if (index === -1) return;

    const original = this.rutina.ejercicios[index];

    const copia = { ...original };

    const ejercicios = [...this.rutina.ejercicios];

    ejercicios.splice(index + 1, 0, copia);

    ejercicios.forEach((ej, i) => {
      ej.orden = i + 1;
    });

    this.rutina.ejercicios = ejercicios;

    await this.rutinasService.guardarRutinaPaciente({
      ...this.rutina,
      ejercicios
    });

  }

  async convertirAPlantilla() {

    if (!this.rutina) return;

    const templateRutina: Rutina = {
      ...this.rutina,
      id: undefined,
      tipo: 'template',
      pacienteId: undefined,
      activa: undefined
    };

    await this.rutinasService.guardarTemplate(templateRutina);

    alert('Plantilla creada desde esta rutina');

  }

  // ================================
  // CLINICAL SESSION
  // ================================

  async iniciarSesionClinica() {

    if (!this.rutina?.id || !this.rutina.pacienteId) return;

    await this.sesionesService.registrarSesion({
      rutinaId: this.rutina.id,
      pacienteId: this.rutina.pacienteId,
      clinicId: this.rutina.clinicId,
      tipoSesion: 'clinica',
      fecha: new Date()
    });

    this.sesionClinicaIniciada.emit();

    const alert = await this.alertCtrl.create({
      header: 'Sesion registrada',
      message: 'La sesion clinica fue registrada correctamente.',
      buttons: ['OK']
    });

    await alert.present();

  }

  // ================================
  // HOME ROUTINE — PUBLIC LINK
  // ================================

  async enviarRutinaDomiciliaria() {

    if (!this.rutina?.id) return;

    if (this.rutina.publicToken && this.rutina.publicEnabled) {
      this.publicLink = `${window.location.origin}/r/${this.rutina.publicToken}`;
      return;
    }

    const token = await this.rutinasService.habilitarAccesoPublico(
      this.rutina.id
    );

    this.rutina.publicToken = token;
    this.rutina.publicEnabled = true;

    this.publicLink = `${window.location.origin}/r/${token}`;

  }

  copiarLink() {

    if (!this.publicLink) return;

    navigator.clipboard.writeText(this.publicLink);

    alert('Link copiado al portapapeles');

  }

  // ================================
  // CLOSE ROUTINE
  // ================================

  async cerrarRutina() {

    if (!this.rutina?.id) return;

    const alert = await this.alertCtrl.create({
      header: 'Cerrar rutina',
      message: 'La rutina sera marcada como cerrada.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Cerrar',
          role: 'destructive',
          handler: async () => {
            await this.rutinasService.activarRutina(this.rutina!.id!, false);
          }
        }
      ]
    });

    await alert.present();

  }

}
