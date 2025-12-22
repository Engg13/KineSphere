import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { LoginPage } from './login.page';
import { AuthService } from '../services/auth.service';
import { NavController, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

describe('LoginPage', () => {
  let component: LoginPage;
  let fixture: ComponentFixture<LoginPage>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let navCtrlSpy: jasmine.SpyObj<NavController>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    // Crear spies
    authServiceSpy = jasmine.createSpyObj('AuthService', [
      'login', 
      'isAuthenticated',
      'getUsername',
      'validateCredentialsForDemo'
    ]);
    
    navCtrlSpy = jasmine.createSpyObj('NavController', ['navigateRoot']);
    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    // Configurar ToastController mock
    const toastSpy = jasmine.createSpyObj('Toast', ['present']);
    toastCtrlSpy.create.and.returnValue(Promise.resolve(toastSpy));

    // 🔥 MOCK DE validateCredentialsForDemo para simular validación
    authServiceSpy.validateCredentialsForDemo.and.callFake((username, password) => {
      // Simular validación básica
      const isValidFormat = username.length >= 3 && 
                           username.length <= 8 && 
                           /^[a-zA-Z0-9]+$/.test(username) &&
                           password.length === 4 && 
                           /^\d+$/.test(password);
      
      return {
        formatValid: isValidFormat,
        userExists: isValidFormat && username === 'kine123' && password === '1234',
        isValid: isValidFormat && username === 'kine123' && password === '1234',
        usernameLength: username?.length || 0,
        passwordLength: password?.length || 0,
        usernamePatternValid: username ? /^[a-zA-Z0-9]+$/.test(username) : false,
        passwordPatternValid: password ? /^\d+$/.test(password) : false,
        requirements: {
          usernameMin: 3,
          usernameMax: 8,
          passwordExact: 4,
          usernamePattern: 'alphanumeric',
          passwordPattern: 'numeric only'
        }
      };
    });

    await TestBed.configureTestingModule({
      declarations: [LoginPage],
      imports: [
        IonicModule.forRoot(),
        FormsModule
      ],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: NavController, useValue: navCtrlSpy },
        { provide: ToastController, useValue: toastCtrlSpy },
        { provide: Router, useValue: routerSpy }
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  //  CASOS POSITIVOS 
  describe('Login exitoso', () => {
    it('debe navegar al dashboard cuando las credenciales son válidas', fakeAsync(async () => {
      // Arrange
      authServiceSpy.login.and.returnValue(true);
      component.username = 'kine123';
      component.password = '1234';

      // Act
      await component.login();
      tick();

      // Assert
      expect(authServiceSpy.login).toHaveBeenCalledWith('kine123', '1234');
      expect(navCtrlSpy.navigateRoot).toHaveBeenCalledWith('/dashboard');
    }));
  });

  //  CASOS NEGATIVOS 
  describe('Login fallido - Casos negativos', () => {
    it('NO debe navegar cuando las credenciales son inválidas (formato válido pero usuario no existe)', fakeAsync(async () => {
      // Arrange - Formato válido pero usuario no existe en la lista
      authServiceSpy.login.and.returnValue(false);
      component.username = 'user9999'; // Formato válido (3-8 chars, alfanumérico)
      component.password = '9999'; // Formato válido (4 dígitos)

      // Act
      await component.login();
      tick();

      // Assert - Debe llamar al servicio pero NO navegar
      expect(authServiceSpy.login).toHaveBeenCalledWith('user9999', '9999');
      expect(navCtrlSpy.navigateRoot).not.toHaveBeenCalled(); 
      expect(toastCtrlSpy.create).toHaveBeenCalled(); // Debe mostrar error
    }));

    it('NO debe autenticar con usuario muy corto (2 caracteres) - no llega a llamar al servicio', async () => {
      component.username = 'ab'; // Formato inválido
      component.password = '1234';
      
      await component.login();
      
      // No debe ni intentar llamar al servicio porque falló la validación de formato
      expect(authServiceSpy.login).not.toHaveBeenCalled();
      expect(navCtrlSpy.navigateRoot).not.toHaveBeenCalled();
      // Debe mostrar toast de error de formato
      expect(toastCtrlSpy.create).toHaveBeenCalled();
    });

    it('NO debe autenticar con usuario muy largo (9 caracteres)', async () => {
      component.username = 'usuariolargo';
      component.password = '1234';
      
      await component.login();
      
      expect(authServiceSpy.login).not.toHaveBeenCalled();
      expect(navCtrlSpy.navigateRoot).not.toHaveBeenCalled();
      expect(toastCtrlSpy.create).toHaveBeenCalled();
    });

    it('NO debe autenticar con contraseña de 3 dígitos', async () => {
      component.username = 'kine123';
      component.password = '123';
      
      await component.login();
      
      expect(authServiceSpy.login).not.toHaveBeenCalled();
      expect(navCtrlSpy.navigateRoot).not.toHaveBeenCalled();
      expect(toastCtrlSpy.create).toHaveBeenCalled();
    });

    it('NO debe autenticar con contraseña no numérica', async () => {
      component.username = 'kine123';
      component.password = 'abcd';
      
      await component.login();
      
      expect(authServiceSpy.login).not.toHaveBeenCalled();
      expect(navCtrlSpy.navigateRoot).not.toHaveBeenCalled();
      expect(toastCtrlSpy.create).toHaveBeenCalled();
    });

    it('debe mostrar mensaje de error cuando el login falla por credenciales incorrectas', fakeAsync(async () => {
      // Arrange - Formato válido pero credenciales incorrectas
      authServiceSpy.login.and.returnValue(false);
      component.username = 'kine123'; // Existe pero...
      component.password = '9999';    // Contraseña incorrecta

      // Act
      await component.login();
      tick();

      // Assert
      expect(authServiceSpy.login).toHaveBeenCalled(); // ¡Sí se llama!
      expect(navCtrlSpy.navigateRoot).not.toHaveBeenCalled();
      expect(toastCtrlSpy.create).toHaveBeenCalled();
    }));

    it('debe mantener isLoading en false después de error de formato', fakeAsync(async () => {
      // Error de formato (no llega a login)
      component.username = 'ab';
      component.password = '123';

      await component.login();
      tick();

      expect(component.isLoading).toBeFalse();
    }));

    it('debe mantener isLoading en false después de error de credenciales', fakeAsync(async () => {
      // Error de credenciales (sí llega a login)
      authServiceSpy.login.and.returnValue(false);
      component.username = 'kine123';
      component.password = '9999';

      await component.login();
      tick();

      expect(component.isLoading).toBeFalse();
    }));
  });


  // PRUEBAS DE ESTADO DEL COMPONENTE 
  describe('Estado del componente', () => {
    it('debe establecer isLoading durante el login exitoso', fakeAsync(async () => {
      authServiceSpy.login.and.returnValue(true);
      component.username = 'kine123';
      component.password = '1234';

      const loginPromise = component.login();
      expect(component.isLoading).toBeTrue(); // Durante el login
      
      await loginPromise;
      tick();
      
      expect(component.isLoading).toBeFalse(); // Después del login
    }));

    it('debe establecer isLoading durante el login fallido (formato válido)', fakeAsync(async () => {
      authServiceSpy.login.and.returnValue(false);
      component.username = 'kine123';
      component.password = '9999';

      const loginPromise = component.login();
      expect(component.isLoading).toBeTrue(); // Durante el login
      
      await loginPromise;
      tick();
      
      expect(component.isLoading).toBeFalse(); // Después del error
    }));

    it('NO debe establecer isLoading cuando el formato es inválido', fakeAsync(async () => {
      component.username = 'ab';
      component.password = '123';

      const loginPromise = component.login();
      // isLoading debería ser false inmediatamente porque falla la validación
      expect(component.isLoading).toBeFalse();
      
      await loginPromise;
      tick();
      
      expect(component.isLoading).toBeFalse();
    }));

    it('debe manejar excepciones durante el login', fakeAsync(async () => {
      authServiceSpy.login.and.throwError('Error del servidor');
      component.username = 'kine123';
      component.password = '1234';

      await component.login();
      tick();

      expect(component.isLoading).toBeFalse();
      expect(toastCtrlSpy.create).toHaveBeenCalled();
    }));
  });
});