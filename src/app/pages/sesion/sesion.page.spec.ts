import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { IonicModule, NavController } from '@ionic/angular';
import { SesionPage } from './sesion.page';
import { JsonServerService } from '../../services/json-server.service';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { of, throwError } from 'rxjs';

describe('SesionPage', () => {
  let component: SesionPage;
  let fixture: ComponentFixture<SesionPage>;
  let mockJsonServerService: any;
  let mockNavController: any;

  beforeEach(async () => {
    // Mock de JsonServerService
    mockJsonServerService = {
      createSesion: jasmine.createSpy('createSesion').and.returnValue(of({ id: 1, success: true }))
    };

    // Mock de NavController
    mockNavController = {
      navigateBack: jasmine.createSpy('navigateBack'),
      navigateRoot: jasmine.createSpy('navigateRoot')
    };

    await TestBed.configureTestingModule({
      declarations: [SesionPage],
      imports: [IonicModule.forRoot()],
      providers: [
        { provide: JsonServerService, useValue: mockJsonServerService },
        { provide: NavController, useValue: mockNavController },
        provideHttpClient(withInterceptorsFromDi()),  // ← NECESARIO para HttpClient
        provideHttpClientTesting()                    // ← NECESARIO para testing HTTP
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(SesionPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have initial values', () => {
    expect(component.pacienteNombre).toBe('Juan Perez');
    expect(component.numeroSesion).toBe(4);
    expect(component.sesionData.nivelDolor).toBe(0);
    expect(component.sesionData.calidadSueno).toBe(0);
    expect(component.sesionData.ejerciciosRealizados).toBe(true);
  });

  it('should validate form correctly', () => {
    // Formulario inválido (calidadSueno = 0)
    expect(component.esFormularioValido()).toBeFalse();

    // Formulario válido
    component.sesionData.nivelDolor = 5;
    component.sesionData.calidadSueno = 3;
    expect(component.esFormularioValido()).toBeTrue();
  });

  it('should save session successfully', fakeAsync(() => {
    // Configurar datos válidos
    component.sesionData.nivelDolor = 5;
    component.sesionData.calidadSueno = 3;
    component.sesionData.observaciones = 'Test observación';

    spyOn(window, 'alert'); // Mock de alert

    // Ejecutar guardar
    component.guardarSesion();
    tick();

    // Verificar que se llamó al servicio
    expect(mockJsonServerService.createSesion).toHaveBeenCalled();
    
    // Verificar los datos enviados
    const datosEsperados = {
      paciente_id: 1,
      numero_sesion: 4,
      nivel_dolor: 5,
      calidad_sueno: 3,
      ejercicios_realizados: true,
      observaciones: 'Test observación',
      fecha: jasmine.any(String)
    };
    
    expect(mockJsonServerService.createSesion).toHaveBeenCalledWith(datosEsperados);
  }));

  it('should show alert when form is invalid', () => {
    // Datos inválidos (calidadSueno = 0)
    component.sesionData.nivelDolor = 5;
    component.sesionData.calidadSueno = 0;

    spyOn(window, 'alert');

    component.guardarSesion();

    expect(window.alert).toHaveBeenCalledWith('Por favor, complete la evaluación de dolor y calidad de sueño');
    expect(mockJsonServerService.createSesion).not.toHaveBeenCalled();
  });

  it('should handle save error', fakeAsync(() => {
    // Mock error
    mockJsonServerService.createSesion.and.returnValue(throwError(() => new Error('Server error')));
    
    component.sesionData.nivelDolor = 5;
    component.sesionData.calidadSueno = 3;

    spyOn(window, 'alert');
    spyOn(console, 'error');

    component.guardarSesion();
    tick();

    expect(console.error).toHaveBeenCalledWith('❌ Error al guardar sesión:', jasmine.any(Error));
    expect(window.alert).toHaveBeenCalledWith('❌ Error al guardar la sesión. Verifica que json-server esté corriendo en http://localhost:3000');
  }));

  it('should navigate back to patient detail', () => {
    component.volverAPaciente();
    expect(mockNavController.navigateBack).toHaveBeenCalledWith('/paciente-detalle');
  });

  it('should navigate to dashboard', () => {
    component.volverAlDashboard();
    expect(mockNavController.navigateRoot).toHaveBeenCalledWith('/dashboard');
  });
});