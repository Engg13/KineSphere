import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DocumentosMedicosPage } from './documentos-medicos.page';
import { IonicModule, NavController } from '@ionic/angular';

describe('DocumentosMedicosPage', () => {
  let component: DocumentosMedicosPage;

  // 
  beforeEach(() => {
    
    component = new DocumentosMedicosPage(
      { 
        paramMap: { subscribe: () => {} },
        queryParams: { subscribe: () => {} }
      } as any, // ActivatedRoute fake
      { navigateBack: () => {} } as any, 
      {} as any 
    );
  });

  it('should exist', () => {
    expect(component).toBeTruthy();
  });

  it('should have default values', () => {
    expect(component.documentos).toEqual([]);
    expect(component.pacienteId).toBe(0);
    expect(component.pacienteNombre).toBe('Paciente');
  });

  it('should have navigation method', () => {
    expect(typeof component.volverAlPaciente).toBe('function');
  });

  it('should have camera methods', () => {
    expect(typeof component.tomarFoto).toBe('function');
    expect(typeof component.abrirGaleria).toBe('function');
  });
});