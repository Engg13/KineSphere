import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AgregarPacientePage } from './agregar-paciente.page';

describe('AgregarPacientePage', () => {
  let component: AgregarPacientePage;
  let fixture: ComponentFixture<AgregarPacientePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AgregarPacientePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
