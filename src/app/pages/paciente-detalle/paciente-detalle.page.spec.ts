import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { IonicModule } from '@ionic/angular';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { PacienteDetallePage } from './paciente-detalle.page';
import { JsonServerService } from '../../services/json-server.service';
import { DatabaseService } from '../../services/database.service';
import { NavController } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('PacienteDetallePage', () => {
  let component: PacienteDetallePage;
  let fixture: ComponentFixture<PacienteDetallePage>;
  let databaseServiceSpy: any;
  let navControllerSpy: any;

  beforeEach(async () => {
    // Crear mocks
    databaseServiceSpy = jasmine.createSpyObj('DatabaseService', [
      'getPaciente',
      'getPacientes',
      'getSesionesByPaciente'
    ]);

    const jsonServerServiceSpy = jasmine.createSpyObj('JsonServerService', ['getPaciente']);
    navControllerSpy = jasmine.createSpyObj('NavController', ['navigateRoot', 'navigateBack']);

    // Configurar mock de ActivatedRoute para queryParams
    const activatedRouteSpy = {
      queryParams: of({ id: '123' }) // Usamos of() de rxjs para crear un observable
    };

    await TestBed.configureTestingModule({
      declarations: [PacienteDetallePage],
      imports: [
        IonicModule.forRoot(),
        HttpClientTestingModule
      ],
      providers: [
        { provide: JsonServerService, useValue: jsonServerServiceSpy },
        { provide: DatabaseService, useValue: databaseServiceSpy },
        { provide: NavController, useValue: navControllerSpy },
        { provide: ActivatedRoute, useValue: activatedRouteSpy }
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

  it('should load pacienteId from query params', () => {
    expect(component.pacienteId).toBe('123');
  });

  it('should initialize with loading state', () => {
    expect(component.estaCargando).toBeTrue();
  });
});