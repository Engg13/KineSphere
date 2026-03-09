export interface RutinaTemplateEjercicio {

  ejercicioId: string;

  nombre: string;

  orden: number;

  series: number;

  repeticiones?: number;

  tiempo?: number;

  carga?: number;

  notas?: string;

}

export interface RutinaEjercicio {

  id?: string;

  ejercicioId: string;

  nombre: string;

  orden: number;

  series: number;

  repeticiones?: number;

  tiempo?: number;

  carga?: number;

  notas?: string;

  videoUrl?: string;

  imagenUrl?: string;

  instrucciones?: string;

}