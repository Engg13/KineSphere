/**
 * CONFIGURACIÓN DE PROTRACTOR PARA PRUEBAS E2E
 * Descripción: Configura el entorno de pruebas end-to-end
 * para simular la interacción de un usuario real con la aplicación.
 */

exports.config = {
  // Framework de pruebas
  framework: 'jasmine',
  
  // Especificaciones (archivos de prueba)
  specs: ['src/**/*.e2e-spec.ts'],
  
  // Configuración del navegador
  capabilities: {
    browserName: 'chrome',
    chromeOptions: {
      args: [
        '--headless',           // Ejecutar sin interfaz gráfica
        '--disable-gpu',        // Deshabilitar GPU en headless
        '--no-sandbox',         // Necesario para CI/CD
        '--disable-dev-shm-usage', // Para limitaciones de memoria
        '--window-size=1920,1080'  // Tamaño de ventana
      ]
    }
  },
  
  // URL base de la aplicación
  baseUrl: 'http://localhost:8100',
  
  // Configuración para TypeScript
  onPrepare: () => {
    // Registrar TypeScript
    require('ts-node').register({
      project: 'e2e/tsconfig.json'
    });
    
    // Configurar tiempo de espera global
    browser.waitForAngularEnabled(true);
    
    // Configurar reporter personalizado
    const JasmineReporter = require('jasmine-spec-reporter').SpecReporter;
    jasmine.getEnv().clearReporters();
    jasmine.getEnv().addReporter(new JasmineReporter({
      spec: {
        displayStacktrace: 'pretty'
      }
    }));
  },
  
  // Opciones de Jasmine
  jasmineNodeOpts: {
    showColors: true,           // Mostrar colores en la salida
    defaultTimeoutInterval: 30000, // Timeout de 30 segundos
    print: function() {}        // Función de impresión personalizada
  },
  
  // Configuración de esperas
  allScriptsTimeout: 30000,
  
  // Deshabilitar sincronización si la app no es completamente Angular
  SELENIUM_PROMISE_MANAGER: false
};