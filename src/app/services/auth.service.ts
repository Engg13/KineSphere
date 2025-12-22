import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private isLoggedIn = false;
  
  //  LISTA DE USUARIOS VÁLIDOS PARA DEMO
  private validUsers = [
    { username: 'kine123', password: '1234', nombre: 'Klgo. Esteban Gomez' },
    { username: 'admin', password: '4321', nombre: 'Administrador' },
    { username: 'demo', password: '0000', nombre: 'Usuario Demo' },
    { username: 'user123', password: '5678', nombre: 'Usuario 123' },
    { username: 'terapeuta', password: '9999', nombre: 'Terapeuta' }
  ];

  constructor(private platform: Platform) {
    console.log('🔐 AuthService inicializado');
    this.checkStoredAuth();
  }

  /**
   *  MÉTODO DE LOGIN CON VALIDACIÓN COMPLETA
   * Requisitos:
   * - Usuario: 3-8 caracteres, solo letras y números
   * - Contraseña: 4 dígitos numéricos
   */
  login(username: string, password: string): boolean {
    console.log('🔐 AuthService.login() llamado');
    console.log('📥 Credenciales recibidas:', { 
      username, 
      passwordLength: password?.length,
      usernameLength: username?.length 
    });
    
    // Validar formato de entrada
    if (!this.validateInputFormat(username, password)) {
      console.log('❌ Validación de formato falló');
      return false;
    }
    
    //  Buscar usuario en lista válida
    const user = this.validUsers.find(u => 
      u.username.toLowerCase() === username.toLowerCase() && 
      u.password === password
    );
    
    if (user) {
      console.log('✅ Usuario encontrado:', user.nombre);
      this.isLoggedIn = true;
      
      // Almacenar información de sesión
      this.storeAuthData(username, user.nombre);
      
      // Log para debugging
      this.logAuthSuccess(user);
      
      return true;
    } else {
      console.log('❌ Credenciales inválidas - Usuario no encontrado');
      this.logAuthFailure(username);
      return false;
    }
  }

  /**
   *  VALIDACIÓN DE FORMATO (3-8 chars, 4 dígitos)
   * Este es el método CRÍTICO para el video
   */
  private validateInputFormat(username: string, password: string): boolean {
    console.log('🔍 Validando formato de entrada...');
    
    // Validación 1: Usuario no vacío
    if (!username || username.trim() === '') {
      console.log('❌ Usuario vacío');
      return false;
    }
    
    // Validación 2: Usuario entre 3 y 8 caracteres
    if (username.length < 3) {
      console.log(`❌ Usuario muy corto: ${username.length} (mínimo 3)`);
      return false;
    }
    
    if (username.length > 8) {
      console.log(`❌ Usuario muy largo: ${username.length} (máximo 8)`);
      return false;
    }
    
    // Validación 3: Usuario solo letras y números
    if (!/^[a-zA-Z0-9]+$/.test(username)) {
      console.log('❌ Usuario contiene caracteres inválidos');
      return false;
    }
    
    // Validación 4: Contraseña no vacía
    if (!password || password.trim() === '') {
      console.log('❌ Contraseña vacía');
      return false;
    }
    
    // Validación 5: Contraseña exactamente 4 caracteres
    if (password.length !== 4) {
      console.log(`❌ Contraseña longitud incorrecta: ${password.length} (debe ser 4)`);
      return false;
    }
    
    // Validación 6: Contraseña solo números
    if (!/^\d+$/.test(password)) {
      console.log('❌ Contraseña no es numérica');
      return false;
    }
    
    console.log('✅ Validación de formato exitosa');
    return true;
  }

  /**
   *  ALMACENAR DATOS DE AUTENTICACIÓN
   */
  private storeAuthData(username: string, nombre: string): void {
    // Usar método apropiado según plataforma
    if (this.platform.is('capacitor') || this.platform.is('cordova')) {
      // Para dispositivos nativos
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('username', username);
      localStorage.setItem('nombreCompleto', nombre);
      localStorage.setItem('lastLogin', new Date().toISOString());
    } else {
      // Para navegador/web
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('username', username);
      localStorage.setItem('nombreCompleto', nombre);
      localStorage.setItem('lastLogin', new Date().toISOString());
    }
    
    console.log('💾 Datos de autenticación almacenados en localStorage');
  }

  /**
   *  CERRAR SESIÓN
   */
  logout(): void {
    console.log('👋 AuthService.logout() llamado');
    
    this.isLoggedIn = false;
    
    // Limpiar almacenamiento
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('username');
    localStorage.removeItem('nombreCompleto');
    localStorage.removeItem('lastLogin');
    
    console.log('✅ Sesión cerrada y datos limpiados');
  }

  /**
   *  VERIFICAR SI ESTÁ AUTENTICADO
   */
  isAuthenticated(): boolean {
    const hasLocalStorage = localStorage.getItem('isLoggedIn') === 'true';
    const hasSession = this.isLoggedIn;
    
    return hasLocalStorage || hasSession;
  }

  /**
   *  VERIFICAR AUTENTICACIÓN ALMACENADA
   */
  private checkStoredAuth(): void {
    const storedAuth = localStorage.getItem('isLoggedIn');
    const username = localStorage.getItem('username');
    
    if (storedAuth === 'true' && username) {
      console.log('🔍 AuthService: Sesión previa encontrada para:', username);
      this.isLoggedIn = true;
    } else {
      console.log('🔍 AuthService: No hay sesión activa almacenada');
      this.isLoggedIn = false;
    }
  }

  /**
   *  OBTENER NOMBRE DE USUARIO
   */
  getUsername(): string {
    const username = localStorage.getItem('username') || '';
    console.log('👤 AuthService.getUsername():', username || 'No disponible');
    return username;
  }

  /**
   *  OBTENER NOMBRE COMPLETO
   */
  getNombreCompleto(): string {
    const nombre = localStorage.getItem('nombreCompleto') || 'Profesional Kinesiólogo';
    console.log('👨‍⚕️ AuthService.getNombreCompleto():', nombre);
    return nombre;
  }

  /**
   *  OBTENER INFORMACIÓN DE SESIÓN 
   */
  getSessionInfo(): any {
    return {
      isLoggedIn: this.isLoggedIn,
      username: this.getUsername(),
      nombreCompleto: this.getNombreCompleto(),
      lastLogin: localStorage.getItem('lastLogin'),
      platform: this.platform.platforms(),
      userAgent: navigator.userAgent
    };
  }

  /**
   *  LOG DE ÉXITO 
   */
  private logAuthSuccess(user: any): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event: 'LOGIN_SUCCESS',
      username: user.username,
      nombre: user.nombre,
      validation: 'PASSED',
      requirements: {
        usernameLength: user.username.length,
        passwordLength: user.password.length,
        usernamePattern: 'alphanumeric',
        passwordPattern: 'numeric'
      }
    };
    
    console.log('📊 LOGIN SUCCESS:', logEntry);
    
    // Guardar en historial 
    const loginHistory = JSON.parse(localStorage.getItem('loginHistory') || '[]');
    loginHistory.unshift(logEntry);
    if (loginHistory.length > 5) loginHistory.pop();
    localStorage.setItem('loginHistory', JSON.stringify(loginHistory));
  }

  /**
   *  LOG DE FALLO 
   */
  private logAuthFailure(username: string): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event: 'LOGIN_FAILURE',
      attemptedUsername: username,
      reason: 'Invalid credentials or format'
    };
    
    console.log('📊 LOGIN FAILURE:', logEntry);
  }

  /**
   *  MÉTODO PPARA DEMOSTRAR VALIDACIÓN
   */
  validateCredentialsForDemo(username: string, password: string): any {
    const formatValid = this.validateInputFormat(username, password);
    const userExists = this.validUsers.some(u => 
      u.username.toLowerCase() === username.toLowerCase() && 
      u.password === password
    );
    
    return {
      formatValid: formatValid,
      userExists: userExists,
      isValid: formatValid && userExists,
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
  }

  /**
   * 👥 OBTENER USUARIOS VÁLIDOS 
   */
  getDemoUsers(): any[] {
    console.log('👥 Lista de usuarios para demostración:');
    return this.validUsers.map(user => ({
      username: user.username,
      passwordHint: `Contraseña: ${user.password}`,
      nombre: user.nombre,
      isValidExample: true,
      validation: {
        usernameLength: user.username.length,
        passwordLength: user.password.length,
        usernamePattern: /^[a-zA-Z0-9]+$/.test(user.username),
        passwordPattern: /^\d+$/.test(user.password)
      }
    }));
  }

  /**
   *  PROBAR CASOS DE PRUEBA 
   */
  runTestCases(): any {
    const testCases = [
      { username: 'ab', password: '1234', expected: false, reason: 'Usuario muy corto' },
      { username: 'usuario123', password: '1234', expected: false, reason: 'Usuario muy largo' },
      { username: 'kine@123', password: '1234', expected: false, reason: 'Caracteres inválidos' },
      { username: 'kine123', password: '123', expected: false, reason: 'Contraseña corta' },
      { username: 'kine123', password: '12345', expected: false, reason: 'Contraseña larga' },
      { username: 'kine123', password: 'abcd', expected: false, reason: 'Contraseña no numérica' },
      { username: 'kine123', password: '1234', expected: true, reason: 'Válido' },
      { username: 'admin', password: '4321', expected: true, reason: 'Válido' }
    ];
    
    const results = testCases.map(test => ({
      ...test,
      actual: this.login(test.username, test.password),
      passed: this.login(test.username, test.password) === test.expected
    }));
    
    return results;
  }
}