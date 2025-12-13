import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { IonicModule, NavController } from '@ionic/angular';
import { PacienteDetallePage } from './paciente-detalle.page';
import { ActivatedRoute } from '@angular/router';
import { JsonServerService } from '../../services/json-server.service';
import { DatabaseService } from '../../services/database.service';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { of } from 'rxjs';

describe('PacienteDetallePage', () => {
  let component: PacienteDetallePage;
  let fixture: ComponentFixture<PacienteDetallePage>;
  
  // Mocks de servicios
  let mockActivatedRoute: any;
  let mockJsonServerService: any;
  let mockDatabaseService: any;
  let mockNavController: any;

  beforeEach(async () => {
    // Mock de ActivatedRoute con parámetros
    mockActivatedRoute = {
      queryParams: of({
        id: '123'
      })
    };

    // Mock de JsonServerService
    mockJsonServerService = {
      getPaciente: jasmine.createSpy('getPaciente').and.returnValue(of({
        id: '123',
        nombre: 'Juan Pérez',
        telefono: '+56912345678',
        email: 'juan@email.com'
      })),
      getPacientes: jasmine.createSpy('getPacientes').and.returnValue(of([])),
      getSesionesPorPaciente: jasmine.createSpy('getSesionesPorPaciente').and.returnValue(of([]))
    };

    // Mock de DatabaseService
    mockDatabaseService = {
      getPaciente: jasmine.createSpy('getPaciente').and.returnValue(Promise.resolve(null)), // Por defecto null para forzar JSON Server
      getSesionesByPaciente: jasmine.createSpy('getSesionesByPaciente').and.returnValue(Promise.resolve([]))
    };

    // Mock de NavController
    mockNavController = {
      navigateRoot: jasmine.createSpy('navigateRoot'),
      navigateBack: jasmine.createSpy('navigateBack')
    };

    await TestBed.configureTestingModule({
      declarations: [PacienteDetallePage],
      imports: [IonicModule.forRoot()],
      providers: [
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: JsonServerService, useValue: mockJsonServerService },
        { provide: DatabaseService, useValue: mockDatabaseService },
        { provide: NavController, useValue: mockNavController },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting()
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(PacienteDetallePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load patient from route params', fakeAsync(() => {
    // Simular que localStorage tiene un paciente guardado
    spyOn(localStorage, 'getItem').and.returnValue('123');
    
    component.ngOnInit();
    tick();
    
    expect(component.pacienteId).toBe('123');
    expect(mockDatabaseService.getPaciente).toHaveBeenCalledWith(123);
    expect(mockJsonServerService.getPaciente).toHaveBeenCalledWith('123');
  }));

  it('should load patient from localStorage when no route params', fakeAsync(() => {
    // Mock de ActivatedRoute sin parámetros
    mockActivatedRoute.queryParams = of({});
    spyOn(localStorage, 'getItem').and.returnValue('456');
    
    component.ngOnInit();
    tick();
    
    expect(component.pacienteId).toBe('456');
  }));

  it('should handle patient not found', fakeAsync(() => {
    // Mock de que no se encuentra el paciente
    mockJsonServerService.getPaciente.and.returnValue(of(null));
    mockJsonServerService.getPacientes.and.returnValue(of([]));
    
    spyOn(localStorage, 'getItem').and.returnValue('999');
    
    component.ngOnInit();
    tick();
    
    expect(component.paciente).toBeNull();
    expect(component.estaCargando).toBeFalse();
  }));

  it('should navigate to new session', () => {
    component.paciente = { id: '123', nombre: 'Test' };
    
    component.nuevaSesion();
    
    expect(mockNavController.navigateRoot).toHaveBeenCalledWith('/sesion', {
      queryParams: { 
        pacienteId: '123',
        pacienteNombre: 'Test' 
      }
    });
  });

  it('should navigate back to list', () => {
    component.volverALista();
    expect(mockNavController.navigateBack).toHaveBeenCalledWith('/pacientes-lista');
  });

  it('should navigate to documents', () => {
    component.paciente = { id: '123', nombre: 'Test' };
    
    component.irADocumentos();
    
    expect(mockNavController.navigateRoot).toHaveBeenCalledWith('/documentos-medicos', {
      queryParams: { 
        pacienteId: '123',
        pacienteNombre: 'Test' 
      }
    });
  });

  it('should navigate to edit patient', () => {
    component.paciente = { id: '123', nombre: 'Test' };
    
    component.editarPaciente();
    
    expect(mockNavController.navigateRoot).toHaveBeenCalledWith('/agregar-paciente', {
      queryParams: { 
        id: '123',
        modoEdicion: true 
      }
    });
  });

  it('should refresh data', fakeAsync(async () => {
    component.pacienteId = '123';
    spyOn(component as any, 'cargarPaciente');
    
    await component.refrescarDatos();
    tick();
    
    expect((component as any).cargarPaciente).toHaveBeenCalledWith('123');
  }));

  it('should handle phone call', () => {
    component.paciente = { telefono: '+56912345678' };
    spyOn(window, 'open');
    
    component.llamarPaciente();
    
    expect(window.open).toHaveBeenCalledWith('tel:+56912345678', '_system');
  });

  it('should handle email', () => {
    component.paciente = { email: 'test@email.com' };
    spyOn(window, 'open');
    
    component.enviarEmail();
    
    expect(window.open).toHaveBeenCalledWith('mailto:test@email.com', '_system');
  });
});