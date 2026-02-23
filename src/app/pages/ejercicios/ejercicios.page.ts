import { Component, OnInit, OnDestroy } from '@angular/core';
import {
  AlertController,
  NavController,
  ToastController,
  IonicModule
} from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { Subscription } from 'rxjs';

import { DatabaseService } from '../../services/database.service';
import { EjerciciosFirestoreService } from '../../services/EjerciciosFirestoreService.service';
import { RutinasFirestoreService } from '../../services/rutinas-firestore.service';

import {
  EjercicioLocal,
  CategoriaEjercicio,
  RutinaEjercicios,
  EjercicioEnRutina,
  SerieEjercicio
} from '../../models/interfaces';

@Component({
  selector: 'app-ejercicios',
  templateUrl: './ejercicios.page.html',
  styleUrls: ['./ejercicios.page.scss'],
  standalone: true,
  imports: [IonicModule, FormsModule, DatePipe]
})
export class EjerciciosPage implements OnInit, OnDestroy {

  pacienteId = '';
  pacienteNombre = '';
  pacienteTelefono = '';

  vista: 'rutina' | 'rutinas' | 'biblioteca' | 'historial' = 'rutinas';

  rutinaActiva: RutinaEjercicios | null = null;
  rutinasAnteriores: RutinaEjercicios[] = [];

  ejerciciosBiblioteca: EjercicioLocal[] = [];
  ejerciciosFiltrados: EjercicioLocal[] = [];
  terminoBusqueda = '';
  categoriaFiltro: CategoriaEjercicio | '' = '';

  ejerciciosExpandidos: Set<number> = new Set();
  sesionIniciada = false;

  historialEjercicio: any[] = [];
  ejercicioHistorialNombre = '';

  listaPacientes: any[] = [];
  pacientesFiltrados: any[] = [];
  busquedaPaciente = '';
  plantillas: any[] = [];
  todasLasRutinas: any[] = [];
  rutinasExpandidas = new Set<string>();

  mostrarFormNuevo = false;
  editandoEjercicioId: string | null = null;

  nuevoEjercicio: Partial<EjercicioLocal> = this.getEjercicioVacio();

  categorias: {
    valor: CategoriaEjercicio;
    nombre: string;
    color: string;
    icono: string;
  }[] = [
    { valor: 'fuerza', nombre: 'Fuerza', color: '#ef4444', icono: 'barbell-outline' },
    { valor: 'movilidad', nombre: 'Movilidad', color: '#3b82f6', icono: 'walk-outline' },
    { valor: 'rehabilitacion', nombre: 'Rehabilitación', color: '#10b981', icono: 'medkit-outline' },
    { valor: 'equilibrio', nombre: 'Equilibrio', color: '#f59e0b', icono: 'body-outline' },
    { valor: 'cardio', nombre: 'Cardio', color: '#ec4899', icono: 'heart-outline' },
    { valor: 'funcional', nombre: 'Funcional', color: '#6366f1', icono: 'fitness-outline' },
    { valor: 'estiramiento', nombre: 'Estiramiento', color: '#14b8a6', icono: 'accessibility-outline' }
  ];

  private subs: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private navCtrl: NavController,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private databaseService: DatabaseService,
    private ejerciciosService: EjerciciosFirestoreService,
    private rutinasService: RutinasFirestoreService
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.pacienteId = params['pacienteId'] || '';
      this.pacienteNombre = params['pacienteNombre'] || '';

      this.cargarPacientes();
      this.cargarBiblioteca();

      if (this.pacienteId) {
        this.cargarRutinasPaciente();
      }

      this.cargarTodasLasRutinas();
    });
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
  }

  // ================= PACIENTES =================

  async cargarPacientes() {
    this.listaPacientes = await this.databaseService.getPacientes();
    this.pacientesFiltrados = [...this.listaPacientes];
  }

  filtrarPacientes() {
    const t = this.busquedaPaciente.toLowerCase();
    this.pacientesFiltrados = this.listaPacientes.filter(p =>
      (p.nombre || '').toLowerCase().includes(t)
    );
  }

  seleccionarPaciente(p: any) {
    this.pacienteId = p.id;
    this.pacienteNombre = p.nombre;
    this.pacienteTelefono = p.telefono || '';
    this.cargarRutinas();
  }

  // ================= BIBLIOTECA =================

  cargarBiblioteca() {
    const sub = this.ejerciciosService.getEjercicios()
      .subscribe(ejs => {
        this.ejerciciosBiblioteca = ejs;
        this.ejerciciosFiltrados = [...ejs];
      });

    this.subs.push(sub);
  }

  filtrarEjercicios() {
    let resultado = [...this.ejerciciosBiblioteca];

    if (this.terminoBusqueda.trim()) {
      const t = this.terminoBusqueda.toLowerCase();
      resultado = resultado.filter(e =>
        e.nombre.toLowerCase().includes(t)
      );
    }

    if (this.categoriaFiltro) {
      resultado = resultado.filter(e =>
        e.categoria === this.categoriaFiltro
      );
    }

    this.ejerciciosFiltrados = resultado;
  }

  filtrarPorCategoria(cat: CategoriaEjercicio | '') {
    this.categoriaFiltro = this.categoriaFiltro === cat ? '' : cat;
    this.filtrarEjercicios();
  }

  // ================= RUTINAS =================

  cargarRutinas() {

      // 🧠 SI NO HAY PACIENTE
      if (!this.pacienteId) {

        const sub = this.rutinasService
          .getRutinasGeneralesRealtime()
          .subscribe((rutinas: any[]) => {

            this.rutinaActiva =
              rutinas.find(r => !r.completada) || null;

            this.rutinasAnteriores =
              rutinas.filter(r => r.completada);

          });

        this.subs.push(sub);
        return;
      }

      // 🧠 SI HAY PACIENTE
      const sub = this.rutinasService
        .getRutinasPorPacienteRealtime(this.pacienteId)
        .subscribe((rutinas: any[]) => {

          this.rutinaActiva =
            rutinas.find(r => !r.completada) || null;

          this.rutinasAnteriores =
            rutinas.filter(r => r.completada);

        });

      this.subs.push(sub);
    }

  async completarRutina() {
  if (!this.rutinaActiva) return;

  const alert = await this.alertCtrl.create({
    header: 'Finalizar rutina',
    message: '¿Seguro que deseas marcar esta rutina como completada?',
    buttons: [
      { text: 'Cancelar', role: 'cancel' },
      {
        text: 'Finalizar',
        handler: async () => {
          await this.rutinasService.actualizarRutina(
            this.rutinaActiva.id,
            {
              completada: true,
              fechaCompletada: new Date().toISOString()
            }
          );

          this.mostrarToast('Rutina completada', 'success');
        }
      }
    ]
  });

  await alert.present();
}

  cambiarVista(v: 'rutina' | 'rutinas' | 'biblioteca' | 'historial') {
    this.vista = v;
  }

  async crearNuevaRutina() {
    const alert = await this.alertCtrl.create({
      header: 'Nueva Rutina',
      inputs: [
        {
          name: 'nombre',
          type: 'text',
          placeholder: 'Ej: Tren inferior fuerza'
        }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Crear',
          handler: async (data) => {
            if (!data.nombre?.trim()) return false;

            await this.rutinasService.crearRutina({
              pacienteId: this.pacienteId || null,   // 👈 clave
              pacienteNombre: this.pacienteNombre || null,
              nombre: data.nombre.trim(),
              ejercicios: []
            });

            this.mostrarToast('Rutina creada', 'success');
            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  // ================= UTILIDADES UI =================

  toggleRutinaExpandida(id: string) {
    if (this.rutinasExpandidas.has(id)) {
      this.rutinasExpandidas.delete(id);
    } else {
      this.rutinasExpandidas.add(id);
    }
  }

  isRutinaExpandida(id: string): boolean {
    return this.rutinasExpandidas.has(id);
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

    if (this.rutinaActiva) {
      this.rutinaActiva.ejercicios.forEach((_, i) =>
        this.ejerciciosExpandidos.add(i)
      );
    }

    this.mostrarToast('Sesión iniciada', 'primary');
  }


  getProgresoRutina(): number {
    if (!this.rutinaActiva) return 0;

    let total = 0;
    let completadas = 0;

    this.rutinaActiva.ejercicios.forEach(ej => {
      total += ej.series.length;
      completadas += ej.series.filter(s => s.completada).length;
    });

    return total ? Math.round((completadas / total) * 100) : 0;
  }

  getSeriesCompletadas(i: number): number {
    if (!this.rutinaActiva) return 0;
    return this.rutinaActiva.ejercicios[i].series.filter(s => s.completada).length;
  }

  todasSeriesCompletadas(i: number): boolean {
    if (!this.rutinaActiva) return false;
    return this.rutinaActiva.ejercicios[i].series.every(s => s.completada);
  }

  getColorCategoria(cat: CategoriaEjercicio) {
    return this.categorias.find(c => c.valor === cat)?.color || '#6b7280';
  }

  getIconoCategoria(cat: CategoriaEjercicio) {
    return this.categorias.find(c => c.valor === cat)?.icono || 'fitness-outline';
  }

  abrirVideo(url: string) {
    window.open(url, '_blank');
  }

  getVideoThumbnail(url: string): string | null {
    if (!url) return null;
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const id = url.split('v=')[1]?.split('&')[0] || url.split('/').pop();
      return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
    }
    return null;
  }

  verHistorial(id: string, nombre: string) {
    this.ejercicioHistorialNombre = nombre;
    this.vista = 'historial';
  }

  async enviarWhatsappConNumero(rutina: RutinaEjercicios | null) {
    if (!rutina) return;
    this.mostrarToast('Función WhatsApp lista para implementar', 'primary');
  }

  trackByEjercicio(index: number, item: EjercicioEnRutina) {
    return item.ejercicioId;
  }

  trackBySerie(index: number, item: SerieEjercicio) {
    return item.numero;
  }

  trackByEjercicioLocal(index: number, item: EjercicioLocal) {
    return item.id;
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

  // ================= NAVEGACIÓN =================

  volverAtras() {
    if (this.pacienteId) {
      this.navCtrl.navigateRoot('/paciente-detalle', {
        queryParams: { pacienteId: this.pacienteId }
      });
      return;
    }

    this.navCtrl.back();
  }

  // ================= RECARGAR DATOS =================

  cargarDatos() {
    this.cargarBiblioteca();
    this.cargarRutinas();
  }

  // =====================================================
// SERIES (AUTO-SAVE FIRESTORE)
// =====================================================

  async onRepChange(ejercicioIdx: number, serieIdx: number, valor: string) {
    if (!this.rutinaActiva) return;

    const reps = valor ? parseInt(valor, 10) : null;

    this.rutinaActiva.ejercicios[ejercicioIdx].series[serieIdx].repeticiones = reps;

    await this.rutinasService.actualizarRutina(
      this.rutinaActiva.id,
      { ejercicios: this.rutinaActiva.ejercicios }
    );
  }

  async onPesoChange(ejercicioIdx: number, serieIdx: number, valor: string) {
    if (!this.rutinaActiva) return;

    const peso = valor ? parseFloat(valor) : null;

    this.rutinaActiva.ejercicios[ejercicioIdx].series[serieIdx].peso = peso;

    await this.rutinasService.actualizarRutina(
      this.rutinaActiva.id,
      { ejercicios: this.rutinaActiva.ejercicios }
    );
  }

  async toggleSerie(ejercicioIdx: number, serieIdx: number) {
    if (!this.rutinaActiva) return;

    const serie = this.rutinaActiva.ejercicios[ejercicioIdx].series[serieIdx];

    serie.completada = !serie.completada;

    await this.rutinasService.actualizarRutina(
      this.rutinaActiva.id,
      { ejercicios: this.rutinaActiva.ejercicios }
    );
  }


  // -----------------------------------------------------
  // COMPLETAR / DESMARCAR TODAS
  // -----------------------------------------------------

  async cumplimentarTodas(ejercicioIdx: number) {
    if (!this.rutinaActiva) return;

    const ejercicio = this.rutinaActiva.ejercicios[ejercicioIdx];
    const todasCompletadas = ejercicio.series.every(s => s.completada);

    ejercicio.series.forEach(s => s.completada = !todasCompletadas);

    await this.rutinasService.actualizarRutina(
      this.rutinaActiva.id,
      { ejercicios: this.rutinaActiva.ejercicios }
    );
  }

  // -----------------------------------------------------
  // ELIMINAR EJERCICIO
  // -----------------------------------------------------

  async eliminarEjercicioDeRutina(ejercicioIdx: number) {
    if (!this.rutinaActiva) return;

    this.rutinaActiva.ejercicios.splice(ejercicioIdx, 1);

    // Recalcular letras A, B, C...
    this.rutinaActiva.ejercicios.forEach((e, i) => {
      e.letra = String.fromCharCode(65 + i);
    });

    await this.rutinasService.actualizarRutina(
      this.rutinaActiva.id,
      { ejercicios: this.rutinaActiva.ejercicios }
    );

    this.mostrarToast('Ejercicio eliminado', 'medium');
  }

  // =====================================================
// FORM NUEVO / EDITAR EJERCICIO
// =====================================================

toggleFormNuevo() {
  this.mostrarFormNuevo = !this.mostrarFormNuevo;

  if (this.mostrarFormNuevo) {
    this.editandoEjercicioId = null;
    this.nuevoEjercicio = this.getEjercicioVacio();
  }
}

editarEjercicio(ejercicio: EjercicioLocal) {
  this.editandoEjercicioId = ejercicio.id;
  this.nuevoEjercicio = { ...ejercicio };
  this.mostrarFormNuevo = true;
}

async guardarNuevoEjercicio() {
  if (!this.nuevoEjercicio.nombre?.trim()) {
    this.mostrarToast('El nombre es obligatorio', 'warning');
    return;
  }

  if (this.editandoEjercicioId) {
    await this.ejerciciosService.actualizarEjercicio(
      this.editandoEjercicioId,
      this.nuevoEjercicio
    );
    this.mostrarToast('Ejercicio actualizado', 'success');
  } else {
    await this.ejerciciosService.agregarEjercicioPersonalizado(
      this.nuevoEjercicio
    );
    this.mostrarToast('Ejercicio creado', 'success');
  }

  this.mostrarFormNuevo = false;
}

  private getEjercicioVacio(): Partial<EjercicioLocal> {
    return {
      nombre: '',
      descripcion: '',
      instrucciones: '',
      categoria: 'rehabilitacion',
      musculoPrincipal: '',
      equipamiento: 'Ninguno',
      videoUrl: '',
      dificultad: 'basico'
    };
  }

  estaEnRutina(ejercicioId: string): boolean {
    if (!this.rutinaActiva) return false;

    return this.rutinaActiva.ejercicios?.some(
      (e: any) => e.ejercicioId === ejercicioId
    );
  }

  async agregarARutina(ejercicio: EjercicioLocal) {

      if (!this.rutinaActiva) {
        this.mostrarToast('Primero crea una rutina', 'warning');
        return;
      }

      if (this.estaEnRutina(ejercicio.id)) {
        this.mostrarToast('Ya está en la rutina', 'warning');
        return;
      }

      const alert = await this.alertCtrl.create({
        header: 'Agregar a rutina',
        subHeader: ejercicio.nombre,
        inputs: [
          {
            name: 'series',
            type: 'number',
            placeholder: 'Cantidad de series',
            value: 3,
            min: 1
          },
          {
            name: 'reps',
            type: 'number',
            placeholder: 'Repeticiones',
            value: 12,
            min: 1
          }
        ],
        buttons: [
          { text: 'Cancelar', role: 'cancel' },
          {
            text: 'Agregar',
            handler: async data => {

              const cantidadSeries = parseInt(data.series) || 3;
              const repeticiones = parseInt(data.reps) || 12;

              const nuevasSeries = [];

              for (let i = 1; i <= cantidadSeries; i++) {
                nuevasSeries.push({
                  numero: i,
                  repeticiones,
                  peso: null,
                  completada: false
                });
              }

              const nuevoEjercicio = {
                ejercicioId: ejercicio.id,
                ejercicio,
                letra: String.fromCharCode(
                  65 + (this.rutinaActiva.ejercicios?.length || 0)
                ),
                descansoSegundos: 60,
                series: nuevasSeries
              };

              const ejerciciosActualizados = [
                ...(this.rutinaActiva.ejercicios || []),
                nuevoEjercicio
              ];

              await this.rutinasService.actualizarRutina(
                this.rutinaActiva.id,
                { ejercicios: ejerciciosActualizados }
              );

              this.mostrarToast('Ejercicio agregado', 'success');
            }
          }
        ]
      });

      await alert.present();
    }

  async eliminarEjercicioBiblioteca(ejercicio: EjercicioLocal) {
    const alert = await this.alertCtrl.create({
      header: 'Eliminar ejercicio',
      message: `Eliminar "${ejercicio.nombre}"?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => {
            await this.ejerciciosService.eliminarEjercicio(ejercicio.id);
            this.mostrarToast('Ejercicio eliminado', 'medium');
          }
        }
      ]
    });

    await alert.present();
  }

  async usarPlantilla(plantilla: any) {

    // Si NO hay paciente → simplemente clonar como rutina activa general
    if (!this.pacienteId) {

      await this.rutinasService.crearRutina({
        pacienteId: null,
        pacienteNombre: null,
        nombre: plantilla.nombre,
        ejercicios: plantilla.ejercicios
      });

      this.mostrarToast('Rutina creada desde plantilla', 'success');
      return;
    }

    // Si hay paciente → asignarla
    await this.rutinasService.crearRutina({
      pacienteId: this.pacienteId,
      pacienteNombre: this.pacienteNombre,
      nombre: plantilla.nombre,
      ejercicios: plantilla.ejercicios
    });

    this.mostrarToast('Plantilla asignada al paciente', 'success');
  }

  ejerciciosBibliotecaExpandidos: Set<string> = new Set();

  toggleBibliotecaExpandido(id: string) {
    if (this.ejerciciosBibliotecaExpandidos.has(id)) {
      this.ejerciciosBibliotecaExpandidos.delete(id);
    } else {
      this.ejerciciosBibliotecaExpandidos.add(id);
    }
  }

  isBibliotecaExpandido(id: string): boolean {
    return this.ejerciciosBibliotecaExpandidos.has(id);
    }
  
  async agregarSerieAEjercicio(index: number) {

    if (!this.rutinaActiva) return;

    const ejercicio = this.rutinaActiva.ejercicios[index];

    const nuevaSerie = {
      numero: ejercicio.series.length + 1,
      repeticiones: 12,
      peso: null,
      completada: false
    };

    ejercicio.series.push(nuevaSerie);

    await this.rutinasService.actualizarRutina(
      this.rutinaActiva.id,
      { ejercicios: this.rutinaActiva.ejercicios }
    );
  }

  async asignarRutinaAPaciente(rutina: any) {

    if (this.listaPacientes.length === 0) {
      this.mostrarToast('No hay pacientes registrados', 'warning');
      return;
    }

    const alert = await this.alertCtrl.create({
      header: 'Asignar a paciente',
      inputs: this.listaPacientes.map(p => ({
        type: 'radio',
        label: p.nombre || p.nombre_completo,
        value: p
      })),
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Asignar',
          handler: async (pacienteSeleccionado) => {

            if (!pacienteSeleccionado) return false;

            await this.rutinasService.clonarRutinaACliente(
              rutina,
              pacienteSeleccionado.id,
              pacienteSeleccionado.nombre || pacienteSeleccionado.nombre_completo
            );

            this.mostrarToast('Rutina asignada correctamente', 'success');
            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  abrirRutina(rut: RutinaEjercicios) {
  this.rutinaActiva = rut;
  this.cambiarVista('rutina');
}

async eliminarRutina(id: string) {

    const confirmar = confirm('¿Eliminar esta rutina?');

    if (!confirmar) return;

    await this.rutinasService.eliminarRutina(id);

    this.mostrarToast('Rutina eliminada', 'success');
  }

  async crearNuevaRutinaGeneral() {

    const alert = await this.alertCtrl.create({
      header: 'Nueva rutina general',
      inputs: [
        {
          name: 'nombre',
          type: 'text',
          placeholder: 'Nombre de la rutina'
        }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Crear',
          handler: async data => {

            if (!data.nombre?.trim()) return false;

            await this.rutinasService.crearRutina({
              pacienteId: null,
              pacienteNombre: null,
              nombre: data.nombre.trim(),
              ejercicios: []
            });

            this.mostrarToast('Rutina creada correctamente', 'success');

            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  cerrarRutinaActiva() {
    this.rutinaActiva = null;
    this.sesionIniciada = false;
    this.vista = 'rutinas';
  }

  cargarRutinasPaciente() {
    const sub = this.rutinasService
      .getRutinasPorPacienteRealtime(this.pacienteId)
      .subscribe(rutinas => {
        this.rutinaActiva = rutinas.find(r => !r.completada) || null;
        this.rutinasAnteriores = rutinas.filter(r => r.completada);
      });

    this.subs.push(sub);
  }

  cargarTodasLasRutinas() {
    const sub = this.rutinasService
      .getRutinasRealtime()
      .subscribe(rutinas => {
        this.todasLasRutinas = rutinas;
      });

    this.subs.push(sub);
  }





}