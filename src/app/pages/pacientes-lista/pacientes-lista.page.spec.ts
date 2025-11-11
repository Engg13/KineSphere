import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PacientesListaPage } from './pacientes-lista.page';

describe('PacientesListaPage', () => {
  let component: PacientesListaPage;
  let fixture: ComponentFixture<PacientesListaPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(PacientesListaPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
