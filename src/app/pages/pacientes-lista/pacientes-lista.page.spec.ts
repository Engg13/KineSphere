import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { IonicModule, NavController, LoadingController, ToastController, AlertController } from '@ionic/angular';
import { PacientesListaPage } from './pacientes-lista.page';
import { JsonServerService } from '../../services/json-server.service';
import { DatabaseService } from '../../services/database.service';
import { PlatformService } from '../../services/platform.service';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { of } from 'rxjs';

describe('PacientesListaPage', () => {
  let component: PacientesListaPage;
  let fixture: ComponentFixture<PacientesListaPage>;
  
  // Mocks de todos los servicios
  let mockJsonServerService: any;
  let mockDatabaseService: any;
  let mockPlatformService: any;
  let mockNavController: any;
  let mockLoadingController: any;
  let mockToastController: any;
  let mockAlertController: any;

  beforeEach(async () => {
    // Mock de JsonServerService
    mockJsonServerService = {
      getPacientes: jasmine.createSpy('getPacientes').and.returnValue(of([])),
      createPaciente: jasmine.createSpy('createPaciente').and.returnValue(of({})),
      deletePaciente: jasmine.createSpy('deletePaciente').and.returnValue(of({}))
    };

    // Mock de DatabaseService
    mockDatabaseService = {
      getPacientes: jasmine.createSpy('getPacientes').and.returnValue(Promise.resolve([])),
      addPaciente: jasmine.createSpy('addPaciente').and.returnValue(Promise.resolve()),
      deletePaciente: jasmine.createSpy('deletePaciente').and.returnValue(Promise.resolve())
    };

    // Mock de PlatformService
    mockPlatformService = {
      getDebugInfo: jasmine.createSpy('getDebugInfo').and.returnValue({
        descripcion: 'Test Platform',
        isNative: false,
        isWeb: true
      }),
      shouldUseSQLite: jasmine.createSpy('shouldUseSQLite').and.returnValue(false)
    };

    // Mock de LoadingController
    const mockLoading = {
      present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
      dismiss: jasmine.createSpy('dismiss').and.returnValue(Promise.resolve())
    };
    mockLoadingController = {
      create: jasmine.createSpy('create').and.returnValue(Promise.resolve(mockLoading))
    };

    // Mock de ToastController
    const mockToast = {
      present: jasmine.createSpy('present').and.returnValue(Promise.resolve())
    };
    mockToastController = {
      create: jasmine.createSpy('create').and.returnValue(Promise.resolve(mockToast))
    };

    // Mock de AlertController
    const mockAlert = {
      present: jasmine.createSpy('present').and.returnValue(Promise.resolve())
    };
    mockAlertController = {
      create: jasmine.createSpy('create').and.returnValue(Promise.resolve(mockAlert))
    };

    // Mock de NavController
    mockNavController = {
      navigateRoot: jasmine.createSpy('navigateRoot')
    };

    await TestBed.configureTestingModule({
      declarations: [PacientesListaPage],
      imports: [IonicModule.forRoot()],
      providers: [
        { provide: JsonServerService, useValue: mockJsonServerService },
        { provide: DatabaseService, useValue: mockDatabaseService },
        { provide: PlatformService, useValue: mockPlatformService },
        { provide: NavController, useValue: mockNavController },
        { provide: LoadingController, useValue: mockLoadingController },
        { provide: ToastController, useValue: mockToastController },
        { provide: AlertController, useValue: mockAlertController },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting()
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(PacientesListaPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with correct title', () => {
    expect(component.tituloPagina).toBe('Lista de Pacientes');
  });

  it('should load patients on init', fakeAsync(() => {
    // Configurar mocks para carga exitosa
    mockJsonServerService.getPacientes.and.returnValue(of([
      { id: 1, nombre: 'Test Paciente', activo: true }
    ]));

    component.ngOnInit();
    tick();

    expect(component.pacientes.length).toBe(1);
    expect(component.estaCargando).toBeFalse();
  }));

  it('should navigate to add patient', () => {
    component.agregarPaciente();
    expect(mockNavController.navigateRoot).toHaveBeenCalledWith('/agregar-paciente');
  });

  it('should calculate total patients', () => {
    component.pacientes = [
      { id: 1, nombre: 'Paciente 1' },
      { id: 2, nombre: 'Paciente 2' }
    ];
    
    expect(component.totalPacientes).toBe(2);
  });

  it('should calculate active patients', () => {
    component.pacientes = [
      { id: 1, nombre: 'Paciente 1', activo: true },
      { id: 2, nombre: 'Paciente 2', activo: false },
      { id: 3, nombre: 'Paciente 3', activo: true }
    ];
    
    expect(component.pacientesActivos).toBe(2);
  });

  // Test para mostrarToast
  it('should show toast', fakeAsync(async () => {
    await component.mostrarToast('Test message', 'success');
    expect(mockToastController.create).toHaveBeenCalled();
  }));
});