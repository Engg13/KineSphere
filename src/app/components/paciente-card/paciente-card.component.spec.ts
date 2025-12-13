import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { PacienteCardComponent } from './paciente-card.component';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { DatePipe } from '@angular/common';

describe('PacienteCardComponent', () => {
  let component: PacienteCardComponent;
  let fixture: ComponentFixture<PacienteCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PacienteCardComponent],
      imports: [IonicModule.forRoot()],
      providers: [DatePipe], // Para el pipe date
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(PacienteCardComponent);
    component = fixture.componentInstance;
    
    // ASIGNAR UN PACIENTE CON TODAS LAS PROPIEDADES QUE USA EL HTML
    component.paciente = {
      nombre: 'María García',           // ← REQUERIDO por {{ paciente.nombre }}
      genero: 'Femenino',               // ← REQUERIDO por paciente.genero
      // Las demás son opcionales por los *ngIf:
      edad: 28,                         // ← Si quieres probar la edad
      diagnostico: 'Lesión lumbar',     // ← Si quieres probar el diagnóstico
      fecha_ingreso: '2024-01-15'       // ← Si quieres probar fecha (con GUION BAJO _)
    };
    
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});