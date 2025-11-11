import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PacienteDetallePage } from './paciente-detalle.page';

describe('PacienteDetallePage', () => {
  let component: PacienteDetallePage;
  let fixture: ComponentFixture<PacienteDetallePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(PacienteDetallePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
