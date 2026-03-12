export interface RutinaTemplateEjercicio {

  ejercicioId: string;

  nombre: string;

  orden: number;

  series: number;

  repeticiones?: number;

  tiempo?: number;

  carga?: number;

  notas?: string;
  
  videoUrl?: string;

}