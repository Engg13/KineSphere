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
  private readonly LIB_VERSION_KEY = 'ejercicios_lib_version';
  private readonly CURRENT_LIB_VERSION = 2;

  // ==================== BIBLIOTECA DE EJERCICIOS ====================

  getEjercicios(): EjercicioLocal[] {
    try {
      const data = localStorage.getItem(this.EJERCICIOS_KEY);
      if (data) {
        const ejercicios: EjercicioLocal[] = JSON.parse(data);
        this.mergeNuevosDefaults(ejercicios);
        return ejercicios;
      }
    } catch (e) {
      console.error('Error cargando ejercicios:', e);
    }
    // Primera vez: cargar ejercicios por defecto
    const defaults = this.getEjerciciosPorDefecto();
    this.guardarEjercicios(defaults);
    localStorage.setItem(this.LIB_VERSION_KEY, String(this.CURRENT_LIB_VERSION));
    return defaults;
  }

  private mergeNuevosDefaults(existing: EjercicioLocal[]): void {
    const version = parseInt(localStorage.getItem(this.LIB_VERSION_KEY) || '1', 10);
    if (version >= this.CURRENT_LIB_VERSION) return;

    const defaults = this.getEjerciciosPorDefecto();
    const existingIds = new Set(existing.map(e => e.id));
    const nuevos = defaults.filter(e => !existingIds.has(e.id));

    if (nuevos.length > 0) {
      existing.push(...nuevos);
      this.guardarEjercicios(existing);
    }
    localStorage.setItem(this.LIB_VERSION_KEY, String(this.CURRENT_LIB_VERSION));
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
      },

      // ==================== ACE FITNESS - SIN EQUIPAMIENTO ====================

      // --- ESTIRAMIENTOS ---
      {
        id: 'ace_90_lat_stretch',
        nombre: 'Estiramiento dorsal 90°',
        descripcion: 'Estiramiento del dorsal ancho para mejorar movilidad de hombro y espalda.',
        instrucciones: 'De pie frente a una superficie, inclinar el torso a 90° con los brazos extendidos. Dejar caer el pecho hacia el suelo.',
        categoria: 'estiramiento',
        musculoPrincipal: 'Dorsal ancho',
        equipamiento: 'Ninguno',
        dificultad: 'basico',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_childs_pose',
        nombre: 'Postura del niño (Child\'s Pose)',
        descripcion: 'Estiramiento suave de espalda, caderas y muslos. Postura de descanso y recuperacion.',
        instrucciones: 'De rodillas, sentarse sobre los talones y extender los brazos al frente con el torso hacia el suelo. Mantener 20-30 segundos.',
        categoria: 'estiramiento',
        musculoPrincipal: 'Espalda / Cadera',
        equipamiento: 'Ninguno',
        dificultad: 'basico',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_kneeling_hip_flexor',
        nombre: 'Estiramiento de flexor de cadera arrodillado',
        descripcion: 'Elongacion del psoas iliaco y recto femoral, ideal para sedentarismo.',
        instrucciones: 'Rodilla trasera en el suelo, pie delantero adelantado. Empujar la cadera hacia adelante manteniendo el torso erguido. Mantener 20-30s.',
        categoria: 'estiramiento',
        musculoPrincipal: 'Flexores de cadera',
        equipamiento: 'Ninguno',
        dificultad: 'basico',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_kneeling_ta_stretch',
        nombre: 'Estiramiento de tibial anterior arrodillado',
        descripcion: 'Elongacion del tibial anterior para aliviar tension en la parte frontal de la pierna.',
        instrucciones: 'Arrodillado con los empeines apoyados en el suelo, sentarse suavemente sobre los talones.',
        categoria: 'estiramiento',
        musculoPrincipal: 'Tibial anterior',
        equipamiento: 'Ninguno',
        dificultad: 'basico',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_lateral_neck_flexion',
        nombre: 'Flexion lateral de cuello',
        descripcion: 'Estiramiento suave de la musculatura lateral cervical.',
        instrucciones: 'Inclinar la oreja hacia el hombro sin elevar el hombro. Mantener 15-20 segundos cada lado.',
        categoria: 'estiramiento',
        musculoPrincipal: 'Cuello',
        equipamiento: 'Ninguno',
        dificultad: 'basico',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_leg_crossover_stretch',
        nombre: 'Estiramiento cruzado de pierna',
        descripcion: 'Elongacion de gluteos, piriforme y banda iliotibial.',
        instrucciones: 'Acostado boca arriba, cruzar una pierna sobre la otra y llevarla hacia el lado opuesto. Mantener hombros en el suelo.',
        categoria: 'estiramiento',
        musculoPrincipal: 'Gluteos / Piriforme',
        equipamiento: 'Ninguno',
        dificultad: 'basico',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_modified_hurdler_stretch',
        nombre: 'Estiramiento de valla modificado',
        descripcion: 'Elongacion de isquiotibiales de forma segura para la rodilla.',
        instrucciones: 'Sentado, una pierna extendida y la otra flexionada con el pie tocando el muslo interno. Inclinarse hacia la pierna extendida.',
        categoria: 'estiramiento',
        musculoPrincipal: 'Isquiotibiales',
        equipamiento: 'Ninguno',
        dificultad: 'basico',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_neck_flexion_extension',
        nombre: 'Flexion y extension de cuello',
        descripcion: 'Movilidad cervical en el plano sagital para aliviar rigidez.',
        instrucciones: 'Llevar el menton al pecho (flexion) y luego mirar al techo (extension). Movimientos lentos y controlados.',
        categoria: 'estiramiento',
        musculoPrincipal: 'Cuello',
        equipamiento: 'Ninguno',
        dificultad: 'basico',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_overhead_triceps_stretch',
        nombre: 'Estiramiento de triceps sobre la cabeza',
        descripcion: 'Elongacion del triceps braquial y dorsal ancho.',
        instrucciones: 'Llevar un brazo por detras de la cabeza, con el codo apuntando al techo. Con la otra mano empujar suavemente el codo.',
        categoria: 'estiramiento',
        musculoPrincipal: 'Triceps',
        equipamiento: 'Ninguno',
        dificultad: 'basico',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_seated_biceps_stretch',
        nombre: 'Estiramiento de biceps sentado',
        descripcion: 'Elongacion del biceps braquial con rodillas flexionadas.',
        instrucciones: 'Sentado con rodillas flexionadas, manos detras apoyadas en el suelo con dedos hacia atras. Deslizar el cuerpo hacia adelante.',
        categoria: 'estiramiento',
        musculoPrincipal: 'Biceps',
        equipamiento: 'Ninguno',
        dificultad: 'basico',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_seated_butterfly',
        nombre: 'Estiramiento mariposa sentado',
        descripcion: 'Elongacion de aductores e ingle.',
        instrucciones: 'Sentado, juntar las plantas de los pies y dejar caer las rodillas a los lados. Presionar suavemente con los codos.',
        categoria: 'estiramiento',
        musculoPrincipal: 'Aductores',
        equipamiento: 'Ninguno',
        dificultad: 'basico',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_seated_calf_stretch',
        nombre: 'Estiramiento de pantorrilla sentado',
        descripcion: 'Elongacion del gastrocnemio y soleo.',
        instrucciones: 'Sentado con piernas extendidas, flexionar el pie hacia el cuerpo usando una toalla o las manos. Mantener 20-30s.',
        categoria: 'estiramiento',
        musculoPrincipal: 'Pantorrillas',
        equipamiento: 'Ninguno',
        dificultad: 'basico',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_seated_side_straddle',
        nombre: 'Estiramiento lateral sentado con piernas abiertas',
        descripcion: 'Elongacion de oblicuos, dorsal y aductores.',
        instrucciones: 'Sentado con piernas abiertas, inclinarse lateralmente hacia una pierna extendiendo el brazo opuesto.',
        categoria: 'estiramiento',
        musculoPrincipal: 'Oblicuos / Aductores',
        equipamiento: 'Ninguno',
        dificultad: 'basico',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_seated_straddle',
        nombre: 'Estiramiento sentado con piernas abiertas',
        descripcion: 'Elongacion de isquiotibiales y aductores bilateralmente.',
        instrucciones: 'Sentado con piernas abiertas, inclinarse hacia adelante con la espalda recta. Mantener 20-30 segundos.',
        categoria: 'estiramiento',
        musculoPrincipal: 'Isquiotibiales / Aductores',
        equipamiento: 'Ninguno',
        dificultad: 'basico',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_seated_toe_touches',
        nombre: 'Tocarse los pies sentado',
        descripcion: 'Elongacion de toda la cadena posterior.',
        instrucciones: 'Sentado con piernas juntas y extendidas, inclinarse hacia los pies manteniendo la espalda lo mas recta posible.',
        categoria: 'estiramiento',
        musculoPrincipal: 'Isquiotibiales / Pantorrillas',
        equipamiento: 'Ninguno',
        dificultad: 'basico',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_side_lying_quad_stretch',
        nombre: 'Estiramiento de cuadriceps lateral',
        descripcion: 'Elongacion del cuadriceps en posicion lateral.',
        instrucciones: 'Acostado de lado, tomar el tobillo de la pierna superior y llevar el talon hacia el gluteo. Mantener 20-30 segundos.',
        categoria: 'estiramiento',
        musculoPrincipal: 'Cuadriceps',
        equipamiento: 'Ninguno',
        dificultad: 'basico',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_standing_chest_stretch',
        nombre: 'Estiramiento de pecho de pie',
        descripcion: 'Elongacion del pectoral mayor, mejora postura.',
        instrucciones: 'De pie, entrelazar las manos detras de la espalda y elevar los brazos abriendo el pecho. Mantener 15-20 segundos.',
        categoria: 'estiramiento',
        musculoPrincipal: 'Pectoral',
        equipamiento: 'Ninguno',
        dificultad: 'basico',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_standing_dorsiflexion',
        nombre: 'Estiramiento de pantorrilla de pie (dorsiflexion)',
        descripcion: 'Elongacion del gastrocnemio y soleo en carga.',
        instrucciones: 'De pie frente a la pared, un pie adelante y otro atras. Empujar la pared manteniendo el talon trasero en el suelo.',
        categoria: 'estiramiento',
        musculoPrincipal: 'Pantorrillas',
        equipamiento: 'Ninguno',
        dificultad: 'basico',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_standing_lunge_stretch',
        nombre: 'Estiramiento en zancada de pie',
        descripcion: 'Elongacion de flexores de cadera e isquiotibiales.',
        instrucciones: 'Dar un paso largo al frente, bajar la rodilla trasera hacia el suelo. Mantener el torso erguido. 20-30 segundos cada lado.',
        categoria: 'estiramiento',
        musculoPrincipal: 'Flexores de cadera',
        equipamiento: 'Ninguno',
        dificultad: 'basico',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_standing_shoulder_ext',
        nombre: 'Extension de hombro de pie',
        descripcion: 'Estiramiento de la parte anterior del hombro y biceps.',
        instrucciones: 'De pie, llevar los brazos extendidos hacia atras entrelazando las manos. Elevar suavemente.',
        categoria: 'estiramiento',
        musculoPrincipal: 'Hombro anterior / Biceps',
        equipamiento: 'Ninguno',
        dificultad: 'basico',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_supine_90_90_hip',
        nombre: 'Estiramiento 90-90 de rotadores de cadera',
        descripcion: 'Elongacion de rotadores internos y externos de cadera.',
        instrucciones: 'Acostado boca arriba, piernas a 90° de cadera y rodilla. Dejar caer ambas rodillas hacia un lado. Alternar.',
        categoria: 'estiramiento',
        musculoPrincipal: 'Rotadores de cadera',
        equipamiento: 'Ninguno',
        dificultad: 'basico',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_supine_hamstring_stretch',
        nombre: 'Estiramiento de isquiotibiales supino',
        descripcion: 'Elongacion segura de isquiotibiales acostado boca arriba.',
        instrucciones: 'Acostado boca arriba, elevar una pierna extendida y sujetarla con las manos o toalla. Mantener 20-30 segundos.',
        categoria: 'estiramiento',
        musculoPrincipal: 'Isquiotibiales',
        equipamiento: 'Ninguno',
        dificultad: 'basico',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_supine_hip_flexor_stretch',
        nombre: 'Estiramiento supino de flexor de cadera',
        descripcion: 'Elongacion del psoas y recto femoral en posicion supina.',
        instrucciones: 'Acostado boca arriba al borde de una superficie, dejar colgar una pierna hacia el suelo. Mantener 20-30 segundos.',
        categoria: 'estiramiento',
        musculoPrincipal: 'Flexores de cadera',
        equipamiento: 'Ninguno',
        dificultad: 'basico',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_supine_it_band',
        nombre: 'Estiramiento supino de banda iliotibial',
        descripcion: 'Elongacion de la banda iliotibial y tensor de la fascia lata.',
        instrucciones: 'Acostado boca arriba, cruzar una pierna extendida sobre la otra hacia el lado opuesto. Mantener hombros en el suelo.',
        categoria: 'estiramiento',
        musculoPrincipal: 'Banda iliotibial',
        equipamiento: 'Ninguno',
        dificultad: 'intermedio',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_thomas_stretch',
        nombre: 'Estiramiento de Thomas',
        descripcion: 'Elongacion especifica para psoas iliaco y recto femoral.',
        instrucciones: 'Acostado al borde de una camilla, abrazar una rodilla al pecho y dejar la otra pierna colgar. Mantener 20-30 segundos.',
        categoria: 'estiramiento',
        musculoPrincipal: 'Flexores de cadera',
        equipamiento: 'Ninguno',
        dificultad: 'basico',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_seated_straddle_side',
        nombre: 'Estiramiento sentado con alcances laterales',
        descripcion: 'Elongacion lateral del tronco y aductores.',
        instrucciones: 'Sentado con piernas abiertas, alcanzar un pie con ambas manos inclinandose lateralmente. Alternar lados.',
        categoria: 'estiramiento',
        musculoPrincipal: 'Oblicuos / Aductores',
        equipamiento: 'Ninguno',
        dificultad: 'intermedio',
        fechaCreacion: new Date().toISOString()
      },

      // --- FUERZA ---
      {
        id: 'ace_bent_knee_pushup',
        nombre: 'Flexion de brazos con rodillas apoyadas',
        descripcion: 'Version modificada de la flexion de brazos para principiantes.',
        instrucciones: 'Apoyar rodillas y manos en el suelo. Bajar el pecho hacia el suelo y empujar de vuelta. Mantener el core activado.',
        categoria: 'fuerza',
        musculoPrincipal: 'Pectoral / Triceps',
        equipamiento: 'Ninguno',
        dificultad: 'basico',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_crunch',
        nombre: 'Crunch abdominal',
        descripcion: 'Ejercicio clasico de fortalecimiento del recto abdominal.',
        instrucciones: 'Acostado boca arriba con rodillas flexionadas, elevar hombros del suelo contrayendo abdominales. No tirar del cuello.',
        categoria: 'fuerza',
        musculoPrincipal: 'Abdominales',
        equipamiento: 'Ninguno',
        dificultad: 'basico',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_pushup',
        nombre: 'Flexion de brazos (Push-up)',
        descripcion: 'Ejercicio clasico de empuje para pecho, hombros y triceps.',
        instrucciones: 'Manos al ancho de hombros, cuerpo en linea recta. Bajar el pecho al suelo y empujar de vuelta. Core activado.',
        categoria: 'fuerza',
        musculoPrincipal: 'Pectoral / Triceps / Hombros',
        equipamiento: 'Ninguno',
        dificultad: 'intermedio',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_pushup_single_leg',
        nombre: 'Flexion de brazos con elevacion de pierna',
        descripcion: 'Push-up avanzado que agrega inestabilidad con una pierna elevada.',
        instrucciones: 'Realizar una flexion de brazos con una pierna elevada del suelo. Alternar pierna en cada repeticion.',
        categoria: 'fuerza',
        musculoPrincipal: 'Pectoral / Core',
        equipamiento: 'Ninguno',
        dificultad: 'avanzado',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_pushup_staggered',
        nombre: 'Flexion de brazos con manos desfasadas',
        descripcion: 'Variante de push-up con manos a diferentes alturas para mayor demanda unilateral.',
        instrucciones: 'Una mano mas adelante que la otra. Realizar la flexion y alternar la posicion de las manos entre series.',
        categoria: 'fuerza',
        musculoPrincipal: 'Pectoral / Triceps',
        equipamiento: 'Ninguno',
        dificultad: 'avanzado',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_plank_ups',
        nombre: 'Plank-ups (Plancha a brazos extendidos)',
        descripcion: 'Transicion entre plancha de antebrazos y plancha alta para fortalecer brazos y core.',
        instrucciones: 'Desde plancha de antebrazos, subir a plancha alta un brazo a la vez. Bajar de la misma forma. Alternar brazo lider.',
        categoria: 'fuerza',
        musculoPrincipal: 'Triceps / Core',
        equipamiento: 'Ninguno',
        dificultad: 'intermedio',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_reverse_crunch',
        nombre: 'Crunch inverso',
        descripcion: 'Fortalecimiento del abdomen inferior.',
        instrucciones: 'Acostado boca arriba, elevar las rodillas hacia el pecho contrayendo los abdominales inferiores. Bajar controladamente.',
        categoria: 'fuerza',
        musculoPrincipal: 'Abdominales inferiores',
        equipamiento: 'Ninguno',
        dificultad: 'intermedio',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_side_plank_modified',
        nombre: 'Plancha lateral modificada',
        descripcion: 'Fortalecimiento de oblicuos con apoyo de rodillas.',
        instrucciones: 'Acostado de lado, apoyar antebrazo y rodillas. Elevar la cadera formando linea recta. Mantener 15-30 segundos.',
        categoria: 'fuerza',
        musculoPrincipal: 'Oblicuos',
        equipamiento: 'Ninguno',
        dificultad: 'basico',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_side_plank_straight',
        nombre: 'Plancha lateral con piernas extendidas',
        descripcion: 'Fortalecimiento de oblicuos y estabilizadores laterales del core.',
        instrucciones: 'Apoyar antebrazo y borde del pie inferior. Elevar la cadera formando linea recta. Mantener 20-30 segundos.',
        categoria: 'fuerza',
        musculoPrincipal: 'Oblicuos / Core lateral',
        equipamiento: 'Ninguno',
        dificultad: 'intermedio',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_single_arm_plank',
        nombre: 'Plancha con un brazo',
        descripcion: 'Plancha avanzada con apoyo unilateral para mayor desafio anti-rotacional.',
        instrucciones: 'Desde plancha alta, extender un brazo al frente manteniendo las caderas estables. Alternar brazos.',
        categoria: 'fuerza',
        musculoPrincipal: 'Core / Hombros',
        equipamiento: 'Ninguno',
        dificultad: 'intermedio',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_supine_bicycle_crunch',
        nombre: 'Crunch bicicleta',
        descripcion: 'Fortalecimiento de oblicuos y recto abdominal con movimiento rotacional.',
        instrucciones: 'Acostado boca arriba, llevar el codo hacia la rodilla opuesta alternando lados en movimiento de pedaleo.',
        categoria: 'fuerza',
        musculoPrincipal: 'Oblicuos / Abdominales',
        equipamiento: 'Ninguno',
        dificultad: 'intermedio',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_v_ups',
        nombre: 'V-ups',
        descripcion: 'Ejercicio abdominal avanzado que trabaja toda la faja abdominal.',
        instrucciones: 'Acostado boca arriba, elevar simultaneamente piernas y torso formando una V. Tocar los pies con las manos.',
        categoria: 'fuerza',
        musculoPrincipal: 'Abdominales',
        equipamiento: 'Ninguno',
        dificultad: 'intermedio',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_vertical_toe_touches',
        nombre: 'Tocar los pies vertical',
        descripcion: 'Ejercicio abdominal con piernas elevadas a 90 grados.',
        instrucciones: 'Acostado boca arriba con piernas verticales, elevar las manos hacia los pies contrayendo los abdominales.',
        categoria: 'fuerza',
        musculoPrincipal: 'Abdominales',
        equipamiento: 'Ninguno',
        dificultad: 'intermedio',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_standing_calf_raises',
        nombre: 'Elevacion de talones de pie en pared',
        descripcion: 'Fortalecimiento de pantorrillas con apoyo en pared.',
        instrucciones: 'De pie cerca de la pared para equilibrio, elevar los talones lo mas alto posible. Bajar lentamente.',
        categoria: 'fuerza',
        musculoPrincipal: 'Pantorrillas',
        equipamiento: 'Ninguno',
        dificultad: 'basico',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_ckc_parascapular',
        nombre: 'Ejercicios paraescapulares CKC',
        descripcion: 'Estabilizacion escapular en cadena cinematica cerrada.',
        instrucciones: 'En posicion de push-up, realizar protraccion y retraccion escapular sin flexionar los codos.',
        categoria: 'fuerza',
        musculoPrincipal: 'Escapulares / Hombros',
        equipamiento: 'Ninguno',
        dificultad: 'intermedio',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_side_plank_advanced',
        nombre: 'Plancha lateral avanzada',
        descripcion: 'Plancha lateral completa con mayor demanda de estabilidad.',
        instrucciones: 'Desde plancha lateral con piernas extendidas, mantener alineacion de cabeza a pies. Agregar elevacion de pierna.',
        categoria: 'fuerza',
        musculoPrincipal: 'Oblicuos / Gluteo medio',
        equipamiento: 'Ninguno',
        dificultad: 'avanzado',
        fechaCreacion: new Date().toISOString()
      },

      // --- MOVILIDAD ---
      {
        id: 'ace_cobra',
        nombre: 'Cobra',
        descripcion: 'Extension de columna para mejorar movilidad toracica y aliviar tension lumbar.',
        instrucciones: 'Acostado boca abajo, manos bajo los hombros, extender los brazos elevando el pecho. Caderas en el suelo.',
        categoria: 'movilidad',
        musculoPrincipal: 'Columna / Abdominales',
        equipamiento: 'Ninguno',
        dificultad: 'basico',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_downward_dog',
        nombre: 'Perro boca abajo (Downward Dog)',
        descripcion: 'Postura que estira toda la cadena posterior y fortalece hombros.',
        instrucciones: 'Desde cuadrupedia, elevar caderas formando una V invertida. Empujar talones hacia el suelo, brazos extendidos.',
        categoria: 'movilidad',
        musculoPrincipal: 'Cadena posterior / Hombros',
        equipamiento: 'Ninguno',
        dificultad: 'intermedio',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_hip_rotations_pushup',
        nombre: 'Rotaciones de cadera en posicion de push-up',
        descripcion: 'Movilidad de cadera manteniendo estabilidad de core.',
        instrucciones: 'En posicion de plancha alta, llevar una rodilla al codo del mismo lado y luego al codo opuesto. Alternar piernas.',
        categoria: 'movilidad',
        musculoPrincipal: 'Cadera / Core',
        equipamiento: 'Ninguno',
        dificultad: 'intermedio',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_high_plank_tspine',
        nombre: 'Rotacion toracica en plancha alta',
        descripcion: 'Movilidad de columna toracica con estabilizacion de core.',
        instrucciones: 'Desde plancha alta, rotar el torso levantando un brazo al techo. Seguir la mano con la mirada. Volver y alternar.',
        categoria: 'movilidad',
        musculoPrincipal: 'Columna toracica / Core',
        equipamiento: 'Ninguno',
        dificultad: 'avanzado',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_shoulder_packing',
        nombre: 'Empaquetamiento escapular (Shoulder Packing)',
        descripcion: 'Activacion de estabilizadores escapulares para mejor control del hombro.',
        instrucciones: 'De pie, deprimir y retraer las escapulas llevando los hombros hacia abajo y atras. Mantener 5-10 segundos.',
        categoria: 'movilidad',
        musculoPrincipal: 'Escapulares',
        equipamiento: 'Ninguno',
        dificultad: 'basico',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_shoulder_iytw',
        nombre: 'Serie de movilidad de hombro I-Y-T-W',
        descripcion: 'Secuencia de movimientos para estabilidad y movilidad del manguito rotador.',
        instrucciones: 'De pie o prono, formar letras I, Y, T y W con los brazos. Mantener cada posicion 5 segundos.',
        categoria: 'movilidad',
        musculoPrincipal: 'Manguito rotador / Deltoides',
        equipamiento: 'Ninguno',
        dificultad: 'intermedio',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_prone_scapular_iytwo',
        nombre: 'Serie escapular prona I-Y-T-W-O',
        descripcion: 'Estabilizacion escapular en posicion prona para fortalecer espalda alta.',
        instrucciones: 'Acostado boca abajo, realizar formaciones de brazos en I, Y, T, W y O levantando los brazos del suelo.',
        categoria: 'movilidad',
        musculoPrincipal: 'Romboides / Trapecio',
        equipamiento: 'Ninguno',
        dificultad: 'intermedio',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_side_lying_arm_rolls',
        nombre: 'Rotacion de brazos acostado de lado',
        descripcion: 'Movilidad toracica con apertura del pecho.',
        instrucciones: 'Acostado de lado con rodillas flexionadas, abrir el brazo superior en arco hacia el otro lado siguiendo con la mirada.',
        categoria: 'movilidad',
        musculoPrincipal: 'Columna toracica / Pectoral',
        equipamiento: 'Ninguno',
        dificultad: 'avanzado',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_spinal_twist_push_pull',
        nombre: 'Torsion espinal con empuje-traccion',
        descripcion: 'Rotacion toracica avanzada con movimiento de brazos.',
        instrucciones: 'De pie, rotar el torso empujando con un brazo y traccionando con el otro. Controlar el movimiento desde el core.',
        categoria: 'movilidad',
        musculoPrincipal: 'Columna / Oblicuos',
        equipamiento: 'Ninguno',
        dificultad: 'avanzado',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_standing_ankle_mob',
        nombre: 'Movilizacion de tobillo de pie',
        descripcion: 'Mejora la dorsiflexion del tobillo, esencial para sentadillas profundas.',
        instrucciones: 'De pie frente a la pared, pie adelantado, llevar la rodilla hacia la pared sin despegar el talon.',
        categoria: 'movilidad',
        musculoPrincipal: 'Tobillo',
        equipamiento: 'Ninguno',
        dificultad: 'intermedio',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_standing_gate_openers',
        nombre: 'Abridores de puerta (Gate Openers)',
        descripcion: 'Movilidad dinamica de cadera con rotacion interna y externa.',
        instrucciones: 'De pie, elevar la rodilla al frente y rotar la cadera abriendo hacia afuera. Volver y alternar.',
        categoria: 'movilidad',
        musculoPrincipal: 'Cadera',
        equipamiento: 'Ninguno',
        dificultad: 'intermedio',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_supine_pelvic_tilts',
        nombre: 'Basculacion pelvica supina',
        descripcion: 'Activacion de core profundo y movilidad lumbo-pelvica.',
        instrucciones: 'Acostado boca arriba con rodillas flexionadas, aplanar la zona lumbar contra el suelo y luego arquearla.',
        categoria: 'movilidad',
        musculoPrincipal: 'Core / Zona lumbar',
        equipamiento: 'Ninguno',
        dificultad: 'basico',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_supine_rotator_cuff',
        nombre: 'Manguito rotador supino',
        descripcion: 'Movilidad y activacion del manguito rotador acostado.',
        instrucciones: 'Acostado boca arriba, codo a 90°, rotar el antebrazo hacia adentro y afuera controladamente.',
        categoria: 'movilidad',
        musculoPrincipal: 'Manguito rotador',
        equipamiento: 'Ninguno',
        dificultad: 'basico',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_supine_shoulder_flexion',
        nombre: 'Flexion de hombro supina',
        descripcion: 'Movilidad de hombro en flexion con gravedad asistida.',
        instrucciones: 'Acostado boca arriba, elevar los brazos desde los lados hasta sobre la cabeza. Movimiento lento y controlado.',
        categoria: 'movilidad',
        musculoPrincipal: 'Hombro / Dorsal',
        equipamiento: 'Ninguno',
        dificultad: 'basico',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_supine_snow_angel',
        nombre: 'Angel de nieve supino',
        descripcion: 'Movilidad de hombro y activacion de estabilizadores escapulares.',
        instrucciones: 'Acostado boca arriba, deslizar los brazos por el suelo desde los costados hasta sobre la cabeza como hacer un angel de nieve.',
        categoria: 'movilidad',
        musculoPrincipal: 'Hombros / Escapulares',
        equipamiento: 'Ninguno',
        dificultad: 'basico',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_supine_spinal_twist',
        nombre: 'Torsion espinal supina con progresiones',
        descripcion: 'Rotacion toracica y estiramiento de oblicuos en posicion supina.',
        instrucciones: 'Acostado boca arriba, rodillas flexionadas, dejar caer ambas rodillas hacia un lado. Mantener hombros pegados al suelo.',
        categoria: 'movilidad',
        musculoPrincipal: 'Columna / Oblicuos',
        equipamiento: 'Ninguno',
        dificultad: 'intermedio',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_upward_dog',
        nombre: 'Perro boca arriba (Upward Dog)',
        descripcion: 'Extension de columna que abre el pecho y estira abdominales.',
        instrucciones: 'Desde prono, empujar con las manos elevando el torso y caderas del suelo. Hombros lejos de las orejas.',
        categoria: 'movilidad',
        musculoPrincipal: 'Columna / Pectoral',
        equipamiento: 'Ninguno',
        dificultad: 'basico',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_standing_triangle',
        nombre: 'Flexiones laterales en triangulo de pie',
        descripcion: 'Movilidad lateral del tronco y estiramiento de cadena lateral.',
        instrucciones: 'Piernas abiertas, inclinar el torso lateralmente deslizando la mano por la pierna. Brazo opuesto al techo.',
        categoria: 'movilidad',
        musculoPrincipal: 'Oblicuos / Espalda',
        equipamiento: 'Ninguno',
        dificultad: 'intermedio',
        fechaCreacion: new Date().toISOString()
      },

      // --- EQUILIBRIO ---
      {
        id: 'ace_contralateral_limb',
        nombre: 'Elevacion contralateral de extremidades',
        descripcion: 'Fortalecimiento de espalda baja y gluteos con control motor.',
        instrucciones: 'Acostado boca abajo, elevar brazo derecho y pierna izquierda simultaneamente. Mantener 3-5 segundos. Alternar.',
        categoria: 'equilibrio',
        musculoPrincipal: 'Espalda baja / Gluteos',
        equipamiento: 'Ninguno',
        dificultad: 'basico',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_single_leg_stand',
        nombre: 'Equilibrio en una pierna',
        descripcion: 'Ejercicio basico de propiocepcion y equilibrio.',
        instrucciones: 'De pie, elevar una rodilla a 90° y mantener el equilibrio. Ojos abiertos, luego progresar con ojos cerrados.',
        categoria: 'equilibrio',
        musculoPrincipal: 'Core / Tobillo',
        equipamiento: 'Ninguno',
        dificultad: 'basico',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_single_leg_squat',
        nombre: 'Sentadilla a una pierna (Pistol Squat)',
        descripcion: 'Sentadilla unilateral avanzada para fuerza y equilibrio.',
        instrucciones: 'De pie en una pierna, bajar el cuerpo controladamente con la otra pierna extendida al frente. Volver a subir.',
        categoria: 'equilibrio',
        musculoPrincipal: 'Cuadriceps / Gluteos',
        equipamiento: 'Ninguno',
        dificultad: 'intermedio',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_single_leg_rdl',
        nombre: 'Peso muerto rumano a una pierna',
        descripcion: 'Ejercicio unilateral para cadena posterior y equilibrio.',
        instrucciones: 'De pie en una pierna, inclinar el torso hacia adelante con la pierna libre extendiendose hacia atras. Volver controladamente.',
        categoria: 'equilibrio',
        musculoPrincipal: 'Isquiotibiales / Gluteos',
        equipamiento: 'Ninguno',
        dificultad: 'avanzado',
        fechaCreacion: new Date().toISOString()
      },

      // --- CARDIO ---
      {
        id: 'ace_cycled_split_squat_jump',
        nombre: 'Salto en tijera alternado',
        descripcion: 'Ejercicio pliometrico para potencia de piernas.',
        instrucciones: 'Desde posicion de zancada, saltar y cambiar las piernas en el aire. Aterrizar suavemente en zancada opuesta.',
        categoria: 'cardio',
        musculoPrincipal: 'Cuadriceps / Gluteos',
        equipamiento: 'Ninguno',
        dificultad: 'intermedio',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_forward_linear_jumps',
        nombre: 'Saltos lineales hacia adelante',
        descripcion: 'Saltos horizontales para desarrollar potencia y coordinacion.',
        instrucciones: 'De pie, saltar hacia adelante con ambos pies usando los brazos para impulsarse. Aterrizar con rodillas suaves.',
        categoria: 'cardio',
        musculoPrincipal: 'Piernas / Gluteos',
        equipamiento: 'Ninguno',
        dificultad: 'basico',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_jump_and_reach',
        nombre: 'Salto y alcance',
        descripcion: 'Salto vertical con extension completa del cuerpo.',
        instrucciones: 'Desde media sentadilla, saltar verticalmente alcanzando con ambos brazos al maximo. Aterrizar suavemente.',
        categoria: 'cardio',
        musculoPrincipal: 'Piernas / Gluteos',
        equipamiento: 'Ninguno',
        dificultad: 'intermedio',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_mountain_climbers',
        nombre: 'Escaladores (Mountain Climbers)',
        descripcion: 'Ejercicio cardiovascular de alta intensidad que trabaja todo el cuerpo.',
        instrucciones: 'En posicion de plancha alta, llevar rodillas al pecho alternadamente de forma rapida. Mantener caderas estables.',
        categoria: 'cardio',
        musculoPrincipal: 'Core / Piernas',
        equipamiento: 'Ninguno',
        dificultad: 'avanzado',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_squat_jump',
        nombre: 'Sentadilla con salto (Squat Jump)',
        descripcion: 'Ejercicio pliometrico para potencia de tren inferior.',
        instrucciones: 'Realizar una sentadilla y al subir explotar en un salto vertical. Aterrizar suavemente en sentadilla.',
        categoria: 'cardio',
        musculoPrincipal: 'Cuadriceps / Gluteos',
        equipamiento: 'Ninguno',
        dificultad: 'basico',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_tuck_jump',
        nombre: 'Salto con rodillas al pecho (Tuck Jump)',
        descripcion: 'Salto pliometrico avanzado con recogida de rodillas.',
        instrucciones: 'Saltar verticalmente y llevar las rodillas al pecho en el aire. Aterrizar suavemente con rodillas flexionadas.',
        categoria: 'cardio',
        musculoPrincipal: 'Piernas / Core',
        equipamiento: 'Ninguno',
        dificultad: 'intermedio',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_sprinter_pulls',
        nombre: 'Tirajes de velocista (Sprinter Pulls)',
        descripcion: 'Movimiento explosivo que simula la mecanica de carrera.',
        instrucciones: 'De pie, realizar movimiento de sprint en el lugar con enfasis en la traccion de brazos y elevacion de rodillas.',
        categoria: 'cardio',
        musculoPrincipal: 'Cuerpo completo',
        equipamiento: 'Ninguno',
        dificultad: 'intermedio',
        fechaCreacion: new Date().toISOString()
      },

      // --- FUNCIONAL ---
      {
        id: 'ace_bear_crawl',
        nombre: 'Gateo de oso (Bear Crawl)',
        descripcion: 'Movimiento funcional en cuadrupedia que trabaja todo el cuerpo.',
        instrucciones: 'En cuadrupedia con rodillas elevadas del suelo, avanzar moviendo brazo y pierna opuestos. Mantener espalda plana.',
        categoria: 'funcional',
        musculoPrincipal: 'Cuerpo completo',
        equipamiento: 'Ninguno',
        dificultad: 'intermedio',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_forward_lunge',
        nombre: 'Zancada frontal (Forward Lunge)',
        descripcion: 'Ejercicio funcional de tren inferior con enfasis en control y estabilidad.',
        instrucciones: 'Dar un paso largo al frente, bajar hasta que ambas rodillas esten a 90°. Empujar con el pie delantero para volver.',
        categoria: 'funcional',
        musculoPrincipal: 'Cuadriceps / Gluteos',
        equipamiento: 'Ninguno',
        dificultad: 'intermedio',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_forward_lunge_arm_drivers',
        nombre: 'Zancada con conductores de brazos',
        descripcion: 'Zancada avanzada con movimiento de brazos para mayor desafio de equilibrio.',
        instrucciones: 'Realizar zancada frontal con brazos extendidos al frente, luego rotarlos sobre la cabeza durante el movimiento.',
        categoria: 'funcional',
        musculoPrincipal: 'Piernas / Core',
        equipamiento: 'Ninguno',
        dificultad: 'avanzado',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_glute_activation_lunges',
        nombre: 'Zancadas con activacion glutea',
        descripcion: 'Variante de zancada con enfasis en activacion de gluteos.',
        instrucciones: 'Realizar zancada profunda con inclinacion del torso hacia adelante para maximizar la activacion glutea.',
        categoria: 'funcional',
        musculoPrincipal: 'Gluteos / Cuadriceps',
        equipamiento: 'Ninguno',
        dificultad: 'avanzado',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_inchworms',
        nombre: 'Gusano (Inchworm)',
        descripcion: 'Movimiento funcional que trabaja flexibilidad y fuerza de todo el cuerpo.',
        instrucciones: 'De pie, inclinarse y caminar con las manos al frente hasta plancha. Volver caminando con los pies hacia las manos.',
        categoria: 'funcional',
        musculoPrincipal: 'Cuerpo completo',
        equipamiento: 'Ninguno',
        dificultad: 'avanzado',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_inverted_flyers',
        nombre: 'Voladores invertidos (Inverted Flyers)',
        descripcion: 'Ejercicio unilateral para cadena posterior y equilibrio dinamico.',
        instrucciones: 'Desde una pierna, inclinar el torso y abrir los brazos lateralmente como un avion. Volver controladamente.',
        categoria: 'funcional',
        musculoPrincipal: 'Cadena posterior / Core',
        equipamiento: 'Ninguno',
        dificultad: 'avanzado',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_lateral_crawls',
        nombre: 'Gateo lateral',
        descripcion: 'Movimiento en cuadrupedia lateral para coordinacion y estabilidad.',
        instrucciones: 'En posicion de bear crawl, desplazarse lateralmente moviendo mano y pie del mismo lado. Mantener caderas bajas.',
        categoria: 'funcional',
        musculoPrincipal: 'Cuerpo completo',
        equipamiento: 'Ninguno',
        dificultad: 'intermedio',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_lateral_over_unders',
        nombre: 'Desplazamiento lateral sobre y bajo',
        descripcion: 'Movimiento lateral combinando pasos altos y agachados.',
        instrucciones: 'Imaginar obstaculos a la altura de la cadera. Pasar sobre uno y agacharse bajo el siguiente lateralmente.',
        categoria: 'funcional',
        musculoPrincipal: 'Piernas / Cadera',
        equipamiento: 'Ninguno',
        dificultad: 'intermedio',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_lunge_elbow_instep',
        nombre: 'Zancada con codo al empeine',
        descripcion: 'Movilidad dinamica que combina zancada con apertura de cadera.',
        instrucciones: 'Dar una zancada profunda, llevar el codo hacia el empeine del pie delantero, luego rotar abriendo el brazo al techo.',
        categoria: 'funcional',
        musculoPrincipal: 'Cadera / Columna toracica',
        equipamiento: 'Ninguno',
        dificultad: 'intermedio',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_plank_knee_drag',
        nombre: 'Plancha con arrastre de rodilla',
        descripcion: 'Ejercicio de core dinamico desde posicion de plancha.',
        instrucciones: 'Desde plancha alta, arrastrar una rodilla hacia el codo del mismo lado. Alternar piernas manteniendo caderas estables.',
        categoria: 'funcional',
        musculoPrincipal: 'Core / Cadera',
        equipamiento: 'Ninguno',
        dificultad: 'intermedio',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_side_lunge',
        nombre: 'Zancada lateral (Side Lunge)',
        descripcion: 'Ejercicio funcional en el plano frontal para aductores y cuadriceps.',
        instrucciones: 'Dar un paso amplio hacia el lado, flexionar la rodilla de la pierna que avanza. Mantener la otra pierna extendida.',
        categoria: 'funcional',
        musculoPrincipal: 'Aductores / Cuadriceps',
        equipamiento: 'Ninguno',
        dificultad: 'intermedio',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_single_arm_single_leg_plank',
        nombre: 'Plancha con un brazo y una pierna',
        descripcion: 'Plancha extrema con soporte minimo, maximo desafio de estabilidad.',
        instrucciones: 'Desde plancha alta, levantar un brazo y la pierna opuesta. Mantener el cuerpo estable sin rotacion.',
        categoria: 'funcional',
        musculoPrincipal: 'Core / Cuerpo completo',
        equipamiento: 'Ninguno',
        dificultad: 'avanzado',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_spider_walks',
        nombre: 'Caminata de arana (Spider Walks)',
        descripcion: 'Movimiento funcional que combina fuerza de tren superior y movilidad de cadera.',
        instrucciones: 'Desde plancha alta, dar pasos con manos y pies alternadamente, llevando la rodilla hacia el codo.',
        categoria: 'funcional',
        musculoPrincipal: 'Cuerpo completo',
        equipamiento: 'Ninguno',
        dificultad: 'intermedio',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_sumo_rotational_squat',
        nombre: 'Sentadilla sumo con rotacion',
        descripcion: 'Sentadilla amplia con componente rotacional.',
        instrucciones: 'Pies mas abiertos que los hombros, puntas hacia afuera. Bajar en sentadilla y al subir rotar el torso. Alternar lados.',
        categoria: 'funcional',
        musculoPrincipal: 'Cuadriceps / Aductores / Core',
        equipamiento: 'Ninguno',
        dificultad: 'intermedio',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_warrior_i',
        nombre: 'Guerrero I (Warrior I)',
        descripcion: 'Postura de yoga que combina fuerza, equilibrio y flexibilidad.',
        instrucciones: 'Piernas en zancada, pie trasero a 45°, caderas al frente. Elevar ambos brazos sobre la cabeza. Mantener 20-30 segundos.',
        categoria: 'funcional',
        musculoPrincipal: 'Piernas / Cadera / Core',
        equipamiento: 'Ninguno',
        dificultad: 'basico',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_partner_squats',
        nombre: 'Sentadilla asistida en pareja',
        descripcion: 'Sentadilla con asistencia para principiantes o rehabilitacion.',
        instrucciones: 'Frente a un companero tomados de las manos, realizar sentadillas simultaneas usando el agarre como soporte.',
        categoria: 'funcional',
        musculoPrincipal: 'Cuadriceps / Gluteos',
        equipamiento: 'Ninguno',
        dificultad: 'basico',
        fechaCreacion: new Date().toISOString()
      },

      // --- REHABILITACION ---
      {
        id: 'ace_dirty_dog',
        nombre: 'Perro sucio (Dirty Dog)',
        descripcion: 'Activacion de gluteo medio y estabilizacion de cadera.',
        instrucciones: 'En cuadrupedia, elevar una rodilla lateralmente manteniendo 90° de flexion. No rotar la pelvis.',
        categoria: 'rehabilitacion',
        musculoPrincipal: 'Gluteo medio',
        equipamiento: 'Ninguno',
        dificultad: 'basico',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_glute_bridge_single_leg',
        nombre: 'Puente gluteo progresion unilateral',
        descripcion: 'Progresion del puente de gluteo hacia trabajo unilateral.',
        instrucciones: 'Acostado boca arriba, una pierna extendida. Elevar la cadera con una sola pierna. Mantener la pelvis nivelada.',
        categoria: 'rehabilitacion',
        musculoPrincipal: 'Gluteos / Isquiotibiales',
        equipamiento: 'Ninguno',
        dificultad: 'intermedio',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_quadruped_hip_ext',
        nombre: 'Extension de cadera en cuadrupedia',
        descripcion: 'Fortalecimiento de gluteo maximo con control pelvico.',
        instrucciones: 'En cuadrupedia, extender una pierna hacia atras con rodilla flexionada a 90°. Apretar el gluteo arriba.',
        categoria: 'rehabilitacion',
        musculoPrincipal: 'Gluteo maximo',
        equipamiento: 'Ninguno',
        dificultad: 'basico',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_side_lying_abduction',
        nombre: 'Abduccion de cadera acostado de lado',
        descripcion: 'Fortalecimiento aislado del gluteo medio.',
        instrucciones: 'Acostado de lado, elevar la pierna superior manteniendo la rodilla extendida. No rotar la pelvis.',
        categoria: 'rehabilitacion',
        musculoPrincipal: 'Gluteo medio',
        equipamiento: 'Ninguno',
        dificultad: 'basico',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_side_lying_adduction',
        nombre: 'Aduccion de cadera acostado de lado',
        descripcion: 'Fortalecimiento de aductores de cadera.',
        instrucciones: 'Acostado de lado, pierna superior cruzada al frente. Elevar la pierna inferior manteniendo la rodilla extendida.',
        categoria: 'rehabilitacion',
        musculoPrincipal: 'Aductores',
        equipamiento: 'Ninguno',
        dificultad: 'basico',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_supine_dead_bug',
        nombre: 'Bicho muerto (Dead Bug)',
        descripcion: 'Ejercicio de control motor para activacion de core profundo.',
        instrucciones: 'Acostado boca arriba, brazos al techo y rodillas a 90°. Extender brazo y pierna opuestos. Mantener lumbar pegada al suelo.',
        categoria: 'rehabilitacion',
        musculoPrincipal: 'Core profundo',
        equipamiento: 'Ninguno',
        dificultad: 'basico',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_supine_hollowing',
        nombre: 'Vaciamiento abdominal con movimiento de piernas',
        descripcion: 'Activacion del transverso abdominal con movimiento de extremidades.',
        instrucciones: 'Acostado boca arriba, activar el transverso (ombligo hacia adentro). Realizar movimientos de piernas sin perder la activacion.',
        categoria: 'rehabilitacion',
        musculoPrincipal: 'Transverso abdominal',
        equipamiento: 'Ninguno',
        dificultad: 'basico',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_supine_reverse_marches',
        nombre: 'Marchas inversas supinas',
        descripcion: 'Control motor de core con movimiento alterno de piernas.',
        instrucciones: 'Acostado boca arriba con rodillas a 90°, bajar un pie al suelo alternadamente sin perder la posicion neutra de la columna.',
        categoria: 'rehabilitacion',
        musculoPrincipal: 'Core / Flexores de cadera',
        equipamiento: 'Ninguno',
        dificultad: 'basico',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ace_supermans',
        nombre: 'Superman',
        descripcion: 'Fortalecimiento de la musculatura extensora de la columna.',
        instrucciones: 'Acostado boca abajo, elevar simultaneamente brazos y piernas del suelo. Mantener 3-5 segundos. Bajar controladamente.',
        categoria: 'rehabilitacion',
        musculoPrincipal: 'Erectores espinales / Gluteos',
        equipamiento: 'Ninguno',
        dificultad: 'basico',
        fechaCreacion: new Date().toISOString()
      }
    ];
  }
}
