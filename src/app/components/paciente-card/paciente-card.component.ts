import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-paciente-card',
  templateUrl: './paciente-card.component.html',
  styleUrls: ['./paciente-card.component.scss'],
  standalone: false
})
export class PacienteCardComponent {
  @Input() paciente: any;
  @Input() mostrarAcciones: boolean = true;
  @Output() verDetalle = new EventEmitter<any>();
  @Output() editarPaciente = new EventEmitter<any>();
  @Output() nuevaSesion = new EventEmitter<any>();

  onVerDetalle() {
    this.verDetalle.emit(this.paciente);
  }

  onEditarPaciente() {
    this.editarPaciente.emit(this.paciente);
  }

  onNuevaSesion() {
    this.nuevaSesion.emit(this.paciente);
  }

  getBadgeColor(genero: string): string {
    return genero === 'Femenino' ? 'danger' : 'primary';
  }

  getEstadoColor(activo: boolean): string {
    return activo ? 'success' : 'medium';
  }
}