import { TestBed } from '@angular/core/testing';
import { DatabaseService } from './database.service';
import { SQLite } from '@awesome-cordova-plugins/sqlite/ngx';
import { Platform } from '@ionic/angular';
import { PlatformService } from './platform.service';

describe('DatabaseService', () => {
  let service: DatabaseService;
  let mockSQLite: any;
  let mockPlatform: any;
  let mockPlatformService: any;

  beforeEach(() => {
    // Mock de SQLiteObject
    const mockSQLiteObject = {
      executeSql: jasmine.createSpy('executeSql').and.returnValue(Promise.resolve({
        rows: {
          length: 0,
          item: (index: number) => ({})
        }
      })),
      close: jasmine.createSpy('close').and.returnValue(Promise.resolve())
    };

    // Mock de SQLite
    mockSQLite = {
      create: jasmine.createSpy('create').and.returnValue(Promise.resolve(mockSQLiteObject))
    };

    // Mock de Platform
    mockPlatform = {
      ready: jasmine.createSpy('ready').and.returnValue(Promise.resolve())
    };

    // Mock de PlatformService
    mockPlatformService = {
      shouldUseSQLite: jasmine.createSpy('shouldUseSQLite').and.returnValue(false), // Por defecto false para web
      getDebugInfo: jasmine.createSpy('getDebugInfo').and.returnValue({
        descripcion: 'web'
      })
    };

    TestBed.configureTestingModule({
      providers: [
        DatabaseService,
        { provide: SQLite, useValue: mockSQLite },
        { provide: Platform, useValue: mockPlatform },
        { provide: PlatformService, useValue: mockPlatformService }
      ]
    });

    service = TestBed.inject(DatabaseService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get pacientes from localStorage when in web mode', async () => {
    // Mock localStorage
    spyOn(localStorage, 'getItem').and.returnValue(JSON.stringify([
      { id: 1, nombre: 'Test User', es_demo: false }
    ]));

    const pacientes = await service.getPacientes();
    
    expect(pacientes.length).toBe(1);
    expect(pacientes[0].nombre).toBe('Test User');
    expect(pacientes[0].es_demo).toBeFalse();
  });

  it('should return demo pacientes when localStorage is empty', async () => {
    // Mock localStorage vacío
    spyOn(localStorage, 'getItem').and.returnValue(null);

    const pacientes = await service.getPacientes();
    
    expect(pacientes.length).toBe(3); // 3 pacientes demo
    expect(pacientes[0].es_demo).toBeTrue();
  });

  it('should add paciente to localStorage in web mode', async () => {
    const mockPaciente = {
      nombre: 'Nuevo Paciente',
      email: 'nuevo@email.com',
      telefono: '+56999999999',
      diagnostico: 'Test'
    };

    spyOn(localStorage, 'getItem').and.returnValue(JSON.stringify([]));
    spyOn(localStorage, 'setItem');

    const result = await service.addPaciente(mockPaciente);
    
    expect(localStorage.setItem).toHaveBeenCalled();
    expect(result.insertId).toBeDefined();
  });

  it('should delete paciente from localStorage in web mode', async () => {
    const pacientesMock = [
      { id: 1, nombre: 'Paciente 1' },
      { id: 2, nombre: 'Paciente 2' }
    ];

    spyOn(localStorage, 'getItem').and.returnValue(JSON.stringify(pacientesMock));
    spyOn(localStorage, 'setItem');

    const result = await service.deletePaciente(1);
    
    expect(localStorage.setItem).toHaveBeenCalled();
    expect(result.rowsAffected).toBe(1);
  });

  it('should get demo pacientes when in native mode but SQLite fails', async () => {
    // Configurar para modo nativo
    mockPlatformService.shouldUseSQLite.and.returnValue(true);
    mockSQLite.create.and.returnValue(Promise.reject('SQLite error'));

    const pacientes = await service.getPacientes();
    
    expect(pacientes.length).toBe(3); // Debería retornar demo
    expect(pacientes[0].es_demo).toBeTrue();
  });

  it('should handle getPaciente by id', async () => {
    spyOn(localStorage, 'getItem').and.returnValue(JSON.stringify([
      { id: 1, nombre: 'Paciente Específico' }
    ]));

    const paciente = await service.getPaciente(1);
    
    expect(paciente).toBeDefined();
    expect(paciente.nombre).toBe('Paciente Específico');
  });

  it('should return null for non-existent paciente', async () => {
    spyOn(localStorage, 'getItem').and.returnValue(JSON.stringify([]));

    const paciente = await service.getPaciente(999);
    
    expect(paciente).toBeNull();
  });

  it('should get estadisticas', async () => {
    spyOn(localStorage, 'getItem').and.returnValue(JSON.stringify([
      { id: 1, nombre: 'P1', activo: true, es_demo: false },
      { id: 2, nombre: 'P2', activo: false, es_demo: true }
    ]));

    const stats = await service.getEstadisticas();
    
    expect(stats.totalPacientes).toBe(2);
    expect(stats.pacientesActivos).toBe(1);
    expect(stats.pacientesReales).toBe(1);
    expect(stats.pacientesDemo).toBe(1);
  });

  it('should clear demo data from localStorage', async () => {
    spyOn(localStorage, 'removeItem');

    await service.clearDemoData();
    
    expect(localStorage.removeItem).toHaveBeenCalledWith('user_pacientes');
  });
});