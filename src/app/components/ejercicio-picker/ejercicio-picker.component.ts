import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IonicModule, ModalController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { EjerciciosFirestoreService } from '../../services/ejercicios-firestore.service';
import { Ejercicio, CategoriaEjercicio } from '../../models/ejercicio.model';


@Component({
  selector: 'app-ejercicio-picker',
  templateUrl: './ejercicio-picker.component.html',
  styleUrls: ['./ejercicio-picker.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class EjercicioPickerComponent implements OnInit {

  private destroyRef = inject(DestroyRef);

  ejercicios: Ejercicio[] = [];
  ejerciciosFiltrados: Ejercicio[] = [];

  terminoBusqueda = '';
  categoriaFiltro: CategoriaEjercicio | '' = '';

  categorias: { valor: CategoriaEjercicio; nombre: string; icono: string }[] = [
    { valor: 'fuerza', nombre: 'Fuerza', icono: 'barbell-outline' },
    { valor: 'movilidad', nombre: 'Movilidad', icono: 'walk-outline' },
    { valor: 'rehabilitacion', nombre: 'Rehabilitación', icono: 'medkit-outline' },
    { valor: 'equilibrio', nombre: 'Equilibrio', icono: 'body-outline' },
    { valor: 'cardio', nombre: 'Cardio', icono: 'heart-outline' },
    { valor: 'funcional', nombre: 'Funcional', icono: 'fitness-outline' },
    { valor: 'estiramiento', nombre: 'Estiramiento', icono: 'accessibility-outline' }
  ];

  constructor(
    private ejerciciosService: EjerciciosFirestoreService,
    private modalCtrl: ModalController
  ) {}

  ngOnInit() {

    this.ejerciciosService
      .getEjercicios()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(ejs => {

        this.ejercicios = ejs;
        this.ejerciciosFiltrados = [...ejs];

      });

  }

  // ================= BUSCAR =================

  filtrarEjercicios() {

    let resultado = [...this.ejercicios];

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

    this.categoriaFiltro =
      this.categoriaFiltro === cat ? '' : cat;

    this.filtrarEjercicios();

  }

  // ================= SELECCIONAR =================

  seleccionar(ejercicio: Ejercicio) {

    this.modalCtrl.dismiss({
      ejercicio
    });

  }

  cerrar() {
    this.modalCtrl.dismiss();
  }

}