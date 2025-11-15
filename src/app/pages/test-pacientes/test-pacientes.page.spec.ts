import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TestPacientesPage } from './test-pacientes.page';

describe('TestPacientesPage', () => {
  let component: TestPacientesPage;
  let fixture: ComponentFixture<TestPacientesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(TestPacientesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
