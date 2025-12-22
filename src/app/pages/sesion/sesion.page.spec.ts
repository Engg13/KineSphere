import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SesionPage } from './sesion.page';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { IonicModule } from '@ionic/angular';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { RouterTestingModule } from '@angular/router/testing'; // ← ¡IMPORTANTE!
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

// Importa las clases reales
import { DatabaseService } from '../../services/database.service';
import { PlatformService } from '../../services/platform.service';
import { JsonServerService } from '../../services/json-server.service';

describe('SesionPage', () => {
  let component: SesionPage;
  let fixture: ComponentFixture<SesionPage>;

  beforeEach(async () => {
    // Crea mocks
    const databaseServiceMock = jasmine.createSpyObj('DatabaseService', [
      'createSesion', 'getSesionesByPaciente', 'updateSesion'
    ]);
    
    const platformServiceMock = jasmine.createSpyObj('PlatformService', ['shouldUseSQLite']);
    const jsonServerServiceMock = jasmine.createSpyObj('JsonServerService', ['createSesion']);
    const navControllerMock = jasmine.createSpyObj('NavController', ['navigateBack']);
    const toastControllerMock = jasmine.createSpyObj('ToastController', ['create']);

    // Configura retornos
    databaseServiceMock.createSesion.and.returnValue(Promise.resolve({ id: 1 }));
    platformServiceMock.shouldUseSQLite.and.returnValue(false);
    jsonServerServiceMock.createSesion.and.returnValue(Promise.resolve({ id: 1 }));
    toastControllerMock.create.and.returnValue(
      Promise.resolve({
        present: jasmine.createSpy('present').and.returnValue(Promise.resolve())
      })
    );

    await TestBed.configureTestingModule({
      declarations: [SesionPage],
      imports: [
        IonicModule.forRoot(),
        HttpClientTestingModule,
        RouterTestingModule, // ← Esto provee ActivatedRoute
        FormsModule,
        ReactiveFormsModule
      ],
      providers: [
        // ActivatedRoute se provee automáticamente con RouterTestingModule
        { provide: DatabaseService, useValue: databaseServiceMock },
        { provide: PlatformService, useValue: platformServiceMock },
        { provide: JsonServerService, useValue: jsonServerServiceMock },
        { provide: 'NavController', useValue: navControllerMock },
        { provide: 'ToastController', useValue: toastControllerMock }
        // NO necesitas proveer ActivatedRoute si usas RouterTestingModule
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(SesionPage);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});