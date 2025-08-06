/**
 * PAGE GESTION DES COMMISSIONS SUPER-ADMIN
 * Interface pour configurer les taux de commission dynamiques
 */

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { 
  IonContent, 
  IonHeader, 
  IonTitle, 
  IonToolbar,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton,
  IonIcon,
  IonText,
  IonGrid,
  IonRow,
  IonCol,
  IonItem,
  IonLabel,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonToggle,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  IonSearchbar,
  IonBadge,
  IonList,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  LoadingController,
  ToastController,
  AlertController,
  ModalController,
  RefresherCustomEvent
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  arrowBackOutline,
  businessOutline,
  cashOutline,
  settingsOutline,
  saveOutline,
  refreshOutline,
  searchOutline,
  addOutline,
  createOutline,
  trashOutline,
  timeOutline,
  shieldCheckmarkOutline,
  trendingUpOutline
} from 'ionicons/icons';

import { 
  CommissionManagementService,
  GlobalCommissionStats
} from '../../services/commission-management.service';

interface EntrepriseCommission {
  id: string;
  nom: string;
  email: string;
  taux_actuel: number;
  taux_global: boolean;
  derniere_modification: string;
  ca_mensuel: number;
  commission_mensuelle: number;
  nb_reservations: number;
}

@Component({
  selector: 'app-commission-management',
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
      <ion-icon name="business-outline"></ion-icon>
      Gestion Commissions
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
    
    <!-- Statistiques globales des commissions -->
    <ion-card class="stats-card">
      <ion-card-header>
        <ion-card-title>
          <ion-icon name="trending-up-outline"></ion-icon>
          Statistiques Commissions
        </ion-card-title>
      </ion-card-header>
      <ion-card-content>
        <ion-grid>
          <ion-row>
            <ion-col size="6" size-md="3">
              <div class="stat-item">
                <div class="stat-number primary">{{ stats.taux_moyen.toFixed(1) }}%</div>
                <div class="stat-label">Taux Moyen</div>
              </div>
            </ion-col>
            <ion-col size="6" size-md="3">
              <div class="stat-item">
                <div class="stat-number success">{{ formatPrice(stats.commission_totale) }}</div>
                <div class="stat-label">Commission Totale</div>
              </div>
            </ion-col>
            <ion-col size="6" size-md="3">
              <div class="stat-item">
                <div class="stat-number">{{ stats.entreprises_avec_taux_specifique }}</div>
                <div class="stat-label">Taux Spécifiques</div>
              </div>
            </ion-col>
            <ion-col size="6" size-md="3">
              <div class="stat-item">
                <div class="stat-number">{{ stats.entreprises_avec_taux_global }}</div>
                <div class="stat-label">Taux Global</div>
              </div>
            </ion-col>
          </ion-row>
        </ion-grid>
      </ion-card-content>
    </ion-card>

    <!-- Configuration du taux global -->
    <ion-card class="global-config-card">
      <ion-card-header>
        <ion-card-title>
          <ion-icon name="settings-outline"></ion-icon>
          Configuration Globale
          <ion-badge color="primary" class="global-badge">{{ tauxGlobal }}%</ion-badge>
        </ion-card-title>
      </ion-card-header>
      <ion-card-content>
        <ion-grid>
          <ion-row class="commission-row">
            <ion-col size="12" size-md="3">
              <ion-item>
                <ion-label position="stacked">Nouveau Taux (%)</ion-label>
                <ion-input
                  type="number"
                  [(ngModel)]="nouveauTauxGlobal"
                  placeholder="{{ tauxGlobal }}"
                  min="0"
                  max="50"
                  step="0.1">
                </ion-input>
              </ion-item>
            </ion-col>
            <ion-col size="12" size-md="6">
              <ion-item>
                <ion-label position="stacked">Motif du changement</ion-label>
                <ion-input
                  type="text"
                  [(ngModel)]="motifChangement"
                  placeholder="Raison de la modification..."
                  maxlength="200">
                </ion-input>
              </ion-item>
            </ion-col>
            <ion-col size="12" size-md="3">
              <ion-button 
                expand="block" 
                fill="solid"
                color="primary"
                (click)="onUpdateTauxGlobal()"
                [disabled]="isSaving || nouveauTauxGlobal === tauxGlobal || !motifChangement.trim()">
                <ion-icon name="save-outline" slot="start"></ion-icon>
                {{ isSaving ? 'Sauvegarde...' : 'Mettre à jour' }}
              </ion-button>
            </ion-col>
          </ion-row>
          <ion-row>
            <ion-col size="12">
              <ion-text color="medium">
                <p class="global-info">
                  ℹ️ Ce taux s'applique à {{ stats.entreprises_avec_taux_global }} entreprises sans taux spécifique.<br>
                  <span *ngIf="nouveauTauxGlobal !== tauxGlobal">
                    📊 Changement: {{ tauxGlobal }}% → {{ nouveauTauxGlobal }}% ({{ (nouveauTauxGlobal - tauxGlobal > 0 ? '+' : '') + (nouveauTauxGlobal - tauxGlobal).toFixed(1) }}%)
                  </span>
                </p>
              </ion-text>
            </ion-col>
          </ion-row>
        </ion-grid>
      </ion-card-content>
    </ion-card>

    <!-- Recherche et filtres -->
    <ion-card class="search-card">
      <ion-card-content>
        <ion-searchbar
          [(ngModel)]="searchTerm"
          placeholder="Rechercher une entreprise..."
          (ionInput)="onSearch()"
          debounce="300">
        </ion-searchbar>
      </ion-card-content>
    </ion-card>

    <!-- Loading -->
    <div *ngIf="isLoading" class="loading-container">
      <ion-spinner></ion-spinner>
      <p>Chargement des entreprises...</p>
    </div>

    <!-- Liste des entreprises -->
    <ion-card *ngIf="!isLoading" class="enterprises-card">
      <ion-card-header>
        <ion-card-title>
          <ion-icon name="business-outline"></ion-icon>
          Entreprises ({{ filteredEntreprises.length }})
          <ion-button 
            size="small" 
            fill="outline" 
            (click)="onAddSpecificRate()">
            <ion-icon name="add-outline" slot="start"></ion-icon>
            Ajouter Taux
          </ion-button>
        </ion-card-title>
      </ion-card-header>
      <ion-card-content>
        
        <!-- Message si aucune entreprise -->
        <div *ngIf="filteredEntreprises.length === 0" class="empty-state">
          <ion-icon name="search-outline" size="large"></ion-icon>
          <h3>Aucune entreprise trouvée</h3>
          <p>Essayez de modifier votre recherche</p>
        </div>

        <!-- Liste des entreprises -->
        <ion-list *ngIf="filteredEntreprises.length > 0">
          <ion-item-sliding *ngFor="let entreprise of filteredEntreprises; trackBy: trackByEntreprise">
            <ion-item>
              <div class="entreprise-item">
                <!-- Info entreprise -->
                <div class="entreprise-info">
                  <div class="entreprise-name">{{ entreprise.nom }}</div>
                  <div class="entreprise-email">{{ entreprise.email }}</div>
                  <div class="entreprise-stats">
                    <span class="stat">{{ entreprise.nb_reservations }} courses</span>
                    <span class="stat">{{ formatPrice(entreprise.ca_mensuel) }} CA</span>
                  </div>
                </div>
                
                <!-- Taux actuel -->
                <div class="taux-section">
                  <div class="taux-value" [class.global]="entreprise.taux_global">
                    {{ entreprise.taux_actuel }}%
                  </div>
                  <div class="taux-type">
                    <ion-badge 
                      [color]="entreprise.taux_global ? 'medium' : 'primary'"
                      size="small">
                      {{ entreprise.taux_global ? 'Global' : 'Spécifique' }}
                    </ion-badge>
                  </div>
                  <div class="commission-mensuelle">
                    {{ formatPrice(entreprise.commission_mensuelle) }}
                  </div>
                </div>
              </div>
            </ion-item>
            
            <!-- Actions coulissantes -->
            <ion-item-options side="end">
              <ion-item-option 
                (click)="onEditCommission(entreprise)"
                color="primary">
                <ion-icon name="create-outline" slot="icon-only"></ion-icon>
              </ion-item-option>
              <ion-item-option 
                *ngIf="!entreprise.taux_global"
                (click)="onDeleteSpecificRate(entreprise)"
                color="danger">
                <ion-icon name="trash-outline" slot="icon-only"></ion-icon>
              </ion-item-option>
            </ion-item-options>
          </ion-item-sliding>
        </ion-list>
      </ion-card-content>
    </ion-card>

    <!-- Informations système -->
    <ion-card class="system-info-card">
      <ion-card-content>
        <div class="system-info">
          <ion-icon name="shield-checkmark-outline" color="success"></ion-icon>
          <div class="info-text">
            <strong>Système de Commission Dynamique Actif</strong>
            <p>Les modifications sont appliquées en temps réel à toutes les nouvelles réservations.</p>
          </div>
        </div>
      </ion-card-content>
    </ion-card>

  </div>
</ion-content>
  `,
  styleUrls: ['./commission-management.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonButton,
    IonIcon,
    IonText,
    IonGrid,
    IonRow,
    IonCol,
    IonItem,
    IonLabel,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonToggle,
    IonSpinner,
    IonRefresher,
    IonRefresherContent,
    IonSearchbar,
    IonBadge,
    IonList,
    IonItemSliding,
    IonItemOptions,
    IonItemOption
  ]
})
export class CommissionManagementPage implements OnInit {

  // Données
  entreprises: EntrepriseCommission[] = [];
  filteredEntreprises: EntrepriseCommission[] = [];
  stats: GlobalCommissionStats = {
    taux_moyen: 0,
    commission_totale: 0,
    entreprises_avec_taux_global: 0,
    entreprises_avec_taux_specifique: 0,
    ca_total: 0
  };

  // Configuration globale
  tauxGlobal: number = 15;
  nouveauTauxGlobal: number = 15;
  motifChangement: string = '';

  // État de l'interface
  isLoading = true;
  isSaving = false;
  searchTerm = '';

  constructor(
    private commissionService: CommissionManagementService,
    private router: Router,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private alertController: AlertController,
    private modalController: ModalController
  ) {
    // Ajouter les icônes
    addIcons({
      arrowBackOutline,
      businessOutline,
      cashOutline,
      settingsOutline,
      saveOutline,
      refreshOutline,
      searchOutline,
      addOutline,
      createOutline,
      trashOutline,
      timeOutline,
      shieldCheckmarkOutline,
      trendingUpOutline
    });
  }

  async ngOnInit() {
    await this.loadInitialData();
  }

  private async loadInitialData() {
    try {
      this.isLoading = true;
      
      // Charger le taux global actuel
      this.tauxGlobal = await this.commissionService.getCurrentGlobalRate();
      this.nouveauTauxGlobal = this.tauxGlobal;
      
      // Charger les entreprises et leurs commissions
      await this.loadEntreprises();
      
      // Charger les statistiques
      await this.loadStats();
      
    } catch (error) {
      console.error('❌ Erreur chargement initial:', error);
      this.showError('Erreur lors du chargement des données');
    } finally {
      this.isLoading = false;
    }
  }

  private async loadEntreprises() {
    try {
      // Cette méthode sera implémentée dans le service
      this.entreprises = await this.commissionService.getEntreprisesWithCommissionInfo();
      this.filteredEntreprises = [...this.entreprises];
    } catch (error) {
      console.error('❌ Erreur chargement entreprises:', error);
      this.showError('Erreur lors du chargement des entreprises');
    }
  }

  private async loadStats() {
    try {
      this.stats = await this.commissionService.getGlobalCommissionStats();
    } catch (error) {
      console.error('❌ Erreur chargement statistiques:', error);
    }
  }

  // Event handlers
  async onRefresh(event?: RefresherCustomEvent) {
    await this.loadInitialData();
    if (event) {
      event.target.complete();
    }
  }

  onSearch() {
    if (!this.searchTerm.trim()) {
      this.filteredEntreprises = [...this.entreprises];
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredEntreprises = this.entreprises.filter(entreprise =>
      entreprise.nom.toLowerCase().includes(term) ||
      entreprise.email.toLowerCase().includes(term)
    );
  }

  async onUpdateTauxGlobal() {
    if (this.nouveauTauxGlobal === this.tauxGlobal || !this.motifChangement.trim()) return;
    
    const alert = await this.alertController.create({
      header: 'Confirmation du changement',
      message: `Modification du taux global de ${this.tauxGlobal}% à ${this.nouveauTauxGlobal}%.\n\nMotif: ${this.motifChangement}\n\nImpact: ${this.stats.entreprises_avec_taux_global} entreprises seront notifiées automatiquement.`,
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel'
        },
        {
          text: 'Confirmer',
          handler: async () => {
            await this.updateGlobalRate();
          }
        }
      ]
    });

    await alert.present();
  }

  private async updateGlobalRate() {
    try {
      this.isSaving = true;
      
      // Utiliser le motif dans la mise à jour
      await this.commissionService.updateGlobalCommissionRate(this.nouveauTauxGlobal, this.motifChangement);
      
      this.tauxGlobal = this.nouveauTauxGlobal;
      
      // Recharger les données
      await this.loadEntreprises();
      await this.loadStats();
      
      // Réinitialiser le motif après succès
      this.motifChangement = '';
      
      const toast = await this.toastController.create({
        message: `✅ Taux global mis à jour : ${this.tauxGlobal}% - ${this.stats.entreprises_avec_taux_global} entreprises notifiées`,
        duration: 4000,
        color: 'success',
        position: 'top'
      });
      await toast.present();
      
    } catch (error) {
      console.error('❌ Erreur mise à jour taux global:', error);
      this.showError('Erreur lors de la mise à jour du taux global');
    } finally {
      this.isSaving = false;
    }
  }

  async onEditCommission(entreprise: EntrepriseCommission) {
    const alert = await this.alertController.create({
      header: 'Modifier Commission',
      subHeader: entreprise.nom,
      inputs: [
        {
          name: 'nouveauTaux',
          type: 'number',
          placeholder: 'Nouveau taux (%)',
          value: entreprise.taux_actuel.toString(),
          min: 0,
          max: 50
        }
      ],
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel'
        },
        {
          text: 'Sauvegarder',
          handler: async (data) => {
            const nouveauTaux = parseFloat(data.nouveauTaux);
            if (nouveauTaux && nouveauTaux !== entreprise.taux_actuel) {
              await this.updateEntrepriseCommission(entreprise, nouveauTaux);
            }
          }
        }
      ]
    });

    await alert.present();
  }

  private async updateEntrepriseCommission(entreprise: EntrepriseCommission, nouveauTaux: number) {
    try {
      const loading = await this.loadingController.create({
        message: 'Mise à jour...',
        spinner: 'crescent'
      });
      await loading.present();

      await this.commissionService.setSpecificCommissionRate(entreprise.id, nouveauTaux);
      
      // Recharger les données
      await this.loadEntreprises();
      await this.loadStats();
      
      const toast = await this.toastController.create({
        message: `✅ Commission mise à jour pour ${entreprise.nom} : ${nouveauTaux}%`,
        duration: 3000,
        color: 'success',
        position: 'top'
      });
      await toast.present();
      
      await loading.dismiss();
    } catch (error) {
      console.error('❌ Erreur mise à jour commission:', error);
      this.showError('Erreur lors de la mise à jour de la commission');
    }
  }

  async onAddSpecificRate() {
    // TODO: Implémenter modal de sélection d'entreprise
    const toast = await this.toastController.create({
      message: '🚧 Ajout de taux spécifique - Fonctionnalité en développement',
      duration: 3000,
      color: 'warning',
      position: 'top'
    });
    await toast.present();
  }

  async onDeleteSpecificRate(entreprise: EntrepriseCommission) {
    const alert = await this.alertController.create({
      header: 'Supprimer Taux Spécifique',
      message: `Supprimer le taux spécifique pour ${entreprise.nom} ? L'entreprise utilisera le taux global (${this.tauxGlobal}%).`,
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel'
        },
        {
          text: 'Supprimer',
          handler: async () => {
            await this.deleteSpecificRate(entreprise);
          }
        }
      ]
    });

    await alert.present();
  }

  private async deleteSpecificRate(entreprise: EntrepriseCommission) {
    try {
      const loading = await this.loadingController.create({
        message: 'Suppression...',
        spinner: 'crescent'
      });
      await loading.present();

      await this.commissionService.removeSpecificCommissionRate(entreprise.id);
      
      // Recharger les données
      await this.loadEntreprises();
      await this.loadStats();
      
      const toast = await this.toastController.create({
        message: `✅ Taux spécifique supprimé pour ${entreprise.nom}`,
        duration: 3000,
        color: 'success',
        position: 'top'
      });
      await toast.present();
      
      await loading.dismiss();
    } catch (error) {
      console.error('❌ Erreur suppression taux:', error);
      this.showError('Erreur lors de la suppression du taux spécifique');
    }
  }

  goBack() {
    this.router.navigate(['/super-admin/dashboard']);
  }

  // Utilitaires
  formatPrice(price: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'GNF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  }

  trackByEntreprise(index: number, entreprise: EntrepriseCommission): string {
    return entreprise.id;
  }

  private async showError(message: string) {
    const toast = await this.toastController.create({
      message: `❌ ${message}`,
      duration: 4000,
      color: 'danger',
      position: 'top'
    });
    await toast.present();
  }
}