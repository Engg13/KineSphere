import { Injectable } from '@angular/core';
import { RutinaPaciente } from '../models/rutina-paciente.model';

@Injectable({
  providedIn: 'root'
})
export class RutinasWhatsappService {

  enviarRutina(rutina: RutinaPaciente, telefono?: string) {

    let mensaje = `*Rutina de ejercicios*\n\n`;
    mensaje += `*${rutina.nombre}*\n\n`;

    (rutina.ejercicios || []).forEach((ej, index) => {

      mensaje += `*${String.fromCharCode(65 + index)}) ${ej.nombre}*\n`;

      for (let i = 1; i <= ej.series; i++) {
        const reps = ej.repeticiones ?? '-';
        mensaje += `  Serie ${i}: ${reps} reps\n`;
      }

      if (ej.notas?.trim()) {
        mensaje += `  Indicaciones: ${ej.notas.trim()}\n`;
      }

      mensaje += '\n';
    });

    const texto = encodeURIComponent(mensaje);

    let url = `https://wa.me/?text=${texto}`;

    if (telefono) {
      url = `https://wa.me/${telefono}?text=${texto}`;
    }

    window.open(url, '_blank');
  }

}
