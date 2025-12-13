/**
 * CONSTANTES DE SELECTORES E2E
 * Descripción: Centraliza todos los selectores CSS utilizados en las pruebas E2E
 * para facilitar el mantenimiento y evitar duplicación.
 */

export const SELECTORS = {
  // 🔐 AUTENTICACIÓN
  LOGIN: {
    EMAIL_INPUT: 'ion-input[name="email"] input, input[name="email"], #email',
    PASSWORD_INPUT: 'ion-input[name="password"] input, input[name="password"], #password',
    LOGIN_BUTTON: 'ion-button[type="submit"], button[type="submit"], .login-btn',
    ERROR_MESSAGE: '.error-message, ion-note[color="danger"]'
  },
  
  // 👥 PACIENTES
  PACIENTES: {
    LISTA: 'ion-list, .pacientes-list, paciente-card',
    AGREGAR_BTN: 'ion-button[routerLink="/agregar-paciente"], .agregar-paciente-btn',
    BUSCAR_INPUT: 'ion-searchbar input, input[type="search"]',
    PACIENTE_ITEM: 'ion-item, .paciente-item'
  },
  
  // 📝 FORMULARIO PACIENTE
  FORM_PACIENTE: {
    NOMBRE_INPUT: 'ion-input[name="nombre"] input, input[name="nombre"], #nombre',
    RUT_INPUT: 'ion-input[name="rut"] input, input[name="rut"], #rut',
    FECHA_NAC_INPUT: 'ion-input[name="fechaNacimiento"] input, input[name="fechaNacimiento"], #fechaNacimiento',
    TELEFONO_INPUT: 'ion-input[name="telefono"] input, input[name="telefono"], #telefono',
    DIAGNOSTICO_INPUT: 'ion-input[name="diagnostico"] input, input[name="diagnostico"], #diagnostico',
    GUARDAR_BTN: 'ion-button[type="submit"], button[type="submit"], .guardar-btn',
    CANCELAR_BTN: 'ion-button[type="button"], button[type="button"], .cancelar-btn'
  },
  
  // 🏠 DASHBOARD
  DASHBOARD: {
    WELCOME_MESSAGE: '.welcome-message, ion-title',
    STATS_CARDS: 'ion-card, .stat-card',
    MENU_BUTTON: 'ion-menu-button, .menu-btn'
  },
  
  // 📄 DOCUMENTOS MÉDICOS
  DOCUMENTOS: {
    TOMAR_FOTO_BTN: 'ion-button[take-photo], .tomar-foto-btn',
    GALERIA_BTN: 'ion-button[open-gallery], .galeria-btn',
    DOCUMENTOS_LIST: 'ion-list, .documentos-list'
  },
  
  // 📍 VISITA DOMICILIARIA
  VISITA: {
    OBTENER_UBICACION_BTN: 'ion-button[get-location], .ubicacion-btn',
    GUARDAR_VISITA_BTN: 'ion-button[save-visit], .guardar-visita-btn',
    MAP_CONTAINER: '.map-container, #map'
  },
  
  // 🔔 NOTIFICACIONES Y MENSAJES
  MESSAGES: {
    TOAST_SUCCESS: '.toast-success, ion-toast[color="success"]',
    TOAST_ERROR: '.toast-error, ion-toast[color="danger"]',
    ALERT: 'ion-alert, .alert-wrapper',
    LOADING: 'ion-loading, .loading-wrapper'
  },
  
  // 🧭 NAVEGACIÓN
  NAVIGATION: {
    BACK_BUTTON: 'ion-back-button, .back-button',
    MENU_ITEMS: 'ion-menu ion-item, .menu-item',
    TABS: 'ion-tabs, ion-tab-bar'
  }
};