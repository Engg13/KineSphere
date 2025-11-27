import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PlatformService {
  
  private platformInfo: any = null;

  constructor() { }

  // ✅ DETECCIÓN COMPLETA DE PLATAFORMA (SIN RECURSIVIDAD)
  detectPlatform() {
    // Cachear el resultado para evitar cálculos repetidos
    if (this.platformInfo) {
      return this.platformInfo;
    }

    const userAgent = navigator.userAgent.toLowerCase();
    const isCapacitor = !!(window as any).Capacitor;
    const isCordova = !!(window as any).cordova;
    
    this.platformInfo = {
      // Información del User Agent
      userAgent: navigator.userAgent,
      isAndroidUserAgent: /android/.test(userAgent),
      isIOSUserAgent: /iphone|ipad|ipod/.test(userAgent),
      isMobileUserAgent: /android|iphone|ipad|ipod/.test(userAgent),
      
      // Entorno REAL
      isCapacitor,
      isCordova,
      isNative: isCapacitor || isCordova,
      isWeb: !isCapacitor && !isCordova,
      
      // Plataforma final (CALCULADO DIRECTAMENTE)
      platform: this.getPlatformName(),
      description: this.getPlatformDescriptionDirect(isCapacitor, isCordova, userAgent)
    };

    return this.platformInfo;
  }

  // ✅ OBTENER NOMBRE DE PLATAFORMA (INDEPENDIENTE)
  private getPlatformName(): string {
    if ((window as any).Capacitor) {
      return (window as any).Capacitor.getPlatform();
    }
    if ((window as any).cordova) {
      return (window as any).cordova.platformId;
    }
    return 'web';
  }

  // ✅ DESCRIPCIÓN LEGIBLE (SIN LLAMAR A detectPlatform)
  private getPlatformDescriptionDirect(isCapacitor: boolean, isCordova: boolean, userAgent: string): string {
    const isNative = isCapacitor || isCordova;
    const isAndroidUA = /android/.test(userAgent);
    
    if (isNative) {
      return isAndroidUA ? 'Android Nativo' : 'iOS Nativo';
    } else {
      const isMobileUA = /android|iphone|ipad|ipod/.test(userAgent);
      return isMobileUA ? 'Navegador Móvil' : 'Navegador Escritorio';
    }
  }

  // ✅ DECIDIR QUÉ BASE DE DATOS USAR
  shouldUseSQLite(): boolean {
    const platform = this.detectPlatform();
    return platform.isNative; // Solo SQLite en apps nativas
  }

  // ✅ DECIDIR QUÉ ESTRATEGIA DE DATOS USAR
  getDataStrategy(): 'sqlite' | 'json-server' {
    return this.shouldUseSQLite() ? 'sqlite' : 'json-server';
  }

  // ✅ INFORMACIÓN PARA DEBUG
  getDebugInfo(): any {
    const platform = this.detectPlatform();
    return {
      plataforma: platform.platform,
      descripcion: platform.description,
      estrategia: this.getDataStrategy(),
      userAgent: platform.userAgent,
      timestamp: new Date().toISOString()
    };
  }

  // ✅ LIMPIAR CACHE (para testing)
  clearCache() {
    this.platformInfo = null;
  }
}