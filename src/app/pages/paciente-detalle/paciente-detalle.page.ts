import { Component } from '@angular/core';

@Component({
  selector: 'app-paciente-detalle',
  templateUrl: './paciente-detalle.page.html',
  styleUrls: ['./paciente-detalle.page.scss'],
  standalone: false
})
export class PacienteDetallePage {
  // INTERPOLACIÓN: Datos del paciente
  paciente = {
    nombre: 'Juan Pérez',
    edad: 45,
    diagnostico: 'Lumbalgia crónica',
    telefono: '+56912345678',
    email: 'juan.perez@email.com',
    fechaIngreso: '2024-10-15',
    evaActual: 4,
    sesionesCompletadas: 3,
    activo: true
  };

  // Historial de sesiones para *ngFor
  historialSesiones = [
    { fecha: '2024-11-10', eva: 6, observaciones: 'Mejoría en movilidad' },
    { fecha: '2024-11-03', eva: 7, observaciones: 'Dolor persistente' },
    { fecha: '2024-10-27', eva: 8, observaciones: 'Primera evaluación' }
  ];

  constructor() { }
}