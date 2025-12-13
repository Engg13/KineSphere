import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { IonicModule, AlertController, LoadingController, NavController } from '@ionic/angular';
import { EjerciciosPage } from './ejercicios.page';
import { WgerApiService, Ejercicio } from '../../services/wger-api.service'; // Importar Ejercicio
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { of } from 'rxjs';

describe('EjerciciosPage', () => {
  let component: EjerciciosPage;
  let fixture: ComponentFixture<EjerciciosPage>;
  let mockWgerService: any;
  let mockAlertController: any;
  let mockLoadingController: any;
  let mockNavController: any;

  // Mock completo de ejercicios
  const mockEjercicios: Ejercicio[] = [
    { 
      id: 1, 
      nombre: 'Sentadilla', 
      descripcion: 'Ejercicio para piernas', 
      categoria: 10,
      musculos: [1, 2],
      musculos_secundarios: [3, 4],
      equipamiento: [5],
      imagenes: []
    },
    { 
      id: 2, 
      nombre: 'Flexiones', 
      descripcion: 'Ejercicio para pecho', 
      categoria: 10,
      musculos: [6, 7],
      musculos_secundarios: [8],
      equipamiento: [],
      imagenes: []
    }
  ];

  beforeEach(async () => {
    // Mock de WgerApiService
    mockWgerService = {
      getEjerciciosCompletos: jasmine.createSpy('getEjerciciosCompletos').and.returnValue(of(mockEjercicios)),
      getCategorias: jasmine.createSpy('getCategorias').and.returnValue(of([{ id: 10, name: 'Fuerza' }])),
      getMusculos: jasmine.createSpy('getMusculos').and.returnValue(of([])),
      getEquipamiento: jasmine.createSpy('getEquipamiento').and.returnValue(of([])),
      buscarEjercicios: jasmine.createSpy('buscarEjercicios').and.returnValue(of([])),
      clearCache: jasmine.createSpy('clearCache')
    };

    // Mock de AlertController
    mockAlertController = {
      create: jasmine.createSpy('create').and.returnValue(Promise.resolve({
        present: jasmine.createSpy('present').and.returnValue(Promise.resolve())
      }))
    };

    // Mock de LoadingController
    const mockLoading = {
      present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
      dismiss: jasmine.createSpy('dismiss').and.returnValue(Promise.resolve())
    };
    mockLoadingController = {
      create: jasmine.createSpy('create').and.returnValue(Promise.resolve(mockLoading))
    };

    // Mock de NavController
    mockNavController = {
      back: jasmine.createSpy('back')
    };

    await TestBed.configureTestingModule({
      declarations: [EjerciciosPage],
      imports: [IonicModule.forRoot()],
      providers: [
        { provide: WgerApiService, useValue: mockWgerService },
        { provide: AlertController, useValue: mockAlertController },
        { provide: LoadingController, useValue: mockLoadingController },
        { provide: NavController, useValue: mockNavController },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting()
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(EjerciciosPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have initial values', () => {
    expect(component.ejercicios).toEqual([]);
    expect(component.ejerciciosFiltrados).toEqual([]);
    expect(component.terminoBusqueda).toBe('');
  });

  it('should load exercises on init', fakeAsync(() => {
    component.ngOnInit();
    tick();

    expect(mockWgerService.getEjerciciosCompletos).toHaveBeenCalled();
    expect(component.ejercicios.length).toBe(2);
    expect(component.ejerciciosFiltrados.length).toBe(2);
  }));

  it('should track by exercise id', () => {
    const ejercicio = mockEjercicios[0];
    const result = component.trackById(0, ejercicio);
    
    expect(result).toBe(1);
  });

  it('should get exercise icon for category', () => {
    // Mockear categorías primero
    component.categorias = [{ id: 10, name: 'Fuerza' }];
    
    const fuerzaIcon = component.getExerciseIcon(10);
    expect(fuerzaIcon).toBe('barbell');
    
    const defaultIcon = component.getExerciseIcon(999);
    expect(defaultIcon).toBe('fitness');
  });

  it('should filter exercises by search term', () => {
    component.ejercicios = mockEjercicios;
    
    component.terminoBusqueda = 'sentadilla';
    component.filtrarEjercicios();
    
    expect(component.ejerciciosFiltrados.length).toBe(1);
    expect(component.ejerciciosFiltrados[0].nombre).toBe('Sentadilla');
  });

  it('should clear search', () => {
    component.terminoBusqueda = 'test';
    component.ejerciciosFiltrados = [];
    component.limpiarBusqueda();
    
    expect(component.terminoBusqueda).toBe('');
    expect(component.ejerciciosFiltrados.length).toBe(0);
  });

  it('should navigate back', () => {
    component.volverAtras();
    expect(mockNavController.back).toHaveBeenCalled();
  });
});