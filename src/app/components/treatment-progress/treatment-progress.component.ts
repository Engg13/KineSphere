import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-treatment-progress',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './treatment-progress.component.html',
  styleUrls: ['./treatment-progress.component.scss']
})
export class TreatmentProgressComponent {

  @Input() sesiones: any[] = [];
  @Input() sesionesPlanificadas = 10;

  get sesionesProgreso() {
    return this.sesiones.filter(s => s.tipoEvolucion === 'progress');
  }

}