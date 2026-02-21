import { Component, OnInit } from '@angular/core';
import { AlertController, NavController, ToastController, ModalController } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { EjerciciosService } from '../../services/ejercicios.service';
import { DatabaseService } from '../../services/database.service';
import {
  EjercicioLocal,
  EjercicioEnRutina,
  RutinaEjercicios,
  SerieEjercicio,
  CategoriaEjercicio,
  HistorialEjercicio
} from '../../models/interfaces';

@Component({
  selector: 'app-ejercicios',
  templateUrl: './ejercicios.page.html',
  styleUrls: ['./ejercicios.page.scss'],
  standalone: false
})
export class EjerciciosPage implements OnInit {
  // Datos del paciente
  pacienteId: string = '';
  pacienteNombre: string = '';
  pacienteTelefono: string = '';

  // Vista actual
  vista: 'rutina' | 'biblioteca' | 'historial' = 'rutina';

  // Rutina activa
  rutinaActiva: RutinaEjercicios | null = null;
  rutinasAnteriores: RutinaEjercicios[] = [];

  // Biblioteca
  ejerciciosBiblioteca: EjercicioLocal[] = [];
  ejerciciosFiltrados: EjercicioLocal[] = [];
  terminoBusqueda: string = '';
  categoriaFiltro: CategoriaEjercicio | '' = '';
  categorias = this.ejerciciosService.getCategorias();

  // Estado UI
  ejerciciosExpandidos: Set<number> = new Set();
  sesionIniciada: boolean = false;

  // Historial
  historialEjercicio: HistorialEjercicio[] = [];
  ejercicioHistorialNombre: string = '';

  // Selector de pacientes
  listaPacientes: any[] = [];

  // Nuevo/editar ejercicio
  mostrarFormNuevo: boolean = false;
  nuevoEjercicio = this.getEjercicioVacio();
  editandoEjercicioId: string | null = null;

  constructor(
    private ejerciciosService: EjerciciosService,
    private databaseService: DatabaseService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private navCtrl: NavController,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.pacienteId = params['pacienteId'] || '';
      this.pacienteNombre = params['pacienteNombre'] || '';
    });
    this.cargarDatos();
  }

  ionViewDidEnter() {
    this.cargarDatos();
    this.cargarPacientes();
  }

  private async cargarPacientes() {
    try {
      this.listaPacientes = await this.databaseService.getPacientes();
      // Si ya tenemos pacienteId, cargar su teléfono
      if (this.pacienteId && this.pacienteId !== 'general') {
        const p = this.listaPacientes.find((pac: any) => String(pac.id) === String(this.pacienteId));
        if (p?.telefono) {
          this.pacienteTelefono = p.telefono;
        }
      }
    } catch {}
  }

  seleccionarPaciente(paciente: any) {
    this.pacienteId = String(paciente.id);
    this.pacienteNombre = paciente.nombre || `${paciente.nombre_completo || ''}`.trim();
    this.pacienteTelefono = paciente.telefono || '';
    this.cargarDatos();
  }

  cargarDatos() {
    this.ejerciciosBiblioteca = this.ejerciciosService.getEjercicios();
    this.ejerciciosFiltrados = [...this.ejerciciosBiblioteca];

    const id = this.pacienteId || 'general';
    const rutinas = this.ejerciciosService.getRutinasPorPaciente(id);
    this.rutinaActiva = rutinas.find(r => !r.completada) || null;
    this.rutinasAnteriores = rutinas.filter(r => r.completada);
  }

  // ==================== NAVEGACIÓN VISTAS ====================

  cambiarVista(vista: 'rutina' | 'biblioteca' | 'historial') {
    this.vista = vista;
    if (vista === 'biblioteca') {
      this.ejerciciosFiltrados = [...this.ejerciciosBiblioteca];
      this.terminoBusqueda = '';
      this.categoriaFiltro = '';
    }
  }

  // ==================== RUTINA ====================

  async crearNuevaRutina() {
    if (!this.pacienteId) {
      this.pacienteId = 'general';
      this.pacienteNombre = this.pacienteNombre || 'Sin paciente';
    }

    const alert = await this.alertCtrl.create({
      header: 'Nueva Rutina',
      inputs: [
        {
          name: 'nombre',
          type: 'text',
          placeholder: 'Nombre de la rutina',
          value: `Rutina ${new Date().toLocaleDateString('es-CL')}`
        }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Crear',
          handler: (data) => {
            if (!data.nombre?.trim()) return false;
            this.rutinaActiva = this.ejerciciosService.crearRutina(
              this.pacienteId, data.nombre.trim(), this.pacienteNombre
            );
            this.mostrarToast('Rutina creada. Agrega ejercicios.', 'success');
            // Ir a biblioteca para que agregue ejercicios
            this.cambiarVista('biblioteca');
            return true;
          }
        }
      ]
    });
    await alert.present();
  }

  toggleEjercicioExpandido(idx: number) {
    if (this.ejerciciosExpandidos.has(idx)) {
      this.ejerciciosExpandidos.delete(idx);
    } else {
      this.ejerciciosExpandidos.add(idx);
    }
  }

  isExpandido(idx: number): boolean {
    return this.ejerciciosExpandidos.has(idx);
  }

  iniciarSesionEjercicios() {
    this.sesionIniciada = true;
    // Expandir todos al iniciar
    if (this.rutinaActiva) {
      this.rutinaActiva.ejercicios.forEach((_, i) => this.ejerciciosExpandidos.add(i));
    }
    this.mostrarToast('Sesion iniciada', 'primary');
  }

  // Series
  onRepChange(ejercicioIdx: number, serieIdx: number, valor: string) {
    if (!this.rutinaActiva) return;
    const reps = valor ? parseInt(valor, 10) : null;
    this.ejerciciosService.actualizarSerie(
      this.pacienteId, this.rutinaActiva.id, ejercicioIdx, serieIdx, { repeticiones: reps }
    );
    this.rutinaActiva.ejercicios[ejercicioIdx].series[serieIdx].repeticiones = reps;
  }

  onPesoChange(ejercicioIdx: number, serieIdx: number, valor: string) {
    if (!this.rutinaActiva) return;
    const peso = valor ? parseFloat(valor) : null;
    this.ejerciciosService.actualizarSerie(
      this.pacienteId, this.rutinaActiva.id, ejercicioIdx, serieIdx, { peso }
    );
    this.rutinaActiva.ejercicios[ejercicioIdx].series[serieIdx].peso = peso;
  }

  toggleSerie(ejercicioIdx: number, serieIdx: number) {
    if (!this.rutinaActiva || !this.sesionIniciada) return;
    const completada = this.ejerciciosService.toggleSerieCompletada(
      this.pacienteId, this.rutinaActiva.id, ejercicioIdx, serieIdx
    );
    this.rutinaActiva.ejercicios[ejercicioIdx].series[serieIdx].completada = completada;
  }

  cumplimentarTodas(ejercicioIdx: number) {
    if (!this.rutinaActiva || !this.sesionIniciada) return;
    this.ejerciciosService.cumplimentarTodas(
      this.pacienteId, this.rutinaActiva.id, ejercicioIdx
    );
    // Recargar estado
    const rutina = this.ejerciciosService.getRutina(this.pacienteId, this.rutinaActiva.id);
    if (rutina) {
      this.rutinaActiva.ejercicios[ejercicioIdx].series = rutina.ejercicios[ejercicioIdx].series;
    }
  }

  todasSeriesCompletadas(ejercicioIdx: number): boolean {
    if (!this.rutinaActiva) return false;
    return this.rutinaActiva.ejercicios[ejercicioIdx].series.every(s => s.completada);
  }

  getSeriesCompletadas(ejercicioIdx: number): number {
    if (!this.rutinaActiva) return 0;
    return this.rutinaActiva.ejercicios[ejercicioIdx].series.filter(s => s.completada).length;
  }

  getProgresoRutina(): number {
    if (!this.rutinaActiva) return 0;
    let total = 0, completadas = 0;
    this.rutinaActiva.ejercicios.forEach(ej => {
      total += ej.series.length;
      completadas += ej.series.filter(s => s.completada).length;
    });
    return total > 0 ? Math.round((completadas / total) * 100) : 0;
  }

  async agregarSerieAEjercicio(ejercicioIdx: number) {
    if (!this.rutinaActiva) return;
    const ej = this.rutinaActiva.ejercicios[ejercicioIdx];
    const ultimaSerie = ej.series[ej.series.length - 1];
    ej.series.push({
      numero: ej.series.length + 1,
      repeticiones: ultimaSerie?.repeticiones || 12,
      peso: ultimaSerie?.peso || null,
      completada: false
    });
    this.ejerciciosService.actualizarSerie(
      this.pacienteId, this.rutinaActiva.id, ejercicioIdx, ej.series.length - 1,
      ej.series[ej.series.length - 1]
    );
  }

  async eliminarEjercicioDeRutina(ejercicioIdx: number) {
    if (!this.rutinaActiva) return;
    const ej = this.rutinaActiva.ejercicios[ejercicioIdx];
    const alert = await this.alertCtrl.create({
      header: 'Eliminar ejercicio',
      message: `Quitar "${ej.ejercicio.nombre}" de la rutina?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          cssClass: 'danger',
          handler: () => {
            this.ejerciciosService.eliminarEjercicioDeRutina(
              this.pacienteId, this.rutinaActiva!.id, ejercicioIdx
            );
            this.rutinaActiva!.ejercicios.splice(ejercicioIdx, 1);
            this.rutinaActiva!.ejercicios.forEach((e, i) => e.letra = String.fromCharCode(65 + i));
            this.ejerciciosExpandidos.delete(ejercicioIdx);
          }
        }
      ]
    });
    await alert.present();
  }

  async completarRutina() {
    if (!this.rutinaActiva) return;
    const progreso = this.getProgresoRutina();

    const alert = await this.alertCtrl.create({
      header: 'Finalizar rutina',
      message: progreso < 100
        ? `Progreso: ${progreso}%. Algunas series no estan completadas. Finalizar de todas formas?`
        : 'Todas las series completadas. Finalizar rutina?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Finalizar',
          handler: () => {
            this.ejerciciosService.completarRutina(this.pacienteId, this.rutinaActiva!.id);
            this.mostrarToast('Rutina completada', 'success');
            this.sesionIniciada = false;
            this.ejerciciosExpandidos.clear();
            this.cargarDatos();
          }
        }
      ]
    });
    await alert.present();
  }

  // ==================== BIBLIOTECA ====================

  filtrarEjercicios() {
    let resultado = [...this.ejerciciosBiblioteca];

    if (this.terminoBusqueda.trim()) {
      resultado = this.ejerciciosService.buscarEjercicios(this.terminoBusqueda);
    }

    if (this.categoriaFiltro) {
      resultado = resultado.filter(e => e.categoria === this.categoriaFiltro);
    }

    this.ejerciciosFiltrados = resultado;
  }

  filtrarPorCategoria(cat: CategoriaEjercicio | '') {
    this.categoriaFiltro = this.categoriaFiltro === cat ? '' : cat;
    this.filtrarEjercicios();
  }

  async agregarARutina(ejercicio: EjercicioLocal) {
    // Si no hay pacienteId, usar uno genérico para rutinas sin paciente
    if (!this.pacienteId) {
      this.pacienteId = 'general';
      this.pacienteNombre = this.pacienteNombre || 'Sin paciente';
    }

    if (!this.rutinaActiva) {
      // Crear rutina automáticamente
      this.rutinaActiva = this.ejerciciosService.crearRutina(
        this.pacienteId,
        `Rutina ${new Date().toLocaleDateString('es-CL')}`,
        this.pacienteNombre
      );
    }

    // Verificar si ya está en la rutina
    if (this.rutinaActiva.ejercicios.some(e => e.ejercicioId === ejercicio.id)) {
      this.mostrarToast('Este ejercicio ya esta en la rutina', 'warning');
      return;
    }

    const alert = await this.alertCtrl.create({
      header: 'Agregar a rutina',
      subHeader: ejercicio.nombre,
      inputs: [
        { name: 'series', type: 'number', placeholder: 'Series', value: '3', min: 1, max: 10 },
        { name: 'repeticiones', type: 'number', placeholder: 'Repeticiones', value: '12', min: 1, max: 100 },
        { name: 'descanso', type: 'number', placeholder: 'Descanso (seg)', value: '60', min: 0, max: 300 }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Agregar',
          handler: (data) => {
            this.ejerciciosService.agregarEjercicioARutina(
              this.pacienteId,
              this.rutinaActiva!.id,
              ejercicio.id,
              parseInt(data.series) || 3,
              parseInt(data.repeticiones) || 12,
              parseInt(data.descanso) || 60
            );
            // Recargar rutina
            this.rutinaActiva = this.ejerciciosService.getRutina(this.pacienteId, this.rutinaActiva!.id) || null;
            this.mostrarToast(`"${ejercicio.nombre}" agregado a la rutina`, 'success');
            this.cambiarVista('rutina');
          }
        }
      ]
    });
    await alert.present();
  }

  abrirVideo(videoUrl: string) {
    if (videoUrl) {
      window.open(videoUrl, '_blank');
    }
  }

  getVideoThumbnail(url: string): string {
    return this.ejerciciosService.getVideoThumbnail(url);
  }

  getIconoCategoria(cat: CategoriaEjercicio): string {
    return this.ejerciciosService.getIconoCategoria(cat);
  }

  getColorCategoria(cat: CategoriaEjercicio): string {
    return this.ejerciciosService.getColorCategoria(cat);
  }

  // ==================== CREAR/EDITAR EJERCICIO ====================

  toggleFormNuevo() {
    this.mostrarFormNuevo = !this.mostrarFormNuevo;
    if (this.mostrarFormNuevo) {
      this.editandoEjercicioId = null;
      this.nuevoEjercicio = this.getEjercicioVacio();
    }
  }

  editarEjercicio(ejercicio: EjercicioLocal) {
    this.editandoEjercicioId = ejercicio.id;
    this.nuevoEjercicio = {
      nombre: ejercicio.nombre,
      descripcion: ejercicio.descripcion,
      instrucciones: ejercicio.instrucciones || '',
      categoria: ejercicio.categoria,
      musculoPrincipal: ejercicio.musculoPrincipal,
      equipamiento: ejercicio.equipamiento,
      videoUrl: ejercicio.videoUrl || '',
      dificultad: ejercicio.dificultad
    };
    this.mostrarFormNuevo = true;
  }

  guardarNuevoEjercicio() {
    if (!this.nuevoEjercicio.nombre.trim()) {
      this.mostrarToast('El nombre es obligatorio', 'warning');
      return;
    }

    if (this.editandoEjercicioId) {
      this.ejerciciosService.actualizarEjercicio(this.editandoEjercicioId, this.nuevoEjercicio);
      this.mostrarToast('Ejercicio actualizado', 'success');
      this.editandoEjercicioId = null;
    } else {
      this.ejerciciosService.agregarEjercicio(this.nuevoEjercicio);
      this.mostrarToast('Ejercicio creado', 'success');
    }
    this.mostrarFormNuevo = false;
    this.cargarDatos();
    this.filtrarEjercicios();
  }

  async eliminarEjercicioBiblioteca(ejercicio: EjercicioLocal) {
    const alert = await this.alertCtrl.create({
      header: 'Eliminar ejercicio',
      message: `Eliminar "${ejercicio.nombre}" de la biblioteca?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          cssClass: 'danger',
          handler: () => {
            this.ejerciciosService.eliminarEjercicio(ejercicio.id);
            this.cargarDatos();
            this.filtrarEjercicios();
            this.mostrarToast('Ejercicio eliminado', 'medium');
          }
        }
      ]
    });
    await alert.present();
  }

  private getEjercicioVacio() {
    return {
      nombre: '',
      descripcion: '',
      instrucciones: '',
      categoria: 'rehabilitacion' as CategoriaEjercicio,
      musculoPrincipal: '',
      equipamiento: 'Ninguno',
      videoUrl: '',
      dificultad: 'basico' as 'basico' | 'intermedio' | 'avanzado'
    };
  }

  // ==================== HISTORIAL ====================

  verHistorial(ejercicioId: string, nombre: string) {
    this.ejercicioHistorialNombre = nombre;
    this.historialEjercicio = this.ejerciciosService.getHistorial(ejercicioId);
    this.vista = 'historial';
  }

  // ==================== WHATSAPP ====================

  async enviarWhatsappConNumero(rutina: RutinaEjercicios | null) {
    if (!rutina) return;

    // Si tenemos teléfono del paciente, enviar directo
    if (this.pacienteTelefono) {
      this.ejerciciosService.enviarPorWhatsapp(rutina, this.pacienteTelefono);
      this.mostrarToast('Abriendo WhatsApp...', 'success');
      return;
    }

    // Si no hay teléfono, preguntar
    const alert = await this.alertCtrl.create({
      header: 'Enviar por WhatsApp',
      message: rutina.nombre,
      inputs: [
        {
          name: 'telefono',
          type: 'tel',
          placeholder: 'Ej: +56912345678'
        }
      ],
      buttons: [
        {
          text: 'Sin numero',
          handler: () => {
            this.ejerciciosService.enviarPorWhatsapp(rutina);
            this.mostrarToast('Abriendo WhatsApp...', 'success');
          }
        },
        {
          text: 'Enviar',
          handler: (data) => {
            this.ejerciciosService.enviarPorWhatsapp(rutina, data.telefono || undefined);
            this.mostrarToast('Abriendo WhatsApp...', 'success');
          }
        }
      ]
    });
    await alert.present();
  }

  // ==================== UTILIDADES ====================

  volverAtras() {
    // Re-setear ID para que paciente-detalle lo encuentre al volver
    if (this.pacienteId && this.pacienteId !== 'general') {
      localStorage.setItem('ver_paciente_id', this.pacienteId);
    }
    this.navCtrl.back();
  }

  private async mostrarToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      position: 'bottom',
      color
    });
    await toast.present();
  }

  trackByEjercicio(index: number, item: EjercicioEnRutina): string {
    return item.ejercicioId;
  }

  estaEnRutina(ejercicioId: string): boolean {
    return !!this.rutinaActiva?.ejercicios.some(e => e.ejercicioId === ejercicioId);
  }

  trackByEjercicioLocal(index: number, item: EjercicioLocal): string {
    return item.id;
  }

  trackBySerie(index: number, item: SerieEjercicio): number {
    return item.numero;
  }
}
