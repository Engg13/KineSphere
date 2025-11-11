import { Component } from '@angular/core';

@Component({
  selector: 'app-sesion',
  templateUrl: './sesion.page.html',
  styleUrls: ['./sesion.page.scss'],
  standalone: false
})
export class SesionPage {
  // INTERPOLACIÓN: Datos de la sesión
  pacienteNombre: string = 'Juan Pérez';
  numeroSesion: number = 4;
  
  // Formulario
  eva: number = 0;
  observaciones: string = '';
  ejerciciosRealizados: boolean = true;
  sueno: string = 'bueno';

  constructor() { }

  guardarSesion() {
    alert(`Sesión ${this.numeroSesion} guardada para ${this.pacienteNombre}`);
    // Aquí iría la lógica para guardar
  }
}