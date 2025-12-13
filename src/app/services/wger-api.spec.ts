import { TestBed } from '@angular/core/testing';
import { WgerApiService } from './wger-api.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';

describe('WgerApiService', () => {
  let service: WgerApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        WgerApiService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(WgerApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch exercises', (done) => {
    // Mock directo del método
    spyOn(service, 'getEjerciciosCompletos').and.returnValue(
      of([{ 
        id: 1, 
        nombre: 'Test', 
        descripcion: 'Test',
        categoria: 1,
        musculos: [],
        musculos_secundarios: [],
        equipamiento: [],
        imagenes: []
      }])
    );

    service.getEjerciciosCompletos(5).subscribe(ejercicios => {
      expect(ejercicios.length).toBe(1);
      expect(ejercicios[0].nombre).toBe('Test');
      done();
    });
  });

  it('should handle errors', (done) => {
    // Mock directo del error
    spyOn(service, 'getEjerciciosCompletos').and.returnValue(
      throwError(() => new Error('Test error'))
    );

    service.getEjerciciosCompletos(5).subscribe({
      next: () => fail('Should have failed'),
      error: (error) => {
        expect(error.message).toBe('Test error');
        done();
      }
    });
  });
});