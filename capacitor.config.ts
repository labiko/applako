import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lako.chauffeur',
  appName: 'Loko Taxi',
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
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 6000,
      launchAutoHide: true,
      backgroundColor: "#FFFEE9",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true
    }
  }
};

export default config;