import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DocumentosMedicosPage } from './documentos-medicos.page';

describe('DocumentosMedicosPage', () => {
  let component: DocumentosMedicosPage;
  let fixture: ComponentFixture<DocumentosMedicosPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(DocumentosMedicosPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
