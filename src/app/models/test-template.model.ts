export interface TestPregunta {
  texto: string;
  puntajeMin: number;
  puntajeMax: number;
}

export interface TestRangoResultado {
  nombre: string;
  min: number;
  max: number;
  color: string;
}

export interface TestTemplate {
  id: string;
  nombre: string;
  descripcion: string;
  preguntas: TestPregunta[];
  rangos: TestRangoResultado[];
  fechaCreacion: string;
  updatedAt?: string;
  source?: 'firebase' | 'local';
}
