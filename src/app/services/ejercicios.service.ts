import { Injectable } from '@angular/core';
import {
  EjercicioLocal,
  EjercicioEnRutina,
  RutinaEjercicios,
  SerieEjercicio,
  HistorialEjercicio,
  CategoriaEjercicio
} from '../models/interfaces';

@Injectable({
  providedIn: 'root'
})
export class EjerciciosService {

  private readonly EJERCICIOS_KEY = 'ejercicios_biblioteca';
  private readonly RUTINAS_KEY = 'rutinas_ejercicios';
  private readonly HISTORIAL_KEY = 'historial_ejercicios';

  // ==================== BIBLIOTECA DE EJERCICIOS ====================

  getEjercicios(): EjercicioLocal[] {
    try {
      const data = localStorage.getItem(this.EJERCICIOS_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error('Error cargando ejercicios:', e);
    }
    // Primera vez: cargar ejercicios por defecto
    const defaults = this.getEjerciciosPorDefecto();
    this.guardarEjercicios(defaults);
    return defaults;
  }

  getEjercicioById(id: string): EjercicioLocal | undefined {
    return this.getEjercicios().find(e => e.id === id);
  }

  getEjerciciosPorCategoria(categoria: CategoriaEjercicio): EjercicioLocal[] {
    return this.getEjercicios().filter(e => e.categoria === categoria);
  }

  buscarEjercicios(termino: string): EjercicioLocal[] {
    const t = termino.toLowerCase().trim();
    if (!t) return this.getEjercicios();
    return this.getEjercicios().filter(e =>
      e.nombre.toLowerCase().includes(t) ||
      e.descripcion.toLowerCase().includes(t) ||
      e.musculoPrincipal.toLowerCase().includes(t) ||
      e.categoria.toLowerCase().includes(t)
    );
  }

  agregarEjercicio(ejercicio: Omit<EjercicioLocal, 'id' | 'fechaCreacion'>): EjercicioLocal {
    const nuevo: EjercicioLocal = {
      ...ejercicio,
      id: this.generarId(),
      fechaCreacion: new Date().toISOString()
    };
    const ejercicios = this.getEjercicios();
    ejercicios.push(nuevo);
    this.guardarEjercicios(ejercicios);
    return nuevo;
  }

  actualizarEjercicio(id: string, cambios: Partial<EjercicioLocal>): void {
    const ejercicios = this.getEjercicios();
    const idx = ejercicios.findIndex(e => e.id === id);
    if (idx !== -1) {
      ejercicios[idx] = { ...ejercicios[idx], ...cambios };
      this.guardarEjercicios(ejercicios);
    }
  }

  eliminarEjercicio(id: string): void {
    const ejercicios = this.getEjercicios().filter(e => e.id !== id);
    this.guardarEjercicios(ejercicios);
  }

  private guardarEjercicios(ejercicios: EjercicioLocal[]): void {
    localStorage.setItem(this.EJERCICIOS_KEY, JSON.stringify(ejercicios));
  }

  // ==================== RUTINAS ====================

  getRutinasPorPaciente(pacienteId: string | number): RutinaEjercicios[] {
    try {
      const data = localStorage.getItem(`${this.RUTINAS_KEY}_${pacienteId}`);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  getRutina(pacienteId: string | number, rutinaId: string): RutinaEjercicios | undefined {
    return this.getRutinasPorPaciente(pacienteId).find(r => r.id === rutinaId);
  }

  crearRutina(pacienteId: string | number, nombre: string, pacienteNombre?: string): RutinaEjercicios {
    const rutina: RutinaEjercicios = {
      id: this.generarId(),
      pacienteId,
      pacienteNombre,
      nombre,
      ejercicios: [],
      fecha: new Date().toISOString(),
      completada: false,
      enviadaWhatsapp: false
    };
    const rutinas = this.getRutinasPorPaciente(pacienteId);
    rutinas.unshift(rutina);
    this.guardarRutinas(pacienteId, rutinas);
    return rutina;
  }

  agregarEjercicioARutina(
    pacienteId: string | number,
    rutinaId: string,
    ejercicioId: string,
    numSeries: number = 3,
    repeticiones: number = 12,
    descanso: number = 60
  ): void {
    const rutinas = this.getRutinasPorPaciente(pacienteId);
    const rutina = rutinas.find(r => r.id === rutinaId);
    if (!rutina) return;

    const ejercicio = this.getEjercicioById(ejercicioId);
    if (!ejercicio) return;

    const letra = String.fromCharCode(65 + rutina.ejercicios.length); // A, B, C...

    const series: SerieEjercicio[] = Array.from({ length: numSeries }, (_, i) => ({
      numero: i + 1,
      repeticiones,
      peso: null,
      completada: false
    }));

    rutina.ejercicios.push({
      ejercicioId,
      ejercicio,
      letra,
      series,
      descansoSegundos: descanso
    });

    this.guardarRutinas(pacienteId, rutinas);
  }

  eliminarEjercicioDeRutina(pacienteId: string | number, rutinaId: string, ejercicioIdx: number): void {
    const rutinas = this.getRutinasPorPaciente(pacienteId);
    const rutina = rutinas.find(r => r.id === rutinaId);
    if (!rutina) return;

    rutina.ejercicios.splice(ejercicioIdx, 1);
    // Recalcular letras
    rutina.ejercicios.forEach((ej, i) => {
      ej.letra = String.fromCharCode(65 + i);
    });

    this.guardarRutinas(pacienteId, rutinas);
  }

  actualizarSerie(
    pacienteId: string | number,
    rutinaId: string,
    ejercicioIdx: number,
    serieIdx: number,
    cambios: Partial<SerieEjercicio>
  ): void {
    const rutinas = this.getRutinasPorPaciente(pacienteId);
    const rutina = rutinas.find(r => r.id === rutinaId);
    if (!rutina || !rutina.ejercicios[ejercicioIdx]) return;

    const serie = rutina.ejercicios[ejercicioIdx].series[serieIdx];
    if (serie) {
      Object.assign(serie, cambios);
    }
    this.guardarRutinas(pacienteId, rutinas);
  }

  toggleSerieCompletada(
    pacienteId: string | number,
    rutinaId: string,
    ejercicioIdx: number,
    serieIdx: number
  ): boolean {
    const rutinas = this.getRutinasPorPaciente(pacienteId);
    const rutina = rutinas.find(r => r.id === rutinaId);
    if (!rutina || !rutina.ejercicios[ejercicioIdx]) return false;

    const serie = rutina.ejercicios[ejercicioIdx].series[serieIdx];
    if (serie) {
      serie.completada = !serie.completada;
      this.guardarRutinas(pacienteId, rutinas);
      return serie.completada;
    }
    return false;
  }

  cumplimentarTodas(pacienteId: string | number, rutinaId: string, ejercicioIdx: number): void {
    const rutinas = this.getRutinasPorPaciente(pacienteId);
    const rutina = rutinas.find(r => r.id === rutinaId);
    if (!rutina || !rutina.ejercicios[ejercicioIdx]) return;

    const todasCompletadas = rutina.ejercicios[ejercicioIdx].series.every(s => s.completada);
    rutina.ejercicios[ejercicioIdx].series.forEach(s => {
      s.completada = !todasCompletadas;
    });

    this.guardarRutinas(pacienteId, rutinas);
  }

  completarRutina(pacienteId: string | number, rutinaId: string): void {
    const rutinas = this.getRutinasPorPaciente(pacienteId);
    const rutina = rutinas.find(r => r.id === rutinaId);
    if (!rutina) return;

    rutina.completada = true;
    rutina.fechaCompletada = new Date().toISOString();

    // Guardar en historial
    rutina.ejercicios.forEach(ej => {
      this.agregarAlHistorial(ej.ejercicioId, {
        fecha: rutina.fechaCompletada!,
        series: [...ej.series],
        rutinaId
      });
    });

    this.guardarRutinas(pacienteId, rutinas);
  }

  eliminarRutina(pacienteId: string | number, rutinaId: string): void {
    const rutinas = this.getRutinasPorPaciente(pacienteId).filter(r => r.id !== rutinaId);
    this.guardarRutinas(pacienteId, rutinas);
  }

  private guardarRutinas(pacienteId: string | number, rutinas: RutinaEjercicios[]): void {
    localStorage.setItem(`${this.RUTINAS_KEY}_${pacienteId}`, JSON.stringify(rutinas));
  }

  // ==================== HISTORIAL ====================

  getHistorial(ejercicioId: string): HistorialEjercicio[] {
    try {
      const data = localStorage.getItem(`${this.HISTORIAL_KEY}_${ejercicioId}`);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private agregarAlHistorial(ejercicioId: string, entrada: HistorialEjercicio): void {
    const historial = this.getHistorial(ejercicioId);
    historial.unshift(entrada);
    // Mantener últimas 50 entradas
    const recortado = historial.slice(0, 50);
    localStorage.setItem(`${this.HISTORIAL_KEY}_${ejercicioId}`, JSON.stringify(recortado));
  }

  // ==================== WHATSAPP ====================

  generarMensajeWhatsapp(rutina: RutinaEjercicios): string {
    let msg = `*${rutina.nombre}*\n`;
    msg += `Paciente: ${rutina.pacienteNombre || 'N/A'}\n`;
    msg += `Fecha: ${new Date(rutina.fecha).toLocaleDateString('es-CL')}\n`;
    msg += `━━━━━━━━━━━━━━━\n\n`;

    rutina.ejercicios.forEach(ej => {
      msg += `*${ej.letra}) ${ej.ejercicio.nombre}*\n`;
      if (ej.ejercicio.instrucciones) {
        msg += `${ej.ejercicio.instrucciones}\n`;
      }
      msg += `\n`;

      ej.series.forEach(s => {
        const check = s.completada ? '\u2705' : '\u2B1C';
        const reps = s.repeticiones ? `${s.repeticiones} reps` : '-';
        const peso = s.peso ? `${s.peso} kg` : '- kg';
        msg += `  Serie ${s.numero}: ${reps} x ${peso} ${check}\n`;
      });

      if (ej.descansoSegundos) {
        msg += `  Descanso: ${ej.descansoSegundos}s\n`;
      }

      // Imagen del ejercicio (solo URLs web, no base64)
      if (ej.ejercicio.imagenUrl && !ej.ejercicio.imagenUrl.startsWith('data:')) {
        msg += `  Imagen: ${ej.ejercicio.imagenUrl}\n`;
      }

      if (ej.ejercicio.videoUrl) {
        msg += `  Video: ${ej.ejercicio.videoUrl}\n`;
      }
      msg += `\n`;
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

    // Marcar como enviada
    const rutinas = this.getRutinasPorPaciente(rutina.pacienteId);
    const r = rutinas.find(x => x.id === rutina.id);
    if (r) {
      r.enviadaWhatsapp = true;
      this.guardarRutinas(rutina.pacienteId, rutinas);
    }
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

  getIconoCategoria(categoria: CategoriaEjercicio): string {
    const cat = this.getCategorias().find(c => c.valor === categoria);
    return cat?.icono || 'fitness-outline';
  }

  getColorCategoria(categoria: CategoriaEjercicio): string {
    const cat = this.getCategorias().find(c => c.valor === categoria);
    return cat?.color || '#3880ff';
  }

  getVideoThumbnail(videoUrl: string): string {
    if (!videoUrl) return '';
    // Extraer ID de YouTube
    const match = videoUrl.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (match) {
      return `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg`;
    }
    return '';
  }

  // ==================== EJERCICIOS POR DEFECTO ====================

  private getEjerciciosPorDefecto(): EjercicioLocal[] {
    return [
      {
        id: 'ej_sentadilla',
        nombre: 'Sentadilla',
        descripcion: 'Ejercicio compuesto para fortalecer cuádriceps, glúteos e isquiotibiales.',
        instrucciones: 'Pies a la anchura de los hombros, bajar las caderas hasta que los muslos estén paralelos al suelo. Mantener la espalda recta.',
        categoria: 'fuerza',
        musculoPrincipal: 'Cuádriceps',
        equipamiento: 'Peso corporal',
        dificultad: 'basico',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ej_puente_gluteo',
        nombre: 'Puente de glúteo',
        descripcion: 'Activación y fortalecimiento de glúteos y estabilización de la zona lumbar.',
        instrucciones: 'Acostado boca arriba, rodillas flexionadas, elevar la cadera contrayendo los glúteos. Mantener 2-3 segundos arriba.',
        categoria: 'rehabilitacion',
        musculoPrincipal: 'Glúteo mayor',
        equipamiento: 'Peso corporal',
        dificultad: 'basico',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ej_plancha',
        nombre: 'Plancha frontal',
        descripcion: 'Ejercicio isométrico para estabilización del core y fortalecimiento abdominal.',
        instrucciones: 'Apoyar antebrazos y puntas de los pies, mantener el cuerpo en línea recta. No dejar caer las caderas.',
        categoria: 'fuerza',
        musculoPrincipal: 'Core',
        equipamiento: 'Peso corporal',
        dificultad: 'basico',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ej_estiramiento_isquio',
        nombre: 'Estiramiento isquiotibiales',
        descripcion: 'Elongación de la cadena posterior para mejorar flexibilidad y prevenir lesiones.',
        instrucciones: 'Sentado en el suelo, piernas extendidas, inclinarse hacia adelante intentando tocar las puntas de los pies. Mantener 20-30 segundos.',
        categoria: 'estiramiento',
        musculoPrincipal: 'Isquiotibiales',
        equipamiento: 'Ninguno',
        dificultad: 'basico',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ej_elevacion_pierna',
        nombre: 'Elevación de pierna recta',
        descripcion: 'Fortalecimiento de cuádriceps sin carga articular, ideal para rehabilitación de rodilla.',
        instrucciones: 'Acostado boca arriba, una pierna flexionada y la otra extendida. Elevar la pierna recta 30cm del suelo. Mantener 5 segundos.',
        categoria: 'rehabilitacion',
        musculoPrincipal: 'Cuádriceps',
        equipamiento: 'Ninguno',
        dificultad: 'basico',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ej_curl_biceps',
        nombre: 'Curl de bíceps',
        descripcion: 'Ejercicio de aislamiento para fortalecer bíceps braquial.',
        instrucciones: 'De pie, codos pegados al cuerpo, flexionar el antebrazo hasta llevar la mano al hombro. Bajar controladamente.',
        categoria: 'fuerza',
        musculoPrincipal: 'Bíceps',
        equipamiento: 'Mancuernas',
        dificultad: 'basico',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ej_cat_cow',
        nombre: 'Gato-Vaca (Cat-Cow)',
        descripcion: 'Movilidad de columna vertebral, alivia tensión lumbar y cervical.',
        instrucciones: 'En cuadrupedia, alternar entre arquear la espalda (gato) y hundirla (vaca). Coordinar con la respiración.',
        categoria: 'movilidad',
        musculoPrincipal: 'Columna vertebral',
        equipamiento: 'Ninguno',
        dificultad: 'basico',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ej_clamshell',
        nombre: 'Clamshell',
        descripcion: 'Activación de glúteo medio para estabilización de cadera y rodilla.',
        instrucciones: 'Acostado de lado, rodillas flexionadas a 45°, separar la rodilla superior sin mover la pelvis. Banda elástica opcional.',
        categoria: 'rehabilitacion',
        musculoPrincipal: 'Glúteo medio',
        equipamiento: 'Banda elástica',
        dificultad: 'basico',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ej_step_up',
        nombre: 'Step-up',
        descripcion: 'Ejercicio funcional unilateral para fuerza y equilibrio de miembros inferiores.',
        instrucciones: 'Subir a un escalón con una pierna, extender completamente la cadera arriba. Bajar controladamente.',
        categoria: 'funcional',
        musculoPrincipal: 'Cuádriceps / Glúteos',
        equipamiento: 'Escalón o banco',
        dificultad: 'intermedio',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ej_bird_dog',
        nombre: 'Bird-Dog',
        descripcion: 'Estabilización de core con extensión contralateral de brazo y pierna.',
        instrucciones: 'En cuadrupedia, extender brazo derecho y pierna izquierda simultáneamente. Mantener el tronco estable. Alternar lados.',
        categoria: 'equilibrio',
        musculoPrincipal: 'Core / Multífidos',
        equipamiento: 'Ninguno',
        dificultad: 'basico',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ej_press_hombro',
        nombre: 'Press de hombro',
        descripcion: 'Fortalecimiento del deltoides y estabilizadores del hombro.',
        instrucciones: 'De pie o sentado, elevar las mancuernas desde los hombros hasta extensión completa sobre la cabeza.',
        categoria: 'fuerza',
        musculoPrincipal: 'Deltoides',
        equipamiento: 'Mancuernas',
        dificultad: 'intermedio',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ej_estiramiento_pectoral',
        nombre: 'Estiramiento pectoral en puerta',
        descripcion: 'Elongación de pectoral mayor y menor, corrige postura de hombros adelantados.',
        instrucciones: 'De pie en el marco de una puerta, colocar antebrazos en el marco y dar un paso al frente hasta sentir el estiramiento.',
        categoria: 'estiramiento',
        musculoPrincipal: 'Pectoral',
        equipamiento: 'Puerta o marco',
        dificultad: 'basico',
        fechaCreacion: new Date().toISOString()
      }
    ];
  }
}
