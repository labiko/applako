# 🔐 Plan de Développement - Réinitialisation Mot de Passe Conducteurs

## 📋 Vue d'ensemble

Implémenter un système de réinitialisation de mot de passe pour les conducteurs dans l'interface Super Admin, similaire à celui existant pour les entreprises.

## 🎯 Objectifs

1. Permettre au Super Admin de réinitialiser les mots de passe des conducteurs
2. Forcer les conducteurs à créer un nouveau mot de passe après réinitialisation
3. Maintenir la traçabilité et la sécurité du processus

## 📊 Modifications Base de Données

### 1. Ajout de la colonne `first_login` dans la table `conducteurs`

```sql
-- Migration: Ajouter first_login à la table conducteurs
ALTER TABLE conducteurs 
ADD COLUMN first_login BOOLEAN DEFAULT false;

-- Mettre à jour les conducteurs existants
UPDATE conducteurs 
SET first_login = false 
WHERE first_login IS NULL;

-- Rendre la colonne NOT NULL après update
ALTER TABLE conducteurs 
ALTER COLUMN first_login SET NOT NULL;
ALTER TABLE conducteurs 
ALTER COLUMN first_login SET DEFAULT false;
```

### 2. Structure mise à jour de la table `conducteurs`

```typescript
interface Conducteur {
  id: string;
  nom: string;
  prenom: string;
  telephone: string;
  email?: string;
  adresse?: string;
  permis_numero?: string;
  date_naissance?: string;
  vehicule_marque?: string;
  vehicule_modele?: string;
  vehicule_immatriculation?: string;
  vehicule_annee?: number;
  actif: boolean;
  first_login: boolean;        // ← NOUVEAU
  entreprise_id?: string;
  created_at: string;
  updated_at: string;
  password_hash?: string;
  // ... autres champs
}
```

## 🏗️ Architecture Proposée

### 1. **Service Layer** - `conducteur-management.service.ts`

```typescript
// Interfaces pour l'historique
export interface PasswordResetHistory {
  id: string;
  entity_type: 'conducteur' | 'entreprise';
  entity_id: string;
  entreprise_id?: string; // NULL pour conducteurs indépendants ou réinitialisations d'entreprises
  reset_by: string;
  reset_at: string;
  ip_address?: string;
  user_agent?: string;
  reset_reason?: string;
}

export interface PasswordResetStats {
  total_resets: number;
  resets_by_entreprise: Map<string, number>;
  independent_conductor_resets: number;
  entreprise_conductor_resets: number;
  recent_resets: PasswordResetHistory[];
}

// Ajouter dans le service existant ou créer un nouveau service
export class ConducteurManagementService {
  
  // Méthode de réinitialisation avec historique
  async resetConducteurPassword(conducteurId: string, resetReason?: string): Promise<{ success: boolean, error?: any }> {
    try {
      console.log('🔒 Réinitialisation mot de passe conducteur:', conducteurId);

      // Récupérer les infos du conducteur (notamment l'entreprise_id)
      const { data: conducteur, error: fetchError } = await this.supabase.client
        .from('conducteurs')
        .select('id, nom, prenom, entreprise_id, telephone')
        .eq('id', conducteurId)
        .single();

      if (fetchError || !conducteur) {
        throw new Error('Conducteur non trouvé');
      }

      // Réinitialiser le mot de passe
      const { error: updateError } = await this.supabase.client
        .from('conducteurs')
        .update({
          password_hash: null,
          first_login: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', conducteurId);

      if (updateError) {
        throw updateError;
      }

      // Enregistrer dans l'historique
      const { error: historyError } = await this.supabase.client
        .from('password_reset_history')
        .insert({
          entity_type: 'conducteur',
          entity_id: conducteurId,
          entreprise_id: conducteur.entreprise_id, // NULL si conducteur indépendant
          reset_by: this.getCurrentAdminId(), // À implémenter selon votre système d'auth
          reset_reason: resetReason || 'Réinitialisation manuelle par Super Admin',
          ip_address: this.getClientIP(), // À implémenter
          user_agent: navigator.userAgent
        });

      if (historyError) {
        console.error('⚠️ Erreur enregistrement historique:', historyError);
        // On ne bloque pas la réinitialisation si l'historique échoue
      }

      console.log('✅ Mot de passe conducteur réinitialisé avec succès');
      
      // Optionnel : Envoyer une notification
      await this.notifyPasswordReset(conducteur);
      
      return { success: true, conducteur };

    } catch (error) {
      console.error('❌ Erreur réinitialisation mot de passe conducteur:', error);
      return { success: false, error };
    }
  }
  
  // Méthode pour récupérer les conducteurs avec leur statut de connexion
  async getConducteursWithPasswordStatus(): Promise<any[]> {
    const { data, error } = await this.supabase.client
      .from('conducteurs')
      .select(`
        *,
        entreprise:entreprises(nom)
      `)
      .order('created_at', { ascending: false });
      
    return data || [];
  }

  // Récupérer l'historique des réinitialisations
  async getPasswordResetHistory(filters?: {
    entrepriseId?: string;
    entityType?: 'conducteur' | 'entreprise';
    startDate?: string;
    endDate?: string;
  }): Promise<PasswordResetHistory[]> {
    let query = this.supabase.client
      .from('v_password_reset_history')
      .select('*')
      .order('reset_at', { ascending: false });

    if (filters?.entrepriseId) {
      query = query.eq('entreprise_id', filters.entrepriseId);
    }
    
    if (filters?.entityType) {
      query = query.eq('entity_type', filters.entityType);
    }
    
    if (filters?.startDate) {
      query = query.gte('reset_at', filters.startDate);
    }
    
    if (filters?.endDate) {
      query = query.lte('reset_at', filters.endDate);
    }

    const { data, error } = await query.limit(100);
    
    if (error) {
      console.error('Erreur récupération historique:', error);
      return [];
    }
    
    return data || [];
  }

  // Statistiques par entreprise
  async getResetStatsByEntreprise(entrepriseId: string): Promise<{
    total_resets: number;
    conducteurs_affected: number;
    last_reset: string | null;
    conducteurs_with_first_login: number;
  }> {
    // Historique des réinitialisations pour cette entreprise
    const { data: history } = await this.supabase.client
      .from('password_reset_history')
      .select('*')
      .eq('entreprise_id', entrepriseId)
      .eq('entity_type', 'conducteur');

    // Conducteurs actuels nécessitant attention
    const { data: conducteurs } = await this.supabase.client
      .from('conducteurs')
      .select('id, first_login, password_hash')
      .eq('entreprise_id', entrepriseId);

    return {
      total_resets: history?.length || 0,
      conducteurs_affected: new Set(history?.map(h => h.entity_id)).size,
      last_reset: history?.[0]?.reset_at || null,
      conducteurs_with_first_login: conducteurs?.filter(c => c.first_login).length || 0
    };
  }
}
```

### 2. **Component** - Mise à jour de `conducteurs-management.page.ts`

```typescript
export class ConducteursManagementPage implements OnInit {
  
  // === MÉTHODES DE RÉINITIALISATION ===
  
  // Réinitialisation depuis le bouton global
  async onResetPasswordConducteur() {
    // Vérifier qu'il y a des conducteurs
    if (this.conducteurs.length === 0) {
      this.showError('Aucun conducteur disponible pour réinitialisation');
      return;
    }

    // Créer liste des conducteurs pour sélection
    const inputs = this.conducteurs.map(c => ({
      name: 'conducteur',
      type: 'radio' as const,
      label: `${c.nom} ${c.prenom}
📱 ${c.telephone}
${c.email ? '📧 ' + c.email : ''}
${c.entreprise?.nom ? '🏢 ' + c.entreprise.nom : '👤 Indépendant'}
${c.password_hash ? '🔒 Mot de passe défini' : '⚠️ Aucun mot de passe'}`,
      value: c.id,
      checked: false
    }));

    const alert = await this.alertController.create({
      header: '🔐 Réinitialisation Mot de Passe Conducteur',
      subHeader: 'Sélectionnez le conducteur à réinitialiser',
      message: `Cette action va:
• Supprimer le mot de passe actuel
• Forcer une nouvelle connexion
• Le conducteur devra créer un nouveau mot de passe`,
      inputs: inputs,
      cssClass: 'custom-alert-large',
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel',
          cssClass: 'secondary'
        },
        {
          text: '🔄 Réinitialiser',
          handler: async (conducteurId) => {
            if (conducteurId) {
              const conducteur = this.conducteurs.find(c => c.id === conducteurId);
              if (conducteur) {
                await this.confirmResetPasswordConducteur(conducteur);
                return true;
              }
              return false;
            } else {
              this.showError('Veuillez sélectionner un conducteur');
              return false;
            }
          }
        }
      ]
    });

    await alert.present();
  }

  // Confirmation de réinitialisation
  private async confirmResetPasswordConducteur(conducteur: any) {
    const confirmAlert = await this.alertController.create({
      header: 'Confirmation Réinitialisation',
      subHeader: `${conducteur.nom} ${conducteur.prenom}`,
      message: `📱 Téléphone: ${conducteur.telephone}
${conducteur.email ? '📧 Email: ' + conducteur.email : ''}
${conducteur.entreprise?.nom ? '🏢 Entreprise: ' + conducteur.entreprise.nom : '👤 Indépendant'}

Statut: ${conducteur.password_hash ? '🔒 Mot de passe défini' : '⚠️ Aucun mot de passe'}

Cette action va:
• Supprimer le mot de passe actuel
• Marquer le compte comme "première connexion"
• Le conducteur devra créer un nouveau mot de passe à sa prochaine connexion`,
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel',
          cssClass: 'secondary'
        },
        {
          text: '✅ Confirmer la Réinitialisation',
          cssClass: 'danger',
          handler: async () => {
            await this.resetPasswordForConducteur(conducteur.id);
          }
        }
      ]
    });

    await confirmAlert.present();
  }

  // Réinitialisation spécifique depuis la carte
  async onResetPasswordSpecificConducteur(conducteur: any) {
    await this.confirmResetPasswordConducteur(conducteur);
  }

  // Exécution de la réinitialisation
  private async resetPasswordForConducteur(conducteurId: string) {
    const loading = await this.loadingController.create({
      message: 'Réinitialisation...'
    });
    await loading.present();

    try {
      const { success, error } = await this.conducteurService.resetConducteurPassword(conducteurId);

      if (!success) {
        throw error;
      }

      this.showSuccess('Mot de passe conducteur réinitialisé avec succès');
      await this.loadConducteurs(); // Recharger la liste

    } catch (error: any) {
      console.error('❌ Erreur reset password conducteur:', error);
      this.showError('Erreur lors de la réinitialisation du mot de passe');
    } finally {
      await loading.dismiss();
    }
  }
}
```

### 3. **Template UI** - Mise à jour de l'interface

#### A. Bouton dans la barre d'actions
```html
<!-- Dans la barre d'actions principale -->
<ion-col size="12" size-md="4">
  <ion-button 
    expand="block" 
    fill="outline"
    color="warning"
    (click)="onResetPasswordConducteur()">
    <ion-icon name="key-outline" slot="start"></ion-icon>
    Réinitialiser Mot de Passe
  </ion-button>
</ion-col>
```

#### B. Bouton sur chaque carte conducteur
```html
<!-- Dans la carte de chaque conducteur -->
<ion-button 
  size="small" 
  fill="clear" 
  color="warning"
  (click)="onResetPasswordSpecificConducteur(conducteur)"
  [title]="'Réinitialiser le mot de passe'">
  <ion-icon name="key-outline" slot="icon-only"></ion-icon>
</ion-button>
```

#### C. Indicateur visuel du statut
```html
<!-- Badge pour indiquer le statut du mot de passe -->
<ion-badge 
  *ngIf="!conducteur.password_hash" 
  color="warning" 
  class="password-status">
  <ion-icon name="warning"></ion-icon>
  Aucun mot de passe
</ion-badge>

<ion-badge 
  *ngIf="conducteur.first_login" 
  color="danger" 
  class="first-login-badge">
  <ion-icon name="alert-circle"></ion-icon>
  Première connexion
</ion-badge>
```

## 🔄 Workflow Côté Conducteur (Login)

### 1. Modification du `auth.service.ts`

```typescript
async loginConducteur(telephone: string, password: string) {
  try {
    // Récupérer le conducteur
    const { data: conducteur, error } = await this.supabase.client
      .from('conducteurs')
      .select('*')
      .eq('telephone', telephone)
      .single();

    if (error || !conducteur) {
      throw new Error('Conducteur non trouvé');
    }

    // Vérifier si c'est une première connexion
    if (conducteur.first_login) {
      return {
        success: false,
        requirePasswordReset: true,
        conducteurId: conducteur.id,
        message: 'Veuillez créer un nouveau mot de passe'
      };
    }

    // Vérifier le mot de passe
    if (!conducteur.password_hash) {
      return {
        success: false,
        requirePasswordReset: true,
        conducteurId: conducteur.id,
        message: 'Aucun mot de passe défini. Veuillez en créer un.'
      };
    }

    // Vérification normale du mot de passe
    const passwordValid = await bcrypt.compare(password, conducteur.password_hash);
    
    if (!passwordValid) {
      throw new Error('Mot de passe incorrect');
    }

    // Connexion réussie
    return {
      success: true,
      conducteur: conducteur
    };

  } catch (error) {
    console.error('Erreur login conducteur:', error);
    return { success: false, error };
  }
}
```

### 2. Page de création de nouveau mot de passe

```typescript
// reset-password.page.ts
export class ResetPasswordPage {
  newPassword: string = '';
  confirmPassword: string = '';
  conducteurId: string;

  async createNewPassword() {
    // Validation
    if (this.newPassword !== this.confirmPassword) {
      this.showError('Les mots de passe ne correspondent pas');
      return;
    }

    if (this.newPassword.length < 8) {
      this.showError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    try {
      // Hash du nouveau mot de passe
      const hashedPassword = await bcrypt.hash(this.newPassword, 10);

      // Mise à jour en base
      const { error } = await this.supabase.client
        .from('conducteurs')
        .update({
          password_hash: hashedPassword,
          first_login: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', this.conducteurId);

      if (error) throw error;

      this.showSuccess('Mot de passe créé avec succès');
      // Rediriger vers la page de connexion
      this.router.navigate(['/login']);

    } catch (error) {
      console.error('Erreur création mot de passe:', error);
      this.showError('Erreur lors de la création du mot de passe');
    }
  }
}
```

## 📊 Tableau de Bord - Statistiques & Requêtes

### Requêtes d'Analyse avec Entreprise

```sql
-- 1. Historique des réinitialisations par entreprise
SELECT 
  e.nom as entreprise,
  COUNT(DISTINCT prh.entity_id) as nb_conducteurs_reinitialises,
  COUNT(*) as total_reinitialisations,
  MAX(prh.reset_at) as derniere_reinitialisation
FROM password_reset_history prh
LEFT JOIN entreprises e ON prh.entreprise_id = e.id
WHERE prh.entity_type = 'conducteur'
GROUP BY e.id, e.nom
ORDER BY total_reinitialisations DESC;

-- 2. Conducteurs nécessitant une réinitialisation par entreprise
SELECT 
  e.nom as entreprise,
  COUNT(CASE WHEN c.password_hash IS NULL THEN 1 END) as sans_mot_de_passe,
  COUNT(CASE WHEN c.first_login = true THEN 1 END) as premiere_connexion,
  COUNT(*) as total_conducteurs
FROM conducteurs c
LEFT JOIN entreprises e ON c.entreprise_id = e.id
GROUP BY e.id, e.nom
HAVING COUNT(CASE WHEN c.password_hash IS NULL OR c.first_login = true THEN 1 END) > 0
ORDER BY sans_mot_de_passe DESC;

-- 3. Timeline des réinitialisations (conducteurs vs entreprises)
SELECT 
  DATE(reset_at) as date_reset,
  entity_type,
  COUNT(*) as nombre,
  COUNT(DISTINCT entreprise_id) as nb_entreprises_impactees
FROM password_reset_history
WHERE reset_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(reset_at), entity_type
ORDER BY date_reset DESC;

-- 4. Conducteurs indépendants vs entreprise pour les réinitialisations
SELECT 
  CASE 
    WHEN entreprise_id IS NULL THEN 'Indépendants'
    ELSE 'Entreprise'
  END as type_conducteur,
  COUNT(*) as nb_reinitialisations,
  COUNT(DISTINCT entity_id) as nb_conducteurs_uniques
FROM password_reset_history
WHERE entity_type = 'conducteur'
GROUP BY CASE WHEN entreprise_id IS NULL THEN 'Indépendants' ELSE 'Entreprise' END;
```

### Ajouter des métriques de sécurité

```typescript
interface SecurityStats {
  total_conducteurs: number;
  conducteurs_sans_password: number;
  conducteurs_first_login: number;
  reinitialisations_ce_mois: number;
  derniere_reinitialisation: string;
}

// Requête pour obtenir les stats
async getSecurityStats() {
  const { data: stats } = await this.supabase.client
    .from('conducteurs')
    .select('password_hash, first_login, updated_at')
    .then(result => {
      const data = result.data || [];
      return {
        data: {
          total_conducteurs: data.length,
          conducteurs_sans_password: data.filter(c => !c.password_hash).length,
          conducteurs_first_login: data.filter(c => c.first_login).length,
          // ... autres calculs
        }
      };
    });
    
  return stats;
}
```

## 🔒 Sécurité & Bonnes Pratiques

### 1. **Validation des Mots de Passe**
```typescript
// Critères de validation
const passwordRequirements = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialChar: false
};

function validatePassword(password: string): { valid: boolean, errors: string[] } {
  const errors = [];
  
  if (password.length < passwordRequirements.minLength) {
    errors.push(`Minimum ${passwordRequirements.minLength} caractères`);
  }
  
  if (passwordRequirements.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Au moins une majuscule');
  }
  
  if (passwordRequirements.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Au moins une minuscule');
  }
  
  if (passwordRequirements.requireNumber && !/[0-9]/.test(password)) {
    errors.push('Au moins un chiffre');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
```

### 2. **Historique des Réinitialisations**
```sql
-- Table d'audit pour tracer les réinitialisations
CREATE TABLE password_reset_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  entity_type VARCHAR(20) NOT NULL, -- 'conducteur' ou 'entreprise'
  entity_id UUID NOT NULL, -- ID du conducteur ou de l'entreprise
  entreprise_id UUID, -- ID de l'entreprise (NULL si indépendant ou si entity_type='entreprise')
  reset_by UUID NOT NULL, -- ID du super admin
  reset_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  reset_reason TEXT, -- Raison optionnelle de la réinitialisation
  
  -- Index pour les recherches
  INDEX idx_entity_type_id ON password_reset_history(entity_type, entity_id),
  INDEX idx_entreprise_id ON password_reset_history(entreprise_id),
  INDEX idx_reset_at ON password_reset_history(reset_at DESC)
);

-- Vue pour faciliter les requêtes avec jointures
CREATE VIEW v_password_reset_history AS
SELECT 
  prh.*,
  CASE 
    WHEN prh.entity_type = 'conducteur' THEN c.nom || ' ' || c.prenom
    WHEN prh.entity_type = 'entreprise' THEN e.nom
  END as entity_name,
  CASE 
    WHEN prh.entity_type = 'conducteur' THEN c.telephone
    WHEN prh.entity_type = 'entreprise' THEN e.telephone
  END as entity_phone,
  e_linked.nom as entreprise_name
FROM password_reset_history prh
LEFT JOIN conducteurs c ON prh.entity_type = 'conducteur' AND prh.entity_id = c.id
LEFT JOIN entreprises e ON prh.entity_type = 'entreprise' AND prh.entity_id = e.id
LEFT JOIN entreprises e_linked ON prh.entreprise_id = e_linked.id;
```

### 3. **Notifications**
```typescript
// Envoyer une notification au conducteur
async notifyPasswordReset(conducteur: any) {
  // Par SMS
  if (conducteur.telephone) {
    await this.smsService.send({
      to: conducteur.telephone,
      message: `Votre mot de passe Lako Taxi a été réinitialisé. 
      Veuillez créer un nouveau mot de passe lors de votre prochaine connexion.`
    });
  }
  
  // Par Email (si disponible)
  if (conducteur.email) {
    await this.emailService.send({
      to: conducteur.email,
      subject: 'Réinitialisation de votre mot de passe Lako Taxi',
      template: 'password-reset',
      data: { name: `${conducteur.nom} ${conducteur.prenom}` }
    });
  }
}
```

## 📋 Checklist d'Implémentation

### Phase 1: Base de Données
- [ ] Ajouter colonne `first_login` dans table `conducteurs`
- [ ] Migrer les données existantes
- [ ] Créer table d'audit `password_reset_history`

### Phase 2: Backend/Service
- [ ] Créer/Mettre à jour `ConducteurManagementService`
- [ ] Implémenter méthode `resetConducteurPassword()`
- [ ] Ajouter méthode de récupération avec statut password

### Phase 3: Super Admin UI
- [ ] Ajouter bouton global de réinitialisation
- [ ] Ajouter bouton spécifique sur chaque carte
- [ ] Implémenter les alertes de confirmation
- [ ] Ajouter indicateurs visuels (badges)

### Phase 4: Conducteur Login
- [ ] Modifier `auth.service.ts` pour détecter `first_login`
- [ ] Créer page de création de nouveau mot de passe
- [ ] Implémenter validation du mot de passe
- [ ] Gérer la redirection après création

### Phase 5: Fonctionnalités Avancées
- [ ] Implémenter l'historique des réinitialisations
- [ ] Ajouter les notifications SMS/Email
- [ ] Créer dashboard de statistiques de sécurité
- [ ] Ajouter logs d'audit

### Phase 6: Tests
- [ ] Tester réinitialisation depuis Super Admin
- [ ] Tester création nouveau mot de passe côté conducteur
- [ ] Vérifier les cas d'erreur
- [ ] Valider les notifications

## 🎯 Résultat Attendu

### Pour le Super Admin
- Interface claire pour réinitialiser les mots de passe
- Double confirmation pour éviter les erreurs
- Feedback visuel du statut de chaque conducteur
- Historique et statistiques

### Pour le Conducteur
- Détection automatique de la réinitialisation
- Interface simple pour créer un nouveau mot de passe
- Validation robuste du nouveau mot de passe
- Notification de la réinitialisation

## 📈 Métriques de Succès

1. **Temps de réinitialisation** < 30 secondes
2. **Taux de succès** > 95%
3. **Temps moyen de création nouveau mot de passe** < 2 minutes
4. **Réduction des tickets support** liés aux mots de passe de 50%

## 🚀 Priorités

1. **P0 - Critique** : Fonctionnalité de base (reset + first_login)
2. **P1 - Important** : Notifications et validation robuste
3. **P2 - Nice to have** : Historique et statistiques
4. **P3 - Future** : Intégration avec système de tokens temporaires