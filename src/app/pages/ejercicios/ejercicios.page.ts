// src/app/pages/ejercicios/ejercicios.page.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { WgerApiService, Ejercicio } from '../../services/wger-api.service';
import { AlertController, LoadingController } from '@ionic/angular';
import { Subscription } from 'rxjs';

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
  estaCargando: boolean = false;
  categorias: any[] = [];
  
  private subscriptions: Subscription = new Subscription();

  constructor(
    private wgerService: WgerApiService,
    private loadingCtrl: LoadingController,
    private alertController: AlertController
  ) {}

  async ngOnInit() {
    await this.cargarEjercicios();
    await this.cargarCategorias();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }


async cargarEjercicios() {
  const loading = await this.loadingCtrl.create({
    message: 'Cargando ejercicios en español...'
  });
  await loading.present();

  try {
    this.estaCargando = true;
    
    // ✅ Usar el método corregido que filtra solo español
    const ejerciciosSub = this.wgerService.getEjerciciosSoloEspanol(50)
      .subscribe({
        next: (ejerciciosData) => {
          this.ejercicios = ejerciciosData;
          this.ejerciciosFiltrados = [...this.ejercicios];
          console.log('Ejercicios en español cargados:', this.ejercicios.length);
          
          // Mostrar algunos ejemplos en consola para verificar
          if (this.ejercicios.length > 0) {
            console.log('Primeros 3 ejercicios:', this.ejercicios.slice(0, 3));
          }
        },
        error: (error) => {
          console.error('Error cargando ejercicios:', error);
          this.mostrarError('Error al cargar los ejercicios. Verifica tu conexión.');
        }
      });
    
    this.subscriptions.add(ejerciciosSub);
    
  } catch (error) {
    console.error('Error cargando ejercicios:', error);
    await this.mostrarError('Error al cargar los ejercicios. Verifica tu conexión.');
  } finally {
    this.estaCargando = false;
    await loading.dismiss();
  }
}

  async cargarCategorias() {
    try {
      const categoriasSub = this.wgerService.getCategorias().subscribe({
        next: (response) => {
          this.categorias = response?.results || [];
        },
        error: (error) => {
          console.error('Error cargando categorías:', error);
        }
      });
      this.subscriptions.add(categoriasSub);
    } catch (error) {
      console.error('Error cargando categorías:', error);
    }
  }

  filtrarEjercicios() {
    if (!this.terminoBusqueda) {
      this.ejerciciosFiltrados = [...this.ejercicios];
      return;
    }

    this.ejerciciosFiltrados = this.ejercicios.filter(ejercicio =>
      ejercicio.nombre.toLowerCase().includes(this.terminoBusqueda.toLowerCase()) ||
      ejercicio.descripcion.toLowerCase().includes(this.terminoBusqueda.toLowerCase())
    );
  }

  async buscarEjercicios() {
    if (!this.terminoBusqueda.trim()) {
      await this.cargarEjercicios();
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: 'Buscando ejercicios...'
    });
    await loading.present();

    try {
      this.estaCargando = true;
      
      // ✅ Usar Observable con subscribe
      const busquedaSub = this.wgerService.buscarEjercicios(this.terminoBusqueda)
        .subscribe({
          next: (resultados) => {
            this.ejerciciosFiltrados = resultados;
          },
          error: (error) => {
            console.error('Error buscando ejercicios:', error);
            this.mostrarError('Error en la búsqueda');
          }
        });
      
      this.subscriptions.add(busquedaSub);
      
    } catch (error) {
      console.error('Error buscando ejercicios:', error);
      await this.mostrarError('Error en la búsqueda');
    } finally {
      this.estaCargando = false;
      await loading.dismiss();
    }
  }

  obtenerNombreCategoria(categoriaId: number): string {
    const categoria = this.categorias.find(cat => cat.id === categoriaId);
    return categoria ? categoria.name : 'General';
  }

  async mostrarError(mensaje: string) {
    const alert = await this.alertController.create({
      header: 'Error',
      message: mensaje,
      buttons: ['OK']
    });
    await alert.present();
  }

  seleccionarEjercicio(ejercicio: Ejercicio) {
    console.log('Ejercicio seleccionado:', ejercicio);
    this.mostrarDetalleEjercicio(ejercicio);
  }

  async mostrarDetalleEjercicio(ejercicio: Ejercicio) {
    const alert = await this.alertController.create({
      header: ejercicio.nombre,
      message: `
        <div class="ejercicio-detalle">
          <p><strong>Descripción:</strong></p>
          <p>${ejercicio.descripcion}</p>
          <br>
          <p><strong>Categoría:</strong> ${this.obtenerNombreCategoria(ejercicio.categoria)}</p>
        </div>
      `,
      buttons: [
        {
          text: 'Seleccionar',
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

  confirmarSeleccion(ejercicio: Ejercicio) {
    console.log('Ejercicio confirmado:', ejercicio);
    localStorage.setItem('ejercicioSeleccionado', JSON.stringify(ejercicio));
    this.mostrarMensaje('Ejercicio seleccionado correctamente');
  }

  async mostrarMensaje(mensaje: string) {
    const alert = await this.alertController.create({
      header: 'Éxito',
      message: mensaje,
      buttons: ['OK']
    });
    await alert.present();
  }

  limpiarBusqueda() {
    this.terminoBusqueda = '';
    this.ejerciciosFiltrados = [...this.ejercicios];
  }
}