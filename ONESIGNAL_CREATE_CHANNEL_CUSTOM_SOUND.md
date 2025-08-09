# OneSignal - Création Channel avec Son Personnalisé

Guide détaillé pour créer un Android Notification Channel avec son personnalisé dans OneSignal Dashboard.

## 🎯 Problème résolu

**Symptôme** : Les notifications OneSignal arrivent bien sur mobile mais jouent seulement le son par défaut, malgré la configuration `android_sound = "claxon"` dans le payload.

**Cause racine** : OneSignal utilise les **Android Notification Channels** pour gérer les sons personnalisés. Sans channel configuré, le paramètre `android_sound` est ignoré.

**Solution** : Créer un channel dans OneSignal Dashboard avec son personnalisé + utiliser `android_channel_id` dans le code.

---

## 📋 Prérequis

### 1. Fichier audio préparé
- ✅ **Fichier** : `claxon.wav` (format supporté par Android)
- ✅ **Emplacement mobile** : `android/app/src/main/res/raw/claxon.wav`
- ✅ **Configuration Capacitor** : Mapping dans `capacitor.config.ts`

```typescript
// capacitor.config.ts
android: {
  resources: [{
    src: 'src/assets/sounds/claxon.wav',
    target: 'app/src/main/res/raw/claxon.wav'
  }]
}
```

### 2. Accès OneSignal Dashboard
- ✅ **URL** : https://dashboard.onesignal.com
- ✅ **Section** : Push Settings > Android Notification Channels
- ✅ **Permissions** : Admin sur l'app OneSignal

---

## 🚀 Étapes détaillées

### **Étape 1: Accéder à la section Channels**

1. Connectez-vous au **OneSignal Dashboard**
2. Sélectionnez votre app (ex: `AppLakoChauffeur`)
3. Menu gauche → **Settings** 
4. Onglet **Push Settings**
5. Section **Android Notification Channels**

**État initial** : Message affiché
> "No groups created. Create a group to add notification channels"

### **Étape 2: Créer le Notification Group**

1. Cliquez **"Add Group"**
2. Popup **"Create Notification Group"** s'ouvre
3. **Configuration** :
   - **Name** : `reservations` (nom logique du groupe)
4. Cliquez **"Submit"**

**Résultat** : Groupe créé, bouton **"Add Channel"** disponible

### **Étape 3: Créer le Notification Channel**

1. Dans le groupe créé, cliquez **"Add Channel"**
2. Popup **"Create Notification Channel"** s'ouvre

### **Étape 4: Configuration du Channel**

#### **Informations de base**
- **User-visible channel name** : `reservations_channel`
- **User-visible channel description** : `Notifications pour nouvelles courses Lako Chauffeur`

#### **Paramètres techniques**
- **Importance** : ☑️ `High` (obligatoire pour son + vibration)
- **Sound** : ☑️ `Custom` puis saisir : `claxon` ⚠️ **SANS extension .wav**
- **Vibration** : ☑️ `Default` (ou Custom selon préférence)
- **LED** : ☑️ `Default` 
- **Badges** : ☑️ `Enabled`
- **Lockscreen** : ☑️ `Private` (ou Public selon politique)

#### **⚠️ Point critique - Configuration Sound**
```
Sound: Custom → Champ texte : "claxon"
```
- **✅ CORRECT** : `claxon` (sans extension)
- **❌ INCORRECT** : `claxon.wav` ou `claxon.mp3`
- **Logique** : OneSignal cherchera automatiquement `res/raw/claxon.wav`

### **Étape 5: Création et récupération ID**

1. Cliquez **"Create"**
2. Channel créé avec **ID unique généré** (ex: `1c80350f-1600-4b1d-837b-537b1659704e`)
3. **⚠️ Notez cet ID** - indispensable pour le code

---

## 💻 Intégration Code

### **1. Configuration Web.config**

Ajoutez le Channel ID dans `Web.config` :

```xml
<appSettings>
  <!-- Autres configs OneSignal -->
  <add key="onesignalAppId" value="867e880f-d486-482e-b7d8-d174db39f322" />
  <add key="onesignalApiKey" value="YOUR_API_KEY" />
  <add key="onesignalUrl" value="https://onesignal.com/api/v1/notifications" />
  
  <!-- NOUVEAU: Channel ID pour son personnalisé -->
  <add key="onesignalChannelId" value="1c80350f-1600-4b1d-837b-537b1659704e" />
</appSettings>
```

### **2. Modification code C#**

**AVANT (ne fonctionne pas)** :
```csharp
var obj = new {
    app_id = ConfigurationManager.AppSettings["onesignalAppId"],
    contents = new { en = Message, fr = Message },
    include_external_user_ids = new string[] { "conducteur_" + ConducteurId },
    priority = 10,
    android_sound = "claxon",     // ❌ IGNORÉ sans channel
    ios_sound = "claxon.wav",
    // ...
};
```

**APRÈS (fonctionnel)** :
```csharp
var obj = new {
    app_id = ConfigurationManager.AppSettings["onesignalAppId"],
    contents = new { en = Message, fr = Message },
    include_external_user_ids = new string[] { "conducteur_" + ConducteurId },
    priority = 10,
    android_channel_id = ConfigurationManager.AppSettings["onesignalChannelId"], // ✅ UTILISE LE CHANNEL
    android_accent_color = "FF00A651",
    android_led_color = "FF00A651",
    // ...
};
```

### **3. Debug et vérification**

Ajout logging pour vérifier configuration :

```csharp
var channelId = ConfigurationManager.AppSettings["onesignalChannelId"];
Console.WriteLine($"🔧 OneSignal Config Check:");
Console.WriteLine($"  - Channel ID: {(string.IsNullOrEmpty(channelId) ? "❌ MANQUANT" : "✅ OK")}");
```

---

## 🔍 Logique technique

### **Flux complet**
1. **Code C#** → Envoie payload avec `android_channel_id`
2. **OneSignal API** → Reçoit la demande de notification
3. **OneSignal** → Utilise le channel configuré (ID fourni)
4. **FCM/Firebase** → Reçoit notification avec channel settings
5. **Android App** → Cherche `res/raw/claxon.wav`
6. **Système** → Joue le son personnalisé ! 🔊

### **Pourquoi ça marche maintenant**
- **Channel OneSignal** : Contient la config `sound = "claxon"`
- **ID unique** : `android_channel_id` lie le payload au bon channel
- **Fichier présent** : `res/raw/claxon.wav` existe grâce à Capacitor
- **Permissions** : Channel `High` importance = son autorisé

---

## ✅ Tests et validation

### **Test 1: Vérification fichier mobile**
```bash
# Dans le projet Ionic
ionic build
ionic capacitor sync android
# Vérifier : android/app/src/main/res/raw/claxon.wav existe
```

### **Test 2: Test notification**
```
# URL de test
https://www.labico.net/Taxi/ProcessPendingReservationNotifications

# Ou insérer réservation test en base
INSERT INTO reservations (depart_nom, destination_nom, vehicle_type, position_depart, statut) 
VALUES ('Test Départ', 'Test Destination', 'voiture', ST_GeomFromText('POINT(0 0)', 4326), 'pending');
```

### **Test 3: Vérification logs**
```csharp
Console.WriteLine($"🔧 Channel ID utilisé: {channelId}");
// Doit afficher: 1c80350f-1600-4b1d-837b-537b1659704e
```

---

## 🚨 Troubleshooting

### **Problème: Son toujours par défaut**
- ❌ **Channel ID incorrect** → Vérifier dans OneSignal Dashboard
- ❌ **Fichier manquant** → Vérifier `res/raw/claxon.wav`
- ❌ **Web.config** → Vérifier `onesignalChannelId`
- ❌ **App cache** → Redémarrer app / Clean build

### **Problème: Channel non trouvé**
```
OneSignal Error: Channel ID not found
```
**Solution** : Re-créer le channel, noter le nouvel ID

### **Problème: Permissions audio**
- **Android** : Vérifier permissions notification dans app
- **Channel** : Importance = `High` obligatoire pour son custom

---

## 📚 Références

- **OneSignal Channels** : https://documentation.onesignal.com/docs/android-notification-categories
- **Android Notification Channels** : https://developer.android.com/develop/ui/views/notifications/channels
- **Capacitor Resources** : https://capacitorjs.com/docs/guides/splash-screens-and-icons

---

## 📝 Changelog

- **v1.0** - Guide initial avec création channel
- **Configuration** : Channel `1c80350f-1600-4b1d-837b-537b1659704e` opérationnel
- **Status** : ✅ Son claxon personnalisé fonctionnel sur mobile

---

**Auteur** : Claude Code  
**Date** : 2025-01-09  
**Projet** : AppLakoChauffeur - OneSignal Push Notifications  