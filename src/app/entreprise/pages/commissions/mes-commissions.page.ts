/**
 * PAGE MES COMMISSIONS - ENTREPRISE
 * Vue dédiée pour les entreprises pour consulter leurs commissions
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
  IonList,
  IonBadge,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  IonSegment,
  IonSegmentButton,
  IonChip,
  IonAccordion,
  IonAccordionGroup,
  LoadingController,
  ToastController,
  RefresherCustomEvent
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  arrowBackOutline,
  cashOutline,
  cardOutline,
  statsChartOutline,
  businessOutline,
  personOutline,
  carOutline,
  calendarOutline,
  timeOutline,
  locationOutline,
  downloadOutline,
  listOutline,
  gridOutline,
  refreshOutline,
  checkmarkCircleOutline,
  walletOutline,
  alertCircleOutline,
  hourglassOutline,
  documentTextOutline,
  eyeOutline,
  calculatorOutline,
  checkmarkCircle,
  time,
  informationCircle,
  timeOutline as timeOutlineIcon
} from 'ionicons/icons';

import { EntrepriseCommissionService } from '../../services/entreprise-commission.service';
import { FluxFinancierService } from '../../../super-admin/services/flux-financier.service';

// Interfaces locales
export interface PeriodeCommission {
  id: string;
  periode_debut: string;
  periode_fin: string;
  statut: 'en_cours' | 'cloturee' | 'facturee' | 'payee';
  montant_commission: number;
  chiffre_affaire_brut: number;
  nombre_reservations: number;
  taux_commission_moyen: number;
  statut_paiement: 'non_paye' | 'paye' | 'en_attente';
  date_versement_commission?: string;
  reservations?: ReservationCommission[];
}

export interface ReservationCommission {
  id: string;
  client_phone: string;
  depart_nom: string;
  destination_nom: string;
  prix_total: number;
  distance_km?: number;
  created_at: string;
  date_code_validation: string;
  code_validation: string;
  conducteur_nom: string;
}

@Component({
  selector: 'app-mes-commissions',
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
      <ion-icon name="wallet-outline"></ion-icon>
      Mes Commissions
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
    
    <!-- Loading -->
    <div *ngIf="isLoading" class="loading-container">
      <ion-spinner></ion-spinner>
      <p>Chargement de vos commissions...</p>
    </div>

    <!-- Contenu principal -->
    <div *ngIf="!isLoading">
      
      <!-- Résumé global -->
      <ion-card class="summary-card">
        <ion-card-header>
          <ion-card-title>
            <ion-icon name="stats-chart-outline"></ion-icon>
            Résumé Global
          </ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-grid>
            <ion-row>
              <ion-col size="6" size-md="3">
                <div class="stat-item">
                  <div class="stat-value">{{ formatPrice(totalCommissions) }}</div>
                  <div class="stat-label">Total Commissions</div>
                </div>
              </ion-col>
              <ion-col size="6" size-md="3">
                <div class="stat-item">
                  <div class="stat-value">{{ formatPrice(totalPaye) }}</div>
                  <div class="stat-label">Total Payé</div>
                </div>
              </ion-col>
              <ion-col size="6" size-md="3">
                <div class="stat-item">
                  <div class="stat-value">{{ formatPrice(totalEnAttente) }}</div>
                  <div class="stat-label">En Attente</div>
                </div>
              </ion-col>
              <ion-col size="6" size-md="3">
                <div class="stat-item">
                  <div class="stat-value">{{ totalReservations }}</div>
                  <div class="stat-label">Réservations</div>
                </div>
              </ion-col>
            </ion-row>
          </ion-grid>
        </ion-card-content>
      </ion-card>

      <!-- Balance Financière Mobile Money vs Cash -->
      <ion-card *ngIf="balanceEntreprise" class="balance-card">
        <ion-card-header>
          <ion-card-title>
            <ion-icon name="wallet-outline"></ion-icon>
            Ma Balance Financière
          </ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <div class="balance-summary">
            <div class="balance-main">
              <div class="balance-amount" [class.positive]="balanceEntreprise.balance_courante > 0" [class.negative]="balanceEntreprise.balance_courante < 0">
                {{ formatPrice(balanceEntreprise.balance_courante || 0) }}
              </div>
              <div class="balance-label">
                {{ balanceEntreprise.balance_courante > 0 ? 'Créditeur' : balanceEntreprise.balance_courante < 0 ? 'Débiteur' : 'Équilibré' }}
              </div>
            </div>
          </div>
          
          <ion-grid class="balance-details">
            <ion-row>
              <ion-col size="6">
                <div class="detail-item mobile-money">
                  <div class="detail-value">{{ formatPrice(balanceEntreprise.total_mobile_money_encaisse || 0) }}</div>
                  <div class="detail-label">💰 Mobile Money Traité</div>
                </div>
              </ion-col>
              <ion-col size="6">
                <div class="detail-item cash">
                  <div class="detail-value">{{ formatPrice(balanceEntreprise.total_ca_cash || 0) }}</div>
                  <div class="detail-label">💵 CA Cash</div>
                </div>
              </ion-col>
            </ion-row>
            <ion-row>
              <ion-col size="6">
                <div class="detail-item reverser">
                  <div class="detail-value">{{ formatPrice(balanceEntreprise.total_a_reverser || 0) }}</div>
                  <div class="detail-label">↩️ Reçu Admin</div>
                  <div class="detail-explanation">89% du MM vous sera reversé</div>
                </div>
              </ion-col>
              <ion-col size="6">
                <div class="detail-item collecter">
                  <div class="detail-value">{{ formatPrice(balanceEntreprise.total_a_collecter || 0) }}</div>
                  <div class="detail-label">📥 Dû Commission</div>
                  <div class="detail-explanation">11% sur vos ventes cash</div>
                </div>
              </ion-col>
            </ion-row>
            <ion-row>
              <ion-col size="12">
                <div class="detail-item periods">
                  <div class="detail-value">{{ balanceEntreprise.nombre_periodes_traitees || 0 }}</div>
                  <div class="detail-label">📊 Périodes Traitées</div>
                  <div class="detail-explanation">Dernière MAJ: {{ formatDate(balanceEntreprise.date_derniere_mise_a_jour) }}</div>
                </div>
              </ion-col>
            </ion-row>
          </ion-grid>
        </ion-card-content>
      </ion-card>

      <!-- Filtres -->
      <ion-card class="filters-card">
        <ion-card-content>
          <ion-segment [(ngModel)]="statutFilter" (ionChange)="onFilterChange()">
            <ion-segment-button value="tous">
              <ion-label>Toutes ({{ periodes.length }})</ion-label>
            </ion-segment-button>
            <ion-segment-button value="paye">
              <ion-label>Payées ({{ getCountByStatus('paye') }})</ion-label>
            </ion-segment-button>
            <ion-segment-button value="non_paye">
              <ion-label>Non Payées ({{ getCountByStatus('non_paye') }})</ion-label>
            </ion-segment-button>
            <ion-segment-button value="en_attente">
              <ion-label>En Attente ({{ getCountByStatus('en_attente') }})</ion-label>
            </ion-segment-button>
          </ion-segment>
        </ion-card-content>
      </ion-card>

      <!-- Liste des périodes -->
      <ion-accordion-group *ngIf="filteredPeriodes.length > 0">
        <ion-accordion 
          *ngFor="let periode of filteredPeriodes; trackBy: trackByPeriode"
          class="periode-accordion">
          
          <ion-item slot="header" color="light">
            <ion-label>
              <h2>
                <ion-icon name="calendar-outline"></ion-icon>
                {{ formatDate(periode.periode_debut) }} - {{ formatDate(periode.periode_fin) }}
              </h2>
              <p>{{ getPeriodeStatusText(periode.statut) }}</p>
            </ion-label>
            
            <div class="periode-summary" slot="end">
              <div class="commission-amount">
                {{ formatPrice(periode.montant_commission) }}
                <ion-icon 
                  [name]="getPaymentStatusIcon(periode.statut_paiement)"
                  [color]="getPaymentStatusColor(periode.statut_paiement)"
                  class="payment-icon">
                </ion-icon>
              </div>
              <ion-chip 
                [color]="getPeriodeStatusColor(periode.statut)"
                size="small">
                {{ periode.nombre_reservations }} courses
              </ion-chip>
            </div>
          </ion-item>

          <div class="accordion-content" slot="content">
            
            <!-- Détails de la commission -->
            <ion-grid class="periode-details">
              <ion-row>
                <ion-col size="12" size-md="6">
                  <div class="detail-section">
                    <h4>💰 Détails Financiers</h4>
                    <div class="detail-item">
                      <span>Chiffre d'affaires brut:</span>
                      <strong>{{ formatPrice(periode.chiffre_affaire_brut) }}</strong>
                    </div>
                    <div class="detail-item">
                      <span>Taux de commission:</span>
                      <strong>{{ periode.taux_commission_moyen }}%</strong>
                    </div>
                    <div class="detail-item">
                      <span>Commission calculée:</span>
                      <strong>{{ formatPrice(periode.montant_commission) }}</strong>
                    </div>
                    <div class="detail-item" *ngIf="periode.date_versement_commission">
                      <span>Date de versement:</span>
                      <strong>{{ formatDate(periode.date_versement_commission) }}</strong>
                    </div>
                  </div>
                </ion-col>
                <ion-col size="12" size-md="6">
                  <div class="detail-section">
                    <h4>📊 Statistiques</h4>
                    <div class="detail-item">
                      <span>Nombre de courses:</span>
                      <strong>{{ periode.nombre_reservations }}</strong>
                    </div>
                    <div class="detail-item">
                      <span>Prix moyen par course:</span>
                      <strong>{{ formatPrice(periode.chiffre_affaire_brut / periode.nombre_reservations) }}</strong>
                    </div>
                    <div class="detail-item">
                      <span>Commission moyenne:</span>
                      <strong>{{ formatPrice(periode.montant_commission / periode.nombre_reservations) }}</strong>
                    </div>
                  </div>
                </ion-col>
              </ion-row>
            </ion-grid>

            <!-- Calculatrice en temps réel -->
            <div class="calculator-section">
              <h4>
                <ion-icon name="calculator-outline"></ion-icon>
                Calculatrice Commission
              </h4>
              <div class="calculator">
                <div class="calc-formula">
                  <span class="ca">{{ formatPrice(periode.chiffre_affaire_brut) }}</span>
                  <span class="operator">×</span>
                  <span class="taux">{{ periode.taux_commission_moyen }}%</span>
                  <span class="operator">=</span>
                  <span class="result">{{ formatPrice(periode.montant_commission) }}</span>
                </div>
              </div>
            </div>

            <!-- Liste des réservations avec filtres -->
            <div class="reservations-section" *ngIf="periode.reservations && periode.reservations.length > 0">
              <h4>
                <ion-icon name="car-outline"></ion-icon>
                Réservations
              </h4>
              
              <!-- Tabs Validées/En Attente pour cette période -->
              <div class="reservation-filters">
                <ion-segment 
                  [ngModel]="getReservationFilter(periode.id)" 
                  (ionChange)="onReservationFilterChange($event, periode.id)"
                  class="validation-segment">
                  <ion-segment-button value="validees" class="validated-tab">
                    <ion-label>
                      <span class="tab-text">VALIDÉES</span>
                      <span class="tab-count">({{ getValidatedReservationsCount(periode.reservations) }})</span>
                    </ion-label>
                    <ion-icon name="checkmark-circle" class="tab-icon"></ion-icon>
                  </ion-segment-button>
                  <ion-segment-button value="en_attente" class="pending-tab">
                    <ion-label>
                      <span class="tab-text">EN ATTENTE</span>
                      <span class="tab-count">({{ getPendingReservationsCount(periode.reservations) }})</span>
                    </ion-label>
                    <ion-icon name="time" class="tab-icon"></ion-icon>
                  </ion-segment-button>
                </ion-segment>
              </div>

              <!-- Message informatif pour les validées -->
              <div class="info-message" *ngIf="getReservationFilter(periode.id) === 'validees'">
                <div class="info-content">
                  <ion-icon name="information-circle" class="info-icon"></ion-icon>
                  <span class="info-text">Ces réservations sont comptées dans les commissions</span>
                </div>
              </div>
              
              <ion-list class="reservations-list">
                <ion-item 
                  *ngFor="let reservation of getFilteredReservations(periode.reservations, periode.id); trackBy: trackByReservation"
                  class="reservation-item">
                  
                  <div class="reservation-content">
                    <div class="reservation-header">
                      <div class="reservation-info">
                        <h5>{{ reservation.client_phone }}</h5>
                        <span class="reservation-id">ID: {{ reservation.id }}</span>
                      </div>
                      <div class="prix">{{ formatPrice(reservation.prix_total) }}</div>
                    </div>
                    
                    <div class="reservation-details">
                      <p class="trajet">
                        <ion-icon name="location-outline"></ion-icon>
                        {{ reservation.depart_nom }} → {{ reservation.destination_nom }}
                      </p>
                      <p class="distance" *ngIf="reservation.distance_km">
                        <ion-icon name="car-outline"></ion-icon>
                        {{ reservation.distance_km }} km
                      </p>
                      <p class="datetime">
                        <ion-icon name="calendar-outline"></ion-icon>
                        {{ formatDate(reservation.created_at) }}
                      </p>
                      <p class="conducteur">
                        <ion-icon name="person-outline"></ion-icon>
                        {{ reservation.conducteur_nom }}
                      </p>
                      <p class="validation" *ngIf="reservation.date_code_validation">
                        <ion-icon name="checkmark-circle-outline" color="success"></ion-icon>
                        Validé: {{ reservation.code_validation }}
                      </p>
                      <p class="pending" *ngIf="!reservation.date_code_validation">
                        <ion-icon name="time-outline" color="warning"></ion-icon>
                        En attente de validation
                      </p>
                    </div>
                  </div>
                </ion-item>
              </ion-list>
            </div>

            <!-- Actions -->
            <div class="actions-section">
              <ion-button 
                fill="outline" 
                expand="block"
                (click)="exportPeriodePDF(periode)">
                <ion-icon name="document-text-outline" slot="start"></ion-icon>
                Exporter en PDF
              </ion-button>
            </div>

          </div>
        </ion-accordion>
      </ion-accordion-group>

      <!-- État vide -->
      <div *ngIf="filteredPeriodes.length === 0" class="empty-state">
        <ion-icon name="wallet-outline" size="large"></ion-icon>
        <h3>Aucune commission trouvée</h3>
        <p>Aucune commission ne correspond aux critères sélectionnés.</p>
        <ion-button fill="outline" (click)="clearFilters()">
          <ion-icon name="refresh-outline" slot="start"></ion-icon>
          Voir toutes les commissions
        </ion-button>
      </div>

    </div>
  </div>
</ion-content>
  `,
  styleUrls: ['./mes-commissions.page.scss'],
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
    IonList,
    IonBadge,
    IonSpinner,
    IonRefresher,
    IonRefresherContent,
    IonSegment,
    IonSegmentButton,
    IonChip,
    IonAccordion,
    IonAccordionGroup
  ]
})
export class MesCommissionsPage implements OnInit {

  // Données
  periodes: PeriodeCommission[] = [];
  filteredPeriodes: PeriodeCommission[] = [];

  // Statistiques globales
  totalCommissions = 0;
  totalPaye = 0;
  totalEnAttente = 0;
  totalReservations = 0;

  // Données Flux Financier
  balanceEntreprise: any = null;
  entrepriseId: string | null = null;

  // État de l'interface
  isLoading = true;
  statutFilter: 'tous' | 'paye' | 'non_paye' | 'en_attente' = 'tous';
  
  // Filtres par période pour les réservations
  reservationFilters: { [periodeId: string]: 'validees' | 'en_attente' } = {};

  constructor(
    private commissionService: EntrepriseCommissionService,
    private fluxFinancierService: FluxFinancierService,
    private router: Router,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) {
    // Ajouter les icônes
    addIcons({
      arrowBackOutline,
      cashOutline,
      cardOutline,
      statsChartOutline,
      businessOutline,
      personOutline,
      carOutline,
      calendarOutline,
      timeOutline,
      locationOutline,
      downloadOutline,
      listOutline,
      gridOutline,
      refreshOutline,
      checkmarkCircleOutline,
      walletOutline,
      alertCircleOutline,
      hourglassOutline,
      documentTextOutline,
      eyeOutline,
      calculatorOutline,
      checkmarkCircle,
      time,
      informationCircle,
      'time-outline': timeOutlineIcon
    });
  }

  async ngOnInit() {
    await this.loadCommissions();
  }

  private async loadCommissions() {
    try {
      this.isLoading = true;
      
      // Récupérer l'ID de l'entreprise connectée
      await this.loadEntrepriseInfo();
      
      const { data, error } = await this.commissionService.getMesCommissions();
      
      if (error) {
        throw error;
      }

      this.periodes = data || [];
      
      // Charger la balance de l'entreprise
      if (this.entrepriseId) {
        await this.loadBalanceEntreprise();
      }
      this.calculateGlobalStats();
      this.applyFilters();

    } catch (error) {
      console.error('❌ Erreur chargement commissions:', error);
      this.showError('Erreur lors du chargement des commissions');
    } finally {
      this.isLoading = false;
    }
  }

  private calculateGlobalStats() {
    this.totalCommissions = this.periodes.reduce((sum, p) => sum + p.montant_commission, 0);
    this.totalPaye = this.periodes
      .filter(p => p.statut_paiement === 'paye')
      .reduce((sum, p) => sum + p.montant_commission, 0);
    this.totalEnAttente = this.periodes
      .filter(p => p.statut_paiement !== 'paye')
      .reduce((sum, p) => sum + p.montant_commission, 0);
    this.totalReservations = this.periodes.reduce((sum, p) => sum + p.nombre_reservations, 0);
  }

  private applyFilters() {
    if (this.statutFilter === 'tous') {
      this.filteredPeriodes = [...this.periodes];
    } else {
      this.filteredPeriodes = this.periodes.filter(p => p.statut_paiement === this.statutFilter);
    }
  }

  // Event handlers
  onFilterChange() {
    this.applyFilters();
  }

  clearFilters() {
    this.statutFilter = 'tous';
    this.applyFilters();
  }

  async onRefresh(event?: RefresherCustomEvent) {
    await this.loadCommissions();
    if (event) {
      event.target.complete();
    }
  }

  async exportPeriodePDF(periode: PeriodeCommission) {
    const toast = await this.toastController.create({
      message: '🚧 Export PDF - Fonctionnalité en développement',
      duration: 3000,
      color: 'warning',
      position: 'top'
    });
    await toast.present();
  }

  goBack() {
    this.router.navigate(['/entreprise/dashboard']);
  }

  // Utilitaires de comptage et affichage
  getCountByStatus(status: 'paye' | 'non_paye' | 'en_attente'): number {
    return this.periodes.filter(p => p.statut_paiement === status).length;
  }

  getPeriodeStatusText(statut: string): string {
    switch (statut) {
      case 'en_cours': return 'En Cours';
      case 'cloturee': return 'Clôturée';
      case 'facturee': return 'Facturée';
      case 'payee': return 'Payée';
      default: return statut;
    }
  }

  getPeriodeStatusColor(statut: string): string {
    switch (statut) {
      case 'en_cours': return 'primary';
      case 'cloturee': return 'warning';
      case 'facturee': return 'secondary';
      case 'payee': return 'success';
      default: return 'medium';
    }
  }

  getPaymentStatusIcon(statutPaiement: string): string {
    switch (statutPaiement) {
      case 'paye': return 'wallet-outline';
      case 'en_attente': return 'hourglass-outline';
      case 'non_paye':
      default: return 'alert-circle-outline';
    }
  }

  getPaymentStatusColor(statutPaiement: string): string {
    switch (statutPaiement) {
      case 'paye': return 'success';
      case 'en_attente': return 'warning';
      case 'non_paye':
      default: return 'danger';
    }
  }

  formatPrice(amount: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'GNF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC'
    });
  }

  trackByPeriode(index: number, periode: PeriodeCommission): string {
    return periode.id;
  }

  trackByReservation(index: number, reservation: ReservationCommission): string {
    return reservation.id;
  }

  // Gestion des filtres de réservations par période
  getReservationFilter(periodeId: string): 'validees' | 'en_attente' {
    return this.reservationFilters[periodeId] || 'validees';
  }

  onReservationFilterChange(event: any, periodeId: string) {
    this.reservationFilters[periodeId] = event.detail.value;
  }

  getFilteredReservations(reservations: ReservationCommission[], periodeId: string): ReservationCommission[] {
    if (!reservations) return [];
    
    const filter = this.getReservationFilter(periodeId);
    
    if (filter === 'validees') {
      return reservations.filter(r => r.date_code_validation != null);
    } else {
      return reservations.filter(r => r.date_code_validation == null);
    }
  }

  getValidatedReservationsCount(reservations?: ReservationCommission[]): number {
    if (!reservations) return 0;
    return reservations.filter(r => r.date_code_validation != null).length;
  }

  getPendingReservationsCount(reservations?: ReservationCommission[]): number {
    if (!reservations) return 0;
    return reservations.filter(r => r.date_code_validation == null).length;
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

  private async loadEntrepriseInfo() {
    try {
      // Pour l'instant, utilisons Jakarta taxi express comme exemple
      // Dans un vrai contexte, il faudrait récupérer l'ID depuis le service d'auth
      this.entrepriseId = '20100373-6776-4075-9f8e-a77da892cf67'; // Jakarta taxi express
      
      // TODO: Implémenter la vraie méthode d'authentification entreprise
      // const currentEntreprise = await this.getCurrentEntreprise();
      // this.entrepriseId = currentEntreprise?.id || null;
    } catch (error) {
      console.error('❌ Erreur récupération info entreprise:', error);
    }
  }

  private async loadBalanceEntreprise() {
    if (!this.entrepriseId) return;
    
    try {
      const { data: balances } = await this.fluxFinancierService.getBalancesEntreprises();
      
      // Trouver la balance de cette entreprise
      this.balanceEntreprise = balances?.find(balance => 
        balance.entreprise_id === this.entrepriseId
      ) || null;
      
    } catch (error) {
      console.error('❌ Erreur chargement balance entreprise:', error);
      this.balanceEntreprise = null;
    }
  }
}