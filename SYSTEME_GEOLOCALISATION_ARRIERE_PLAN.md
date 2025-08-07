# Système de Géolocalisation en Arrière-Plan

## Vue d'ensemble

L'application utilise maintenant **deux systèmes de géolocalisation** :

### 1. **GeolocationService** (Standard)
- Utilisé sur **web/navigateur**
- Mise à jour toutes les **5 minutes** via `setInterval`
- **S'arrête** quand l'app est en arrière-plan

### 2. **BackgroundGeolocationService** (Arrière-plan) ✨ NOUVEAU
- Utilisé sur **mobile (Android/iOS)**
- Continue de fonctionner même avec :
  - ✅ Téléphone verrouillé
  - ✅ App en arrière-plan
  - ✅ App fermée (selon les paramètres Android)
- Mise à jour toutes les **5 minutes** ou **500 mètres**

## Configuration

### Permissions Android (déjà configurées)
```xml
<!-- AndroidManifest.xml -->
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
```

### Plugin utilisé
```json
"@capacitor-community/background-geolocation": "^1.2.25"
```

## Fonctionnement

### Démarrage automatique
1. Le conducteur se connecte
2. L'app détecte la plateforme :
   - **Mobile** → `BackgroundGeolocationService` démarre
   - **Web** → `GeolocationService` démarre

### Notification Android
- Une notification persistante apparaît : **"AppLako suit votre position pour les courses"**
- Cette notification est **obligatoire** pour le tracking en arrière-plan sur Android

### Mise à jour de position
La position est mise à jour dans ces conditions :
- Toutes les **5 minutes** (timer)
- OU après **500 mètres** de déplacement
- OU immédiatement si changement significatif

### Mode Hors Ligne ⚠️ IMPORTANT
- Si le conducteur passe en mode **"Hors ligne"** via le toggle :
  - ❌ Le tracking GPS **S'ARRÊTE COMPLÈTEMENT**
  - ❌ Aucune mise à jour de position n'est envoyée
  - ❌ La notification de tracking disparaît
- Quand le conducteur repasse **"En ligne"** :
  - ✅ Le tracking GPS redémarre automatiquement
  - ✅ La notification réapparaît
  - ✅ Les mises à jour reprennent

## Tests

### Pour tester le tracking en arrière-plan :
1. Connecte-toi comme conducteur
2. Vérifie la notification "Tracking activé"
3. Verrouille le téléphone
4. Attends 5 minutes
5. Vérifie dans la base de données que la position a été mise à jour

### Logs à vérifier
```bash
# Dans Android Studio Logcat ou via ADB
adb logcat | findstr "Background"

# Messages attendus :
"✅ Background tracking started with watcher ID: xxx"
"📍 Background location update: {latitude, longitude}"
"🌍 Background update: lat, lng (accuracy: Xm)"
"✅ Background position updated in database"
```

## Optimisation batterie

Le système est optimisé pour :
- Utiliser le GPS seulement quand nécessaire
- Grouper les mises à jour pour économiser la batterie
- Respecter les paramètres d'économie d'énergie Android

## Problèmes connus

### Si le tracking ne fonctionne pas :
1. Vérifier que le GPS est activé
2. Vérifier les permissions de l'app
3. Désactiver l'optimisation batterie pour AppLako :
   - Paramètres → Batterie → Optimisation batterie
   - Chercher "AppLako"
   - Sélectionner "Ne pas optimiser"

### Si la notification n'apparaît pas :
- Vérifier les paramètres de notifications de l'app
- Redémarrer l'application

## Architecture

```
app.component.ts
    ├── Si Mobile → BackgroundGeolocationService
    │   └── Plugin natif Capacitor
    │       └── Service Android/iOS natif
    │           └── Mise à jour BDD toutes les 5 min
    │
    └── Si Web → GeolocationService
        └── JavaScript setInterval
            └── Mise à jour BDD toutes les 5 min
```

## Commandes utiles

```bash
# Rebuild avec le nouveau plugin
npm run build && npx capacitor sync android && npx capacitor run android

# Voir les watchers actifs (dans la console du téléphone)
# Ajouter un bouton de debug qui appelle :
await backgroundGeoService.getActiveWatchers()
```