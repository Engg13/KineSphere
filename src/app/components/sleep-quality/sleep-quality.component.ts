import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-sleep-quality',
  templateUrl: './sleep-quality.component.html',
  styleUrls: ['./sleep-quality.component.scss'],
  standalone: false
})
export class SleepQualityComponent {
  @Input() valor: number = 0;
  @Input() titulo: string = 'Calidad del Sueño (5GS)';
  @Input() descripcion: string = '¿Cómo califica la calidad de su sueño?';
  @Input() readonly: boolean = false;
  @Output() valorChange = new EventEmitter<number>();

  opciones = [
    { valor: 1, texto: 'Pesimo', icono: 'sad', color: 'danger', descripcion: 'Sueño muy perturbado, despierta cansado' },
    { valor: 2, texto: 'Malo', icono: 'cloudy-night-outline', color: 'warning', descripcion: 'Sueño de mala calidad, descanso insuficiente' },
    { valor: 3, texto: 'Regular', icono: 'remove-circle', color: 'medium', descripcion: 'Sueño regular, podría mejorar' },
    { valor: 4, texto: 'Bueno', icono: 'happy', color: 'success', descripcion: 'Buen sueño, descanso adecuado' },
    { valor: 5, texto: 'Excelente', icono: 'heart', color: 'primary', descripcion: 'Sueño excelente, descanso completo' }
  ];

  seleccionarValor(valor: number) {
    if (!this.readonly) {
      this.valor = valor;
      this.valorChange.emit(valor);
    }
  }

  getOpcionSeleccionada() {
    return this.opciones.find(op => op.valor === this.valor);
  }

  getColorClase(valor: number): string {
    const opcion = this.opciones.find(op => op.valor === valor);
    return opcion ? `sleep-color-${opcion.color}` : 'sleep-color-medium';
  }
}