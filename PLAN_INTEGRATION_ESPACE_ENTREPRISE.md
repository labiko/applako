# 🏢 PLAN D'INTÉGRATION - ESPACE ENTREPRISE LOKOTAXI

## 📋 **CONTEXTE GLOBAL DU PROJET**

### **🎯 Objectif Principal**
**Intégrer un espace entreprise** dans l'application mobile LokoTaxi existante en ajoutant :
- 🔄 **Page de sélection** : Choix "Conducteur" ou "Entreprise" au démarrage
- 🏢 **Espace entreprise complet** : Dashboard, gestion flotte, analytics
- 🔗 **Intégration harmonieuse** avec l'app conducteur existante

### **🏗️ Architecture Actuelle (EXISTANTE)**
- ✅ **App mobile conducteur** : Complètement développée et fonctionnelle
- ✅ **Bot WhatsApp** : Interface client pour réservations (Deno + Supabase Edge Functions)
- ✅ **Base de données** : PostgreSQL + PostGIS avec tables complètes
- ✅ **Workflow opérationnel** : Client WhatsApp → Bot → Conducteur → Validation

### **🎯 Objectif de Claude**
**Intégrer UNIQUEMENT l'espace entreprise** dans l'app existante :
1. ✅ **Interface conducteur** : App mobile (EXISTANTE - ne pas toucher)
2. 🆕 **Page sélection** : "Conducteur" ou "Entreprise" (NOUVELLE)
3. 🆕 **Interface entreprise** : Dashboard complet (NOUVELLE - focus principal)

---

## 🗄️ **PHASE 1 : STRUCTURE BASE DE DONNÉES**

### **📊 État Actuel Analysé**

**✅ Table `entreprises` existante :**
```sql
CREATE TABLE public.entreprises (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom character varying NOT NULL,
  siret character varying UNIQUE,
  adresse text,
  telephone character varying UNIQUE,
  email character varying,
  responsable character varying,
  password_hash character varying,
  actif boolean DEFAULT true,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);
```

**✅ Table `conducteurs` avec liaison :**
```sql
-- Colonne entreprise_id déjà présente
entreprise_id uuid REFERENCES entreprises(id)
```

**✅ Table `reservations` avec code validation :**
```sql
-- Colonnes validation déjà présentes
code_validation character varying,
date_code_validation timestamp with time zone
```

### **🔧 Extensions Base de Données Requises**

**1️⃣ Enrichissement table `entreprises` :**
```sql
ALTER TABLE entreprises ADD COLUMN IF NOT EXISTS
  -- Informations business
  logo_url text,
  site_web text,
  secteur_activite varchar(100),
  taille_flotte integer DEFAULT 0,
  
  -- Configuration métier
  commission_rate numeric(5,2) DEFAULT 15.00, -- % commission LokoTaxi
  tarif_km_moto numeric(8,2) DEFAULT 1500, -- GNF par km
  tarif_km_voiture numeric(8,2) DEFAULT 2000, -- GNF par km
  tarif_minimum numeric(8,2) DEFAULT 5000, -- Course minimum GNF
  
  -- Zones d'activité
  zones_autorisees jsonb DEFAULT '[]', -- Array de polygones/villes
  
  -- Dashboard & API
  api_key varchar(64) UNIQUE, -- Pour accès API
  webhook_url text, -- Notifications entreprise
  
  -- Paramètres dashboard
  dashboard_config jsonb DEFAULT '{}',
  derniere_connexion timestamp,
  
  -- Facturation
  mode_facturation varchar(20) DEFAULT 'monthly', -- monthly/weekly/daily
  jour_facturation integer DEFAULT 1, -- 1-31 pour monthly
  
  -- Statut avancé
  statut varchar(20) DEFAULT 'active', -- active/suspended/trial
  date_fin_trial timestamp,
  credits_bonus numeric(10,2) DEFAULT 0
;
```

**2️⃣ Table historique activité :**
```sql
CREATE TABLE entreprise_activite (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  entreprise_id uuid REFERENCES entreprises(id),
  
  -- Métriques quotidiennes
  date_activite date NOT NULL,
  nombre_courses integer DEFAULT 0,
  ca_brut numeric(10,2) DEFAULT 0, -- Chiffre d'affaires brut
  ca_net numeric(10,2) DEFAULT 0, -- Après commission LokoTaxi
  commission_lokotaxi numeric(10,2) DEFAULT 0,
  
  -- Répartition par type
  courses_moto integer DEFAULT 0,
  courses_voiture integer DEFAULT 0,
  ca_moto numeric(10,2) DEFAULT 0,
  ca_voiture numeric(10,2) DEFAULT 0,
  
  -- Indicateurs qualité
  note_moyenne numeric(3,2),
  taux_annulation numeric(5,2), -- % courses annulées
  temps_reponse_moyen integer, -- secondes
  
  created_at timestamp DEFAULT now(),
  
  UNIQUE(entreprise_id, date_activite)
);
```

**3️⃣ Table sessions dashboard :**
```sql
CREATE TABLE entreprise_sessions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  entreprise_id uuid REFERENCES entreprises(id),
  
  -- Session info
  token varchar(128) UNIQUE NOT NULL,
  user_agent text,
  ip_address inet,
  
  -- Durée session
  created_at timestamp DEFAULT now(),
  last_activity timestamp DEFAULT now(),
  expires_at timestamp DEFAULT (now() + interval '24 hours'),
  
  -- Sécurité
  actif boolean DEFAULT true,
  revoked_at timestamp,
  revoked_reason text
);
```

---

## 🔐 **PHASE 2 : SYSTÈME D'AUTHENTIFICATION**

### **🎯 Architecture JWT + Sessions**

**📝 Workflow Auth :**
1. **Login** : email/password → JWT token (24h)
2. **Refresh** : Auto-refresh avant expiration
3. **Logout** : Blacklist token côté serveur
4. **Sécurité** : Rate limiting + IP tracking

**🔧 Endpoints Auth API :**
```typescript
POST /api/entreprise/auth/login
POST /api/entreprise/auth/refresh  
POST /api/entreprise/auth/logout
GET  /api/entreprise/auth/profile
PUT  /api/entreprise/auth/profile
```

**💾 Structure JWT Payload :**
```json
{
  "entreprise_id": "uuid",
  "nom": "Entreprise Name",
  "role": "admin", 
  "permissions": ["dashboard", "conducteurs", "facturation"],
  "exp": 1628097600,
  "iat": 1628011200
}
```

---

## 📊 **PHASE 3 : API BACKEND DASHBOARD**

### **🏗️ Architecture API REST**

**📂 Structure recommandée :**
```
/api/entreprise/
├── auth/           # Authentification
├── dashboard/      # Métriques générales
├── conducteurs/    # Gestion flotte
├── reservations/   # Historique courses
├── analytics/      # Rapports détaillés
├── facturation/    # Données financières
└── notifications/  # Alertes temps réel
```

### **🔄 Endpoints Principaux**

**1️⃣ Dashboard Vue d'Ensemble :**
```typescript
GET /api/entreprise/dashboard/overview
// Retourne :
{
  "periode": "today|week|month",
  "metrics": {
    "courses_total": 45,
    "ca_brut": 125000, // GNF
    "ca_net": 106250,  // Après commission 15%
    "commission": 18750,
    "conducteurs_actifs": 8,
    "note_moyenne": 4.6,
    "taux_completion": 94.2
  },
  "evolution": {
    "courses": "+12%",
    "ca": "+8%", 
    "note": "+0.3"
  },
  "graphiques": {
    "courses_par_heure": [...],
    "repartition_vehicules": {...},
    "zones_populaires": [...]
  }
}
```

**2️⃣ Gestion Conducteurs :**
```typescript
GET /api/entreprise/conducteurs
GET /api/entreprise/conducteurs/:id/stats
PUT /api/entreprise/conducteurs/:id/status
GET /api/entreprise/conducteurs/:id/courses
```

**3️⃣ Réservations & Validation :**
```typescript
GET /api/entreprise/reservations
  ?status=completed
  &date_from=2025-08-01
  &date_to=2025-08-31
  &conducteur_id=uuid
  &page=1&limit=50

GET /api/entreprise/reservations/:id
PUT /api/entreprise/reservations/:id/validate
// Body: { code_validation: "ABC123" }
```

---

## 🎨 **PHASE 4 : INTERFACE MOBILE (INTÉGRATION APP EXISTANTE)**

### **📱 Architecture App Mobile Existante**

**⚠️ IMPORTANT : L'application conducteur est DÉJÀ fonctionnelle - NE PAS MODIFIER**

**🔄 Modifications Requises :**
1. **Page d'accueil** : Ajouter sélection "Conducteur" / "Entreprise"
2. **Routing** : Nouvelles routes espace entreprise uniquement
3. **Navigation** : Stack séparée pour entreprise
4. **Auth** : Système auth entreprise indépendant

### **📱 Stack Technique (Basé sur l'Existant)**

**Framework** : React Native (assumé - s'adapter selon app existante)
**Navigation** : React Navigation (ou équivalent existant)
**State** : Redux/Context (réutiliser pattern existant)
**UI** : Style cohérent avec app conducteur existante
**Charts** : Victory Native ou React Native Chart Kit
**Maps** : React Native Maps (même lib que conducteur probablement)

### **📱 Flow d'Intégration App Mobile**

**🔄 Page Sélection (NOUVELLE) :**
```
+----------------------------------+
|         LokoTaxi Logo            |
|                                  |
|     Choisissez votre espace :    |
|                                  |
| +------------------------------+ |
| |        🚗 CONDUCTEUR         | |
| |   Gérer mes courses          | |
| +------------------------------+ |
|                                  |
| +------------------------------+ |
| |       🏢 ENTREPRISE          | |
| |   Dashboard & Gestion        | |
| +------------------------------+ |
|                                  |
+----------------------------------+
```

**📱 Navigation Entreprise (NOUVELLE) :**
```
Enterprise Stack:
├── 🏠 Dashboard - Vue d'ensemble
├── 👥 Conducteurs - Gestion flotte  
├── 📊 Analytics - Rapports détaillés
├── 💰 Finances - CA & facturation
├── ⚙️ Paramètres - Config
└── 🚪 Déconnexion
```

**🎨 Design Mobile-First :**
- **Cards** : Métriques en cartes (courses, CA, notes)
- **Lists** : Conducteurs et réservations scrollables
- **Charts** : Graphiques adaptés mobile (courbes simples)
- **Bottom Navigation** : 5 onglets principaux
- **Pull-to-refresh** : Actualisation données temps réel

---

## 📲 **PHASE 5 : NOTIFICATIONS TEMPS RÉEL**

### **🔔 Système de Notifications**

**1️⃣ Types d'Alertes :**
- 🆕 **Nouvelle réservation** pour un conducteur
- ✅ **Course terminée** avec validation requise
- ⚠️ **Conducteur inactif** depuis X heures
- 📊 **Seuils atteints** (objectifs journaliers)
- 💰 **Facturation** mensuelle générée

**2️⃣ Canaux de Diffusion :**
- **Dashboard** : Notifications in-app temps réel
- **Email** : Résumés quotidiens/hebdomadaires
- **SMS** : Alertes critiques uniquement
- **Webhook** : API pour intégrations tierces

**3️⃣ Configuration Notifications :**
```json
{
  "nouvelle_course": {
    "enabled": true,
    "channels": ["dashboard", "email"],
    "seuil_montant": 50000 // GNF
  },
  "conducteur_inactif": {
    "enabled": true,
    "delai_heures": 4,
    "channels": ["dashboard", "sms"]
  }
}
```

---

## 💰 **PHASE 6 : GESTION FINANCIÈRE**

### **🧮 Système Commission**

**💡 Modèle Économique :**
- **Commission LokoTaxi** : 15% par défaut (configurable)
- **Paiement conducteur** : 85% du prix course
- **Facturation entreprise** : Monthly/Weekly selon config

**📊 Calculs Automatiques :**
```sql
-- Vue CA entreprise
CREATE VIEW entreprise_ca AS
SELECT 
  e.id,
  e.nom,
  COUNT(r.id) as total_courses,
  SUM(r.prix_total) as ca_brut,
  SUM(r.prix_total * (100 - e.commission_rate) / 100) as ca_net,
  SUM(r.prix_total * e.commission_rate / 100) as commission_lokotaxi
FROM entreprises e
LEFT JOIN conducteurs c ON c.entreprise_id = e.id  
LEFT JOIN reservations r ON r.conducteur_id = c.id 
  AND r.statut = 'completed'
  AND r.date_code_validation IS NOT NULL
GROUP BY e.id, e.nom;
```

### **🧾 Facturation Automatisée**

**📅 Cycle de Facturation :**
1. **Calcul automatique** fin de période
2. **Génération PDF** avec détail courses
3. **Envoi email** avec facture + récapitulatif
4. **Suivi paiements** et relances

---

## 🔄 **PHASE 7 : INTÉGRATION BOT WHATSAPP**

### **🤖 Modifications Bot Requises**

**1️⃣ Enrichissement Réservations :**
```typescript
// Après validation course conducteur
await saveReservation({
  ...reservationData,
  code_validation: generateValidationCode(), // "ABC123"
  date_code_validation: new Date(),
  entreprise_id: conducteur.entreprise_id // Ajout lien
});

// Notification entreprise temps réel
await notifyEntreprise(conducteur.entreprise_id, {
  type: 'course_completed',
  reservation_id: reservation.id,
  montant: reservation.prix_total
});
```

**2️⃣ API Validation Entreprise :**
```typescript
// Endpoint validation courses
PUT /api/reservations/:id/validate
{
  "code_validation": "ABC123",
  "entreprise_id": "uuid",
  "valide_par": "admin@entreprise.com"
}
```

---

## 🚀 **PHASE 8 : DÉPLOIEMENT MOBILE**

### **📱 Intégration App Existante**

**⚠️ IMPORTANT : Réutiliser l'infrastructure de l'app conducteur existante**

**🔄 Modifications App Mobile :**
```
App LokoTaxi (Existante):
├── 📱 SplashScreen (existante)
├── 🆕 UserTypeSelection (NOUVELLE)
├── 🚗 ConducteurStack (EXISTANTE - ne pas toucher)
└── 🏢 EntrepriseStack (NOUVELLE - focus)
```

**🏗️ Architecture Réutilisée :**
- **API Base** : Même serveur que conducteur
- **Auth** : Pattern similaire avec JWT entreprise
- **Database** : Même PostgreSQL (nouvelles tables seulement)
- **Notifications** : Réutiliser service push existant

### **📊 Déploiement Mobile**

**📱 Stores :**
- **Play Store** : Mise à jour version existante
- **App Store** : Mise à jour version existante
- **Description** : "Ajout espace entreprise"

**🔒 Sécurité Mobile :**
- **Biometric Auth** : Touch/Face ID pour entreprises
- **Secure Storage** : Keychain/Keystore tokens
- **Certificate Pinning** : API entreprise
- **Offline Mode** : Cache données critiques

---

## 📈 **ROADMAP IMPLÉMENTATION**

### **🗓️ Planning Recommandé (8 semaines) - INTÉGRATION APP EXISTANTE**

**📅 Semaines 1-2 : Analyse & Extensions DB**
- 🔍 **Analyse app conducteur existante** (structure, patterns, libs)
- 🗄️ **Extensions base de données** uniquement (nouvelles tables entreprise)
- 🔗 **APIs entreprise** (réutiliser infrastructure existante)
- 📋 **Documentation patterns** existants

**📅 Semaines 3-4 : Page Sélection & Auth Entreprise**
- 🔄 **Modification page d'accueil** : Ajout sélection Conducteur/Entreprise
- 🔐 **Système auth entreprise** (pattern similaire conducteur)
- 🧭 **Navigation entreprise** (stack séparée)
- 🎨 **Design cohérent** avec app existante

**📅 Semaines 5-6 : Interface Entreprise Core**
- 📊 **Dashboard principal** (métriques, graphiques)
- 👥 **Gestion conducteurs** (liste, statuts, stats)
- 📝 **Historique réservations** (avec validation)
- 📱 **Adaptation mobile** (responsive, touch-friendly)

**📅 Semaines 7-8 : Finalisations & Tests**
- 💰 **Module finances** (CA, commissions)
- 🔔 **Notifications** (réutiliser système existant)
- 🧪 **Tests intégration** avec app conducteur
- 🚀 **Déploiement stores** (mise à jour app existante)

---

## 💡 **ÉVOLUTIONS FUTURES**

### **🔮 Fonctionnalités V2**
- **📱 App Mobile Entreprise** : Dashboard iOS/Android
- **🤖 Assistant IA** : Chatbot support entreprises
- **📊 Analytics Avancées** : ML prédictions, heatmaps
- **🔗 API Publique** : Intégrations tierces (ERP, CRM)
- **🌍 Multi-Langues** : Support Français + Pular + Anglais

### **🎯 KPIs de Succès**
- **👥 Adoption** : 80% entreprises utilisent dashboard
- **📊 Usage** : 5+ connexions/semaine par entreprise  
- **💰 ROI** : +25% CA via optimisations dashboard
- **😊 Satisfaction** : 4.5/5 rating dashboard
- **🚀 Performance** : 99.9% uptime, <200ms response

---

## 📞 **CONTEXTE POUR CLAUDE (AUTRE PROJET)**

### **🎯 Mission Claude - INTÉGRATION ESPACE ENTREPRISE**
Tu vas **intégrer un espace entreprise** dans l'application mobile LokoTaxi existante. **L'app conducteur fonctionne déjà** - tu dois UNIQUEMENT ajouter la partie entreprise.

### **📱 Application Existante (NE PAS MODIFIER)**
- ✅ **App mobile conducteur** : Complètement développée et opérationnelle
- ✅ **Login/Auth conducteur** : Système d'authentification fonctionnel
- ✅ **Base de données** : PostgreSQL + PostGIS avec toutes les tables
- ✅ **APIs conducteur** : Backend complet pour gestion courses

### **🆕 Tâches à Réaliser (NOUVELLES UNIQUEMENT)**
1. **Page sélection** : "Conducteur" ou "Entreprise" au démarrage
2. **Auth entreprise** : Système login séparé pour entreprises
3. **Navigation entreprise** : Stack complète dashboard/gestion
4. **Intégration harmonieuse** : Design cohérent avec app existante

### **⚠️ Points d'Attention CRITIQUES**
- **NE PAS TOUCHER** à l'app conducteur existante
- **Réutiliser** l'infrastructure et patterns existants
- **Style cohérent** avec le design de l'app conducteur
- **Performance** : Garder fluidité de l'app existante

### **🎖️ Livrable Final**
Une **app mobile unique** avec :
- 🔄 **Choix au démarrage** : Conducteur (existant) ou Entreprise (nouveau)
- 🚗 **Espace conducteur** : Inchangé et fonctionnel
- 🏢 **Espace entreprise** : Dashboard complet intégré

---

*📝 Document généré le 2 août 2025 - Version 1.0*  
*🔄 À réviser et améliorer selon les besoins spécifiques*