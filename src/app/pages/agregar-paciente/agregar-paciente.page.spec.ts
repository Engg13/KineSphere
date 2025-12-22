import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AgregarPacientePage } from './agregar-paciente.page';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { IonicModule } from '@ionic/angular';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

// Importa las clases REALES de tus servicios
import { DatabaseService } from '../../services/database.service';
import { PlatformService } from '../../services/platform.service';
import { JsonServerService } from '../../services/json-server.service';
import { NavController, ToastController } from '@ionic/angular';

describe('AgregarPacientePage', () => {
  let component: AgregarPacientePage;
  let fixture: ComponentFixture<AgregarPacientePage>;

  beforeEach(async () => {
    // Crea mocks ESPECÍFICOS usando jasmine
    const databaseServiceMock = jasmine.createSpyObj('DatabaseService', [
      'createPaciente', 'getPacientes', 'getPaciente', 'updatePaciente', 'deletePaciente'
    ]);
    
    const platformServiceMock = jasmine.createSpyObj('PlatformService', ['shouldUseSQLite']);
    const jsonServerServiceMock = jasmine.createSpyObj('JsonServerService', ['createPaciente']);
    const navControllerMock = jasmine.createSpyObj('NavController', ['navigateRoot', 'navigateBack']);
    const toastControllerMock = jasmine.createSpyObj('ToastController', ['create']);

    // Configura los valores de retorno
    databaseServiceMock.createPaciente.and.returnValue(Promise.resolve({ id: 1 }));
    platformServiceMock.shouldUseSQLite.and.returnValue(false);
    jsonServerServiceMock.createPaciente.and.returnValue(Promise.resolve({ id: 1 }));
    toastControllerMock.create.and.returnValue(
      Promise.resolve({
        present: jasmine.createSpy('present').and.returnValue(Promise.resolve())
      })
    );

    await TestBed.configureTestingModule({
      declarations: [AgregarPacientePage],
      imports: [
        IonicModule.forRoot(),
        HttpClientTestingModule,
        ReactiveFormsModule,
        FormsModule
      ],
      providers: [
        // Usa las CLASES REALES como tokens, no strings
        { provide: DatabaseService, useValue: databaseServiceMock },
        { provide: PlatformService, useValue: platformServiceMock },
        { provide: JsonServerService, useValue: jsonServerServiceMock },
        { provide: NavController, useValue: navControllerMock },
        { provide: ToastController, useValue: toastControllerMock }
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(AgregarPacientePage);
    component = fixture.componentInstance;
  });

  it('should create component instance', () => {
    expect(component).toBeTruthy();
  });
});