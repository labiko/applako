import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lako.chauffeur',
  appName: 'Lako Chauffeur',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;