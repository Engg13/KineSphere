import { CategoriaEjercicio } from '../../models/interfaces';

export const CATEGORIAS_EJERCICIO: {
  valor: CategoriaEjercicio;
  nombre: string;
  icono: string;
  color: string;
}[] = [
  { valor: 'fuerza', nombre: 'Fuerza', icono: 'barbell-outline', color: '#e74c3c' },
  { valor: 'estiramiento', nombre: 'Estiramiento', icono: 'body-outline', color: '#3498db' },
  { valor: 'movilidad', nombre: 'Movilidad', icono: 'sync-outline', color: '#2ecc71' },
  { valor: 'equilibrio', nombre: 'Equilibrio', icono: 'accessibility-outline', color: '#f39c12' },
  { valor: 'cardio', nombre: 'Cardio', icono: 'heart-outline', color: '#e91e63' },
  { valor: 'funcional', nombre: 'Funcional', icono: 'fitness-outline', color: '#9b59b6' },
  { valor: 'rehabilitacion', nombre: 'Rehabilitación', icono: 'medkit-outline', color: '#1abc9c' }
];