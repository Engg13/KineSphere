import { Injectable } from '@angular/core';
import { CategoriaEjercicio } from '../models/ejercicio.model';
import { RutinaPaciente } from '../models/rutina-paciente.model';

@Injectable({
  providedIn: 'root'
})
export class EjerciciosUtilsService {

  // ==================== WHATSAPP ====================

  generarMensajeWhatsapp(rutina: RutinaPaciente): string {

    let msg = `*${rutina.nombre}*\n`;
    msg += `━━━━━━━━━━━━━━━\n\n`;

    (rutina.ejercicios || []).forEach((ej, index) => {

      msg += `*${String.fromCharCode(65 + index)}) ${ej.nombre}*\n\n`;

      for (let i = 1; i <= ej.series; i++) {

        const reps = ej.repeticiones ?? '-';

        msg += `  • Serie ${i}: ${reps} reps\n`;

      }

      if (ej.notas?.trim()) {
        msg += `\n  Indicaciones: ${ej.notas.trim()}\n`;
      }

      msg += '\n';

    });

    msg += `━━━━━━━━━━━━━━━\n`;
    msg += `Enviado desde KineSphere`;

    return msg;
  }

  enviarPorWhatsapp(rutina: RutinaPaciente, telefono?: string): void {

    const mensaje = this.generarMensajeWhatsapp(rutina);

    const encoded = encodeURIComponent(mensaje);

    const base = telefono
      ? `https://wa.me/${telefono.replace(/[^0-9]/g, '')}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;

    window.open(base, '_blank');

  }

  // ==================== CATEGORIAS ====================

  getCategorias(): { valor: CategoriaEjercicio; nombre: string; icono: string; color: string }[] {

    return [
      { valor: 'fuerza', nombre: 'Fuerza', icono: 'barbell-outline', color: '#e74c3c' },
      { valor: 'estiramiento', nombre: 'Estiramiento', icono: 'body-outline', color: '#3498db' },
      { valor: 'movilidad', nombre: 'Movilidad', icono: 'sync-outline', color: '#2ecc71' },
      { valor: 'equilibrio', nombre: 'Equilibrio', icono: 'accessibility-outline', color: '#f39c12' },
      { valor: 'cardio', nombre: 'Cardio', icono: 'heart-outline', color: '#e91e63' },
      { valor: 'funcional', nombre: 'Funcional', icono: 'fitness-outline', color: '#9b59b6' },
      { valor: 'rehabilitacion', nombre: 'Rehabilitación', icono: 'medkit-outline', color: '#1abc9c' }
    ];

  }

  // ==================== VIDEO ====================

  getVideoThumbnail(videoUrl: string): string {

    if (!videoUrl) return '';

    const match = videoUrl.match(
      /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    );

    return match
      ? `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg`
      : '';

  }

}