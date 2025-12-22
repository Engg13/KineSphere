import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EvaluacionFinalPage } from './evaluacion-final.page';
import { ActivatedRoute } from '@angular/router'; // ← NECESARIO
import { of } from 'rxjs'; // ← Para el mock
import { IonicModule } from '@ionic/angular'; // ← Para componentes Ionic
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core'; // ← Para ignorar componentes

describe('EvaluacionFinalPage', () => {
  let component: EvaluacionFinalPage;
  let fixture: ComponentFixture<EvaluacionFinalPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EvaluacionFinalPage],
      imports: [IonicModule.forRoot()], // ← Para ion-button, ion-input, etc.
      providers: [
        { 
          provide: ActivatedRoute, 
          useValue: {
            queryParams: of({}) // ← Mock básico de ActivatedRoute
          } 
        }
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA] // ← Para que no falle con componentes Ionic
    }).compileComponents();

    fixture = TestBed.createComponent(EvaluacionFinalPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});