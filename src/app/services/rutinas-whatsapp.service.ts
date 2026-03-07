import { Injectable } from '@angular/core';
import { RutinaEjercicios } from '../models/interfaces';

@Injectable({
  providedIn: 'root'
})
export class RutinasWhatsappService {

  enviarRutina(rutina: RutinaEjercicios, telefono?: string) {

    let mensaje = `💪 *Rutina de ejercicios*\n\n`;
    mensaje += `*${rutina.nombre}*\n\n`;

    rutina.ejercicios.forEach(ej => {

      mensaje += `🔹 *${ej.ejercicio.nombre}*\n`;

      ej.series.forEach(s => {
        mensaje += `• Serie ${s.numero}: ${s.repeticiones ?? '-'} reps\n`;
      });

      if (ej.ejercicio.videoUrl) {
        mensaje += `🎥 ${ej.ejercicio.videoUrl}\n`;
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