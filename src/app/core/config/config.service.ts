import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';

export type PlatformType = 'ios' | 'android' | 'mobileweb' | 'desktop';

export interface AppConfig {
  appName: string;
  appVersion: string;
  environment: 'development' | 'staging' | 'production';
  platform: PlatformType;
  api: {
    baseUrl: string;
    endpoints: {
      auth: string;
      users: string;
      exercises: string;
      routines: string;
      progress: string;
    };
  };
  features: {
    auth: boolean;
    exercises: boolean;
    routines: boolean;
    tracking: boolean;
    social: boolean;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  
  constructor(private platform: Platform) {}
  
  private detectPlatform(): PlatformType {
    if (this.platform.is('ios')) return 'ios';
    if (this.platform.is('android')) return 'android';
    if (this.platform.is('mobileweb') || this.platform.is('pwa')) return 'mobileweb';
    return 'desktop';
  }
  
  private getEnvironment(): 'development' | 'staging' | 'production' {
    // En desarrollo, siempre es 'development'
    // En producción, sería según variables de entorno
    return window.location.hostname.includes('localhost') ? 'development' : 'production';
  }
  
  private getApiBaseUrl(environment: string): string {
    switch (environment) {
      case 'development':
        return 'http://localhost:3000/api/v1';
      case 'staging':
        return 'https://staging.api.kinesphere.com/v1';
      default:
        return 'https://api.kinesphere.com/v1';
    }
  }
  
  getConfig(): AppConfig {
    const platform = this.detectPlatform();
    const environment = this.getEnvironment();
    const baseUrl = this.getApiBaseUrl(environment);
    
    // Configuración base
    const config: AppConfig = {
      appName: 'KineSphere',
      appVersion: '1.0.0',
      environment: environment,
      platform: platform,
      api: {
        baseUrl: baseUrl,
        endpoints: {
          auth: '/auth',
          users: '/users',
          exercises: '/exercises',
          routines: '/routines',
          progress: '/progress'
        }
      },
      features: {
        auth: true,
        exercises: true,
        routines: true,
        tracking: true,
        social: true
      }
    };
    
    return config;
  }
  
  getPlatformSpecificConfig() {
    const platform = this.detectPlatform();
    
    switch (platform) {
      case 'ios':
        return {
          statusBarStyle: 'dark',
          usesFaceID: true,
          minimumOS: '13.0',
          appStoreId: 'YOUR_IOS_APP_ID'
        };
        
      case 'android':
        return {
          statusBarColor: '#1a237e',
          usesFingerprint: true,
          minSdkVersion: 21,
          packageName: 'com.kinesphere.app'
        };
        
      case 'mobileweb':
        return {
          isPWA: true,
          offlineMode: true,
          serviceWorker: true
        };
        
      default:
        return {
          isDesktop: true
        };
    }
  }
  
  getApiEndpoint(endpoint: keyof AppConfig['api']['endpoints']): string {
    const config = this.getConfig();
    return config.api.baseUrl + config.api.endpoints[endpoint];
  }
  
  isFeatureEnabled(feature: keyof AppConfig['features']): boolean {
    const config = this.getConfig();
    return config.features[feature];
  }
  
  getDebugInfo() {
    return {
      platform: this.detectPlatform(),
      environment: this.getEnvironment(),
      userAgent: navigator.userAgent,
      screenSize: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      timestamp: new Date().toISOString()
    };
  }
}
