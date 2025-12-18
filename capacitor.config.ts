// capacitor.config.ts
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.esteban.kinesphere',
  appName: 'KineSphere',  // ← DEBE ser exactamente esto
  webDir: 'www/browser',
  server: {
    androidScheme: 'https'
  }
};

export default config;