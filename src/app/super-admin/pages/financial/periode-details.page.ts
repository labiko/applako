/**
 * PAGE DÉTAILS D'UNE PÉRIODE DE FACTURATION
 * Vue complète avec liste des réservations et commissions
 */

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
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
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonChip,
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
  filterOutline,
  listOutline,
  gridOutline,
  closeOutline,
  refreshOutline,
  checkmarkCircleOutline,
  checkmarkDoneOutline,
  warningOutline,
  informationCircleOutline,
  walletOutline,
  alertCircleOutline,
  hourglassOutline
} from 'ionicons/icons';

import { 
  FinancialManagementService, 
  FacturationPeriode, 
  CommissionDetail 
} from '../../services/financial-management.service';

// Interface pour une réservation avec détails
interface ReservationDetail {
  id: string;
  customer_name: string;
  customer_phone: string;
  client_phone: string; // Numéro de téléphone réel du client
  pickup_location: string;
  destination: string;
  pickup_date: string;
  pickup_time: string;
  prix_total: number;
  distance_km?: number; // Distance en kilomètres
  statut: string;
  created_at: string;
  date_code_validation?: string | null; // Date de validation du code
  code_validation?: string; // Code de validation
  conducteur?: {
    nom: string;
    telephone: string;
    entreprise?: {
      id: string;
      nom: string;
    };
  };
}

@Component({
  selector: 'app-periode-details',
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
      <ion-icon name="calendar-outline"></ion-icon>
      Détails Période
    </ion-title>
    <ion-button 
      slot="end" 
      fill="clear" 
      (click)="onExportPDF()"
      color="light">
      <ion-icon name="download-outline" slot="icon-only"></ion-icon>
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
      <p>Chargement des détails de la période...</p>
    </div>

    <!-- Contenu principal -->
    <div *ngIf="!isLoading && periode">
      
      <!-- En-tête de la période -->
      <ion-card class="periode-header-card">
        <ion-card-header>
          <ion-card-title>
            <ion-icon name="calendar-outline"></ion-icon>
            {{ formatDate(periode.periode_debut) }} - {{ formatDate(periode.periode_fin) }}
          </ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-grid>
            <ion-row>
              <ion-col size="6" size-md="3">
                <div class="stat-item">
                  <div class="stat-value">{{ formatPrice(periode.total_commissions || 0) }}</div>
                  <div class="stat-label">Total Commissions</div>
                </div>
              </ion-col>
              <ion-col size="6" size-md="3">
                <div class="stat-item">
                  <div class="stat-value">{{ periode.nombre_entreprises || 0 }}</div>
                  <div class="stat-label">Entreprises</div>
                </div>
              </ion-col>
              <ion-col size="6" size-md="3">
                <div class="stat-item">
                  <div class="stat-value">{{ reservations.length }}</div>
                  <div class="stat-label">Réservations</div>
                </div>
              </ion-col>
              <ion-col size="6" size-md="3">
                <div class="stat-item">
                  <div class="stat-value">
                    <ion-badge [color]="getPeriodeStatusColor(periode.statut)">
                      {{ getPeriodeStatusText(periode.statut) }}
                    </ion-badge>
                  </div>
                  <div class="stat-label">Statut</div>
                </div>
              </ion-col>
            </ion-row>
            <!-- Affichage date de clôture si période clôturée -->
            <ion-row *ngIf="periode.statut !== 'en_cours'">
              <ion-col size="12">
                <div class="cloture-info">
                  <ion-icon name="calendar-outline"></ion-icon>
                  <span>Clôturée le {{ formatClotureDate(periode.updated_at) }}</span>
                </div>
              </ion-col>
            </ion-row>
          </ion-grid>
        </ion-card-content>
      </ion-card>

      <!-- Commissions par entreprise -->
      <ion-card class="commissions-card" *ngIf="commissions.length > 0">
        <ion-card-header>
          <ion-card-title>
            <ion-icon name="business-outline"></ion-icon>
            Commissions par Entreprise
          </ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <div class="entreprise-grid">
            <div 
              *ngFor="let commission of commissions" 
              class="entreprise-item"
              [class.selected]="selectedEntreprise === commission.entreprise_id"
              (click)="filterByEntreprise(commission.entreprise_id)">
              
              <div class="entreprise-header">
                <h3>{{ commission.entreprise_nom || 'Entreprise Inconnue' }}</h3>
                <div class="commission-amount">
                  {{ formatPrice(commission.montant_commission) }}
                  <div class="payment-status">
                    <ion-button 
                      fill="clear" 
                      size="small"
                      class="payment-status-btn"
                      [color]="getPaymentStatusColor(commission.statut_paiement)"
                      (click)="togglePaymentStatus($event, commission)"
                      [title]="getPaymentStatusTooltip(commission)">
                      <ion-icon 
                        [name]="getPaymentStatusIcon(commission.statut_paiement)" 
                        slot="icon-only">
                      </ion-icon>
                    </ion-button>
                    <span 
                      *ngIf="commission.statut_paiement === 'paye' && commission.date_versement_commission" 
                      class="payment-date">
                      {{ formatPaymentDateTime(commission.date_versement_commission) }}
                    </span>
                  </div>
                </div>
              </div>
              
              <div class="entreprise-stats">
                <ion-chip color="primary" outline>
                  <ion-icon name="car-outline"></ion-icon>
                  <ion-label>{{ commission.nombre_reservations }} courses</ion-label>
                </ion-chip>
                <ion-chip color="success" outline>
                  <ion-icon name="cash-outline"></ion-icon>
                  <ion-label>{{ formatPrice(commission.chiffre_affaire_brut) }}</ion-label>
                </ion-chip>
                <ion-chip color="warning" outline>
                  <ion-icon name="stats-chart-outline"></ion-icon>
                  <ion-label>{{ commission.taux_commission_moyen }}%</ion-label>
                </ion-chip>
              </div>
            </div>
          </div>
        </ion-card-content>
      </ion-card>

      <!-- Filtres et recherche -->
      <ion-card class="filters-card">
        <ion-card-content>
          <ion-grid>
            <ion-row>
              <ion-col size="12" size-md="8">
                <ion-searchbar
                  [(ngModel)]="searchTerm"
                  (ionInput)="filterReservations()"
                  placeholder="Rechercher par client, conducteur, lieu..."
                  debounce="300">
                </ion-searchbar>
              </ion-col>
              <ion-col size="12" size-md="4">
                <ion-segment [(ngModel)]="viewMode" (ionChange)="onViewModeChange()">
                  <ion-segment-button value="list">
                    <ion-icon name="list-outline"></ion-icon>
                    <ion-label>Liste</ion-label>
                  </ion-segment-button>
                  <ion-segment-button value="grid">
                    <ion-icon name="grid-outline"></ion-icon>
                    <ion-label>Cartes</ion-label>
                  </ion-segment-button>
                </ion-segment>
              </ion-col>
            </ion-row>
          </ion-grid>
          
          <!-- Filtres rapides -->
          <div class="quick-filters" *ngIf="selectedEntreprise">
            <ion-chip 
              color="primary" 
              (click)="clearFilters()">
              <ion-icon name="filter-outline"></ion-icon>
              <ion-label>{{ getSelectedEntrepriseName() }}</ion-label>
              <ion-icon name="close-outline"></ion-icon>
            </ion-chip>
          </div>
        </ion-card-content>
      </ion-card>

      <!-- Liste des réservations avec onglets -->
      <ion-card class="reservations-card">
        <ion-card-header>
          <ion-card-title>
            <ion-icon name="car-outline"></ion-icon>
            Réservations
          </ion-card-title>
        </ion-card-header>
        <ion-card-content>
          
          <!-- Onglets Validées / En attente -->
          <ion-segment [(ngModel)]="reservationTab" (ionChange)="onReservationTabChange()">
            <ion-segment-button value="validees">
              <ion-label>
                Validées ({{ reservationsValidees.length }})
                <ion-icon name="checkmark-circle-outline"></ion-icon>
              </ion-label>
            </ion-segment-button>
            <ion-segment-button value="attente">
              <ion-label>
                En attente ({{ reservationsEnAttente.length }})
                <ion-icon name="time-outline"></ion-icon>
              </ion-label>
            </ion-segment-button>
          </ion-segment>
          
          <!-- Badge d'info pour l'onglet actif -->
          <div class="tab-info" *ngIf="reservationTab === 'validees'">
            <ion-chip color="success">
              <ion-icon name="information-circle-outline"></ion-icon>
              <ion-label>Ces réservations sont comptées dans les commissions</ion-label>
            </ion-chip>
          </div>
          <div class="tab-info" *ngIf="reservationTab === 'attente'">
            <ion-chip color="warning">
              <ion-icon name="warning-outline"></ion-icon>
              <ion-label>Ces réservations ne sont PAS comptées dans les commissions</ion-label>
            </ion-chip>
          </div>
          
          <!-- Vue Liste -->
          <ion-list *ngIf="viewMode === 'list'">
            <ion-item 
              *ngFor="let reservation of filteredReservations; trackBy: trackByReservation"
              class="reservation-item">
              
              <div class="reservation-content">
                <div class="reservation-header">
                  <h3>{{ reservation.client_phone }}</h3>
                  <div class="prix">{{ formatPrice(reservation.prix_total) }}</div>
                </div>
                
                <div class="reservation-details">
                  <p class="reservation-id">
                    <ion-icon name="card-outline"></ion-icon>
                    ID: {{ reservation.id }}
                  </p>
                  <p class="trajet">
                    <ion-icon name="location-outline"></ion-icon>
                    {{ reservation.pickup_location }} → {{ reservation.destination }}
                  </p>
                  <p class="price-distance">
                    <ion-icon name="cash-outline"></ion-icon>
                    {{ formatPrice(reservation.prix_total) }} • {{ reservation.distance_km || 0 }} km
                  </p>
                  <p class="datetime">
                    <ion-icon name="calendar-outline"></ion-icon>
                    {{ formatDateTime(reservation.pickup_date, reservation.pickup_time) }}
                  </p>
                  <p class="conducteur" *ngIf="reservation.conducteur">
                    <ion-icon name="person-outline"></ion-icon>
                    {{ reservation.conducteur.nom }} ({{ reservation.conducteur.entreprise?.nom }})
                  </p>
                  <p class="validation-status" *ngIf="reservation.date_code_validation">
                    <ion-icon name="checkmark-done-outline" color="success"></ion-icon>
                    Code validé le {{ formatDate(reservation.date_code_validation) }}
                  </p>
                  <p class="validation-status" *ngIf="!reservation.date_code_validation">
                    <ion-icon name="time-outline" color="warning"></ion-icon>
                    En attente de validation
                  </p>
                </div>
                
                <div class="reservation-footer">
                  <ion-badge [color]="getReservationStatusColor(reservation.statut)">
                    {{ reservation.statut }}
                  </ion-badge>
                  <span class="created-date">{{ formatDate(reservation.created_at) }}</span>
                </div>
              </div>
            </ion-item>
          </ion-list>

          <!-- Vue Cartes -->
          <div *ngIf="viewMode === 'grid'" class="reservations-grid">
            <div 
              *ngFor="let reservation of filteredReservations; trackBy: trackByReservation"
              class="reservation-card">
              
              <div class="card-header">
                <h4>{{ reservation.client_phone }}</h4>
                <div class="prix">{{ formatPrice(reservation.prix_total) }}</div>
              </div>
              
              <div class="card-body">
                <p class="reservation-id">
                  <ion-icon name="card-outline"></ion-icon>
                  ID: {{ reservation.id }}
                </p>
                <p class="trajet">
                  <ion-icon name="location-outline"></ion-icon>
                  {{ reservation.pickup_location }} → {{ reservation.destination }}
                </p>
                <p class="price-distance">
                  <ion-icon name="cash-outline"></ion-icon>
                  {{ formatPrice(reservation.prix_total) }} • {{ reservation.distance_km || 0 }} km
                </p>
                <p class="datetime">
                  <ion-icon name="time-outline"></ion-icon>
                  {{ formatDateTime(reservation.pickup_date, reservation.pickup_time) }}
                </p>
                <p class="conducteur" *ngIf="reservation.conducteur">
                  <ion-icon name="person-outline"></ion-icon>
                  {{ reservation.conducteur.nom }}
                </p>
                <p class="validation-status">
                  <ion-icon [name]="reservation.date_code_validation ? 'checkmark-done-outline' : 'time-outline'" 
                            [color]="reservation.date_code_validation ? 'success' : 'warning'"></ion-icon>
                  {{ reservation.date_code_validation ? 'Validé' : 'En attente' }}
                </p>
              </div>
              
              <div class="card-footer">
                <ion-badge [color]="getReservationStatusColor(reservation.statut)" size="small">
                  {{ reservation.statut }}
                </ion-badge>
              </div>
            </div>
          </div>

          <!-- État vide -->
          <div *ngIf="filteredReservations.length === 0" class="empty-state">
            <ion-icon name="car-outline" size="large"></ion-icon>
            <h3>Aucune réservation trouvée</h3>
            <p>Aucune réservation ne correspond aux critères de recherche.</p>
            <ion-button fill="outline" (click)="clearFilters()">
              <ion-icon name="refresh-outline" slot="start"></ion-icon>
              Effacer les filtres
            </ion-button>
          </div>
        </ion-card-content>
      </ion-card>

    </div>
  </div>
</ion-content>
  `,
  styleUrls: ['./periode-details.page.scss'],
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
    IonSearchbar,
    IonSegment,
    IonSegmentButton,
    IonChip
  ]
})
export class PeriodeDetailsPage implements OnInit {

  // Données
  periode: FacturationPeriode | null = null;
  commissions: CommissionDetail[] = [];
  reservations: ReservationDetail[] = [];
  filteredReservations: ReservationDetail[] = [];
  
  // Séparation des réservations validées vs en attente
  reservationsValidees: ReservationDetail[] = [];
  reservationsEnAttente: ReservationDetail[] = [];
  filteredValidees: ReservationDetail[] = [];
  filteredEnAttente: ReservationDetail[] = [];

  // État de l'interface
  isLoading = true;
  searchTerm = '';
  selectedEntreprise: string | null = null;
  viewMode: 'list' | 'grid' = 'list';
  reservationTab: 'validees' | 'attente' = 'validees'; // Onglet actif

  // ID de la période
  periodeId: string | null = null;

  constructor(
    private financialService: FinancialManagementService,
    private route: ActivatedRoute,
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
      filterOutline,
      listOutline,
      gridOutline,
      closeOutline,
      refreshOutline,
      checkmarkCircleOutline,
      checkmarkDoneOutline,
      warningOutline,
      informationCircleOutline,
      walletOutline,
      alertCircleOutline,
      hourglassOutline
    });
  }

  async ngOnInit() {
    this.periodeId = this.route.snapshot.paramMap.get('id');
    if (this.periodeId) {
      await this.loadPeriodeDetails();
    } else {
      this.showError('ID de période manquant');
      this.goBack();
    }
  }

  private async loadPeriodeDetails() {
    try {
      this.isLoading = true;
      
      // Charger les données de la période
      await this.loadPeriode();
      await this.loadCommissions();
      await this.loadReservations();

    } catch (error) {
      console.error('❌ Erreur chargement détails période:', error);
      this.showError('Erreur lors du chargement des détails');
    } finally {
      this.isLoading = false;
    }
  }

  private async loadPeriode() {
    const { data: periodes } = await this.financialService.getPeriodes();
    this.periode = periodes?.find(p => p.id === this.periodeId) || null;
  }

  private async loadCommissions() {
    if (!this.periodeId) return;
    const { data } = await this.financialService.getCommissionsDetail(this.periodeId);
    this.commissions = data || [];
  }

  private async loadReservations() {
    if (!this.periode) return;
    
    const { data } = await this.financialService.getReservationsPeriode(
      this.periode.periode_debut, 
      this.periode.periode_fin
    );
    this.reservations = data || [];
    
    // Séparer les réservations validées vs en attente
    this.reservationsValidees = this.reservations.filter(r => r.date_code_validation !== null);
    this.reservationsEnAttente = this.reservations.filter(r => r.date_code_validation === null);
    
    // Initialiser les listes filtrées
    this.filteredValidees = [...this.reservationsValidees];
    this.filteredEnAttente = [...this.reservationsEnAttente];
    this.filteredReservations = this.reservationTab === 'validees' 
      ? this.filteredValidees 
      : this.filteredEnAttente;
  }

  // Filtres et recherche
  filterReservations() {
    // Déterminer la liste source selon l'onglet actif
    const sourceList = this.reservationTab === 'validees' 
      ? this.reservationsValidees 
      : this.reservationsEnAttente;
    
    let filtered = [...sourceList];

    // Filtre par entreprise
    if (this.selectedEntreprise) {
      filtered = filtered.filter(r => 
        r.conducteur?.entreprise?.id === this.selectedEntreprise
      );
    }

    // Filtre par terme de recherche
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(r =>
        r.client_phone.toLowerCase().includes(term) ||
        r.pickup_location.toLowerCase().includes(term) ||
        r.destination.toLowerCase().includes(term) ||
        r.conducteur?.nom.toLowerCase().includes(term) ||
        r.conducteur?.entreprise?.nom.toLowerCase().includes(term) ||
        r.id.toLowerCase().includes(term)
      );
    }

    // Mettre à jour la liste filtrée appropriée
    if (this.reservationTab === 'validees') {
      this.filteredValidees = filtered;
      this.filteredReservations = this.filteredValidees;
    } else {
      this.filteredEnAttente = filtered;
      this.filteredReservations = this.filteredEnAttente;
    }
  }

  filterByEntreprise(entrepriseId: string) {
    this.selectedEntreprise = this.selectedEntreprise === entrepriseId ? null : entrepriseId;
    this.filterReservations();
  }

  clearFilters() {
    this.selectedEntreprise = null;
    this.searchTerm = '';
    this.filterReservations();
  }

  getSelectedEntrepriseName(): string {
    if (!this.selectedEntreprise) return '';
    const commission = this.commissions.find(c => c.entreprise_id === this.selectedEntreprise);
    return commission?.entreprise_nom || 'Entreprise';
  }

  onViewModeChange() {
    // Logique additionnelle si nécessaire
  }

  onReservationTabChange() {
    // Changer la liste affichée selon l'onglet
    this.filteredReservations = this.reservationTab === 'validees' 
      ? this.filteredValidees 
      : this.filteredEnAttente;
    
    // Réappliquer les filtres
    this.filterReservations();
  }

  // ===============================================
  // GESTION STATUT PAIEMENT
  // ===============================================

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

  getPaymentStatusTooltip(commission: CommissionDetail): string {
    switch (commission.statut_paiement) {
      case 'paye': 
        return commission.date_versement_commission 
          ? `Payé le ${this.formatDate(commission.date_versement_commission)}` 
          : 'Payé';
      case 'en_attente': return 'Paiement en attente';
      case 'non_paye':
      default: return 'Non payé - Cliquer pour marquer comme payé';
    }
  }

  async togglePaymentStatus(event: Event, commission: CommissionDetail) {
    event.stopPropagation(); // Empêcher le filtrage par entreprise

    try {
      const loading = await this.loadingController.create({
        message: 'Mise à jour du statut de paiement...',
      });
      await loading.present();

      let result;
      if (commission.statut_paiement === 'paye') {
        // Marquer comme non payé
        result = await this.financialService.marquerCommissionNonPayee(commission.id);
      } else {
        // Marquer comme payé avec la date actuelle
        const dateVersement = new Date().toISOString();
        result = await this.financialService.marquerCommissionPayee(commission.id, dateVersement);
      }

      await loading.dismiss();

      if (result.success) {
        const newStatus = commission.statut_paiement === 'paye' ? 'non_paye' : 'paye';
        const message = newStatus === 'paye' 
          ? `✅ Commission marquée comme payée`
          : `⚠️ Commission marquée comme non payée`;

        // Mettre à jour localement
        commission.statut_paiement = newStatus;
        if (newStatus === 'paye') {
          commission.date_versement_commission = new Date().toISOString();
        } else {
          commission.date_versement_commission = undefined;
        }

        const toast = await this.toastController.create({
          message,
          duration: 3000,
          color: newStatus === 'paye' ? 'success' : 'warning',
          position: 'top'
        });
        await toast.present();

      } else {
        this.showError('Erreur lors de la mise à jour du statut');
      }
    } catch (error) {
      console.error('❌ Erreur togglePaymentStatus:', error);
      this.showError('Erreur lors de la mise à jour');
    }
  }

  // Event handlers
  async onRefresh(event?: RefresherCustomEvent) {
    await this.loadPeriodeDetails();
    if (event) {
      event.target.complete();
    }
  }

  async onExportPDF() {
    const toast = await this.toastController.create({
      message: '🚧 Export PDF - Fonctionnalité en développement',
      duration: 3000,
      color: 'warning',
      position: 'top'
    });
    await toast.present();
  }

  goBack() {
    this.router.navigate(['/super-admin/financial']);
  }

  // Utilitaires
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

  getReservationStatusColor(statut: string): string {
    switch (statut) {
      case 'completed': return 'success';
      case 'accepted': return 'primary';
      case 'pending': return 'warning';
      case 'refused': return 'danger';
      default: return 'medium';
    }
  }

  formatPrice(amount: number): string {
    return this.financialService.formatPrice(amount);
  }

  formatDate(dateString: string): string {
    return this.financialService.formatDate(dateString);
  }

  formatDateTime(date: string, time: string): string {
    const dateObj = new Date(`${date}T${time}`);
    return dateObj.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatPaymentDateTime(dateString: string): string {
    return new Date(dateString).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Africa/Conakry' // GMT+0
    });
  }

  formatClotureDate(dateString: string): string {
    if (!dateString) {
      return 'Date inconnue';
    }
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Date invalide';
      }
      
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Date invalide';
    }
  }

  trackByReservation(index: number, reservation: ReservationDetail): string {
    return reservation.id;
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