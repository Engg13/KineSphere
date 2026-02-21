import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PlatformService {
  
  private platformInfo: any = null;

  constructor() { }

  //  Verificar Capacitor REAL
  detectPlatform() {
    if (this.platformInfo) {
      return this.platformInfo;
    }

    const userAgent = navigator.userAgent.toLowerCase();
    
    // ✅ DETECCIÓN MEJORADA: Verificar si es Capacitor REAL
    const isCapacitor = this.isRealCapacitor();
    const isCordova = !!(window as any).cordova;
    
    // ✅ EN NAVEGADOR: Siempre false, sin importar el User Agent
    const isNative = isCapacitor || isCordova;
    
    this.platformInfo = {
      userAgent: navigator.userAgent,
      isAndroidUserAgent: /android/.test(userAgent),
      isIOSUserAgent: /iphone|ipad|ipod/.test(userAgent),
      isMobileUserAgent: /android|iphone|ipad|ipod/.test(userAgent),
      
      // Entorno REAL
      isCapacitor,
      isCordova,
      isNative: isNative,
      isWeb: !isNative,
      
      platform: this.getPlatformName(),
      description: this.getPlatformDescriptionDirect(isNative, userAgent)
    };

    console.log('🔍 Platform Detection Result:', this.platformInfo);
    return this.platformInfo;
  }

  // Verificar si estamos en un dispositivo nativo REAL (no Capacitor en modo web)
  private isRealCapacitor(): boolean {
    const capacitor = (window as any).Capacitor;

    if (!capacitor) {
      return false;
    }

    // Si Capacitor dice explicitamente que NO es nativo, estamos en web
    if (capacitor.isNativePlatform && typeof capacitor.isNativePlatform === 'function') {
      return capacitor.isNativePlatform();
    }

    // Fallback: si getPlatform devuelve 'web', no es nativo
    if (typeof capacitor.getPlatform === 'function') {
      const plat = capacitor.getPlatform();
      if (plat === 'web') {
        return false;
      }
      return true;
    }

    return false;
  }

  private getPlatformName(): string {
    const capacitor = (window as any).Capacitor;
    
    if (capacitor && typeof capacitor.getPlatform === 'function') {
      return capacitor.getPlatform();
    }
    if ((window as any).cordova) {
      return (window as any).cordova.platformId;
    }
    return 'web';
  }

  private getPlatformDescriptionDirect(isNative: boolean, userAgent: string): string {
    if (isNative) {
      const isAndroidUA = /android/.test(userAgent);
      return isAndroidUA ? 'Android Nativo' : 'iOS Nativo';
    } else {
      const isMobileUA = /android|iphone|ipad|ipod/.test(userAgent);
      return isMobileUA ? 'Navegador Móvil (Simulado)' : 'Navegador Escritorio';
    }
  }

  // ✅ FORZAR MODO WEB PARA DESARROLLO
  shouldUseSQLite(): boolean {
    // ✅ TEMPORAL: Forzar modo web para desarrollo/video
    const forceWebMode = false; // Cambiar a false cuando sea para producción
    
    if (forceWebMode) {
      console.log('🌐 MODO WEB Usando localStorage');
      return false;
    }
    
    const platform = this.detectPlatform();
    const shouldUse = platform.isNative;
    console.log('💾 shouldUseSQLite:', shouldUse, '- Platform:', platform.platform);
    return shouldUse;
  }

  getDataStrategy(): 'sqlite' | 'localStorage' {
    return this.shouldUseSQLite() ? 'sqlite' : 'localStorage';
  }

  getDebugInfo(): any {
    const platform = this.detectPlatform();
    return {
      plataforma: platform.platform,
      descripcion: platform.description,
      estrategia: this.getDataStrategy(),
      userAgent: platform.userAgent,
      isNative: platform.isNative,
      timestamp: new Date().toISOString()
    };
  }

  clearCache() {
    this.platformInfo = null;
  }
}