import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, NavController } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { first } from 'rxjs/operators';

import { Rutina } from '../../models/rutina.model';
import { RutinasService } from '../../services/rutinas.service';
import { RutinaBuilderComponent } from '../../components/rutina-builder/rutina-builder.component';

@Component({
  selector: 'app-rutina-editor',
  standalone: true,
  imports: [CommonModule, IonicModule, RutinaBuilderComponent],
  templateUrl: './rutina-editor.page.html',
  styleUrls: ['./rutina-editor.page.scss']
})
export class RutinaEditorPage {

  rutina!: Rutina;
  tipo: 'template' | 'paciente' = 'template';
  editandoId: string | null = null;
  patientId: string = '';
  cargando = true;
  guardando = false;

  get titulo(): string {

    if (this.editandoId) {
      return this.tipo === 'template'
        ? 'Editar plantilla'
        : 'Editar rutina';
    }

    return this.tipo === 'template'
      ? 'Nueva plantilla'
      : 'Nueva rutina';

  }

  get botonGuardar(): string {

    if (this.editandoId) {
      return this.tipo === 'template'
        ? 'Actualizar plantilla'
        : 'Actualizar rutina';
    }

    return this.tipo === 'template'
      ? 'Guardar plantilla'
      : 'Guardar rutina';

  }

  constructor(
    private rutinasService: RutinasService,
    private navCtrl: NavController,
    private route: ActivatedRoute
  ) {
    this.inicializar();
  }

  private inicializar() {

    const params = this.route.snapshot.queryParamMap;

    this.tipo = (params.get('tipo') as 'template' | 'paciente') || 'template';
    this.editandoId = params.get('id') || null;
    this.patientId = params.get('patientId') || '';

    if (this.editandoId) {
      this.cargarRutinaExistente();
    } else {
      this.crearRutinaNueva();
      this.cargando = false;
    }

  }

  private crearRutinaNueva() {

    this.rutina = {
      nombre: '',
      descripcion: '',
      ejercicios: [],
      tipo: this.tipo,
      clinicId: '',
      createdBy: '',
      activa: this.tipo === 'paciente' ? true : undefined,
      patientId: this.tipo === 'paciente' ? this.patientId : undefined
    };

  }

  private cargarRutinaExistente() {

    if (this.tipo === 'template') {

      this.rutinasService.getTemplates()
        .pipe(first())
        .subscribe(templates => {

          const found = templates.find(t => t.id === this.editandoId);

          if (found) {
            this.rutina = { ...found };
          } else {
            this.crearRutinaNueva();
          }

          this.cargando = false;

        });

    } else {

      this.rutinasService.getRutinaById(this.editandoId!)
        .pipe(first())
        .subscribe(rutina => {

          if (rutina) {
            this.rutina = { ...rutina };
          } else {
            this.crearRutinaNueva();
          }

          this.cargando = false;

        });

    }

  }

  onRutinaChange(rutina: Rutina) {
    this.rutina = rutina;
  }

  async guardar() {

    if (!this.rutina.nombre?.trim()) return;
    if (this.guardando) return;

    this.guardando = true;

    try {

      await this.rutinasService.guardar(this.rutina);
      this.navegarDespuesDeGuardar();

    } catch (err) {
      console.error('Error guardando rutina:', err);
    } finally {
      this.guardando = false;
    }

  }

  volver() {

    if (this.tipo === 'paciente' && this.patientId) {
      this.navCtrl.navigateRoot('/paciente-detalle', {
        queryParams: {
          patientId: this.patientId,
          tab: 'rutinas'
        }
      });
    } else {
      this.navCtrl.back();
    }

  }

  private navegarDespuesDeGuardar() {

    if (this.tipo === 'paciente' && this.patientId) {
      this.navCtrl.navigateRoot('/paciente-detalle', {
        queryParams: {
          patientId: this.patientId,
          tab: 'rutinas'
        }
      });
    } else if (this.tipo === 'template') {
      this.navCtrl.navigateRoot('/rutinas-templates');
    } else {
      this.navCtrl.back();
    }

  }

}
