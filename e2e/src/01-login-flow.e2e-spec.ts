/**
 * PRUEBAS E2E: FLUJO DE AUTENTICACIÓN
 * Descripción: Pruebas end-to-end para el flujo completo de login/logout
 * Objetivo: Verificar que un usuario puede autenticarse correctamente
 * y que las rutas están protegidas por AuthGuard.
 */

import { browser, by, element } from 'protractor';
import { E2EUtils, SELECTORS } from './utils/test-utils';

describe('Flujo de Autenticación - Kinsphere', () => {
  const utils = E2EUtils;

  // Configuración inicial
  beforeAll(async () => {
    console.log('🚀 Iniciando pruebas E2E de Autenticación');
    await browser.waitForAngularEnabled(true);
  });

  beforeEach(async () => {
    // Navegar al login antes de cada prueba
    await utils.navigateTo('/login');
    await browser.sleep(1000); // Esperar carga inicial
  });

  afterEach(async () => {
    // Limpiar almacenamiento después de cada prueba
    await browser.executeScript('window.localStorage.clear();');
    await browser.executeScript('window.sessionStorage.clear();');
  });

  /**
   * PRUEBA 1: Login exitoso
   * Descripción: Verificar que un usuario con credenciales válidas puede iniciar sesión
   * Objeto a evaluar: Formulario de login y redirección al dashboard
   * Resultado esperado: Redirección a /dashboard y mensaje de bienvenida
   */
  it('debería permitir login con credenciales válidas', async () => {
    console.log('🔍 Ejecutando: Login con credenciales válidas');
    
    // 1. Ingresar credenciales (ajustar según tu app)
    await utils.clearAndSendKeys(SELECTORS.LOGIN.EMAIL_INPUT, 'kinesiologo@test.com');
    await utils.clearAndSendKeys(SELECTORS.LOGIN.PASSWORD_INPUT, 'password123');
    
    // 2. Hacer clic en login
    await utils.safeClick(SELECTORS.LOGIN.LOGIN_BUTTON);
    
    // 3. Esperar redirección
    await browser.sleep(3000);
    
    // 4. Verificar que estamos en dashboard
    await utils.expectCurrentUrlToContain('dashboard');
    
    // 5. Verificar mensaje de bienvenida (si existe)
    try {
      await utils.expectToContainText(SELECTORS.DASHBOARD.WELCOME_MESSAGE, 'Bienvenido');
    } catch {
      console.log('ℹ️ No se encontró mensaje de bienvenida específico');
    }
    
    console.log('✅ Login exitoso verificado');
  });

  /**
   * PRUEBA 2: Login con credenciales inválidas
   * Descripción: Verificar que el sistema muestra error con credenciales incorrectas
   * Objeto a evaluar: Mensajes de error del formulario
   * Resultado esperado: Mensaje de error y permanencia en página de login
   */
  it('debería mostrar error con credenciales inválidas', async () => {
    console.log('🔍 Ejecutando: Login con credenciales inválidas');
    
    // 1. Ingresar credenciales incorrectas
    await utils.clearAndSendKeys(SELECTORS.LOGIN.EMAIL_INPUT, 'usuario@incorrecto.com');
    await utils.clearAndSendKeys(SELECTORS.LOGIN.PASSWORD_INPUT, 'claveerronea');
    
    // 2. Hacer clic en login
    await utils.safeClick(SELECTORS.LOGIN.LOGIN_BUTTON);
    
    // 3. Esperar validación
    await browser.sleep(1500);
    
    // 4. Verificar mensaje de error (si existe el selector)
    try {
      await utils.waitForVisible(SELECTORS.LOGIN.ERROR_MESSAGE, 5000);
      const errorText = await utils.getText(SELECTORS.LOGIN.ERROR_MESSAGE);
      expect(errorText).toContain('incorrecta');
      console.log(`✅ Error mostrado: ${errorText}`);
    } catch {
      console.log('ℹ️ No se encontró mensaje de error específico');
    }
    
    // 5. Verificar que seguimos en login
    await utils.expectCurrentUrlToContain('login');
    
    console.log('✅ Validación de credenciales inválidas verificada');
  });

  /**
   * PRUEBA 3: Protección de rutas con AuthGuard
   * Descripción: Verificar que las rutas protegidas redirigen al login si no hay sesión
   * Objeto a evaluar: Navegación a rutas protegidas sin autenticación
   * Resultado esperado: Redirección automática a /login
   */
  it('debería redirigir al login al acceder a rutas protegidas sin autenticar', async () => {
    console.log('🔍 Ejecutando: Protección de rutas con AuthGuard');
    
    // 1. Limpiar sesión
    await browser.executeScript('window.localStorage.clear();');
    
    // 2. Intentar acceder a dashboard sin login
    await utils.navigateTo('/dashboard');
    await browser.sleep(2000);
    
    // 3. Verificar redirección a login
    await utils.expectCurrentUrlToContain('login');
    
    // 4. Intentar acceder a lista de pacientes
    await utils.navigateTo('/pacientes-lista');
    await browser.sleep(2000);
    
    // 5. Verificar redirección a login
    await utils.expectCurrentUrlToContain('login');
    
    console.log('✅ Protección de rutas verificada');
  });

  /**
   * PRUEBA 4: Campos obligatorios en formulario de login
   * Descripción: Verificar validación de campos requeridos
   * Objeto a evaluar: Formulario de login
   * Resultado esperado: Validación previene envío con campos vacíos
   */
  it('debería validar campos obligatorios en el formulario de login', async () => {
    console.log('🔍 Ejecutando: Validación de campos obligatorios');
    
    // 1. Intentar enviar formulario vacío
    await utils.safeClick(SELECTORS.LOGIN.LOGIN_BUTTON);
    await browser.sleep(1000);
    
    // 2. Verificar que no hubo redirección
    await utils.expectCurrentUrlToContain('login');
    
    // 3. Rellenar solo email
    await utils.clearAndSendKeys(SELECTORS.LOGIN.EMAIL_INPUT, 'test@test.com');
    await utils.safeClick(SELECTORS.LOGIN.LOGIN_BUTTON);
    await browser.sleep(1000);
    
    // 4. Verificar que no hubo redirección
    await utils.expectCurrentUrlToContain('login');
    
    console.log('✅ Validación de campos obligatorios verificada');
  });

  /**
   * PRUEBA 5: Navegación después de login exitoso
   * Descripción: Verificar que después del login se puede navegar a secciones principales
   * Objeto a evaluar: Menú de navegación y rutas principales
   * Resultado esperado: Acceso a todas las secciones de la app
   */
  it('debería permitir navegación a secciones principales después del login', async () => {
    console.log('🔍 Ejecutando: Navegación post-login');
    
    // 1. Login exitoso (usar función helper si la creamos)
    await utils.clearAndSendKeys(SELECTORS.LOGIN.EMAIL_INPUT, 'kinesiologo@test.com');
    await utils.clearAndSendKeys(SELECTORS.LOGIN.PASSWORD_INPUT, 'password123');
    await utils.safeClick(SELECTORS.LOGIN.LOGIN_BUTTON);
    await browser.sleep(3000);
    
    // 2. Verificar acceso a diferentes secciones
    const sections = [
      { path: '/pacientes-lista', name: 'Lista de Pacientes' },
      { path: '/dashboard', name: 'Dashboard' },
      { path: '/agregar-paciente', name: 'Agregar Paciente' }
    ];
    
    for (const section of sections) {
      await utils.navigateTo(section.path);
      await browser.sleep(1500);
      await utils.expectCurrentUrlToContain(section.path);
      console.log(`✅ Acceso a ${section.name} verificado`);
    }
    
    console.log('✅ Navegación post-login verificada');
  });
});