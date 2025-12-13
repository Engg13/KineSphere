import { Component, OnInit } from '@angular/core';
import { ConfigService } from '../../core/config/config.service';

@Component({
  selector: 'app-config-test',
  template: \
    <ion-header>
      <ion-toolbar>
        <ion-title>Config KineSphere</ion-title>
      </ion-toolbar>
    </ion-header>
    
    <ion-content>
      <ion-card>
        <ion-card-content>
          <h2>{{config?.appName}}</h2>
          <p>Versión: {{config?.appVersion}}</p>
          <p>Plataforma: {{config?.platform}}</p>
          <p>Entorno: {{config?.environment}}</p>
        </ion-card-content>
      </ion-card>
    </ion-content>
  \
})
export class ConfigTestPage implements OnInit {
  config: any;
  
  constructor(private configService: ConfigService) {}
  
  ngOnInit() {
    this.config = this.configService.getConfig();
    console.log('Config:', this.config);
  }
}
