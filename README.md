# 🚗 AppLakoChauffeur

<div align="center">

![Ionic](https://img.shields.io/badge/Ionic-7.x-3880FF?style=for-the-badge&logo=ionic&logoColor=white)
![Angular](https://img.shields.io/badge/Angular-17.x-DD0031?style=for-the-badge&logo=angular&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Capacitor](https://img.shields.io/badge/Capacitor-5.x-119EFF?style=for-the-badge&logo=capacitor&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)

**Application mobile pour chauffeurs de taxi - Guinée Conakry**

[🌐 Demo Live](https://applako.vercel.app) • [📖 Documentation](./GEOLOCATION_SYSTEM.md) • [🚀 Installation](#-installation)

</div>

---

## 📋 Table des Matières

- [🎯 À Propos](#-à-propos)
- [✨ Fonctionnalités](#-fonctionnalités)
- [🏗️ Architecture](#️-architecture)
- [🚀 Installation](#-installation)
- [⚙️ Configuration](#️-configuration)
- [🔧 Développement](#-développement)
- [📱 Déploiement](#-déploiement)
- [🗺️ Système de Géolocalisation](#️-système-de-géolocalisation)
- [🤝 Contribution](#-contribution)
- [📄 Licence](#-licence)

---

## 🎯 À Propos

**AppLakoChauffeur** est une application mobile dédiée aux chauffeurs de taxi en Guinée-Conakry. Elle permet aux conducteurs de recevoir, accepter et gérer leurs réservations en temps réel avec un système de géolocalisation avancé.

### 🎨 Design System
- **Couleurs** : Palette Lako (Vert #C1F11D, Gris #797979, Crème #FFFEE9)
- **UI/UX** : Interface moderne avec composants Ionic 7
- **Responsive** : Optimisé pour tous les écrans mobiles

---

## ✨ Fonctionnalités

### 🔐 Authentification
- ✅ Connexion sécurisée par téléphone + mot de passe
- ✅ Gestion des sessions avec Supabase Auth
- ✅ Protection des routes privées

### 📍 Géolocalisation Avancée
- ✅ **Tracking GPS automatique** toutes les 5 minutes
- ✅ **Calcul de distance optimisé** avec formule de Haversine
- ✅ **Estimation durée** : 1.8 min/km (33 km/h moyenne urbaine)
- ✅ **Multi-format** : Support WKB PostGIS + POINT PostgreSQL
- ✅ **Acquisition multi-tentatives** pour précision maximale

### 🚕 Gestion des Réservations
- ✅ **Réceptions temps réel** des nouvelles réservations
- ✅ **Actions rapides** : Accepter/Refuser en un clic
- ✅ **Informations détaillées** : Client, destination, prix, distance
- ✅ **Intégration Google Maps** pour navigation

### 👤 Profil Chauffeur
- ✅ **Statut En ligne/Hors ligne** avec contrôle GPS
- ✅ **Statistiques** : Nombre de courses, membre depuis
- ✅ **Historique complet** des réservations traitées

### 🔐 Validation OTP
- ✅ **Système OTP 4 chiffres** pour fin de course
- ✅ **Interface moderne** avec navigation automatique
- ✅ **Validation sécurisée** côté serveur

---

## 🏗️ Architecture

### Stack Technique
```
┌─────────────────────────────────────────┐
│               Frontend                  │
├─────────────────────────────────────────┤
│ Ionic 7 + Angular 17 (Standalone)      │
│ TypeScript 5.x + Capacitor 5           │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│               Backend                   │
├─────────────────────────────────────────┤
│ Supabase (PostgreSQL + PostGIS)        │
│ Real-time subscriptions                 │
│ Row Level Security (RLS)                │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│            Déploiement                  │
├─────────────────────────────────────────┤
│ Vercel (Web) + GitHub Actions          │
│ Android APK via Capacitor              │
└─────────────────────────────────────────┘
```

### Services Principaux

| Service | Description | Fichier |
|---------|-------------|---------|
| **AuthService** | Authentification et gestion utilisateur | `src/app/services/auth.service.ts` |
| **SupabaseService** | Interface base de données | `src/app/services/supabase.service.ts` |
| **GeolocationService** | Tracking GPS automatique | `src/app/services/geolocation.service.ts` |

---

## 🚀 Installation

### Prérequis

Assurez-vous d'avoir installé :

```bash
# Node.js (version 18+ recommandée)
node --version

# npm ou yarn
npm --version

# Ionic CLI
npm install -g @ionic/cli

# Capacitor CLI (optionnel pour mobile)
npm install -g @capacitor/cli
```

### Installation Rapide

```bash
# 1. Cloner le repository
git clone https://github.com/labiko/applako.git
cd applako

# 2. Installer les dépendances
npm install

# 3. Copier la configuration d'environnement
cp src/environments/environment.example.ts src/environments/environment.ts

# 4. Configurer Supabase (voir section Configuration)
# Éditer src/environments/environment.ts

# 5. Lancer le serveur de développement
npm start
# ou
ionic serve
```

### Installation Complète (Mobile)

```bash
# Après l'installation rapide...

# 6. Ajouter les plateformes mobiles
ionic cap add android
ionic cap add ios  # macOS uniquement

# 7. Build pour mobile
npm run build
ionic cap sync

# 8. Ouvrir dans IDE natif
ionic cap open android
ionic cap open ios
```

---

## ⚙️ Configuration

### 🔧 Variables d'Environnement

Créez et configurez `src/environments/environment.ts` :

```typescript
export const environment = {
  production: false,
  supabaseUrl: 'https://votre-projet.supabase.co',
  supabaseKey: 'votre-anon-key-ici'
};
```

### 🗄️ Base de Données Supabase

#### 1. Créer un Projet Supabase
1. Aller sur [supabase.com](https://supabase.com)
2. Créer un nouveau projet
3. Copier l'URL et la clé anonyme

#### 2. Structure des Tables

```sql
-- Table conducteurs
CREATE TABLE conducteurs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nom VARCHAR(100) NOT NULL,
  telephone VARCHAR(20) UNIQUE NOT NULL,
  mot_de_passe VARCHAR(255) NOT NULL,
  position_actuelle TEXT, -- Format WKB PostGIS
  date_update_position TIMESTAMP,
  accuracy NUMERIC,
  hors_ligne BOOLEAN DEFAULT false,
  derniere_activite TIMESTAMP DEFAULT NOW(),
  date_inscription TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Table reservations
CREATE TABLE reservations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_phone VARCHAR(20) NOT NULL,
  vehicle_type VARCHAR(50) DEFAULT 'Standard',
  position_depart TEXT NOT NULL, -- Format POINT
  position_arrivee TEXT,
  destination_nom VARCHAR(255) NOT NULL,
  distance_km NUMERIC,
  prix_total NUMERIC NOT NULL,
  statut VARCHAR(20) DEFAULT 'pending',
  conducteur_id UUID REFERENCES conducteurs(id),
  code_validation VARCHAR(4),
  date_code_validation TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 3. Activer PostGIS (pour géolocalisation)

```sql
-- Activer l'extension PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- Index spatial pour performances
CREATE INDEX idx_conducteurs_position 
ON conducteurs USING GIST (ST_GeomFromText(position_actuelle));

CREATE INDEX idx_reservations_depart 
ON reservations USING GIST (ST_GeomFromText(position_depart));
```

#### 4. Politiques de Sécurité (RLS)

```sql
-- Activer RLS
ALTER TABLE conducteurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- Politique pour conducteurs
CREATE POLICY "Conducteurs peuvent voir leurs données" 
ON conducteurs FOR ALL 
USING (auth.uid()::text = id::text);

-- Politique pour réservations
CREATE POLICY "Conducteurs voient réservations pending ou leurs réservations" 
ON reservations FOR SELECT 
USING (statut = 'pending' OR conducteur_id = auth.uid());
```

---

## 🔧 Développement

### Scripts Disponibles

```bash
# Développement
npm start              # Serveur de dev (port 8100)
ionic serve           # Alternative Ionic
ionic serve --lab     # Vue multi-plateforme

# Build
npm run build         # Build production
ionic build --prod   # Build optimisé

# Tests
npm test              # Tests unitaires
npm run e2e           # Tests end-to-end

# Linting
npm run lint          # ESLint + vérifications
npm run lint:fix      # Correction automatique

# Mobile
ionic cap run android    # Run sur Android
ionic cap run ios        # Run sur iOS (macOS)
ionic cap build android  # Build APK
```

### Structure du Projet

```
src/
├── app/
│   ├── models/           # Interfaces TypeScript
│   ├── services/         # Services (Auth, Supabase, Geo)
│   ├── reservations/     # Page réservations
│   ├── historique/       # Page historique
│   ├── profile/          # Page profil
│   └── login/           # Page connexion
├── assets/              # Images, icônes
├── environments/        # Configuration
└── theme/              # Variables CSS personnalisées
```

### Style Guide

#### CSS Custom Properties
```css
:root {
  --lako-primary: #C1F11D;
  --lako-secondary: #797979;
  --lako-tertiary: #FFFEE9;
  --lako-dark: #151515;
  --lako-white: #FFFFFF;
}
```

#### Conventions de Nommage
- **Components** : PascalCase (`ReservationsPage`)
- **Services** : PascalCase + "Service" (`AuthService`)
- **Variables** : camelCase (`isLoading`)
- **Constants** : SCREAMING_SNAKE_CASE (`GPS_UPDATE_INTERVAL`)

---

## 📱 Déploiement

### 🌐 Déploiement Web (Vercel)

#### Via GitHub (Recommandé)

```bash
# 1. Push vers GitHub
git add .
git commit -m "Ready for deployment"
git push origin main

# 2. Connecter à Vercel
# - Aller sur vercel.com
# - Importer le repository GitHub
# - Configuration automatique détectée
```

#### Configuration Vercel

```json
// vercel.json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ]
}
```

### 📱 Build Mobile

#### Android APK

```bash
# 1. Build production
npm run build

# 2. Synchroniser Capacitor
ionic cap sync android

# 3. Ouvrir Android Studio
ionic cap open android

# 4. Dans Android Studio :
# - Build > Generate Signed Bundle/APK
# - Choisir APK
# - Signer avec votre keystore
```

#### iOS (macOS uniquement)

```bash
# 1. Build production
npm run build

# 2. Synchroniser Capacitor
ionic cap sync ios

# 3. Ouvrir Xcode
ionic cap open ios

# 4. Dans Xcode :
# - Product > Archive
# - Distribute App
```

### 🔄 CI/CD avec GitHub Actions

`.github/workflows/deploy.yml` :

```yaml
name: Deploy to Vercel
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
      
      - name: Deploy to Vercel
        uses: vercel/action@v28
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

---

## 🗺️ Système de Géolocalisation

### Fonctionnalités Avancées

- **📍 Tracking automatique** : Position mise à jour toutes les 5 minutes
- **🎯 Précision optimisée** : Stratégie multi-tentatives (jusqu'à 50m)
- **⚡ Performance** : Cache intelligent et gestion batterie
- **🔄 Formats multiples** : WKB PostGIS + POINT PostgreSQL

### Documentation Technique

Pour plus de détails sur le système de géolocalisation :
👉 **[Consulter GEOLOCATION_SYSTEM.md](./GEOLOCATION_SYSTEM.md)**

---

## 🤝 Contribution

### Comment Contribuer

1. **Fork** le projet
2. **Créer** une branche feature (`git checkout -b feature/nouvelle-fonctionnalite`)
3. **Commit** vos changements (`git commit -m 'Ajout nouvelle fonctionnalité'`)
4. **Push** vers la branche (`git push origin feature/nouvelle-fonctionnalite`)
5. **Ouvrir** une Pull Request

### Standards de Code

- ✅ **ESLint** : Respect des règles définies
- ✅ **TypeScript** : Typage strict activé
- ✅ **Tests** : Couverture minimum 80%
- ✅ **Documentation** : JSDoc pour les fonctions publiques

### Issues et Bugs

Utilisez les templates GitHub pour :
- 🐛 **Bug Report** : Signaler un problème
- ✨ **Feature Request** : Proposer une amélioration
- 📖 **Documentation** : Améliorer la doc

---

## 📄 Licence

Ce projet est sous licence **MIT** - voir le fichier [LICENSE](LICENSE) pour plus de détails.

---

## 🔗 Liens Utiles

| Resource | URL |
|----------|-----|
| 🌐 **Demo Live** | https://applako.vercel.app |
| 📚 **Documentation Ionic** | https://ionicframework.com/docs |
| 🅰️ **Documentation Angular** | https://angular.io/docs |
| 🗄️ **Documentation Supabase** | https://supabase.com/docs |
| 📱 **Documentation Capacitor** | https://capacitorjs.com/docs |

---

## 👥 Équipe

- **Développement** : Équipe Lako
- **Design** : Interface moderne Ionic
- **Backend** : Supabase + PostGIS
- **DevOps** : Vercel + GitHub Actions

---

<div align="center">

**Made with ❤️ for Guinea-Conakry taxi drivers**

[![Built with Ionic](https://img.shields.io/badge/Built%20with-Ionic-3880FF?style=flat&logo=ionic&logoColor=white)](https://ionicframework.com)
[![Powered by Supabase](https://img.shields.io/badge/Powered%20by-Supabase-3ECF8E?style=flat&logo=supabase&logoColor=white)](https://supabase.com)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-000000?style=flat&logo=vercel&logoColor=white)](https://vercel.com)

</div>