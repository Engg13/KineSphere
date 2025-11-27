import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VisitaDomiciliariaPage } from './visita-domiciliaria.page';

describe('VisitaDomiciliariaPage', () => {
  let component: VisitaDomiciliariaPage;
  let fixture: ComponentFixture<VisitaDomiciliariaPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(VisitaDomiciliariaPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
