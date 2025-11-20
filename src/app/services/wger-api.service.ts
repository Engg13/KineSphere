// src/app/services/wger-api.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

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

@Injectable({
  providedIn: 'root'
})
export class WgerApiService {
  private apiUrl = 'https://wger.de/api/v2';
  private idiomaId = 4; // Español

  constructor(private http: HttpClient) { }

  // ✅ CORREGIDO: Filtrar solo ejercicios en español
  getEjerciciosCompletos(limit: number = 50): Observable<Ejercicio[]> {
    const params = new HttpParams()
      .set('limit', limit.toString())
      .set('language', this.idiomaId.toString()) // ✅ Filtrar por idioma
      .set('ordering', 'name'); // ✅ Ordenar por nombre

    return this.http.get<any>(`${this.apiUrl}/exercise-translation/`, { params }).pipe(
      map(response => {
        if (!response.results) {
          return [];
        }
        
        // ✅ Filtrar adicionalmente por idioma por si acaso
        const ejerciciosEspanol = response.results.filter((item: any) => 
          item.language === this.idiomaId
        );
        
        return ejerciciosEspanol.map((item: any) => ({
          id: item.exercise,
          nombre: item.name || 'Ejercicio sin nombre',
          descripcion: this.limpiarDescripcion(item.description),
          categoria: item.category || 0,
          musculos: item.muscles || [],
          musculos_secundarios: item.muscles_secondary || [],
          equipamiento: item.equipment || [],
          imagenes: item.images || []
        }));
      })
    );
  }

  // ✅ CORREGIDO: Búsqueda solo en español
  buscarEjercicios(termino: string): Observable<Ejercicio[]> {
    const params = new HttpParams()
      .set('language', this.idiomaId.toString()) // ✅ Filtrar por idioma
      .set('search', termino);

    return this.http.get<any>(`${this.apiUrl}/exercise-translation/`, { params }).pipe(
      map(response => {
        if (!response.results) {
          return [];
        }
        
        // ✅ Filtrar adicionalmente por idioma
        const ejerciciosEspanol = response.results.filter((item: any) => 
          item.language === this.idiomaId
        );
        
        return ejerciciosEspanol.map((item: any) => ({
          id: item.exercise,
          nombre: item.name || 'Ejercicio sin nombre',
          descripcion: this.limpiarDescripcion(item.description),
          categoria: item.category || 0,
          musculos: item.muscles || [],
          musculos_secundarios: item.muscles_secondary || [],
          equipamiento: item.equipment || [],
          imagenes: item.images || []
        }));
      })
    );
  }

  // ✅ NUEVO: Verificar idiomas disponibles
  getIdiomas(): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}/language/`).pipe(
      map(response => response.results || [])
    );
  }

  // ✅ NUEVO: Obtener ejercicios con verificación de idioma
  getEjerciciosSoloEspanol(limit: number = 50): Observable<Ejercicio[]> {
    return this.getEjerciciosCompletos(limit).pipe(
      map(ejercicios => {
        // Verificar que todos estén en español
        console.log('Ejercicios cargados (español):', ejercicios.length);
        return ejercicios;
      })
    );
  }

  private limpiarDescripcion(descripcion: string): string {
    if (!descripcion) return 'Descripción no disponible';
    
    // Limpiar HTML tags si existen
    const descripcionLimpia = descripcion.replace(/<[^>]*>/g, '').trim();
    return descripcionLimpia || 'Descripción no disponible';
  }

  getMusculos(): Observable<any> {
    return this.http.get(`${this.apiUrl}/muscle/`);
  }

  getEquipamiento(): Observable<any> {
    return this.http.get(`${this.apiUrl}/equipment/`);
  }

  getCategorias(): Observable<any> {
    return this.http.get(`${this.apiUrl}/exercisecategory/`);
  }
}