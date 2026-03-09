import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { NavController } from '@ionic/angular';
import { EjerciciosFirestoreService } from '../../services/ejercicios-firestore.service';
import { RutinasTemplatesService } from '../../services/rutinas-templates.service';
import { YoutubeEmbedPipe } from '../../pipes/youtube-embed.pipe';
import { SafePipe } from '../../pipes/safe.pipe';
import { Ejercicio } from '../../models/ejercicio.model';
import { RutinaTemplateEjercicio } from '../../models/rutina-ejercicio.model';
import { RutinaTemplate } from '../../models/rutina-template.model';
import { ModalController } from '@ionic/angular';
import { EjercicioPickerComponent } from '../../components/ejercicio-picker/ejercicio-picker.component';

@Component({
  selector: 'app-rutina-template-editor',
  standalone: true,
  templateUrl: './rutina-template-editor.page.html',
  styleUrls: ['./rutina-template-editor.page.scss'],
  imports: [CommonModule, IonicModule, FormsModule, YoutubeEmbedPipe,
    SafePipe]
})
export class RutinaTemplateEditorPage {

  ejerciciosBiblioteca: Ejercicio[] = [];
  ejerciciosFiltrados: Ejercicio[] = [];

  terminoBusqueda = '';
  categoriaFiltro = '';
  videoPreview?: string;

  rutina: RutinaTemplate = {
    nombre: '',
    descripcion: '',
    clinicId: '',
    createdBy: '',
    ejercicios: []
  };

  categorias = [
    'fuerza',
    'movilidad',
    'rehabilitacion',
    'equilibrio',
    'cardio',
    'funcional',
    'estiramiento'
  ];

  constructor(
    private ejerciciosService: EjerciciosFirestoreService,
    private templatesService: RutinasTemplatesService,
    private navCtrl: NavController,
    private modalCtrl: ModalController
  ) {
    this.cargarEjercicios();
  }

  // =============================
  // CARGAR EJERCICIOS
  // =============================

  cargarEjercicios() {

    this.ejerciciosService.getEjercicios().subscribe(ejercicios => {

      this.ejerciciosBiblioteca = ejercicios;
      this.ejerciciosFiltrados = [...ejercicios];

    });

  }

  // =============================
  // FILTROS
  // =============================

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

  cambiarCategoria(cat: string) {

    this.categoriaFiltro =
      this.categoriaFiltro === cat ? '' : cat;

    this.filtrarEjercicios();

  }

  // =============================
  // RUTINA
  // =============================

  agregarEjercicio(ejercicio: Ejercicio) {

    const nuevo: RutinaTemplateEjercicio = {

      ejercicioId: ejercicio.id!,
      nombre: ejercicio.nombre,
      orden: 0,
      series: 3,
      repeticiones: 10

    };

    this.rutina.ejercicios.push(nuevo);

    this.reordenarEjercicios();

    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });

  }

  eliminarEjercicio(index: number) {

    this.rutina.ejercicios.splice(index, 1);

    this.rutina.ejercicios.forEach((ej, i) => {
      ej.orden = i + 1;
    });

  }

  async guardar() {

    if (!this.rutina.nombre.trim()) return;

    await this.templatesService.crearTemplate(this.rutina);

    alert('Plantilla creada');

    this.rutina = {
      nombre: '',
      descripcion: '',
      clinicId: '',
      createdBy: '',
      ejercicios: []
    };

  }

  volver() {
    this.navCtrl.back();
  }

  abrirVideo(url?: string) {

    if (!url) return;

    window.open(url, '_blank');

  }

  abrirPreview(url?: string) {

    if (!url) return;

    this.videoPreview = url;

  }

  cerrarPreview() {

    this.videoPreview = undefined;

  }

  reordenarEjercicios() {

    this.rutina.ejercicios = this.rutina.ejercicios.map((ej, index) => ({

      ...ej,
      orden: index + 1

    }));

  }

  async abrirSelectorEjercicios() {

    const modal = await this.modalCtrl.create({
      component: EjercicioPickerComponent
    });

    await modal.present();

    const { data } = await modal.onDidDismiss();

    if (data?.ejercicio) {
      this.agregarEjercicio(data.ejercicio);
    }

  }



}