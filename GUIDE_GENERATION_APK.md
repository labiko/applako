# 📱 GUIDE SIMPLE : GÉNÉRER APK POUR TEST ANDROID

## 🎯 OBJECTIF
Générer rapidement un APK pour installer et tester l'application LokoTaxi sur ton téléphone Android.

---

## ⚡ ÉTAPES RAPIDES (30 minutes)

### 1️⃣ **Vérifier les prérequis**
```bash
# Vérifier que tout est installé
node --version          # Node.js requis
ionic --version         # Ionic CLI requis  
java -version          # Java JDK requis
```

### 2️⃣ **Préparer le projet**
```bash
# Dans le dossier du projet
cd "C:\Users\diall\Documents\IonicProjects\Claude\AppLakoChauffeur"

# Installer les dépendances si nécessaire
npm install

# Build de production
ionic build --prod
```

### 3️⃣ **Configurer Android** 
```bash
# Ajouter la plateforme Android si pas déjà fait
ionic capacitor add android

# Synchroniser le code avec Android
ionic capacitor sync android

# Ouvrir Android Studio
ionic capacitor open android
```

---

## 🔧 GÉNÉRATION APK DANS ANDROID STUDIO

### **Méthode 1 : APK Debug (Plus rapide)**

1. **Ouvrir Android Studio** (via `ionic capacitor open android`)

2. **Attendre la synchronisation** du projet (barres de progression)

3. **Connecter ton téléphone** :
   - Activer "Mode développeur" sur Android
   - Activer "Débogage USB"
   - Connecter en USB et autoriser

4. **Générer et installer** :
   ```
   Menu > Build > Build Bundle(s)/APK(s) > Build APK(s)
   ```

5. **Localiser l'APK** :
   ```
   android/app/build/outputs/apk/debug/app-debug.apk
   ```

6. **Installer directement** :
   - Android Studio détecte ton téléphone
   - Bouton "Run" (flèche verte) 
   - L'app s'installe automatiquement

### **Méthode 2 : APK Release (Plus propre)**

1. **Générer une clé de signature temporaire** :
   ```bash
   # Dans le terminal
   keytool -genkey -v -keystore debug.keystore -alias androiddebugkey -keyalg RSA -keysize 2048 -validity 10000
   
   # Utilise ces infos pour aller vite :
   # Mot de passe : android  
   # Nom : LokoTaxi
   # Ville : Conakry
   # Pays : GN
   ```

2. **Dans Android Studio** :
   ```
   Menu > Build > Generate Signed Bundle/APK
   → Choisir "APK"
   → Sélectionner la clé créée (debug.keystore)
   → Build variant : release
   → Finish
   ```

3. **APK généré dans** :
   ```
   android/app/build/outputs/apk/release/app-release.apk
   ```

---

## 📱 INSTALLATION SUR TON TÉLÉPHONE

### **Option A : Installation directe USB**
- Téléphone connecté en USB
- Android Studio installe automatiquement
- ✅ **Le plus simple !**

### **Option B : Copier l'APK** 
1. **Copier l'APK** vers ton téléphone :
   ```bash
   # L'APK se trouve dans :
   android/app/build/outputs/apk/debug/app-debug.apk
   ```

2. **Sur le téléphone** :
   - Aller dans "Paramètres > Sécurité" 
   - Activer "Sources inconnues" 
   - Ouvrir un gestionnaire de fichiers
   - Naviguer vers l'APK copié
   - Cliquer pour installer

### **Option C : Transfer via cloud**
- Upload l'APK sur Google Drive/OneDrive
- Télécharger sur le téléphone  
- Installer depuis les téléchargements

---

## ⚡ COMMANDES RAPIDES - TOUT EN UN

```bash
# 🚀 Script complet pour générer l'APK rapidement
cd "C:\Users\diall\Documents\IonicProjects\Claude\AppLakoChauffeur"

# Build et sync
ionic build --prod
ionic capacitor sync android

# Ouvrir Android Studio pour build APK
ionic capacitor open android

# Dans Android Studio :
# Build > Build Bundle(s)/APK(s) > Build APK(s)
# Attendre 2-3 minutes
# APK prêt dans : android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 🔍 VÉRIFICATIONS APRÈS INSTALLATION

### ✅ **Checklist de test sur téléphone :**
- [ ] **App se lance** sans crash
- [ ] **Login conducteur** fonctionne  
- [ ] **GPS** demande permission et fonctionne
- [ ] **Interface** s'affiche correctement
- [ ] **Navigation** entre les tabs fonctionne
- [ ] **Système blocage** (test avec conducteur bloqué)

### 🐛 **Si problèmes :**
- **Logs Android** : Menu > View > Tool Windows > Logcat
- **Crash app** : Vérifier permissions dans paramètres Android
- **Pas de GPS** : Vérifier paramètres localisation téléphone
- **Login échoue** : Vérifier connexion internet + credentials

---

## 📁 LOCALISATION DES FICHIERS

```
Projet/
├── android/app/build/outputs/apk/
│   ├── debug/app-debug.apk          ← APK Debug (rapide)
│   └── release/app-release.apk      ← APK Release (signé)
├── capacitor.config.ts              ← Config app
└── android/app/src/main/
    └── AndroidManifest.xml          ← Permissions
```

---

## 🎯 **RÉSUMÉ : 3 ÉTAPES SEULEMENT**

1. **Build** : `ionic build --prod && ionic capacitor sync android`
2. **Ouvrir** : `ionic capacitor open android`  
3. **Générer** : Android Studio > Build > Build APK(s)

**📱 APK prêt dans :** `android/app/build/outputs/apk/debug/app-debug.apk`

**⏰ Temps total :** ~15-30 minutes (selon vitesse PC)

---

## ⚠️ NOTES IMPORTANTES

- **Première fois** : Android Studio peut prendre 10+ minutes pour setup
- **Téléphone** : Activer mode développeur + débogage USB
- **APK Debug** : Suffisant pour tests, pas besoin de signature complexe
- **Permissions** : L'app demandera GPS au premier lancement
- **Internet requis** : Pour connexion Supabase

**🚀 Tu auras l'app LokoTaxi installée et prête à tester !**