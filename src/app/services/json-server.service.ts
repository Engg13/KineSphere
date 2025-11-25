import { Injectable } from '@angular/core';
import { 
  HttpClient, 
  HttpHeaders, 
  HttpErrorResponse 
} from '@angular/common/http';
import { 
  Observable, 
  throwError 
} from 'rxjs';
import { 
  retry, 
  catchError 
} from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class JsonServerService {
  private apiUrl = 'http://localhost:3000';

  constructor(private http: HttpClient) { }

  //  OPCIONES HTTP 
  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
    })
  };

  //  MANEJO CENTRALIZADO DE ERRORES 
  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Error desconocido';
    
    if (error.error instanceof ErrorEvent) {
      // Error del lado del cliente
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Error del lado del servidor
      errorMessage = `Código: ${error.status}\nMensaje: ${error.message}`;
    }
    
    console.error('Error en JsonServer API:', errorMessage);
    return throwError(() => new Error(errorMessage));
  }

  //  MÉTODOS PARA PACIENTES 
  getPacientes(): Observable<any> {
    return this.http.get(`${this.apiUrl}/pacientes`)
      .pipe(
        retry(2), 
        catchError(this.handleError) 
      );
  }

  getPaciente(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/pacientes/${id}`)
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  createPaciente(paciente: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/pacientes`, paciente, this.httpOptions)
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  updatePaciente(id: string, paciente: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/pacientes/${id}`, paciente, this.httpOptions)
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  deletePaciente(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/pacientes/${id}`)
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  // MÉTODOS PARA SESIONES 
  getSesiones(): Observable<any> {
    return this.http.get(`${this.apiUrl}/sesiones`)
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  getSesionesPorPaciente(pacienteId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/sesiones?paciente_id=${pacienteId}`)
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  getSesion(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/sesiones/${id}`)
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  createSesion(sesion: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/sesiones`, sesion, this.httpOptions)
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  updateSesion(id: string, sesion: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/sesiones/${id}`, sesion, this.httpOptions)
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  deleteSesion(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/sesiones/${id}`)
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  // MÉTODOS PARA PROFESIONALES 
  getProfesionales(): Observable<any> {
    return this.http.get(`${this.apiUrl}/profesionales`)
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  getProfesional(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/profesionales/${id}`)
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  // MÉTODO PARA LOGIN 
  loginProfesional(email: string, password: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/profesionales?email=${email}&password=${password}`)
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }
}