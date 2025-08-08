# Installation OneSignal pour Mobile (Capacitor)

## 📱 **Étapes d'installation :**

### **1. Installer le plugin OneSignal Capacitor :**
```bash
npm install @capacitor/push-notifications
npm install @onesignal/onesignal-capacitor
npx cap sync
```

### **2. Configuration Android (android/app/src/main/java/.../MainActivity.java) :**
```java
// Ajouter cette ligne dans MainActivity.java
import com.onesignal.capacitor.OneSignalCapacitor;

// Dans la méthode onCreate() ajouter :
this.init(savedInstanceState, new ArrayList<Class<? extends Plugin>>() {{
  add(OneSignalCapacitor.class);
}});
```

### **3. Configuration AndroidManifest.xml :**
```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<application>
    <!-- OneSignal App ID -->
    <meta-data android:name="onesignal_app_id" 
               android:value="867e880f-d486-482e-b7d8-d174db39f322" />
</application>
```

### **4. Rebuild et redéployer :**
```bash
npm run build
npx capacitor sync android
npx capacitor run android
```

## ⚡ **Installation rapide (tout en une fois) :**
```bash
# Installation
npm install @capacitor/push-notifications @onesignal/onesignal-capacitor

# Configuration automatique
npx cap sync

# Build et deploy
npm run build && npx capacitor sync android && npx capacitor run android
```

## 🔧 **Alternative avec onesignal-cordova-plugin :**
```bash
# Si la version Capacitor pose problème
npm uninstall @onesignal/onesignal-capacitor
npm install onesignal-cordova-plugin
npx cap sync
```