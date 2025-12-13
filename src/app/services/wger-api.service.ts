// src/app/services/wger-api.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError, retry } from 'rxjs/operators';

export interface Ejercicio {
  id: number;
  nombre: string;
  descripcion: string;
  categoria: number;
  musculos: number[];
  musculos_secundarios: number[];
  equipamiento: number[];
  imagenes: any[];
}

export interface ApiResponse<T> {
  results: T[];
  next: string | null;
  previous: string | null;
  count: number;
}

@Injectable({
  providedIn: 'root'
})
export class WgerApiService {
  private apiUrl = 'https://wger.de/api/v2';
  private idiomaId = 4; // Español
  private cacheEjercicios: Ejercicio[] | null = null;

  constructor(private http: HttpClient) { }

  // ✅ MÉTODO ÚNICO PARA MAPEAR EJERCICIOS 
  private mapEjercicio(item: any): Ejercicio {
    return {
      id: item.exercise,
      nombre: item.name || 'Ejercicio sin nombre',
      descripcion: this.limpiarDescripcion(item.description),
      categoria: item.category || 0,
      musculos: item.muscles || [],
      musculos_secundarios: item.muscles_secondary || [],
      equipamiento: item.equipment || [],
      imagenes: item.images || []
    };
  }

  // ✅ MÉTODO PARA FILTRAR POR IDIOMA 
  private filtrarPorIdioma(items: any[]): any[] {
    return items.filter((item: any) => item.language === this.idiomaId);
  }

  // ✅ GET EJERCICIOS OPTIMIZADO 
  getEjerciciosCompletos(limit: number = 50): Observable<Ejercicio[]> {
    // Retornar caché si existe
    if (this.cacheEjercicios) {
      return new Observable(observer => {
        observer.next(this.cacheEjercicios!);
        observer.complete();
      });
    }

    const params = new HttpParams()
      .set('limit', limit.toString())
      .set('language', this.idiomaId.toString())
      .set('ordering', 'name');

    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/exercise-translation/`, { params }).pipe(
      retry(2), // Reintentar 2 veces en caso de error
      map(response => {
        const ejerciciosEspanol = this.filtrarPorIdioma(response.results || []);
        const ejerciciosMapeados = ejerciciosEspanol.map(item => this.mapEjercicio(item));
        
        // Guardar en caché
        this.cacheEjercicios = ejerciciosMapeados;
        
        return ejerciciosMapeados;
      }),
      catchError(this.handleError) 
    );
  }

  // ✅ BÚSQUEDA OPTIMIZADA
  buscarEjercicios(termino: string): Observable<Ejercicio[]> {
    const params = new HttpParams()
      .set('language', this.idiomaId.toString())
      .set('search', termino);

    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/exercise-translation/`, { params }).pipe(
      map(response => {
        const ejerciciosEspanol = this.filtrarPorIdioma(response.results || []);
        return ejerciciosEspanol.map(item => this.mapEjercicio(item));
      }),
      catchError(this.handleError)
    );
  }

  // ✅ PAGINACIÓN 
  getEjerciciosPaginados(page: number = 1, limit: number = 20): Observable<{ejercicios: Ejercicio[], total: number}> {
    const offset = (page - 1) * limit;
    
    const params = new HttpParams()
      .set('limit', limit.toString())
      .set('offset', offset.toString())
      .set('language', this.idiomaId.toString())
      .set('ordering', 'name');

    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/exercise-translation/`, { params }).pipe(
      map(response => {
        const ejerciciosEspanol = this.filtrarPorIdioma(response.results || []);
        const ejerciciosMapeados = ejerciciosEspanol.map(item => this.mapEjercicio(item));
        
        return {
          ejercicios: ejerciciosMapeados,
          total: response.count
        };
      }),
      catchError(this.handleError)
    );
  }

  // ✅ MANEJO CENTRALIZADO DE ERRORES 
  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Error desconocido';
    
    if (error.error instanceof ErrorEvent) {
      // Error del lado del cliente
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Error del lado del servidor
      switch (error.status) {
        case 0:
          errorMessage = 'No hay conexión a internet';
          break;
        case 404:
          errorMessage = 'Recurso no encontrado';
          break;
        case 429:
          errorMessage = 'Demasiadas solicitudes. Por favor, espera un momento';
          break;
        case 500:
          errorMessage = 'Error interno del servidor';
          break;
        default:
          errorMessage = `Error ${error.status}: ${error.message}`;
      }
    }
    
    console.error('❌ Error en WgerApiService:', errorMessage);
    return throwError(() => new Error(errorMessage));
  }

  // ✅ IDIOMAS CON MANEJO DE ERRORES
  getIdiomas(): Observable<any[]> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/language/`).pipe(
      map(response => response.results || []),
      catchError(this.handleError)
    );
  }

  // ✅ EJERCICIOS SOLO ESPAÑOL OPTIMIZADO
  getEjerciciosSoloEspanol(limit: number = 50): Observable<Ejercicio[]> {
    return this.getEjerciciosCompletos(limit).pipe(
      map(ejercicios => {
        console.log('✅ Ejercicios en español cargados:', ejercicios.length);
        return ejercicios;
      })
    );
  }

  // ✅ MÉTODOS ADICIONALES CON MANEJO DE ERRORES
  getMusculos(): Observable<any[]> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/muscle/`).pipe(
      map(response => response.results || []),
      catchError(this.handleError)
    );
  }

  getEquipamiento(): Observable<any[]> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/equipment/`).pipe(
      map(response => response.results || []),
      catchError(this.handleError)
    );
  }

  getCategorias(): Observable<any[]> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/exercisecategory/`).pipe(
      map(response => response.results || []),
      catchError(this.handleError)
    );
  }

  //  LIMPIAR CACHÉ 
  clearCache(): void {
    this.cacheEjercicios = null;
    console.log('🗑️ Cache de ejercicios limpiado');
  }

  private limpiarDescripcion(descripcion: string): string {
    if (!descripcion) return 'Descripción no disponible';
    
    const descripcionLimpia = descripcion
      .replace(/<[^>]*>/g, '') 
      .replace(/\s+/g, ' ')    
      .trim();
    
    return descripcionLimpia || 'Descripción no disponible';
  }
}