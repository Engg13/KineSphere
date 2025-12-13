import { Component, OnInit } from '@angular/core';
import { ConfigService, AppConfig } from '../../core/config/config.service';

@Component({
  selector: 'app-config-test',
  templateUrl: './config-test.page.html',
  styleUrls: ['./config-test.page.scss']
})
export class ConfigTestPage implements OnInit {
  config: AppConfig | undefined;
  authEndpoint: string = '';
  platformConfig: any;
  featuresList: Array<{name: string, enabled: boolean}> = [];
  
  constructor(private configService: ConfigService) {}
  
  ngOnInit() {
    // Obtener configuración completa
    this.config = this.configService.getConfig();
    
    // Obtener endpoint específico
    this.authEndpoint = this.configService.getApiEndpoint('auth');
    
    // Obtener configuración de plataforma
    this.platformConfig = this.configService.getPlatformSpecificConfig();
    
    // Crear lista de funcionalidades
    if (this.config) {
      this.featuresList = Object.entries(this.config.features).map(([key, value]) => ({
        name: this.formatFeatureName(key),
        enabled: value
      }));
    }
    
    // Log para debugging
    console.log('Configuración KineSphere:', {
      config: this.config,
      platformConfig: this.platformConfig,
      debugInfo: this.configService.getDebugInfo()
    });
  }
  
  getEnvColor(): string {
    if (!this.config) return 'medium';
    
    switch (this.config.environment) {
      case 'development': return 'warning';
      case 'staging': return 'secondary';
      case 'production': return 'success';
      default: return 'medium';
    }
  }
  
  private formatFeatureName(key: string): string {
    const names: Record<string, string> = {
      auth: 'Autenticación',
      exercises: 'Ejercicios',
      routines: 'Rutinas',
      tracking: 'Seguimiento',
      social: 'Social'
    };
    return names[key] || key;
  }
}
