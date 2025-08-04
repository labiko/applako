# WORKFLOW_VERSEMENT_CONDUCTEUR.md

## Contexte
Les conducteurs travaillent toute la journée et passent en entreprise chaque soir pour effectuer les versements des sommes encaissées en espèces auprès des clients. **Un code OTP à 4 chiffres est envoyé au conducteur par SMS pour sécuriser le versement.**

## Vue d'ensemble du système

### Principe de fonctionnement
1. Les conducteurs effectuent des courses et encaissent en espèces
2. Le soir, ils viennent à l'entreprise pour verser l'argent
3. L'admin initie le versement → **Code OTP envoyé au conducteur par SMS**
4. Le conducteur communique le code OTP à l'admin
5. L'admin saisit le code OTP pour valider le versement
6. Le versement se fait par conducteur (montant total), pas ligne par ligne

## Structure de la base de données

### Table `versements`
```sql
CREATE TABLE versements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conducteur_id UUID NOT NULL REFERENCES conducteurs(id),
  montant NUMERIC NOT NULL,
  date_versement TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  entreprise_id UUID NOT NULL REFERENCES entreprises(id),
  reservation_ids UUID[] NOT NULL, -- Array des IDs de réservations
  statut TEXT DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'verse', 'otp_envoye', 'annule')),
  otp_code VARCHAR(4), -- Code OTP à 4 chiffres
  otp_generated_at TIMESTAMP, -- Timestamp de génération de l'OTP
  otp_attempts INTEGER DEFAULT 0, -- Nombre de tentatives
  localisation_versement POINT, -- Coordonnées GPS
  adresse_versement TEXT, -- Adresse textuelle
  photo_versement TEXT, -- URL de la photo du versement
  signature_conducteur TEXT, -- Signature électronique
  commentaire TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Table `sms_logs`
```sql
CREATE TABLE sms_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  telephone VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  statut TEXT DEFAULT 'envoye' CHECK (statut IN ('envoye', 'echec', 'simule')),
  type_sms TEXT DEFAULT 'versement_otp' CHECK (type_sms IN ('versement_otp', 'reservation_otp', 'notification')),
  reference_id UUID, -- ID du versement ou réservation
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Table `litiges_versement`
```sql
CREATE TABLE litiges_versement (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  versement_id UUID REFERENCES versements(id),
  type_litige TEXT CHECK (type_litige IN ('montant_incorrect', 'otp_non_recu', 'conducteur_absent', 'fraude_suspectee')),
  description TEXT,
  statut TEXT DEFAULT 'ouvert' CHECK (statut IN ('ouvert', 'en_cours', 'resolu', 'ferme')),
  resolution TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);
```

### Table `file_attente_versements`
```sql
CREATE TABLE file_attente_versements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conducteur_id UUID REFERENCES conducteurs(id),
  priorite TEXT DEFAULT 'normal' CHECK (priorite IN ('vip', 'normal', 'retard')),
  temps_arrivee TIMESTAMP DEFAULT NOW(),
  temps_attente_estime INTEGER, -- en minutes
  statut TEXT DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'en_cours', 'termine')),
  position_file INTEGER
);
```

## Interface utilisateur

### Page "Versements" (après Finances)

#### Onglet 1: "À verser" (par défaut)
- **Critères**: Réservations avec `date_code_validation IS NOT NULL` et pas encore versées
- **Affichage**: 
  - Vue kanban : À traiter | En cours | Validés | Terminés
  - Liste des conducteurs avec priorité
  - Pour chaque conducteur: montant total à verser
  - Indicateur d'anomalies (montants suspects)
  - Détail des réservations (collapsible)
  - Bouton "Effectuer le versement"

#### Onglet 2: "En attente de validation"
- **Critères**: Réservations avec `date_code_validation IS NULL`
- **Affichage**: Réservations en attente de validation par code OTP

#### Onglet 3: "Historique des versements"
- **Critères**: Tous les versements effectués
- **Affichage**: Historique avec dates, montants, conducteurs, photos/signatures

#### Onglet 4: "File d'attente"
- **Affichage**: Conducteurs présents physiquement, ordre de passage
- **Notifications**: Alerts quand c'est le tour d'un conducteur

#### Onglet 5: "Dashboard temps réel"
- **Métriques**: Montant total jour, nombre conducteurs présents, taux succès OTP
- **Graphiques**: Evolution des versements, détection d'anomalies

## Workflow détaillé avec OTP et sécurité renforcée

### 1. Arrivée du conducteur
```typescript
async enregistrerArriveConducteur(conducteurId: string, position?: GeolocationPosition) {
  // 1. Enregistrer dans file d'attente
  await this.ajouterFileAttente(conducteurId, position);
  
  // 2. Calculer temps d'attente estimé
  const tempsAttente = await this.calculerTempsAttente();
  
  // 3. Notifier conducteur et admin
  await this.notifierArrivee(conducteurId, tempsAttente);
  
  // 4. Vérifier anomalies potentielles
  await this.detecterAnomalies(conducteurId);
}
```

### 2. Pré-validation des montants
```typescript
async preValiderMontants(conducteurId: string): Promise<ValidationResult> {
  const reservations = await this.getReservationsAVerser(conducteurId);
  
  // Vérifications automatiques
  const anomalies = [];
  
  // Montant anormalement élevé
  if (montantTotal > this.getSeuilAnomalie(conducteurId)) {
    anomalies.push({type: 'montant_eleve', montant: montantTotal});
  }
  
  // Nombre de courses suspect
  if (reservations.length > this.getSeuilCourses()) {
    anomalies.push({type: 'trop_courses', nombre: reservations.length});
  }
  
  return {valid: anomalies.length === 0, anomalies};
}
```

### 3. Initiation du versement avec double validation
```typescript
async initierVersement(conducteurId: string, reservationIds: string[], options: VersementOptions) {
  // 1. Pré-validation
  const validation = await this.preValiderMontants(conducteurId);
  
  // 2. Double validation si gros montant
  if (options.montant > this.SEUIL_DOUBLE_VALIDATION) {
    const adminApproval = await this.demanderApprobationAdmin(conducteurId, options.montant);
    if (!adminApproval) return {success: false, message: 'Approbation admin requise'};
  }
  
  // 3. Générer OTP
  const otpCode = this.genererOTP();
  
  // 4. Créer versement en attente
  const versement = await this.creerVersementEnAttente(conducteurId, options, otpCode);
  
  // 5. Envoyer SMS OTP
  const conducteur = await this.getConducteur(conducteurId);
  const smsResult = await this.smsService.envoyerOTPVersement(
    conducteur.telephone, 
    otpCode, 
    options.montant
  );
  
  // 6. Enregistrer géolocalisation
  if (options.position) {
    await this.enregistrerLocalisationVersement(versement.id, options.position);
  }
  
  return {success: smsResult.success, versementId: versement.id};
}
```

### 4. Validation OTP avec sécurité renforcée
```typescript
async validerVersementAvecOTP(versementId: string, otpCode: string, options: ValidationOptions) {
  const versement = await this.getVersement(versementId);
  
  // Vérifications de sécurité
  if (!versement || versement.statut !== 'otp_envoye') {
    return {success: false, message: 'Versement non trouvé ou déjà traité'};
  }
  
  if (versement.otp_attempts >= this.MAX_ATTEMPTS) {
    await this.bloquerVersement(versementId, 'trop_tentatives');
    return {success: false, message: 'Nombre maximum de tentatives atteint'};
  }
  
  if (versement.otp_code !== otpCode) {
    await this.incrementerTentativesOTP(versementId);
    await this.detecterTentativeFraude(versementId);
    return {success: false, message: 'Code OTP incorrect'};
  }
  
  // Validation réussie
  await this.finaliserVersement(versementId, options);
  
  // Capture signature si requise
  if (options.requireSignature) {
    await this.capturerSignature(versementId, options.signatureData);
  }
  
  // Photo du versement si requise
  if (options.requirePhoto) {
    await this.capturerPhotoVersement(versementId, options.photoData);
  }
  
  // Notifications
  await this.notifierVersementReussi(versement);
  
  return {success: true, message: 'Versement effectué avec succès'};
}
```

## Services complets

### VersementService
```typescript
interface VersementService {
  // Gestion file d'attente
  ajouterFileAttente(conducteurId: string, position?: GeolocationPosition): Promise<void>
  calculerTempsAttente(): Promise<number>
  notifierTourConducteur(conducteurId: string): Promise<void>
  
  // Pré-validation et détection anomalies
  preValiderMontants(conducteurId: string): Promise<ValidationResult>
  detecterAnomalies(conducteurId: string): Promise<Anomalie[]>
  detecterTentativeFraude(versementId: string): Promise<void>
  
  // Workflow versement
  getMontantsAVerser(): Promise<ConducteurVersement[]>
  initierVersement(conducteurId: string, reservationIds: string[], options: VersementOptions): Promise<{success: boolean, versementId: string}>
  validerVersementAvecOTP(versementId: string, otpCode: string, options: ValidationOptions): Promise<{success: boolean, message: string}>
  
  // Gestion OTP
  renvoyerOTP(versementId: string): Promise<boolean>
  genererOTP(): string
  incrementerTentativesOTP(versementId: string): Promise<void>
  
  // Média et preuves
  capturerPhotoVersement(versementId: string, photoData: string): Promise<void>
  capturerSignature(versementId: string, signatureData: string): Promise<void>
  enregistrerLocalisationVersement(versementId: string, position: GeolocationPosition): Promise<void>
  
  // Historique et rapports
  getHistoriqueVersements(): Promise<Versement[]>
  genererRapportJournalier(): Promise<VersementReport>
  getDashboardMetrics(): Promise<VersementDashboard>
  
  // Litiges
  creerLitige(versementId: string, type: string, description: string): Promise<string>
  resoudreLitige(litigeId: string, resolution: string): Promise<void>
  
  // Réservations en attente
  getReservationsEnAttente(): Promise<Reservation[]>
}
```

### SMSService (simulation complète)
```typescript
interface SMSService {
  envoyerOTPVersement(telephone: string, otpCode: string, montant: number): Promise<{success: boolean, message: string}>
  envoyerConfirmationVersement(telephone: string, montant: number, reference: string): Promise<boolean>
  envoyerNotificationArrivee(telephone: string, position: number, tempsAttente: number): Promise<boolean>
  envoyerNotificationTour(telephone: string): Promise<boolean>
  envoyerAlerteAnomalie(telephone: string, type: string, details: string): Promise<boolean>
  envoyerSMS(telephone: string, message: string, type: string, referenceId?: string): Promise<boolean>
}

class SMSServiceImpl implements SMSService {
  async envoyerOTPVersement(telephone: string, otpCode: string, montant: number): Promise<{success: boolean, message: string}> {
    console.log(`📱 SMS OTP SIMULATION`);
    console.log(`📞 Destinataire: ${telephone}`);
    console.log(`💰 Message: "Code versement: ${otpCode}. Montant: ${montant.toLocaleString()} GNF. LokoTaxi"`);
    
    await this.logSMS(telephone, `Code versement: ${otpCode}. Montant: ${montant.toLocaleString()} GNF. LokoTaxi`, 'versement_otp');
    
    // Simuler succès (95% du temps)
    const success = Math.random() > 0.05;
    return {
      success,
      message: success ? 'SMS envoyé avec succès' : 'Échec envoi SMS'
    };
  }
  
  async envoyerConfirmationVersement(telephone: string, montant: number, reference: string): Promise<boolean> {
    const message = `Versement confirmé: ${montant.toLocaleString()} GNF. Réf: ${reference}. Merci! LokoTaxi`;
    console.log(`📱 SMS CONFIRMATION: ${telephone} - ${message}`);
    await this.logSMS(telephone, message, 'confirmation_versement');
    return Math.random() > 0.02; // 98% succès
  }
  
  async envoyerNotificationArrivee(telephone: string, position: number, tempsAttente: number): Promise<boolean> {
    const message = `Position file: ${position}. Attente estimée: ${tempsAttente}min. LokoTaxi`;
    console.log(`📱 SMS ARRIVEE: ${telephone} - ${message}`);
    await this.logSMS(telephone, message, 'notification_arrivee');
    return true;
  }
  
  async envoyerNotificationTour(telephone: string): Promise<boolean> {
    const message = `C'est votre tour! Présentez-vous au guichet versement. LokoTaxi`;
    console.log(`📱 SMS TOUR: ${telephone} - ${message}`);
    await this.logSMS(telephone, message, 'notification_tour');
    return true;
  }
  
  private async logSMS(telephone: string, message: string, type: string, referenceId?: string): Promise<void> {
    // Enregistrer dans sms_logs via Supabase
    console.log(`📊 Log SMS: ${type} -> ${telephone}`);
  }
}
```

## Interfaces TypeScript

```typescript
interface ConducteurVersement {
  conducteur: ConducteurStats;
  montantTotal: number;
  reservations: ReservationVersement[];
  nombreCourses: number;
  priorite: 'vip' | 'normal' | 'retard';
  tempsAttente?: number;
  positionFile?: number;
  anomalies?: Anomalie[];
}

interface Versement {
  id: string;
  conducteur: ConducteurStats;
  montant: number;
  date_versement: string;
  reservation_ids: string[];
  statut: 'en_attente' | 'verse' | 'otp_envoye' | 'bloque' | 'annule';
  otp_code?: string;
  otp_attempts: number;
  localisation_versement?: {lat: number, lng: number};
  adresse_versement?: string;
  photo_versement?: string;
  signature_conducteur?: string;
  commentaire?: string;
}

interface VersementOptions {
  montant: number;
  reservationIds: string[];
  commentaire?: string;
  position?: GeolocationPosition;
  requirePhoto?: boolean;
  requireSignature?: boolean;
}

interface ValidationOptions {
  requireSignature?: boolean;
  requirePhoto?: boolean;
  signatureData?: string;
  photoData?: string;
}

interface Anomalie {
  type: 'montant_eleve' | 'trop_courses' | 'frequence_anormale' | 'localisation_suspecte';
  severity: 'low' | 'medium' | 'high';
  details: string;
  valeur: number | string;
  seuil: number | string;
}

interface VersementDashboard {
  montantTotalJour: number;
  nombreConducteursPresents: number;
  nombreVersementsEnCours: number;
  tempsAttenteMoyen: number;
  tauxSuccesOTP: number;
  nombreAnomaliesDetectees: number;
  montantMoyenParVersement: number;
  tendanceHoraire: {heure: number, montant: number}[];
}
```

## Navigation et intégration

### Ajout dans le menu principal
```typescript
// Dans entreprise-tabs.page.ts
tabs = [
  {
    tab: 'dashboard',
    icon: 'analytics',
    label: 'Dashboard'
  },
  {
    tab: 'reservations', 
    icon: 'car',
    label: 'Réservations'
  },
  {
    tab: 'conducteurs',
    icon: 'people',
    label: 'Conducteurs'
  },
  {
    tab: 'finances',
    icon: 'card',
    label: 'Finances'
  },
  {
    tab: 'versements', // NOUVEAU
    icon: 'wallet',
    label: 'Versements',
    badge: this.versementsPendingCount
  },
  {
    tab: 'profil',
    icon: 'person',
    label: 'Profil'
  }
];
```

### Routes
```typescript
// Dans app.routes.ts
{
  path: 'entreprise',
  loadComponent: () => import('./entreprise/entreprise-tabs/entreprise-tabs.page').then(m => m.EntrepriseTabsPage),
  children: [
    // ... autres routes
    {
      path: 'versements',
      loadComponent: () => import('./entreprise/versements/versements.page').then(m => m.VersementsPage)
    }
  ]
}
```

## Messages SMS types
```typescript
// OTP de versement
`Code versement: ${otpCode}. Montant: ${montant} GNF. LokoTaxi`

// Confirmation de versement
`Versement confirmé: ${montant} GNF. Ref: ${reference}. Merci! LokoTaxi`

// Notification d'arrivée
`Position file: ${position}. Attente estimée: ${tempsAttente}min. LokoTaxi`

// Notification de tour
`C'est votre tour! Présentez-vous au guichet versement. LokoTaxi`
```

## Sécurité et contraintes

### Contraintes OTP
- **Tentatives maximales**: 3 essais
- **Longueur**: 4 chiffres (1000-9999)
- **Unicité**: Un seul OTP actif par versement

### Gestion des erreurs
- Tentatives épuisées → Blocage temporaire (15 minutes)
- Échec SMS → Retry automatique (3 tentatives)

### États du versement
- `en_attente`: Versement créé, pas encore d'OTP
- `otp_envoye`: OTP généré et envoyé, en attente de validation
- `verse`: Versement validé avec succès
- `annule`: Versement annulé

Cette approche avec OTP garantit que seul le conducteur présent physiquement peut valider son versement, renforçant ainsi la sécurité du processus.