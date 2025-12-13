import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { IonicModule, NavController, ToastController, Platform } from '@ionic/angular';
import { AgregarPacientePage } from './agregar-paciente.page';
import { JsonServerService } from '../../services/json-server.service';
import { DatabaseService } from '../../services/database.service';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { of, throwError } from 'rxjs';

describe('AgregarPacientePage', () => {
  let component: AgregarPacientePage;
  let fixture: ComponentFixture<AgregarPacientePage>;
  
  // Mocks de servicios
  let mockJsonServerService: any;
  let mockDatabaseService: any;
  let mockNavController: any;
  let mockToastController: any;
  let mockPlatform: any;

  beforeEach(async () => {
    // Mock de JsonServerService
    mockJsonServerService = {
      createPaciente: jasmine.createSpy('createPaciente').and.returnValue(of({ id: 1 }))
    };

    // Mock de DatabaseService
    mockDatabaseService = {
      addPaciente: jasmine.createSpy('addPaciente').and.returnValue(Promise.resolve({ insertId: 1 })),
      getPacientes: jasmine.createSpy('getPacientes').and.returnValue(Promise.resolve([]))
    };

    // Mock de NavController
    mockNavController = {
      navigateRoot: jasmine.createSpy('navigateRoot')
    };

    // Mock de ToastController
    const mockToast = {
      present: jasmine.createSpy('present').and.returnValue(Promise.resolve())
    };
    mockToastController = {
      create: jasmine.createSpy('create').and.returnValue(Promise.resolve(mockToast))
    };

    // Mock de Platform
    mockPlatform = {
      is: jasmine.createSpy('is').and.returnValue(false) // Simular web por defecto
    };

    await TestBed.configureTestingModule({
      declarations: [AgregarPacientePage],
      imports: [IonicModule.forRoot()],
      providers: [
        { provide: JsonServerService, useValue: mockJsonServerService },
        { provide: DatabaseService, useValue: mockDatabaseService },
        { provide: NavController, useValue: mockNavController },
        { provide: ToastController, useValue: mockToastController },
        { provide: Platform, useValue: mockPlatform },
        provideHttpClient(withInterceptorsFromDi()),  // ← NECESARIO para HttpClient
        provideHttpClientTesting()                    // ← NECESARIO para testing HTTP
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(AgregarPacientePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have initial paciente object', () => {
    expect(component.paciente).toBeDefined();
    expect(component.paciente.nombre).toBe('');
    expect(component.paciente.activo).toBeTrue();
  });

  it('should validate form correctly', () => {
    // Formulario inválido (campos vacíos)
    expect(component.formularioValido()).toBeFalse();

    // Formulario válido
    component.paciente.nombre = 'Juan Pérez';
    component.paciente.rut = '12.345.678-9';
    component.paciente.telefono = '+56912345678';
    component.paciente.diagnostico = 'Lumbalgia';
    
    expect(component.formularioValido()).toBeTrue();
  });

  it('should calculate age from birth date', () => {
  // 1. Configurar fecha fija
  const fechaFija = new Date('2024-01-15');
  
  // 2. Instalar y configurar el reloj de Jasmine
  jasmine.clock().install();
  jasmine.clock().mockDate(fechaFija);

  try {
    // 3. Configurar fecha de nacimiento
    component.paciente.fechaNacimiento = '1990-05-15';
    
    const edadCalculada = component.calcularEdad();
  
    expect(edadCalculada).toBe(33);
    
  } finally {
    // 6. SIEMPRE restaurar el reloj
    jasmine.clock().uninstall();
  }
});

  it('should generate patient ID from RUT', () => {
    component.paciente.rut = '12.345.678-9';
    const id = component.generarIdPaciente();
    
    expect(id).toBe('PAC-6789'); // Últimos 4 dígitos del RUT limpio
  });

  it('should format RUT correctly', () => {
  // Caso 1: RUT sin puntos ni guión (123456789)
  component.paciente.rut = '123456789';
  component.formatearRut();
  
  // ✅ Formato chileno estándar: 12.345.678-9
  // Nota: El 9 es el dígito verificador calculado o asumido
  expect(component.paciente.rut).toBe('12.345.678-9');
  
  // Caso 2: RUT con dígito verificador en minúscula (12345678k)
  component.paciente.rut = '12345678k';
  component.formatearRut();
  
  // ✅ Debería capitalizar el K
  expect(component.paciente.rut).toBe('12.345.678-K');
  
  // Caso 3: RUT ya formateado (no debería cambiar)
  component.paciente.rut = '12.345.678-9';
  component.formatearRut();
  expect(component.paciente.rut).toBe('12.345.678-9');
  
  // Caso 4: RUT con espacios (debería limpiar)
  component.paciente.rut = ' 12.345.678-9 ';
  component.formatearRut();
  expect(component.paciente.rut).toBe('12.345.678-9');
});

  it('should format phone number correctly', () => {
    // Celular chileno (9 dígitos)
    component.paciente.telefono = '912345678';
    component.formatearTelefono();
    
    expect(component.paciente.telefono).toBe('+56 912345678');
    
    // Ya con código de país
    component.paciente.telefono = '56912345678';
    component.formatearTelefono();
    
    expect(component.paciente.telefono).toBe('+56 9 12345678');
  });

  it('should save patient successfully in web mode', fakeAsync(async () => {
    // Configurar paciente válido
    component.paciente.nombre = 'Test Paciente';
    component.paciente.rut = '12.345.678-9';
    component.paciente.telefono = '+56912345678';
    component.paciente.diagnostico = 'Test';
    
    spyOn(component as any, 'mostrarToast');

    await component.guardarPaciente();
    tick();

    expect(mockJsonServerService.createPaciente).toHaveBeenCalled();
    expect(mockNavController.navigateRoot).toHaveBeenCalledWith('/pacientes-lista');
    expect((component as any).mostrarToast).toHaveBeenCalledWith(
      jasmine.stringContaining('Paciente guardado exitosamente'),
      'success'
    );
  }));

  it('should show warning when form is invalid', async () => {
    // Formulario inválido (campos vacíos)
    spyOn(component as any, 'mostrarToast');

    await component.guardarPaciente();

    expect((component as any).mostrarToast).toHaveBeenCalledWith(
      'Por favor completa los campos obligatorios',
      'warning'
    );
    expect(mockJsonServerService.createPaciente).not.toHaveBeenCalled();
  });

  it('should navigate back to patients list', () => {
    component.volverAPacientes();
    expect(mockNavController.navigateRoot).toHaveBeenCalledWith('/pacientes-lista');
  });
});