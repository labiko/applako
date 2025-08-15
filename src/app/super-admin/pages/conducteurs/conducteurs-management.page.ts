import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent, IonHeader, IonTitle, IonToolbar, IonCard, IonCardHeader,
  IonCardTitle, IonCardContent, IonButton, IonIcon, IonGrid, IonRow,
  IonCol, IonItem, IonLabel, IonBadge, IonSearchbar, IonList,
  IonRefresher, IonRefresherContent, IonSpinner, IonChip,
  IonButtons, IonBackButton, IonSegment, IonSegmentButton,
  AlertController, LoadingController, ToastController, ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  businessOutline, statsChartOutline, addOutline, keyOutline,
  refreshOutline, arrowBackOutline, personOutline, callOutline,
  mailOutline, carOutline, checkmarkCircleOutline, closeCircleOutline,
  alertCircleOutline, warningOutline, lockClosedOutline, lockOpenOutline,
  searchOutline, filterOutline, downloadOutline, peopleOutline,
  shieldCheckmarkOutline, businessSharp, personCircleOutline
} from 'ionicons/icons';

import { ConducteurManagementService, Conducteur, PasswordResetStats } from '../../services/conducteur-management.service';

@Component({
  selector: 'app-conducteurs-management',
  template: `
<ion-header>
  <ion-toolbar color="primary">
    <ion-button 
      slot="start" 
      fill="clear" 
      (click)="goBack()"
      color="light">
      <ion-icon name="arrow-back-outline" slot="icon-only"></ion-icon>
    </ion-button>
    <ion-title>
      <ion-icon name="people-outline"></ion-icon>
      Gestion des Conducteurs
    </ion-title>
    <ion-button 
      slot="end" 
      fill="clear" 
      (click)="onRefresh()"
      color="light">
      <ion-icon name="refresh-outline" slot="icon-only"></ion-icon>
    </ion-button>
  </ion-toolbar>
</ion-header>

<ion-content>
  <ion-refresher slot="fixed" (ionRefresh)="onRefresh($event)">
    <ion-refresher-content></ion-refresher-content>
  </ion-refresher>

  <div class="page-container">
    
    <!-- Statistiques -->
    <ion-card class="stats-card">
      <ion-card-header>
        <ion-card-title>
          <ion-icon name="stats-chart-outline"></ion-icon>
          Statistiques Conducteurs
        </ion-card-title>
      </ion-card-header>
      <ion-card-content>
        <ion-grid>
          <ion-row>
            <ion-col size="6" size-md="2">
              <div class="stat-item">
                <div class="stat-number">{{ stats.total }}</div>
                <div class="stat-label">Total</div>
              </div>
            </ion-col>
            <ion-col size="6" size-md="2">
              <div class="stat-item">
                <div class="stat-number success">{{ stats.actifs }}</div>
                <div class="stat-label">Actifs</div>
              </div>
            </ion-col>
            <ion-col size="6" size-md="2">
              <div class="stat-item">
                <div class="stat-number warning">{{ stats.inactifs }}</div>
                <div class="stat-label">Inactifs</div>
              </div>
            </ion-col>
            <ion-col size="6" size-md="2">
              <div class="stat-item">
                <div class="stat-number danger">{{ stats.sansPassword }}</div>
                <div class="stat-label">Sans MDP</div>
              </div>
            </ion-col>
            <ion-col size="6" size-md="2">
              <div class="stat-item">
                <div class="stat-number warning">{{ stats.firstLogin }}</div>
                <div class="stat-label">1ère connexion</div>
              </div>
            </ion-col>
            <ion-col size="6" size-md="2">
              <div class="stat-item">
                <div class="stat-number primary">{{ stats.independants }}</div>
                <div class="stat-label">Indépendants</div>
              </div>
            </ion-col>
          </ion-row>
        </ion-grid>
      </ion-card-content>
    </ion-card>

    <!-- Actions rapides -->
    <ion-card class="actions-card">
      <ion-card-content>
        <ion-grid>
          <ion-row>
            <ion-col size="12" size-md="3">
              <ion-button 
                expand="block" 
                fill="solid"
                color="primary"
                (click)="onCreateConducteur()">
                <ion-icon name="add-outline" slot="start"></ion-icon>
                Nouveau Conducteur
              </ion-button>
            </ion-col>
            <ion-col size="12" size-md="3">
              <ion-button 
                expand="block" 
                fill="outline"
                color="success"
                (click)="onViewHistory()">
                <ion-icon name="shield-checkmark-outline" slot="start"></ion-icon>
                Historique Réinitialisations
              </ion-button>
            </ion-col>
            <ion-col size="12" size-md="3">
              <ion-button 
                expand="block" 
                fill="outline"
                color="medium"
                (click)="onExportData()">
                <ion-icon name="download-outline" slot="start"></ion-icon>
                Export Données
              </ion-button>
            </ion-col>
          </ion-row>
        </ion-grid>
      </ion-card-content>
    </ion-card>

    <!-- Barre de recherche et filtres -->
    <ion-card class="search-card">
      <ion-card-content>
        <ion-searchbar 
          [(ngModel)]="searchTerm"
          (ionInput)="onSearch($event)"
          placeholder="Rechercher par nom, téléphone, email..."
          [debounce]="300">
        </ion-searchbar>
        
        <!-- Segments de filtre -->
        <ion-segment [(ngModel)]="filterSegment" (ionChange)="onFilterChange()">
          <ion-segment-button value="all">
            <ion-label>Tous ({{ conducteurs.length }})</ion-label>
          </ion-segment-button>
          <ion-segment-button value="actifs">
            <ion-label>Actifs ({{ stats.actifs }})</ion-label>
          </ion-segment-button>
          <ion-segment-button value="sans-password">
            <ion-label>Sans MDP ({{ stats.sansPassword }})</ion-label>
          </ion-segment-button>
          <ion-segment-button value="first-login">
            <ion-label>1ère connexion ({{ stats.firstLogin }})</ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-card-content>
    </ion-card>

    <!-- Liste des conducteurs -->
    <div class="conducteurs-list">
      <div *ngIf="isLoading" class="loading-container">
        <ion-spinner name="circular"></ion-spinner>
        <p>Chargement des conducteurs...</p>
      </div>

      <div *ngIf="!isLoading && filteredConducteurs.length === 0" class="empty-state">
        <ion-icon name="people-outline"></ion-icon>
        <h3>Aucun conducteur trouvé</h3>
        <p>{{ searchTerm ? 'Aucun résultat pour votre recherche' : 'Aucun conducteur enregistré' }}</p>
      </div>

      <ion-grid *ngIf="!isLoading && filteredConducteurs.length > 0">
        <ion-row>
          <ion-col size="12" size-md="6" size-lg="4" *ngFor="let conducteur of filteredConducteurs">
            <ion-card class="conducteur-card" [class.inactive]="!conducteur.actif">
              <ion-card-header>
                <ion-card-title>
                  <div class="conducteur-header">
                    <div class="conducteur-info">
                      <ion-icon name="person-circle-outline" class="conducteur-avatar"></ion-icon>
                      <div>
                        <h3>{{ conducteur.nom }} {{ conducteur.prenom }}</h3>
                        <p class="conducteur-id">ID: {{ conducteur.id.substring(0, 8) }}</p>
                      </div>
                    </div>
                    <div class="conducteur-badges">
                      <ion-badge [color]="conducteur.actif ? 'success' : 'danger'">
                        {{ conducteur.actif ? 'Actif' : 'Inactif' }}
                      </ion-badge>
                      <ion-badge *ngIf="!conducteur.password" color="warning">
                        <ion-icon name="warning"></ion-icon>
                        Sans MDP
                      </ion-badge>
                      <ion-badge *ngIf="conducteur.first_login" color="danger">
                        <ion-icon name="alert-circle"></ion-icon>
                        1ère connexion
                      </ion-badge>
                    </div>
                  </div>
                </ion-card-title>
              </ion-card-header>

              <ion-card-content>
                <ion-list lines="none">
                  <ion-item>
                    <ion-icon name="call-outline" slot="start"></ion-icon>
                    <ion-label>{{ conducteur.telephone }}</ion-label>
                  </ion-item>
                  
                  
                  <ion-item *ngIf="conducteur.entreprise">
                    <ion-icon name="business-outline" slot="start"></ion-icon>
                    <ion-label>
                      <h3>Entreprise</h3>
                      <p>{{ conducteur.entreprise.nom }}</p>
                    </ion-label>
                  </ion-item>
                  
                  <ion-item *ngIf="!conducteur.entreprise">
                    <ion-icon name="person-outline" slot="start"></ion-icon>
                    <ion-label>
                      <h3>Statut</h3>
                      <p>Conducteur indépendant</p>
                    </ion-label>
                  </ion-item>

                  <ion-item *ngIf="conducteur.vehicule_immatriculation">
                    <ion-icon name="car-outline" slot="start"></ion-icon>
                    <ion-label>
                      <h3>Véhicule</h3>
                      <p>{{ conducteur.vehicule_marque }} {{ conducteur.vehicule_modele }}</p>
                      <p>{{ conducteur.vehicule_immatriculation }}</p>
                    </ion-label>
                  </ion-item>
                </ion-list>

                <!-- Actions -->
                <div class="conducteur-actions">
                  <ion-button 
                    size="small" 
                    fill="clear" 
                    color="primary"
                    (click)="onViewDetails(conducteur)">
                    <ion-icon name="eye-outline" slot="icon-only"></ion-icon>
                  </ion-button>
                  
                  <ion-button 
                    size="small" 
                    fill="clear" 
                    color="warning"
                    (click)="onResetPasswordSpecificConducteur(conducteur)"
                    [title]="'Réinitialiser le mot de passe'">
                    <ion-icon name="key-outline" slot="icon-only"></ion-icon>
                  </ion-button>
                  
                  <ion-button 
                    *ngIf="conducteur.actif"
                    size="small" 
                    fill="clear" 
                    color="danger"
                    (click)="onToggleStatus(conducteur)">
                    <ion-icon name="lock-closed-outline" slot="icon-only"></ion-icon>
                  </ion-button>
                  
                  <ion-button 
                    *ngIf="!conducteur.actif"
                    size="small" 
                    fill="clear" 
                    color="success"
                    (click)="onToggleStatus(conducteur)">
                    <ion-icon name="lock-open-outline" slot="icon-only"></ion-icon>
                  </ion-button>
                </div>
              </ion-card-content>
            </ion-card>
          </ion-col>
        </ion-row>
      </ion-grid>
    </div>
  </div>
</ion-content>
  `,
  styleUrls: ['./conducteurs-management.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonContent, IonHeader, IonTitle, IonToolbar, IonCard, IonCardHeader,
    IonCardTitle, IonCardContent, IonButton, IonIcon, IonGrid, IonRow,
    IonCol, IonItem, IonLabel, IonBadge, IonSearchbar, IonList,
    IonRefresher, IonRefresherContent, IonSpinner, IonChip,
    IonButtons, IonBackButton, IonSegment, IonSegmentButton
  ]
})
export class ConducteursManagementPage implements OnInit {
  
  conducteurs: Conducteur[] = [];
  filteredConducteurs: Conducteur[] = [];
  isLoading = true;
  searchTerm = '';
  filterSegment = 'all';
  
  stats = {
    total: 0,
    actifs: 0,
    inactifs: 0,
    sansPassword: 0,
    firstLogin: 0,
    independants: 0,
    entreprises: 0
  };

  passwordResetStats: PasswordResetStats | null = null;

  constructor(
    private router: Router,
    private conducteurService: ConducteurManagementService,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private modalController: ModalController
  ) {
    addIcons({
      businessOutline, statsChartOutline, addOutline, keyOutline,
      refreshOutline, arrowBackOutline, personOutline, callOutline,
      mailOutline, carOutline, checkmarkCircleOutline, closeCircleOutline,
      alertCircleOutline, warningOutline, lockClosedOutline, lockOpenOutline,
      searchOutline, filterOutline, downloadOutline, peopleOutline,
      shieldCheckmarkOutline, businessSharp, personCircleOutline
    });
  }

  async ngOnInit() {
    await this.loadConducteurs();
    await this.loadResetStats();
  }

  async loadConducteurs() {
    this.isLoading = true;
    try {
      console.log('🔄 Chargement des conducteurs...');
      this.conducteurs = await this.conducteurService.getConducteursWithPasswordStatus();
      console.log(`✅ ${this.conducteurs.length} conducteurs chargés`);
      
      this.calculateStats();
      this.applyFilter(); // Applique les filtres actuels aux nouvelles données
      
    } catch (error) {
      console.error('❌ Erreur chargement conducteurs:', error);
      this.showError('Erreur lors du chargement des conducteurs');
      // En cas d'erreur, initialiser avec un tableau vide
      this.conducteurs = [];
      this.filteredConducteurs = [];
    } finally {
      this.isLoading = false;
    }
  }

  async loadResetStats() {
    try {
      this.passwordResetStats = await this.conducteurService.getPasswordResetStats();
    } catch (error) {
      console.error('Erreur chargement stats réinitialisation:', error);
    }
  }

  calculateStats() {
    this.stats = {
      total: this.conducteurs.length,
      actifs: this.conducteurs.filter(c => c.actif).length,
      inactifs: this.conducteurs.filter(c => !c.actif).length,
      sansPassword: this.conducteurs.filter(c => !c.password).length,
      firstLogin: this.conducteurs.filter(c => c.first_login).length,
      independants: this.conducteurs.filter(c => !c.entreprise_id).length,
      entreprises: this.conducteurs.filter(c => c.entreprise_id).length
    };
  }

  applyFilter() {
    try {
      let filtered = [...this.conducteurs];

      // Appliquer le filtre par segment
      switch (this.filterSegment) {
        case 'actifs':
          filtered = filtered.filter(c => c && c.actif === true);
          break;
        case 'sans-password':
          filtered = filtered.filter(c => c && (!c.password || c.password === null || c.password === ''));
          break;
        case 'first-login':
          filtered = filtered.filter(c => c && c.first_login === true);
          break;
        default:
          // 'all' - pas de filtre supplémentaire
          break;
      }

      // Appliquer la recherche
      if (this.searchTerm && this.searchTerm.trim()) {
        const term = this.searchTerm.toLowerCase().trim();
        filtered = filtered.filter(c => {
          if (!c) return false;
          
          const nom = (c.nom || '').toLowerCase();
          const prenom = (c.prenom || '').toLowerCase();
          const telephone = (c.telephone || '').toString();
          const entrepriseNom = (c.entreprise?.nom || '').toLowerCase();
          
          return nom.includes(term) ||
                 prenom.includes(term) ||
                 telephone.includes(term) ||
                 entrepriseNom.includes(term);
        });
      }

      this.filteredConducteurs = filtered;
      console.log(`🔍 Filtres appliqués - Segment: ${this.filterSegment}, Recherche: "${this.searchTerm}", Résultats: ${filtered.length}/${this.conducteurs.length}`);
      
    } catch (error) {
      console.error('❌ Erreur lors de l\'application des filtres:', error);
      this.filteredConducteurs = [...this.conducteurs]; // Fallback sur tous les conducteurs
    }
  }

  onSearch(event: any) {
    try {
      this.searchTerm = event?.detail?.value || '';
      console.log(`🔎 Recherche: "${this.searchTerm}"`);
      this.applyFilter();
    } catch (error) {
      console.error('❌ Erreur lors de la recherche:', error);
    }
  }

  onFilterChange() {
    try {
      console.log(`📊 Changement de filtre: ${this.filterSegment}`);
      this.applyFilter();
    } catch (error) {
      console.error('❌ Erreur lors du changement de filtre:', error);
    }
  }

  async onRefresh(event?: any) {
    await this.loadConducteurs();
    await this.loadResetStats();
    if (event) {
      event.target.complete();
    }
  }

  // === RÉINITIALISATION MOT DE PASSE ===
  
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
${c.telephone}
${c.entreprise?.nom || 'Indépendant'}
${c.password ? 'Mot de passe défini' : 'Aucun mot de passe'}`,
      value: c.id,
      checked: false
    }));

    const alert = await this.alertController.create({
      header: 'Réinitialisation Mot de Passe',
      subHeader: 'Sélectionnez le conducteur',
      message: `Cette action va supprimer le mot de passe actuel et forcer une nouvelle connexion`,
      inputs: inputs,
      cssClass: 'custom-alert-large modern-reset-modal-clean',
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel',
          cssClass: 'alert-button-cancel'
        },
        {
          text: 'Réinitialiser',
          cssClass: 'alert-button-primary',
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

  async onResetPasswordSpecificConducteur(conducteur: Conducteur) {
    await this.confirmResetPasswordConducteur(conducteur);
  }

  private async confirmResetPasswordConducteur(conducteur: Conducteur) {
    const confirmAlert = await this.alertController.create({
      header: 'Confirmer la réinitialisation',
      subHeader: `${conducteur.nom} ${conducteur.prenom}`,
      message: `${conducteur.telephone}
${conducteur.entreprise?.nom || 'Conducteur Indépendant'}

Cette action va supprimer le mot de passe actuel et le conducteur devra en créer un nouveau à sa prochaine connexion.`,
      cssClass: 'modern-confirmation-modal-clean',
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel',
          cssClass: 'alert-button-cancel'
        },
        {
          text: 'Confirmer',
          cssClass: 'alert-button-primary',
          handler: async () => {
            await this.resetPasswordForConducteur(conducteur.id);
          }
        }
      ]
    });

    await confirmAlert.present();
  }

  private async resetPasswordForConducteur(conducteurId: string) {
    const loading = await this.loadingController.create({
      message: 'Réinitialisation...'
    });
    await loading.present();

    try {
      const { success, error } = await this.conducteurService.resetConducteurPassword(
        conducteurId,
        'Super Admin' // TODO: Récupérer l'email du super admin connecté
      );

      if (!success) {
        throw error;
      }

      this.showSuccess('Mot de passe conducteur réinitialisé avec succès');
      await this.loadConducteurs();
      await this.loadResetStats();

    } catch (error: any) {
      console.error('❌ Erreur reset password conducteur:', error);
      this.showError('Erreur lors de la réinitialisation du mot de passe');
    } finally {
      await loading.dismiss();
    }
  }

  // === AUTRES ACTIONS ===

  async onToggleStatus(conducteur: Conducteur) {
    const action = conducteur.actif ? 'désactiver' : 'activer';
    const alert = await this.alertController.create({
      header: `Confirmer ${action}`,
      message: `Voulez-vous vraiment ${action} le conducteur ${conducteur.nom} ${conducteur.prenom} ?`,
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel'
        },
        {
          text: 'Confirmer',
          handler: async () => {
            const loading = await this.loadingController.create({
              message: 'Modification...'
            });
            await loading.present();

            try {
              const { success } = await this.conducteurService.toggleConducteurStatus(
                conducteur.id,
                !conducteur.actif
              );

              if (success) {
                this.showSuccess(`Conducteur ${!conducteur.actif ? 'activé' : 'désactivé'} avec succès`);
                await this.loadConducteurs();
              }
            } catch (error) {
              this.showError(`Erreur lors de la ${action} du conducteur`);
            } finally {
              await loading.dismiss();
            }
          }
        }
      ]
    });

    await alert.present();
  }

  onCreateConducteur() {
    // TODO: Implémenter la création de conducteur
    this.showInfo('Fonctionnalité en cours de développement');
  }

  onViewDetails(conducteur: Conducteur) {
    // TODO: Naviguer vers la page de détails
    this.showInfo('Détails du conducteur: ' + conducteur.nom + ' ' + conducteur.prenom);
  }

  async onViewHistory() {
    try {
      const history = await this.conducteurService.getPasswordResetHistory({
        entityType: 'conducteur',
        limit: 50
      });

      if (history.length === 0) {
        this.showInfo('Aucune réinitialisation dans l\'historique');
        return;
      }

      // Créer la modal avec l'historique
      const alert = await this.alertController.create({
        header: 'Historique des Réinitialisations',
        subHeader: `${history.length} réinitialisation${history.length > 1 ? 's' : ''} trouvée${history.length > 1 ? 's' : ''}`,
        message: this.formatHistoryForModal(history),
        cssClass: 'custom-alert-large history-modal',
        buttons: [
          {
            text: 'Fermer',
            role: 'cancel',
            cssClass: 'alert-button-primary'
          }
        ]
      });

      await alert.present();

    } catch (error) {
      console.error('❌ Erreur chargement historique:', error);
      this.showError('Erreur lors du chargement de l\'historique');
    }
  }

  private formatHistoryForModal(history: any[]): string {
    return history.map(item => {
      const date = new Date(item.reset_at).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      const conducteurName = item.conducteur_nom || 'Conducteur inconnu';
      const entreprise = item.entreprise_nom ? ` (${item.entreprise_nom})` : ' (Indépendant)';
      
      return `📅 ${date}
👤 ${conducteurName}${entreprise}
🔄 Par: ${item.reset_by}
${item.reset_reason ? '📝 Motif: ' + item.reset_reason : ''}`;
    }).join('\n\n─────────────────────\n\n');
  }

  onExportData() {
    // TODO: Implémenter l'export des données
    this.showInfo('Export des données en cours de développement');
  }

  goBack() {
    this.router.navigate(['/super-admin/dashboard']);
  }

  // === HELPERS ===

  private async showSuccess(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color: 'success',
      position: 'top'
    });
    await toast.present();
  }

  private async showError(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color: 'danger',
      position: 'top'
    });
    await toast.present();
  }

  private async showInfo(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color: 'primary',
      position: 'top'
    });
    await toast.present();
  }
}