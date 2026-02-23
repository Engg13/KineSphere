import { Injectable } from '@angular/core';
import {
  RutinaEjercicios,
  SerieEjercicio,
  HistorialEjercicio,
  CategoriaEjercicio
} from '../models/interfaces';

@Injectable({
  providedIn: 'root'
})
export class EjerciciosService {

  private readonly RUTINAS_KEY = 'rutinas_ejercicios';
  private readonly HISTORIAL_KEY = 'historial_ejercicios';

  

  // ==================== WHATSAPP ====================

  generarMensajeWhatsapp(rutina: RutinaEjercicios): string {
    let msg = `*${rutina.nombre}*\n`;
    msg += `Paciente: ${rutina.pacienteNombre || 'N/A'}\n`;
    msg += `Fecha: ${new Date(rutina.fecha).toLocaleDateString('es-CL')}\n`;
    msg += `━━━━━━━━━━━━━━━\n\n`;

    rutina.ejercicios.forEach(ej => {
      msg += `*${ej.letra}) ${ej.ejercicio.nombre}*\n\n`;

      ej.series.forEach(s => {
        const check = s.completada ? '✅' : '⬜';
        msg += `  Serie ${s.numero}: ${s.repeticiones || '-'} reps x ${s.peso || '-'} kg ${check}\n`;
      });

      msg += '\n';
    });

    msg += `━━━━━━━━━━━━━━━\n`;
    msg += `Enviado desde KineSphere`;

    return msg;
  }

  enviarPorWhatsapp(rutina: RutinaEjercicios, telefono?: string): void {
    const mensaje = this.generarMensajeWhatsapp(rutina);
    const encoded = encodeURIComponent(mensaje);

    const base = telefono
      ? `https://wa.me/${telefono.replace(/[^0-9]/g, '')}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;

    window.open(base, '_blank');
  }

  // ==================== UTILIDADES ====================

  private generarId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
  }

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

  getVideoThumbnail(videoUrl: string): string {
    if (!videoUrl) return '';
    const match = videoUrl.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return match ? `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg` : '';
  }
}