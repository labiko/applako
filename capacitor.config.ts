import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lako.chauffeur',
  appName: 'Lako Chauffeur',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  android: {
    // Configuration pour sons personnalisés OneSignal
    resources: [
      {
        src: 'src/assets/sounds/claxon.wav',
        target: 'app/src/main/res/raw/claxon.wav'
      }
    ]
  }
};

export default config;