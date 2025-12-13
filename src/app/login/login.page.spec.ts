import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoginPage } from './login.page';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';

describe('LoginPage', () => {
  let component: LoginPage;
  let fixture: ComponentFixture<LoginPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [LoginPage],
      imports: [
        IonicModule.forRoot(),
        FormsModule
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debería crear el componente', () => {
    // Forma más explícita que evita problemas de tipos
    expect(component).not.toBeNull();
    expect(component).not.toBeUndefined();
    expect(component instanceof LoginPage).toBe(true);
  });

  it('debería tener propiedades inicializadas', () => {
    expect(component.username).toEqual('');
    expect(component.password).toEqual('');
    expect(component.showPwd).toBe(false);
  });

  it('debería cambiar visibilidad de contraseña', () => {
    const initialState = component.showPwd;
    
    component.togglePwd();
    expect(component.showPwd).toBe(!initialState);
    
    component.togglePwd();
    expect(component.showPwd).toBe(initialState);
  });
});