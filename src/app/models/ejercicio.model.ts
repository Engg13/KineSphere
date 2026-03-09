export type CategoriaEjercicio =
  | 'fuerza'
  | 'movilidad'
  | 'estiramiento'
  | 'equilibrio'
  | 'cardio'
  | 'funcional'
  | 'rehabilitacion';

export interface Ejercicio {

  id?: string;

  nombre: string;

  descripcion?: string;

  instrucciones?: string;

  categoria: CategoriaEjercicio;

  zonaCorporal: string;

  musculoPrincipal?: string;

  equipamiento?: string;

  videoUrl?: string;

  videoThumbnail?: string;

  imagenUrl?: string;

  dificultad?: 'basico' | 'intermedio' | 'avanzado';

  clinicId?: string;

  createdBy?: string;

  createdAt?: any;

}