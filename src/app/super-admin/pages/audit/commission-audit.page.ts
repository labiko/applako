/**
 * PAGE AUDIT DES COMMISSIONS SUPER-ADMIN
 * Historique et traçabilité des modifications de commission
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
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  IonSearchbar,
  IonBadge,
  IonList,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  IonChip,
  IonNote,
  LoadingController,
  ToastController,
  AlertController,
  RefresherCustomEvent
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  arrowBackOutline,
  timeOutline,
  personOutline,
  businessOutline,
  trendingUpOutline,
  trendingDownOutline,
  refreshOutline,
  searchOutline,
  calendarOutline,
  filterOutline,
  downloadOutline,
  eyeOutline,
  shieldCheckmarkOutline,
  alertCircleOutline,
  checkmarkCircleOutline,
  arrowForwardOutline,
  cashOutline
} from 'ionicons/icons';

import { CommissionManagementService } from '../../services/commission-management.service';

interface CommissionAuditEntry {
  id: string;
  timestamp: string;
  action_type: 'UPDATE_GLOBAL_RATE' | 'SET_SPECIFIC_RATE' | 'REMOVE_SPECIFIC_RATE';
  user_email: string;
  entreprise_nom?: string;
  entreprise_id?: string;
  ancien_taux: number;
  nouveau_taux: number;
  motif: string;
  impact_level: 'LOW' | 'MEDIUM' | 'HIGH';
  business_impact: number;
}

@Component({
  selector: 'app-commission-audit',
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
      <ion-icon name="shield-checkmark-outline"></ion-icon>
      Audit des Commissions
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
    
    <!-- Statistiques des modifications -->
    <ion-card class="stats-card">
      <ion-card-header>
        <ion-card-title>
          <ion-icon name="trending-up-outline"></ion-icon>
          Statistiques d'Audit
        </ion-card-title>
      </ion-card-header>
      <ion-card-content>
        <ion-grid>
          <ion-row>
            <ion-col size="6" size-md="3">
              <div class="stat-item">
                <div class="stat-number">{{ auditStats.total_modifications }}</div>
                <div class="stat-label">Modifications</div>
              </div>
            </ion-col>
            <ion-col size="6" size-md="3">
              <div class="stat-item">
                <div class="stat-number">{{ auditStats.modifications_ce_mois }}</div>
                <div class="stat-label">Ce Mois</div>
              </div>
            </ion-col>
            <ion-col size="6" size-md="3">
              <div class="stat-item">
                <div class="stat-number">{{ auditStats.taux_moyen.toFixed(1) }}%</div>
                <div class="stat-label">Taux Moyen</div>
              </div>
            </ion-col>
            <ion-col size="6" size-md="3">
              <div class="stat-item">
                <div class="stat-number high">{{ auditStats.modifications_critiques }}</div>
                <div class="stat-label">Impact Élevé</div>
              </div>
            </ion-col>
          </ion-row>
        </ion-grid>
      </ion-card-content>
    </ion-card>

    <!-- Filtres -->
    <ion-card class="filters-card">
      <ion-card-content>
        <ion-grid>
          <ion-row>
            <ion-col size="12" size-md="4">
              <ion-searchbar
                [(ngModel)]="searchTerm"
                placeholder="Rechercher..."
                (ionInput)="onSearch()"
                debounce="300">
              </ion-searchbar>
            </ion-col>
            <ion-col size="6" size-md="2">
              <ion-select 
                [(ngModel)]="filterType" 
                placeholder="Type"
                (ionChange)="onFilterChange()">
                <ion-select-option value="">Tous</ion-select-option>
                <ion-select-option value="UPDATE_GLOBAL_RATE">Global</ion-select-option>
                <ion-select-option value="SET_SPECIFIC_RATE">Spécifique</ion-select-option>
                <ion-select-option value="REMOVE_SPECIFIC_RATE">Suppression</ion-select-option>
              </ion-select>
            </ion-col>
            <ion-col size="6" size-md="2">
              <ion-select 
                [(ngModel)]="filterImpact" 
                placeholder="Impact"
                (ionChange)="onFilterChange()">
                <ion-select-option value="">Tous</ion-select-option>
                <ion-select-option value="HIGH">Élevé</ion-select-option>
                <ion-select-option value="MEDIUM">Moyen</ion-select-option>
                <ion-select-option value="LOW">Faible</ion-select-option>
              </ion-select>
            </ion-col>
            <ion-col size="12" size-md="4">
              <ion-button 
                expand="block" 
                fill="outline" 
                (click)="onExportAudit()">
                <ion-icon name="download-outline" slot="start"></ion-icon>
                Exporter CSV
              </ion-button>
            </ion-col>
          </ion-row>
        </ion-grid>
      </ion-card-content>
    </ion-card>

    <!-- Loading -->
    <div *ngIf="isLoading" class="loading-container">
      <ion-spinner></ion-spinner>
      <p>Chargement de l'historique...</p>
    </div>

    <!-- Liste des modifications -->
    <ion-card *ngIf="!isLoading" class="audit-card">
      <ion-card-header>
        <ion-card-title>
          <ion-icon name="time-outline"></ion-icon>
          Historique des Modifications ({{ filteredAuditEntries.length }})
        </ion-card-title>
      </ion-card-header>
      <ion-card-content>
        
        <!-- Message si aucune entrée -->
        <div *ngIf="filteredAuditEntries.length === 0" class="empty-state">
          <ion-icon name="time-outline" size="large"></ion-icon>
          <h3>Aucune modification trouvée</h3>
          <p>Aucun historique ne correspond aux critères de recherche</p>
        </div>

        <!-- Liste des entrées d'audit -->
        <ion-list *ngIf="filteredAuditEntries.length > 0">
          <ion-item-sliding *ngFor="let entry of filteredAuditEntries; trackBy: trackByEntry">
            <ion-item>
              <div class="audit-entry">
                
                <!-- Header avec type et timestamp -->
                <div class="audit-header">
                  <div class="action-info">
                    <ion-badge 
                      [color]="getActionColor(entry.action_type)"
                      class="action-badge">
                      {{ getActionText(entry.action_type) }}
                    </ion-badge>
                    <ion-badge 
                      [color]="getImpactColor(entry.impact_level)"
                      size="small"
                      class="impact-badge">
                      {{ entry.impact_level }}
                    </ion-badge>
                  </div>
                  <div class="timestamp">
                    <ion-icon name="time-outline"></ion-icon>
                    {{ formatTimestamp(entry.timestamp) }}
                  </div>
                </div>

                <!-- Détails de la modification -->
                <div class="audit-details">
                  <div class="modification-info">
                    <!-- Utilisateur -->
                    <div class="detail-row">
                      <ion-icon name="person-outline" class="detail-icon"></ion-icon>
                      <span class="detail-label">Par :</span>
                      <span class="detail-value">{{ entry.user_email }}</span>
                    </div>
                    
                    <!-- Entreprise (si spécifique) -->
                    <div class="detail-row" *ngIf="entry.entreprise_nom">
                      <ion-icon name="business-outline" class="detail-icon"></ion-icon>
                      <span class="detail-label">Entreprise :</span>
                      <span class="detail-value">{{ entry.entreprise_nom }}</span>
                    </div>
                    
                    <!-- Changement de taux -->
                    <div class="detail-row rate-change">
                      <ion-icon 
                        [name]="entry.nouveau_taux > entry.ancien_taux ? 'trending-up-outline' : 'trending-down-outline'"
                        [class]="entry.nouveau_taux > entry.ancien_taux ? 'increase' : 'decrease'"
                        class="detail-icon">
                      </ion-icon>
                      <span class="detail-label">Taux :</span>
                      <span class="rate-comparison">
                        <span class="old-rate">{{ entry.ancien_taux }}%</span>
                        <ion-icon name="arrow-forward-outline" class="arrow"></ion-icon>
                        <span class="new-rate">{{ entry.nouveau_taux }}%</span>
                      </span>
                    </div>
                    
                    <!-- Impact business -->
                    <div class="detail-row" *ngIf="entry.business_impact">
                      <ion-icon name="cash-outline" class="detail-icon"></ion-icon>
                      <span class="detail-label">Impact :</span>
                      <span class="detail-value impact-value" 
                            [class.positive]="entry.business_impact > 0"
                            [class.negative]="entry.business_impact < 0">
                        {{ formatPrice(getAbsoluteValue(entry.business_impact)) }}
                      </span>
                    </div>
                  </div>
                  
                  <!-- Motif -->
                  <div class="motif-section" *ngIf="entry.motif">
                    <ion-note color="medium">
                      <strong>Motif :</strong> {{ entry.motif }}
                    </ion-note>
                  </div>
                </div>
              </div>
            </ion-item>
            
            <!-- Actions coulissantes -->
            <ion-item-options side="end">
              <ion-item-option 
                (click)="onViewDetails(entry)"
                color="primary">
                <ion-icon name="eye-outline" slot="icon-only"></ion-icon>
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
            <strong>Audit Trail Actif</strong>
            <p>Toutes les modifications de commission sont automatiquement enregistrées et tracées.</p>
          </div>
        </div>
      </ion-card-content>
    </ion-card>

  </div>
</ion-content>
  `,
  styleUrls: ['./commission-audit.page.scss'],
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
    IonSpinner,
    IonRefresher,
    IonRefresherContent,
    IonSearchbar,
    IonBadge,
    IonList,
    IonItemSliding,
    IonItemOptions,
    IonItemOption,
    IonChip,
    IonNote
  ]
})
export class CommissionAuditPage implements OnInit {

  // Données
  auditEntries: CommissionAuditEntry[] = [];
  filteredAuditEntries: CommissionAuditEntry[] = [];
  auditStats = {
    total_modifications: 0,
    modifications_ce_mois: 0,
    taux_moyen: 0,
    modifications_critiques: 0
  };

  // Filtres
  searchTerm = '';
  filterType = '';
  filterImpact = '';

  // État de l'interface
  isLoading = true;

  constructor(
    private commissionService: CommissionManagementService,
    private router: Router,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private alertController: AlertController
  ) {
    // Ajouter les icônes
    addIcons({
      arrowBackOutline,
      timeOutline,
      personOutline,
      businessOutline,
      trendingUpOutline,
      trendingDownOutline,
      refreshOutline,
      searchOutline,
      calendarOutline,
      filterOutline,
      downloadOutline,
      eyeOutline,
      shieldCheckmarkOutline,
      alertCircleOutline,
      checkmarkCircleOutline,
      arrowForwardOutline,
      cashOutline
    });
  }

  async ngOnInit() {
    await this.loadAuditData();
  }

  private async loadAuditData() {
    try {
      this.isLoading = true;
      
      // Charger les entrées d'audit
      await this.loadAuditEntries();
      
      // Calculer les statistiques
      this.calculateStats();
      
    } catch (error) {
      console.error('❌ Erreur chargement audit:', error);
      this.showError('Erreur lors du chargement de l\'audit');
    } finally {
      this.isLoading = false;
    }
  }

  private async loadAuditEntries() {
    try {
      // Charger l'historique réel depuis la table commission_config
      const { data: configs, error } = await this.commissionService.getCommissionHistoryWithDetails();
      
      if (error) {
        console.error('❌ Erreur chargement historique commissions:', error);
        this.auditEntries = [];
      } else {
        // Transformer les données de commission_config en format audit
        this.auditEntries = this.transformConfigsToAuditEntries(configs || []);
      }
    } catch (error) {
      console.error('❌ Erreur chargement audit:', error);
      this.auditEntries = [];
    }

    this.filteredAuditEntries = [...this.auditEntries];
  }

  private calculateStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    this.auditStats = {
      total_modifications: this.auditEntries.length,
      modifications_ce_mois: this.auditEntries.filter(entry => 
        new Date(entry.timestamp) >= startOfMonth
      ).length,
      taux_moyen: this.auditEntries.length > 0 
        ? this.auditEntries.reduce((sum, entry) => sum + entry.nouveau_taux, 0) / this.auditEntries.length
        : 0,
      modifications_critiques: this.auditEntries.filter(entry => 
        entry.impact_level === 'HIGH'
      ).length
    };
  }

  // Event handlers
  async onRefresh(event?: RefresherCustomEvent) {
    await this.loadAuditData();
    if (event) {
      event.target.complete();
    }
  }

  onSearch() {
    this.applyFilters();
  }

  onFilterChange() {
    this.applyFilters();
  }

  private applyFilters() {
    let filtered = [...this.auditEntries];

    // Filtre de recherche
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(entry =>
        entry.user_email.toLowerCase().includes(term) ||
        entry.motif.toLowerCase().includes(term) ||
        (entry.entreprise_nom && entry.entreprise_nom.toLowerCase().includes(term))
      );
    }

    // Filtre par type
    if (this.filterType) {
      filtered = filtered.filter(entry => entry.action_type === this.filterType);
    }

    // Filtre par impact
    if (this.filterImpact) {
      filtered = filtered.filter(entry => entry.impact_level === this.filterImpact);
    }

    this.filteredAuditEntries = filtered;
  }

  async onViewDetails(entry: CommissionAuditEntry) {
    const alert = await this.alertController.create({
      header: 'Détails de la Modification',
      message: `
        <strong>Type:</strong> ${this.getActionText(entry.action_type)}<br>
        <strong>Date:</strong> ${this.formatTimestamp(entry.timestamp)}<br>
        <strong>Utilisateur:</strong> ${entry.user_email}<br>
        ${entry.entreprise_nom ? `<strong>Entreprise:</strong> ${entry.entreprise_nom}<br>` : ''}
        <strong>Changement:</strong> ${entry.ancien_taux}% → ${entry.nouveau_taux}%<br>
        <strong>Impact:</strong> ${entry.impact_level}<br>
        ${entry.business_impact ? `<strong>Impact Financier:</strong> ${this.formatPrice(this.getAbsoluteValue(entry.business_impact))}<br>` : ''}
        <strong>Motif:</strong> ${entry.motif}
      `,
      buttons: ['Fermer']
    });

    await alert.present();
  }

  async onExportAudit() {
    const toast = await this.toastController.create({
      message: '🚧 Export CSV - Fonctionnalité en développement',
      duration: 3000,
      color: 'warning',
      position: 'top'
    });
    await toast.present();
  }

  goBack() {
    this.router.navigate(['/super-admin/dashboard']);
  }

  // Utilitaires
  getActionText(action: string): string {
    switch (action) {
      case 'UPDATE_GLOBAL_RATE': return 'Taux Global';
      case 'SET_SPECIFIC_RATE': return 'Taux Spécifique';
      case 'REMOVE_SPECIFIC_RATE': return 'Suppression';
      default: return action;
    }
  }

  getActionColor(action: string): string {
    switch (action) {
      case 'UPDATE_GLOBAL_RATE': return 'primary';
      case 'SET_SPECIFIC_RATE': return 'success';
      case 'REMOVE_SPECIFIC_RATE': return 'warning';
      default: return 'medium';
    }
  }

  getImpactColor(impact: string): string {
    switch (impact) {
      case 'HIGH': return 'danger';
      case 'MEDIUM': return 'warning';
      case 'LOW': return 'success';
      default: return 'medium';
    }
  }

  formatTimestamp(timestamp: string): string {
    // Afficher l'heure UTC (= GMT+0 = heure de Conakry)
    return new Date(timestamp).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC'
    });
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'GNF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  }

  trackByEntry(index: number, entry: CommissionAuditEntry): string {
    return entry.id;
  }

  getAbsoluteValue(value: number): number {
    return Math.abs(value);
  }

  /**
   * Transforme les configurations de commission en entrées d'audit
   */
  private transformConfigsToAuditEntries(configs: any[]): CommissionAuditEntry[] {
    const entries: CommissionAuditEntry[] = [];
    
    // Trier par date de création décroissante
    const sortedConfigs = configs.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // Grouper par entreprise pour déterminer les changements
    const groupedByEnterprise = new Map<string | null, any[]>();
    
    sortedConfigs.forEach(config => {
      const key = config.entreprise_id || 'global';
      if (!groupedByEnterprise.has(key)) {
        groupedByEnterprise.set(key, []);
      }
      groupedByEnterprise.get(key)!.push(config);
    });

    // Créer les entrées d'audit
    groupedByEnterprise.forEach((configList, entrepriseKey) => {
      for (let i = 0; i < configList.length; i++) {
        const config = configList[i];
        const previousConfig = configList[i + 1]; // Configuration précédente (plus ancienne)
        
        // Déterminer l'ancien taux
        let ancienTaux = 15; // Fallback par défaut
        if (previousConfig && previousConfig.actif === false) {
          ancienTaux = previousConfig.taux_commission;
        } else if (i === configList.length - 1 && !config.entreprise_id) {
          // Pour le premier taux global, l'ancien était 15%
          ancienTaux = 15;
        }

        // Déterminer le type d'action
        let actionType: 'UPDATE_GLOBAL_RATE' | 'SET_SPECIFIC_RATE' | 'REMOVE_SPECIFIC_RATE';
        if (!config.entreprise_id) {
          actionType = 'UPDATE_GLOBAL_RATE';
        } else if (config.actif === false && i === 0) {
          actionType = 'REMOVE_SPECIFIC_RATE';
        } else {
          actionType = 'SET_SPECIFIC_RATE';
        }

        // Déterminer l'impact
        const difference = Math.abs(config.taux_commission - ancienTaux);
        let impactLevel: 'LOW' | 'MEDIUM' | 'HIGH';
        if (difference >= 5) {
          impactLevel = 'HIGH';
        } else if (difference >= 2) {
          impactLevel = 'MEDIUM';
        } else {
          impactLevel = 'LOW';
        }

        // Créer l'entrée d'audit
        const entry: CommissionAuditEntry = {
          id: config.id,
          timestamp: config.created_at,
          action_type: actionType,
          user_email: config.created_by || 'admin@lokotaxi.com',
          entreprise_nom: config.entreprise_nom,
          entreprise_id: config.entreprise_id,
          ancien_taux: ancienTaux,
          nouveau_taux: config.taux_commission,
          motif: config.motif || `Modification du taux de commission`,
          impact_level: impactLevel,
          business_impact: 0 // À calculer si nécessaire
        };

        // Ne pas ajouter les configurations inactives sauf si c'est une suppression
        if (config.actif || actionType === 'REMOVE_SPECIFIC_RATE') {
          entries.push(entry);
        }
      }
    });

    // Retourner triées par date décroissante
    return entries.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
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