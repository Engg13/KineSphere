import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EvaluacionFinalPage } from './evaluacion-final.page';

describe('EvaluacionFinalPage', () => {
  let component: EvaluacionFinalPage;
  let fixture: ComponentFixture<EvaluacionFinalPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(EvaluacionFinalPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
