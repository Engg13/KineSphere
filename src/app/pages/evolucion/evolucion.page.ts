import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { NavController, ToastController, IonicModule } from '@ionic/angular';
import { EvolucionesFirestoreService } from '../../services/evoluciones-firestore.service';
import { TipoEvolucion } from '../../models/evolucion.model';

@Component({
  selector: 'app-evolucion',
  templateUrl: './evolucion.page.html',
  styleUrls: ['./evolucion.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, ReactiveFormsModule]
})
export class EvolucionPage implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private navCtrl = inject(NavController);
  private toastCtrl = inject(ToastController);
  private evolucionesService = inject(EvolucionesFirestoreService);

  patientId = '';
  guardando = false;

  tecnicasDisponibles = [
    'Masoterapia',
    'Movilización articular',
    'Ejercicio terapéutico',
    'Electroterapia',
    'Termoterapia',
    'Crioterapia',
    'Punción seca',
    'Vendaje neuromuscular',
    'Estiramiento',
    'Educación al paciente'
  ];

  tipoEvolucionOptions: { value: TipoEvolucion; label: string }[] = [
    { value: 'initial', label: 'Inicial' },
    { value: 'progress', label: 'Progreso' },
    { value: 'discharge', label: 'Alta' }
  ];

  evolucionForm = this.fb.group({
    tipoEvolucion: this.fb.nonNullable.control<TipoEvolucion>('progress', Validators.required),
    painScale: this.fb.control<number | null>(null),
    sleepQuality: this.fb.control<number | null>(null),
    rom: this.fb.control<string | null>(null),
    zonaTratamiento: this.fb.control<string | null>(null),
    tecnicasAplicadas: this.fb.nonNullable.control<string[]>([]),
    subjective: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(10)]),
    objective: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(10)]),
    assessment: this.fb.nonNullable.control(''),
    plan: this.fb.nonNullable.control(''),
    ejerciciosRealizados: this.fb.nonNullable.control(false),
    rutinaId: this.fb.control<string | null>(null),
    rutinaNombre: this.fb.control<string | null>(null),
    testId: this.fb.control<string | null>(null),
    testNombre: this.fb.control<string | null>(null),
    testPuntajeTotal: this.fb.control<number | null>(null),
    testResultado: this.fb.control<string | null>(null)
  });

  ngOnInit(): void {
    this.patientId = this.route.snapshot.queryParamMap.get('patientId')
      || this.route.snapshot.queryParamMap.get('pacienteId')
      || '';
  }

  onTecnicasChange(event: CustomEvent): void {
    const values = (event.detail.value || []) as string[];
    this.evolucionForm.controls.tecnicasAplicadas.setValue(values);
  }

  async guardarEvolucion(): Promise<void> {
    if (!this.patientId) {
      await this.mostrarToast('Falta patientId para guardar evolución.', 'danger');
      return;
    }

    if (this.evolucionForm.invalid) {
      this.evolucionForm.markAllAsTouched();
      await this.mostrarToast('Completa Subjetivo y Objetivo (mínimo 10 caracteres).', 'warning');
      return;
    }

    const value = this.evolucionForm.getRawValue();
    this.guardando = true;

    try {
      await this.evolucionesService.createEvolucion({
        patientId: this.patientId,
        tipoEvolucion: value.tipoEvolucion,
        subjective: value.subjective.trim(),
        objective: value.objective.trim(),
        assessment: value.assessment.trim(),
        plan: value.plan.trim(),
        painScale: value.painScale,
        sleepQuality: value.sleepQuality,
        rom: value.rom?.trim() || null,
        zonaTratamiento: value.zonaTratamiento?.trim() || null,
        tecnicasAplicadas: value.tecnicasAplicadas,
        ejerciciosRealizados: value.ejerciciosRealizados,
        rutinaId: value.rutinaId || undefined,
        rutinaNombre: value.rutinaNombre || undefined,
        test: value.testId && value.testNombre && value.testPuntajeTotal !== null && value.testResultado
          ? {
              testId: value.testId,
              testNombre: value.testNombre,
              puntajeTotal: value.testPuntajeTotal,
              resultado: value.testResultado
            }
          : undefined
      });

      await this.mostrarToast('Evolución guardada correctamente.', 'success');
      this.navCtrl.navigateBack('/paciente-detalle', {
        queryParams: { pacienteId: this.patientId }
      });
    } catch (error) {
      console.error('Error guardando evolución:', error);
      await this.mostrarToast('No se pudo guardar la evolución.', 'danger');
    } finally {
      this.guardando = false;
    }
  }

  volver(): void {
    this.navCtrl.navigateBack('/paciente-detalle', {
      queryParams: { pacienteId: this.patientId }
    });
  }

  private async mostrarToast(message: string, color: 'success' | 'warning' | 'danger'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      color,
      position: 'bottom'
    });

    await toast.present();
  }
}
