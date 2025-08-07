# Système GPS avec Wake Lock - AppLako Chauffeur

## 🎯 Vue d'ensemble

Le système GPS intégré avec Wake Lock permet aux chauffeurs de contrôler facilement le tracking GPS et la consommation de batterie via leur statut EN LIGNE/HORS LIGNE.

## 🔋 Fonctionnement

### Statut EN LIGNE (Conducteur travaille)
- ✅ **GPS Tracking** : Mise à jour position toutes les 5 minutes
- ✅ **Wake Lock activé** : Écran reste allumé
- ✅ **Application active** : Pas de mise en veille
- ⚡ **Consommation** : Batterie utilisée pour le service

### Statut HORS LIGNE (Conducteur en pause)
- ❌ **GPS Tracking** : Arrêté complètement
- ❌ **Wake Lock désactivé** : Téléphone peut se verrouiller
- 💤 **Économie d'énergie** : Application peut se mettre en veille
- 🔋 **Conservation batterie** : Consommation minimale

## 🎛️ Contrôle utilisateur

Le chauffeur contrôle tout avec un seul bouton :
- **Bouton "EN LIGNE"** → Active GPS + Wake Lock
- **Bouton "HORS LIGNE"** → Désactive GPS + Wake Lock

## 🏗️ Architecture technique

### Services impliqués

#### 1. GeolocationService
- **Localisation** : `src/app/services/geolocation.service.ts`
- **Rôle** : Gestion GPS et intégration Wake Lock
- **Fréquence** : Toutes les 5 minutes quand actif

#### 2. WakeLockService
- **Localisation** : `src/app/services/wake-lock.service.ts`
- **Rôle** : Maintenir l'écran allumé
- **API** : Wake Lock API native du navigateur

#### 3. AuthService
- **Rôle** : Gestion du statut conducteur EN LIGNE/HORS LIGNE
- **Trigger** : Déclenche activation/désactivation GPS + Wake Lock

### Intégration dans l'app

#### AppComponent
```typescript
// Écoute les changements de statut conducteur
this.authService.currentConducteur$.subscribe(async conducteur => {
  if (conducteur) {
    const isOnline = !conducteur.hors_ligne;
    
    if (isOnline) {
      // Conducteur EN LIGNE : démarrer GPS + Wake Lock
      this.geolocationService.startLocationTracking();
    } else {
      // Conducteur HORS LIGNE : arrêter GPS + Wake Lock
      this.geolocationService.stopLocationTracking();
    }
  }
});
```

#### GeolocationService - Méthodes principales
```typescript
async startLocationTracking() {
  // 1. Vérifier permissions GPS
  // 2. Activer Wake Lock
  await this.wakeLockService.enable();
  // 3. Démarrer tracking toutes les 5min
}

stopLocationTracking() {
  // 1. Arrêter le tracking GPS
  // 2. Désactiver Wake Lock
  this.wakeLockService.disable();
}
```

## 📱 Comportement sur Android

### Wake Lock API Support
- ✅ **Compatible** : Capacitor WebView Android
- ✅ **Natif** : Utilise l'API Web standard
- ✅ **Stable** : Pas de plugins tiers problématiques

### Gestion automatique
- **Changement d'onglet** : Wake Lock se libère automatiquement
- **Retour à l'app** : Wake Lock se réactive si conducteur EN LIGNE
- **Fermeture app** : Wake Lock se libère proprement

## 🔧 Configuration

### Permissions Android requises
Déjà configurées dans `android/app/src/main/AndroidManifest.xml` :
```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
```

### Variables d'environnement
Aucune configuration supplémentaire requise - utilise les APIs natives.

## 📊 Monitoring et Debug

### Logs disponibles
- `🔋 Activation Wake Lock - Écran restera allumé pendant le tracking`
- `🔋 Désactivation Wake Lock - Téléphone peut maintenant se verrouiller`
- `📍 GPS tracking started/stopped`

### Méthodes de statut
```typescript
// Vérifier statut Wake Lock
const status = geolocationService.getWakeLockStatus();
// { active: boolean, supported: boolean }

// Statut complet tracking + Wake Lock
const fullStatus = geolocationService.getFullTrackingStatus();
// { tracking: boolean, wakeLockActive: boolean, wakeLockSupported: boolean }
```

## ⚠️ Limitations connues

### Wake Lock
- **Autonomie** : Maintenir l'écran allumé consomme plus de batterie
- **Contrôle utilisateur** : Le chauffeur doit passer HORS LIGNE pour économiser
- **Navigation** : Se désactive si l'utilisateur change d'app

### GPS Tracking
- **Téléphone verrouillé** : S'arrête si Wake Lock désactivé
- **Précision** : Dépend de la qualité du signal GPS
- **Fréquence fixe** : 5 minutes non modifiable par l'utilisateur

## 🎯 Utilisation recommandée

### Pour les chauffeurs
1. **Début de service** : Passer EN LIGNE → GPS + écran actifs
2. **Pendant le service** : Laisser l'app ouverte et le téléphone allumé
3. **Pause/repas** : Passer HORS LIGNE → économie batterie
4. **Fin de service** : Passer HORS LIGNE → arrêt complet

### Pour l'entreprise
- **Formation** : Expliquer l'importance du statut EN LIGNE/HORS LIGNE
- **Monitoring** : Suivre les positions GPS pour vérifier le bon fonctionnement
- **Batterie** : Conseiller l'utilisation d'un chargeur voiture

## 🔄 Evolution future possible

### Améliorations envisageables
- **Notification** : Alerter si Wake Lock échoue
- **Statistiques** : Temps passé EN LIGNE vs HORS LIGNE
- **Optimisation** : Réduire la fréquence GPS selon l'activité
- **Configuration** : Permettre de modifier l'intervalle 5 minutes

### Alternatives techniques
- **Service Worker** : Pour tracking plus robuste (complexe)
- **Plugin natif** : Développement Android/iOS dédié (coûteux)
- **Foreground Service** : Service Android en arrière-plan (expertise native requise)

## 📝 Notes de développement

### Tests recommandés
1. **Test EN LIGNE** : Vérifier GPS + écran allumé
2. **Test HORS LIGNE** : Vérifier arrêt GPS + verrouillage possible
3. **Test changement statut** : Basculer plusieurs fois EN LIGNE/HORS LIGNE
4. **Test batterie** : Mesurer consommation sur une journée type
5. **Test précision** : Vérifier positions GPS en base de données

### Maintenance
- **API Wake Lock** : Suivre l'évolution des standards Web
- **Capacitor** : Mettre à jour régulièrement
- **Android** : Tester sur nouvelles versions Android
- **Permissions** : Vérifier les changements de politique Android

---

**Date de création** : 7 août 2025  
**Version** : 1.0  
**Statut** : ✅ Implémenté et fonctionnel