import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule, NavController } from '@ionic/angular';

import { ActivatedRoute } from '@angular/router';

import { EjercicioPickerComponent } from '../../components/ejercicio-picker/ejercicio-picker.component';

import { RutinasPacienteService } from '../../services/rutinas-paciente.service';

@Component({
  selector: 'app-rutina-paciente-editor',
  standalone: true,
  templateUrl: './rutina-paciente-editor.page.html',
  imports: [
  CommonModule,
  IonicModule,
  FormsModule,
  EjercicioPickerComponent
]
})
export class RutinaPacienteEditorPage implements OnInit {

  private destroyRef = inject(DestroyRef);

  rutinaId!: string;
  rutina: any;

  constructor(
    private route: ActivatedRoute,
    private rutinasService: RutinasPacienteService,
    private navCtrl: NavController
  ) {}

    ngOnInit() {

    this.rutinaId =
      this.route.snapshot.paramMap.get('id')!;

    this.rutinasService
      .getRutinaById(this.rutinaId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(r => this.rutina = r);

  }

    async guardar() {

    await this.rutinasService.actualizarRutina(
      this.rutinaId,
      this.rutina
    );

    this.navCtrl.back();

    }

    agregarEjercicio(ejercicio: any) {

    const nuevo = {

        ejercicioId: ejercicio.id,
        nombre: ejercicio.nombre,
        series: 3,
        repeticiones: 10,
        orden: this.rutina.ejercicios.length + 1

    };

    this.rutina.ejercicios.push(nuevo);

    }

    eliminarEjercicio(index: number) {

        this.rutina.ejercicios.splice(index, 1);

        this.reordenar();

    }

    reordenar() {

        this.rutina.ejercicios =
            this.rutina.ejercicios.map((ej: any, i: number) => ({
            ...ej,
            orden: i + 1
            }));

    }

}