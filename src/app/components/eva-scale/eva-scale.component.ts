import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-eva-scale',
  templateUrl: './eva-scale.component.html',
  styleUrls: ['./eva-scale.component.scss'],
  standalone: false
})
export class EvaScaleComponent {
  @Input() valor: number | null=null;
  @Input() titulo: string = 'Escala Visual Analógica (EVA)';
  @Input() descripcion: string = 'Seleccione el nivel de dolor (0 = sin dolor, 10 = dolor máximo)';
  @Input() readonly: boolean = false;
  @Output() valorChange = new EventEmitter<number>();

  escalas = [
    { valor: 0, texto: '0 - Sin dolor', color: 'success' },
    { valor: 1, texto: '1', color: 'success' },
    { valor: 2, texto: '2', color: 'success' },
    { valor: 3, texto: '3 - Dolor leve', color: 'warning' },
    { valor: 4, texto: '4', color: 'warning' },
    { valor: 5, texto: '5 - Dolor moderado', color: 'warning' },
    { valor: 6, texto: '6', color: 'danger' },
    { valor: 7, texto: '7 - Dolor intenso', color: 'danger' },
    { valor: 8, texto: '8', color: 'danger' },
    { valor: 9, texto: '9', color: 'danger' },
    { valor: 10, texto: '10 - Dolor máximo', color: 'danger' }
  ];

  seleccionarValor(valor: number) {
    if (!this.readonly) {
      this.valor = valor;
      this.valorChange.emit(valor);
    }
  }

  getColorEscala(valor: number): string {
    if (valor <= 2) return 'success';
    if (valor <= 5) return 'warning';
    return 'danger';
  }

  getTextoEscala(): string {
    const escala = this.escalas.find(e => e.valor === this.valor);
    return escala ? escala.texto : 'No seleccionado';
  }
}