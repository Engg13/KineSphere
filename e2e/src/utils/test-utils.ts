/**
 * UTILIDADES PARA PRUEBAS E2E
 * Descripción: Funciones helper para simplificar y estandarizar las pruebas E2E
 */

import { browser, by, element, ExpectedConditions as EC } from 'protractor';

export class E2EUtils {
  /**
   * Esperar a que un elemento sea clickeable
   * @param selector Selector CSS del elemento
   * @param timeout Tiempo máximo de espera en milisegundos
   */
  static async waitForClickable(selector: string, timeout: number = 10000): Promise<void> {
    const elem = element(by.css(selector));
    await browser.wait(EC.elementToBeClickable(elem), timeout, 
      `Elemento ${selector} no es clickeable después de ${timeout}ms`);
  }

  /**
   * Esperar a que un elemento sea visible
   * @param selector Selector CSS del elemento
   * @param timeout Tiempo máximo de espera en milisegundos
   */
  static async waitForVisible(selector: string, timeout: number = 10000): Promise<void> {
    const elem = element(by.css(selector));
    await browser.wait(EC.visibilityOf(elem), timeout,
      `Elemento ${selector} no es visible después de ${timeout}ms`);
  }

  /**
   * Limpiar y escribir texto en un campo
   * @param selector Selector CSS del elemento
   * @param text Texto a escribir
   */
  static async clearAndSendKeys(selector: string, text: string): Promise<void> {
    const elem = element(by.css(selector));
    await this.waitForVisible(selector);
    await elem.clear();
    await elem.sendKeys(text);
  }

  /**
   * Hacer clic en un elemento de manera segura
   * @param selector Selector CSS del elemento
   */
  static async safeClick(selector: string): Promise<void> {
    await this.waitForClickable(selector);
    await element(by.css(selector)).click();
  }

  /**
   * Obtener texto de un elemento
   * @param selector Selector CSS del elemento
   */
  static async getText(selector: string): Promise<string> {
    await this.waitForVisible(selector);
    return await element(by.css(selector)).getText();
  }

  /**
   * Verificar que un elemento contiene texto
   * @param selector Selector CSS del elemento
   * @param expectedText Texto esperado
   */
  static async expectToContainText(selector: string, expectedText: string): Promise<void> {
    const actualText = await this.getText(selector);
    expect(actualText).toContain(expectedText);
  }

  /**
   * Navegar a una URL y esperar a que Angular esté listo
   * @param url URL relativa o absoluta
   */
  static async navigateTo(url: string): Promise<void> {
    await browser.get(url);
    await browser.waitForAngular();
  }

  /**
   * Tomar screenshot y guardarlo
   * @param filename Nombre del archivo (sin extensión)
   */
  static async takeScreenshot(filename: string): Promise<void> {
    const screenshot = await browser.takeScreenshot();
    // Esto guardaría la imagen, pero necesita configuración adicional
    console.log(`Screenshot tomado: ${filename}`);
  }

  /**
   * Simular login de usuario
   * @param email Correo electrónico
   * @param password Contraseña
   */
  static async login(email: string, password: string): Promise<void> {
    await this.navigateTo('/login');
    await this.clearAndSendKeys(SELECTORS.LOGIN.EMAIL_INPUT, email);
    await this.clearAndSendKeys(SELECTORS.LOGIN.PASSWORD_INPUT, password);
    await this.safeClick(SELECTORS.LOGIN.LOGIN_BUTTON);
    await browser.sleep(2000); // Esperar a que se procese el login
  }

  /**
   * Verificar que estamos en una página específica
   * @param expectedUrl Parte de la URL esperada
   */
  static async expectCurrentUrlToContain(expectedUrl: string): Promise<void> {
    const currentUrl = await browser.getCurrentUrl();
    expect(currentUrl).toContain(expectedUrl);
  }
}

// Re-exportar SELECTORS
import { SELECTORS } from './selectors.constants';
export { SELECTORS };