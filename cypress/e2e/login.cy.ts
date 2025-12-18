describe('Login Page - KineSphere', () => {
  beforeEach(() => {
    cy.visit('/login');
  });

  it('should display login page correctly', () => {
    // Verificar elementos principales
    cy.contains('KINESPHERE').should('be.visible');
    cy.contains('Seguimiento de pacientes').should('be.visible');
    cy.contains('Bienvenido').should('be.visible');
    cy.contains('Ingresa a tu cuenta para continuar').should('be.visible');
    
    // Verificar formulario existe
    cy.get('form').should('exist');
  });

  it('should perform login successfully', () => {
    // Método 1: Usar .type() directamente en ion-input (Ionic lo permite)
    cy.get('ion-input[placeholder="Ingresa tu usuario"]')
      .type('admin');
    
    cy.get('ion-input[placeholder="Ingresa tu contraseña de 4 digitos"]')
      .type('1234');
    
    // Hacer clic en login
    cy.get('ion-button').contains('Ingresar').click();
    
    // Verificar navegación
    cy.url().should('include', '/dashboard');
    
    // Verificar dashboard cargó
    cy.contains('Dashboard').should('be.visible');
  });

  it('should have all required elements', () => {
    // Campos de entrada
    cy.get('ion-input').should('have.length', 2);
    
    // Botones
    cy.get('ion-button').contains('Ingresar').should('be.visible');
    cy.get('ion-button').contains('Crea tu cuenta gratis').should('be.visible');
    
    // Checkbox
    cy.get('ion-checkbox').should('be.visible');
    cy.contains('Recordar mis datos').should('be.visible');
    
    // Iconos
    cy.get('ion-icon[name="person-circle-outline"]').should('be.visible');
    cy.get('ion-icon[name="key-outline"]').should('be.visible');
    cy.get('ion-icon[name="eye-outline"]').should('be.visible');
  });
});