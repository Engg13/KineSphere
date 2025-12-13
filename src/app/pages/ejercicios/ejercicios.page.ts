// src/app/pages/ejercicios/ejercicios.page.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { WgerApiService, Ejercicio } from '../../services/wger-api.service';
import { AlertController, LoadingController, NavController  } from '@ionic/angular';
import { Subscription, Observable } from 'rxjs';
import { finalize, catchError } from 'rxjs/operators';

@Component({
  selector: 'app-ejercicios',
  templateUrl: './ejercicios.page.html',
  styleUrls: ['./ejercicios.page.scss'],
  standalone: false
})
export class EjerciciosPage implements OnInit, OnDestroy {
  ejercicios: Ejercicio[] = [];
  ejerciciosFiltrados: Ejercicio[] = [];
  terminoBusqueda: string = '';
  categorias: any[] = [];
  musculos: any[] = [];
  equipamiento: any[] = [];
  
  // Estados mejorados
  loading = {
    ejercicios: false,
    busqueda: false,
    categorias: false
  };
  
  error: string | null = null;
  paginaActual = 1;
  totalEjercicios = 0;
  
  private subscriptions: Subscription = new Subscription();

  constructor(
    private wgerService: WgerApiService,
    private loadingCtrl: LoadingController,
    private alertController: AlertController,
    private navCtrl: NavController
    
  ) {}

  async ngOnInit() {
    await this.cargarTodo();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  // ✅ CARGAR TODO EN PARALELO
  async cargarTodo() {
    const loading = await this.loadingCtrl.create({
      message: 'Cargando recursos...'
    });
    await loading.present();

    try {
      // Cargar en paralelo
      await Promise.all([
        this.cargarEjercicios(),
        this.cargarCategorias(),
        this.cargarMusculos(),
        this.cargarEquipamiento()
      ]);
    } catch (error) {
      this.mostrarError('Error cargando recursos');
    } finally {
      await loading.dismiss();
    }
  }

  // ✅ CARGAR EJERCICIOS OPTIMIZADO
  async cargarEjercicios() {
    this.loading.ejercicios = true;
    this.error = null;

    try {
      const ejerciciosSub = this.wgerService.getEjerciciosCompletos(50)
        .pipe(
          finalize(() => this.loading.ejercicios = false),
          catchError(error => {
            this.error = error.message;
            this.mostrarError(`Error: ${error.message}`);
            return [];
          })
        )
        .subscribe({
          next: (ejerciciosData) => {
            this.ejercicios = ejerciciosData;
            this.ejerciciosFiltrados = [...this.ejercicios];
            console.log(`✅ ${ejerciciosData.length} ejercicios cargados`);
            
            if (ejerciciosData.length === 0) {
              this.mostrarError('No se encontraron ejercicios en español');
            }
          }
        });
      
      this.subscriptions.add(ejerciciosSub);
      
    } catch (error: any) {
      this.loading.ejercicios = false;
      this.error = error.message;
      this.mostrarError('Error crítico cargando ejercicios');
    }
  }

  // ✅ CARGAR CATEGORÍAS
  async cargarCategorias() {
    this.loading.categorias = true;

    const categoriasSub = this.wgerService.getCategorias()
      .pipe(
        finalize(() => this.loading.categorias = false)
      )
      .subscribe({
        next: (categorias) => {
          this.categorias = categorias;
        },
        error: (error) => {
          console.warn('⚠️ No se pudieron cargar categorías:', error.message);
        }
      });
    
    this.subscriptions.add(categoriasSub);
  }

  // ✅ NUEVO: CARGAR MÚSCULOS
  async cargarMusculos() {
    const musculosSub = this.wgerService.getMusculos().subscribe({
      next: (musculos) => {
        this.musculos = musculos;
      },
      error: (error) => {
        console.warn('⚠️ No se pudieron cargar músculos:', error.message);
      }
    });
    
    this.subscriptions.add(musculosSub);
  }

  // ✅ NUEVO: CARGAR EQUIPAMIENTO
  async cargarEquipamiento() {
    const equipamientoSub = this.wgerService.getEquipamiento().subscribe({
      next: (equipamiento) => {
        this.equipamiento = equipamiento;
      },
      error: (error) => {
        console.warn('⚠️ No se pudieron cargar equipamiento:', error.message);
      }
    });
    
    this.subscriptions.add(equipamientoSub);
  }

  // ✅ FILTRAR EJERCICIOS (LOCAL)
  filtrarEjercicios() {
    if (!this.terminoBusqueda.trim()) {
      this.ejerciciosFiltrados = [...this.ejercicios];
      return;
    }

    const termino = this.terminoBusqueda.toLowerCase().trim();
    
    this.ejerciciosFiltrados = this.ejercicios.filter(ejercicio => {
      const nombreMatch = ejercicio.nombre.toLowerCase().includes(termino);
      const descripcionMatch = ejercicio.descripcion.toLowerCase().includes(termino);
      
      return nombreMatch || descripcionMatch;
    });
  }

  // ✅ BUSCAR EN API (CON PAGINACIÓN OPCIONAL)
  async buscarEjercicios() {
    if (!this.terminoBusqueda.trim()) {
      await this.cargarEjercicios();
      return;
    }

    this.loading.busqueda = true;
    this.error = null;

    const busquedaSub = this.wgerService.buscarEjercicios(this.terminoBusqueda)
      .pipe(
        finalize(() => this.loading.busqueda = false)
      )
      .subscribe({
        next: (resultados) => {
          this.ejerciciosFiltrados = resultados;
          
          if (resultados.length === 0) {
            this.mostrarMensaje('No se encontraron ejercicios con ese término');
          }
        },
        error: (error) => {
          this.error = error.message;
          this.mostrarError(`Búsqueda fallida: ${error.message}`);
        }
      });
    
    this.subscriptions.add(busquedaSub);
  }

  // ✅ OBTENER NOMBRE CATEGORÍA 
  obtenerNombreCategoria(categoriaId?: number): string {
  if (!categoriaId || !this.categorias.length) return 'General';
  
  const categoria = this.categorias.find(cat => cat.id === categoriaId);
  return categoria ? categoria.name : 'General';
}

  // ✅ OBTENER NOMBRE MÚSCULO 
  obtenerNombreMusculo(musculoId: number): string {
    if (!this.musculos.length) return '';
    
    const musculo = this.musculos.find(m => m.id === musculoId);
    return musculo ? musculo.name : '';
  }

  // ✅ OBTENER NOMBRE EQUIPAMIENTO 
  obtenerNombreEquipamiento(equipoId: number): string {
    if (!this.equipamiento.length) return '';
    
    const equipo = this.equipamiento.find(e => e.id === equipoId);
    return equipo ? equipo.name : '';
  }

  // ✅ SELECCIONAR EJERCICIO
  seleccionarEjercicio(ejercicio: Ejercicio) {
    console.log('✅ Ejercicio seleccionado:', ejercicio.nombre);
    this.mostrarDetalleEjercicio(ejercicio);
  }

  // ✅ DETALLE EJERCICIO MEJORADO
  async mostrarDetalleEjercicio(ejercicio: Ejercicio) {
    // Preparar información adicional
    const musculosPrincipales = ejercicio.musculos
      .map(id => this.obtenerNombreMusculo(id))
      .filter(nombre => nombre)
      .join(', ');
    
    const equipos = ejercicio.equipamiento
      .map(id => this.obtenerNombreEquipamiento(id))
      .filter(nombre => nombre)
      .join(', ') || 'Ninguno';

    const alert = await this.alertController.create({
      header: ejercicio.nombre,
      message: `
        <div class="ejercicio-detalle" style="max-height: 60vh; overflow-y: auto;">
          <p><strong>Descripción:</strong></p>
          <p style="margin-bottom: 15px;">${ejercicio.descripcion}</p>
          
          <p><strong>Categoría:</strong> ${this.obtenerNombreCategoria(ejercicio.categoria)}</p>
          
          ${musculosPrincipales ? `
          <p><strong>Músculos principales:</strong> ${musculosPrincipales}</p>
          ` : ''}
          
          <p><strong>Equipamiento necesario:</strong> ${equipos}</p>
          
          ${ejercicio.imagenes && ejercicio.imagenes.length > 0 ? `
          <p><strong>Imágenes disponibles:</strong> ${ejercicio.imagenes.length}</p>
          ` : ''}
        </div>
      `,
      buttons: [
        {
          text: 'Asignar a Paciente',
          cssClass: 'primary-button',
          handler: () => {
            this.confirmarSeleccion(ejercicio);
          }
        },
        {
          text: 'Cerrar',
          role: 'cancel'
        }
      ]
    });
    
    await alert.present();
  }

  // ✅ CONFIRMAR SELECCIÓN MEJORADA
  async confirmarSeleccion(ejercicio: Ejercicio) {
    const confirm = await this.alertController.create({
      header: 'Confirmar',
      message: `¿Asignar <strong>${ejercicio.nombre}</strong> al paciente?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Asignar',
          cssClass: 'primary-button',
          handler: () => {
            this.guardarEjercicioSeleccionado(ejercicio);
          }
        }
      ]
    });
    
    await confirm.present();
  }

  // ✅ GUARDAR EJERCICIO 
  private guardarEjercicioSeleccionado(ejercicio: Ejercicio) {
    const ejercicioAsignado = {
      ...ejercicio,
      fechaAsignacion: new Date().toISOString(),
      completado: false,
      series: 3,
      repeticiones: 10,
      descanso: '60 segundos'
    };

    // Guardar en localStorage (o en tu servicio de datos)
    localStorage.setItem('ejercicioSeleccionado', JSON.stringify(ejercicioAsignado));
    
    this.mostrarMensaje(`"${ejercicio.nombre}" asignado correctamente`);
  }

  // ✅ LIMPIAR BÚSQUEDA
  limpiarBusqueda() {
    this.terminoBusqueda = '';
    this.ejerciciosFiltrados = [...this.ejercicios];
    this.error = null;
  }

  // ✅ RECARGAR DATOS
  async recargarDatos() {
    this.wgerService.clearCache(); // Limpiar caché del servicio
    await this.cargarTodo();
  }

  // ✅ MENSAJES MEJORADOS
  async mostrarError(mensaje: string) {
    const alert = await this.alertController.create({
      header: '⚠️ Error',
      message: mensaje,
      buttons: ['Entendido']
    });
    await alert.present();
  }

  async mostrarMensaje(mensaje: string) {
    const alert = await this.alertController.create({
      header: '✅ Éxito',
      message: mensaje,
      buttons: ['OK']
    });
    await alert.present();
  }

  // ✅ GETTERS PARA TEMPLATE
  get hayEjercicios(): boolean {
    return this.ejerciciosFiltrados.length > 0;
  }

  get hayResultadosBusqueda(): boolean {
    return this.terminoBusqueda.trim() !== '' && this.ejerciciosFiltrados.length === 0;
  }

  get estaCargando(): boolean {
    return this.loading.ejercicios || this.loading.busqueda;
  }

  // ✅ SEGUIMIENTO POR ID (mejor performance)
trackById(index: number, ejercicio: Ejercicio | null | undefined): number {
  return ejercicio?.id || index;
}

// Método getExerciseIcon actualizado para manejar undefined
getExerciseIcon(categoriaId?: number): string {
  if (!categoriaId) return 'fitness'; // Valor por defecto
  
  const nombreCategoria = this.obtenerNombreCategoria(categoriaId).toLowerCase();
  
  if (nombreCategoria.includes('fuerza')) return 'barbell';
  if (nombreCategoria.includes('cardio')) return 'heart';
  if (nombreCategoria.includes('flexibilidad')) return 'body';
  if (nombreCategoria.includes('equilibrio')) return 'accessibility';
  if (nombreCategoria.includes('rehabilitación') || nombreCategoria.includes('rehabilitacion')) {
    return 'medkit';
  }
  
  return 'fitness';
}

// ✅ FORMATO CORTO PARA DESCRIPCIÓN
getDescripcionCorta(descripcion: string, maxLength: number = 120): string {
  if (!descripcion) return 'Sin descripción';
  
  if (descripcion.length <= maxLength) return descripcion;
  
  return descripcion.substring(0, maxLength) + '...';
}

volverAtras() {
    console.log('Volver atrás ejecutado');
    this.navCtrl.back();
}
}