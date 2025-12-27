/**
 * PAGE APERÇU FINANCIER ENTREPRISE
 * Interface simple pour voir gains, balance et historique paiements
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
  IonItem,
  IonLabel,
  IonList,
  IonBadge,
  IonSpinner,
  IonChip,
  IonGrid,
  IonRow,
  IonCol,
  IonText,
  IonButtons,
  IonAccordion,
  IonAccordionGroup,
  IonModal,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  LoadingController,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  arrowBackOutline,
  walletOutline,
  cardOutline,
  cashOutline,
  trendingUpOutline,
  receiptOutline,
  checkmarkCircleOutline,
  timeOutline,
  eyeOutline,
  phonePortraitOutline,
  businessOutline,
  statsChartOutline,
  calendarOutline,
  refreshOutline,
  closeOutline,
  searchOutline,
  carOutline,
  locationOutline,
  personOutline,
  callOutline
} from 'ionicons/icons';

import { SupabaseService } from '../../../services/supabase.service';

interface ReservationDetail {
  id: string;
  client_phone: string;
  depart_nom: string;
  destination_nom: string;
  prix_total: number;
  date_reservation: string;
  heure_reservation: number | null;
  minute_reservation: number | null;
  statut: string;
  mode_paiement: string;
  conducteur_nom?: string;
  distance_km?: number;
  commission_calculee: number;
  revenus_entreprise: number;
}

interface PeriodeFinanciere {
  periode_id: string;
  periode_debut: string;
  periode_fin: string;
  statut_periode: string;
  
  // Données financières calculées
  ca_mobile_money: number;
  ca_cash: number;
  ca_total: number;
  commission_totale: number;
  revenus_nets: number;
  
  // Détail des courses
  nombre_courses_mm: number;
  nombre_courses_cash: number;
  reservations_mm: ReservationDetail[];
  reservations_cash: ReservationDetail[];
  
  // Paiement reçu
  paiement_recu?: number;
  date_paiement?: string;
  methode_paiement?: string;
  reste_du: number;
  est_paye: boolean;
}

interface ResumeFinancier {
  balance_actuelle: number;
  total_revenus_nets: number;
  total_mm_recu: number;
  total_cash_collecte: number;
  total_commission_deduite: number;
  nombre_periodes: number;
}

@Component({
  selector: 'app-financial-overview',
  template: `
<ion-header>
  <ion-toolbar color="primary">
    <ion-buttons slot="start">
      <ion-button fill="clear" (click)="goBack()">
        <ion-icon name="arrow-back-outline" slot="icon-only"></ion-icon>
      </ion-button>
    </ion-buttons>
    <ion-title>
      <div class="title-container">
        <div class="icon-wrapper">
          <ion-icon name="wallet-outline"></ion-icon>
        </div>
        <div class="title-text">
          <span class="main-title">Mes Revenus</span>
          <span class="sub-title">Gains & Paiements</span>
        </div>
      </div>
    </ion-title>
    <ion-buttons slot="end">
      <ion-button fill="clear" (click)="onRefresh()">
        <ion-icon name="refresh-outline" slot="icon-only"></ion-icon>
      </ion-button>
    </ion-buttons>
  </ion-toolbar>
</ion-header>

<ion-content>
  <div class="page-container">
    
    <!-- Résumé Financier Global -->
    <ion-card class="resume-card">
      <ion-card-header>
        <ion-card-title>
          <ion-icon name="stats-chart-outline"></ion-icon>
          💰 MES GAINS TOTAUX
        </ion-card-title>
      </ion-card-header>
      <ion-card-content>
        <div class="resume-grid">
          <div class="resume-item mobile-money">
            <div class="resume-icon">📱</div>
            <div class="resume-content">
              <div class="resume-label">Mobile Money Reçu</div>
              <div class="resume-value">{{ formatPrice(resume.total_mm_recu) }}</div>
              <div class="resume-info">Automatiquement</div>
            </div>
          </div>
          
          <div class="resume-item cash">
            <div class="resume-icon">💵</div>
            <div class="resume-content">
              <div class="resume-label">Cash Collecté</div>
              <div class="resume-value">{{ formatPrice(resume.total_cash_collecte) }}</div>
              <div class="resume-info">Par mes conducteurs</div>
            </div>
          </div>
          
          <div class="resume-item commission">
            <div class="resume-icon">➖</div>
            <div class="resume-content">
              <div class="resume-label">Commission Admin</div>
              <div class="resume-value negative">{{ formatPrice(resume.total_commission_deduite) }}</div>
              <div class="resume-info">11% sur tout</div>
            </div>
          </div>
          
          <div class="resume-item total">
            <div class="resume-icon">✅</div>
            <div class="resume-content">
              <div class="resume-label">MES REVENUS NETS</div>
              <div class="resume-value success">{{ formatPrice(resume.total_revenus_nets) }}</div>
              <div class="resume-info">{{ resume.nombre_periodes }} période(s)</div>
            </div>
          </div>
        </div>
        
        <!-- Balance Actuelle -->
        <div class="balance-section">
          <div class="balance-container" [class.positive]="resume.balance_actuelle > 0" [class.negative]="resume.balance_actuelle < 0" [class.zero]="resume.balance_actuelle === 0">
            <div class="balance-icon">
              <ion-icon [name]="getBalanceIcon()"></ion-icon>
            </div>
            <div class="balance-info">
              <div class="balance-label">{{ getBalanceText() }}</div>
              <div class="balance-amount">{{ formatPrice(getAbsoluteValue(resume.balance_actuelle)) }}</div>
            </div>
          </div>
        </div>
      </ion-card-content>
    </ion-card>

    <!-- Loading -->
    <div *ngIf="isLoading" class="loading-container">
      <ion-spinner></ion-spinner>
      <p>Chargement de vos données financières...</p>
    </div>

    <!-- Historique par Période -->
    <ion-card *ngIf="!isLoading" class="periodes-card">
      <ion-card-header>
        <ion-card-title>
          <ion-icon name="calendar-outline"></ion-icon>
          📅 Historique par Période ({{ periodes.length }})
        </ion-card-title>
      </ion-card-header>
      <ion-card-content>
        
        <!-- Message si vide -->
        <div *ngIf="periodes.length === 0" class="empty-state">
          <ion-icon name="calendar-outline"></ion-icon>
          <h3>Aucune période trouvée</h3>
          <p>Vos données financières apparaîtront ici une fois les périodes calculées.</p>
        </div>

        <!-- Accordéons des périodes -->
        <ion-accordion-group *ngIf="periodes.length > 0">
          <ion-accordion *ngFor="let periode of periodes" [value]="periode.periode_id">
            
            <!-- Header de la période -->
            <ion-item slot="header" color="light">
              <div class="periode-header">
                <div class="periode-info">
                  <div class="periode-dates">
                    🗓️ {{ formatPeriodeName(periode.periode_debut, periode.periode_fin) }}
                  </div>
                  <div class="periode-revenus">
                    <span class="revenus-label">Revenus:</span>
                    <span class="revenus-value" [class.success]="periode.revenus_nets > 0" [class.negative]="periode.revenus_nets < 0">
                      {{ formatPrice(periode.revenus_nets) }}
                    </span>
                  </div>
                </div>
                <div class="periode-status">
                  <ion-badge [color]="periode.est_paye ? 'success' : (periode.reste_du > 0 ? 'warning' : 'medium')">
                    {{ periode.est_paye ? '✅ PAYÉE' : (periode.reste_du > 0 ? '⏳ DUE' : '📊 CALCULÉE') }}
                  </ion-badge>
                  <div class="reste-info" *ngIf="!periode.est_paye && periode.reste_du > 0">
                    <small>Reste: {{ formatPrice(periode.reste_du) }}</small>
                  </div>
                </div>
              </div>
            </ion-item>

            <!-- Contenu détaillé -->
            <div class="periode-content" slot="content">
              
              <!-- Résumé de la période -->
              <div class="periode-summary">
                <div class="summary-row">
                  <div class="summary-item">
                    <ion-icon name="phone-portrait-outline" color="success"></ion-icon>
                    <div>
                      <div class="summary-label">Mobile Money</div>
                      <div class="summary-value">{{ periode.nombre_courses_mm }} courses</div>
                      <div class="summary-amount success">{{ formatPrice(periode.ca_mobile_money) }}</div>
                      <div class="summary-note">Reçu automatiquement</div>
                    </div>
                  </div>
                  
                  <div class="summary-item">
                    <ion-icon name="cash-outline" color="warning"></ion-icon>
                    <div>
                      <div class="summary-label">Cash</div>
                      <div class="summary-value">{{ periode.nombre_courses_cash }} courses</div>
                      <div class="summary-amount warning">{{ formatPrice(periode.ca_cash) }}</div>
                      <div class="summary-note">Je collecte</div>
                    </div>
                  </div>
                </div>
                
                <div class="calcul-row">
                  <div class="calcul-item">
                    <span class="calcul-label">➖ Commission Admin (11%):</span>
                    <span class="calcul-value negative">{{ formatPrice(periode.commission_totale) }}</span>
                  </div>
                  <div class="calcul-item total">
                    <span class="calcul-label">🏆 MES REVENUS:</span>
                    <span class="calcul-value success">{{ formatPrice(periode.revenus_nets) }}</span>
                  </div>
                </div>
              </div>

              <!-- Paiement reçu -->
              <div class="paiement-section" *ngIf="periode.paiement_recu">
                <div class="paiement-info">
                  <ion-icon name="checkmark-circle-outline" color="success"></ion-icon>
                  <div class="paiement-details">
                    <div class="paiement-title">💰 PAIEMENT REÇU</div>
                    <div class="paiement-amount">{{ formatPrice(periode.paiement_recu) }}</div>
                    <div class="paiement-date">le {{ formatDate(periode.date_paiement || '') }}</div>
                    <ion-chip [color]="getMethodeColor(periode.methode_paiement || '')" outline>
                      <ion-icon [name]="getMethodeIcon(periode.methode_paiement || '')"></ion-icon>
                      <ion-label>{{ getMethodeText(periode.methode_paiement || '') }}</ion-label>
                    </ion-chip>
                  </div>
                </div>
                <div class="reste-section">
                  <span class="reste-label">Reste dû:</span>
                  <span class="reste-value" [class.zero]="periode.reste_du === 0" [class.positive]="periode.reste_du > 0">
                    {{ formatPrice(periode.reste_du) }}
                  </span>
                </div>
              </div>

              <!-- Bouton voir réservations -->
              <div class="actions-section">
                <ion-button expand="block" fill="outline" (click)="voirReservationsPeriode(periode)">
                  <ion-icon name="eye-outline" slot="start"></ion-icon>
                  Voir les {{ periode.nombre_courses_mm + periode.nombre_courses_cash }} réservations
                </ion-button>
              </div>
            </div>
          </ion-accordion>
        </ion-accordion-group>
      </ion-card-content>
    </ion-card>

  </div>
</ion-content>

<!-- Modal Réservations Détaillées -->
<ion-modal [isOpen]="showReservationsModal" (didDismiss)="closeReservationsModal()">
  <ng-template>
    <ion-header>
      <ion-toolbar style="--background: var(--lako-green); --color: var(--lako-dark);">
        <ion-title>
          Réservations {{ selectedPeriode ? formatPeriodeName(selectedPeriode.periode_debut, selectedPeriode.periode_fin) : '' }}
        </ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="closeReservationsModal()">
            <ion-icon name="close-circle-outline" slot="icon-only" style="color: white;"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="modal-content">
      
      <!-- Statistiques de la période -->
      <ion-card class="stats-card">
        <ion-card-content>
          <ion-grid>
            <ion-row>
              <ion-col size="12" size-md="6">
                <div class="stat-item">
                  <div class="stat-value">{{ filteredReservations.length }}</div>
                  <div class="stat-label">Réservations</div>
                </div>
              </ion-col>
              <ion-col size="12" size-md="6">
                <div class="stat-item">
                  <div class="stat-value">{{ formatPrice(getTotalByType('all')) }}</div>
                  <div class="stat-label">CA Total</div>
                </div>
              </ion-col>
            </ion-row>
            <ion-row>
              <ion-col size="12" size-md="6">
                <div class="stat-item mobile-money">
                  <div class="stat-value">{{ formatPrice(getTotalByType('mobile_money')) }}</div>
                  <div class="stat-label">
                    <ion-icon name="phone-portrait-outline"></ion-icon>
                    Mobile Money
                  </div>
                </div>
              </ion-col>
              <ion-col size="12" size-md="6">
                <div class="stat-item cash">
                  <div class="stat-value">{{ formatPrice(getTotalByType('cash')) }}</div>
                  <div class="stat-label">
                    <ion-icon name="cash-outline"></ion-icon>
                    Cash
                  </div>
                </div>
              </ion-col>
            </ion-row>
          </ion-grid>
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
                  (ionInput)="onSearchChange($event)"
                  placeholder="Rechercher par téléphone, lieu..."
                  show-clear-button="focus">
                </ion-searchbar>
              </ion-col>
              <ion-col size="12" size-md="4">
                <ion-select 
                  [(ngModel)]="filterType" 
                  (ionChange)="onFilterChange($event)"
                  placeholder="Type"
                  fill="outline">
                  <ion-select-option value="all">Tous</ion-select-option>
                  <ion-select-option value="mobile_money">Mobile Money</ion-select-option>
                  <ion-select-option value="cash">Cash</ion-select-option>
                </ion-select>
              </ion-col>
            </ion-row>
          </ion-grid>
        </ion-card-content>
      </ion-card>

      <!-- Liste des réservations -->
      <div class="reservations-list">
        <ion-card *ngFor="let reservation of filteredReservations; trackBy: trackByReservation" class="reservation-card">
          <ion-card-content>
            <ion-grid>
              <ion-row>
                <ion-col size="12" size-md="8">
                  <!-- Informations principales -->
                  <div class="reservation-header">
                    <div class="client-phone">
                      <ion-icon name="call-outline"></ion-icon>
                      {{ reservation.client_phone }}
                    </div>
                    <div class="datetime">
                      {{ formatDateTime(reservation.date_reservation, reservation.heure_reservation, reservation.minute_reservation) }}
                    </div>
                  </div>
                  
                  <!-- ID de réservation complet -->
                  <div class="reservation-id">
                    <ion-icon name="receipt-outline"></ion-icon>
                    <span class="full-id">{{ reservation.id }}</span>
                  </div>

                  <!-- Trajet -->
                  <div class="trip-info">
                    <div class="locations">
                      <div class="departure">
                        <ion-icon name="location-outline" color="success"></ion-icon>
                        <span>{{ reservation.depart_nom || 'Position GPS' }}</span>
                      </div>
                      <div class="destination">
                        <ion-icon name="location-outline" color="danger"></ion-icon>
                        <span>{{ reservation.destination_nom }}</span>
                      </div>
                    </div>
                    
                    <!-- Conducteur -->
                    <div class="driver-info" *ngIf="reservation.conducteur_nom">
                      <ion-icon name="person-outline"></ion-icon>
                      {{ reservation.conducteur_nom }}
                    </div>
                  </div>
                </ion-col>

                <ion-col size="12" size-md="4" class="reservation-summary">
                  <!-- Prix total -->
                  <div class="price-total">
                    {{ formatPrice(reservation.prix_total) }}
                  </div>
                  
                  <!-- Mode de paiement -->
                  <ion-chip [color]="getPaymentColor(reservation.mode_paiement)" class="payment-chip">
                    <ion-icon [name]="getPaymentIcon(reservation.mode_paiement)"></ion-icon>
                    {{ getPaymentText(reservation.mode_paiement) }}
                  </ion-chip>

                  <!-- Revenus entreprise -->
                  <div class="enterprise-revenue">
                    <small>Revenus:</small>
                    <strong>{{ formatPrice(reservation.revenus_entreprise) }}</strong>
                  </div>

                  <!-- Commission -->
                  <div class="commission">
                    <small>Commission (11%):</small>
                    <span class="commission-amount">{{ formatPrice(reservation.commission_calculee) }}</span>
                  </div>
                </ion-col>
              </ion-row>
            </ion-grid>
          </ion-card-content>
        </ion-card>

        <!-- Message si aucune réservation -->
        <div *ngIf="filteredReservations.length === 0" class="no-reservations">
          <ion-icon name="car-outline" size="large"></ion-icon>
          <h3>Aucune réservation trouvée</h3>
          <p *ngIf="searchTerm || filterType !== 'all'">
            Essayez de modifier vos filtres de recherche.
          </p>
          <p *ngIf="!searchTerm && filterType === 'all'">
            Aucune réservation pour cette période.
          </p>
        </div>
      </div>

    </ion-content>
  </ng-template>
</ion-modal>
  `,
  styleUrls: ['./financial-overview.page.scss'],
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
    IonItem,
    IonLabel,
    IonList,
    IonBadge,
    IonSpinner,
    IonChip,
    IonGrid,
    IonRow,
    IonCol,
    IonText,
    IonButtons,
    IonAccordion,
    IonAccordionGroup,
    IonModal,
    IonSearchbar,
    IonSelect,
    IonSelectOption
  ]
})
export class FinancialOverviewPage implements OnInit {

  // Données
  periodes: PeriodeFinanciere[] = [];
  resume: ResumeFinancier = {
    balance_actuelle: 0,
    total_revenus_nets: 0,
    total_mm_recu: 0,
    total_cash_collecte: 0,
    total_commission_deduite: 0,
    nombre_periodes: 0
  };

  // État
  isLoading = true;
  entrepriseId: string | null = null;
  
  // Modal réservations
  showReservationsModal = false;
  selectedPeriode: PeriodeFinanciere | null = null;
  allReservations: ReservationDetail[] = [];
  filteredReservations: ReservationDetail[] = [];
  searchTerm = '';
  filterType = 'all'; // 'all', 'mobile_money', 'cash'

  constructor(
    private supabase: SupabaseService,
    private router: Router,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) {
    addIcons({
      arrowBackOutline,
      walletOutline,
      cardOutline,
      cashOutline,
      trendingUpOutline,
      receiptOutline,
      checkmarkCircleOutline,
      timeOutline,
      eyeOutline,
      phonePortraitOutline,
      businessOutline,
      statsChartOutline,
      calendarOutline,
      refreshOutline,
      closeOutline,
      searchOutline,
      carOutline,
      locationOutline,
      personOutline,
      callOutline
    });
  }

  async ngOnInit() {
    await this.loadEntrepriseData();
  }

  async loadEntrepriseData() {
    try {
      this.isLoading = true;

      // Récupérer l'ID de l'entreprise connectée (à adapter selon votre système d'auth)
      this.entrepriseId = await this.getConnectedEntrepriseId();
      
      if (!this.entrepriseId) {
        throw new Error('Entreprise non identifiée');
      }

      // Charger les données financières
      await this.loadPeriodesFinancieres();
      await this.calculerResumeFinancier();

    } catch (error) {
      console.error('❌ Erreur chargement données:', error);
      this.showError('Erreur lors du chargement des données');
    } finally {
      this.isLoading = false;
    }
  }

  async getConnectedEntrepriseId(): Promise<string> {
    // À adapter selon votre système d'authentification
    // Pour l'exemple, je prends Jakarta Taxi Express
    const { data } = await this.supabase.client
      .from('entreprises')
      .select('id')
      .eq('nom', 'jakarta taxi express')
      .single();
    
    return data?.id || '20100373-6776-4075-9f8e-a77da892cf67';
  }

  async loadPeriodesFinancieres() {
    // Récupérer les périodes avec données de commission
    const { data: commissionsData } = await this.supabase.client
      .from('commissions_detail')
      .select(`
        *,
        facturation_periodes!inner(periode_debut, periode_fin, statut)
      `)
      .eq('entreprise_id', this.entrepriseId)
      .eq('flux_financier_calcule', true)
      .order('created_at', { ascending: false });

    // Récupérer les paiements reçus
    const { data: paiementsData } = await this.supabase.client
      .from('paiements_entreprises')
      .select('*')
      .eq('entreprise_id', this.entrepriseId)
      .eq('statut', 'confirme');

    this.periodes = (commissionsData || []).map(commission => {
      // Chercher paiement avec periode_id correspondant OU paiement sans periode_id s'il n'y a qu'une période
      let paiement = paiementsData?.find(p => p.periode_id === commission.periode_id);
      
      // Si pas de paiement spécifique, chercher les paiements sans periode_id
      if (!paiement && commissionsData?.length === 1) {
        // S'il n'y a qu'une seule période, appliquer les paiements sans periode_id à cette période
        paiement = paiementsData?.find(p => p.periode_id === null);
      }
      
      const revenus_nets = (commission.montant_a_reverser || 0) - (commission.montant_commission_cash || 0);
      const paiement_recu = paiement?.montant_paye || 0;
      const reste_du = Math.max(0, revenus_nets - paiement_recu);

      return {
        periode_id: commission.periode_id,
        periode_debut: commission.facturation_periodes.periode_debut,
        periode_fin: commission.facturation_periodes.periode_fin,
        statut_periode: commission.facturation_periodes.statut,
        
        ca_mobile_money: commission.ca_mobile_money || 0,
        ca_cash: commission.ca_cash || 0,
        ca_total: (commission.ca_mobile_money || 0) + (commission.ca_cash || 0),
        commission_totale: commission.montant_commission || 0,
        revenus_nets,
        
        nombre_courses_mm: commission.nombre_reservations_mobile || 0,
        nombre_courses_cash: commission.nombre_reservations_cash || 0,
        reservations_mm: [],
        reservations_cash: [],
        
        paiement_recu,
        date_paiement: paiement?.date_paiement,
        methode_paiement: paiement?.methode_paiement,
        reste_du,
        est_paye: paiement_recu > 0 && reste_du === 0
      };
    });
  }

  calculerResumeFinancier() {
    this.resume = {
      balance_actuelle: this.periodes.reduce((sum, p) => sum + p.reste_du, 0),
      total_revenus_nets: this.periodes.reduce((sum, p) => sum + p.revenus_nets, 0),
      total_mm_recu: this.periodes.reduce((sum, p) => sum + p.ca_mobile_money, 0),
      total_cash_collecte: this.periodes.reduce((sum, p) => sum + p.ca_cash, 0),
      total_commission_deduite: this.periodes.reduce((sum, p) => sum + p.commission_totale, 0),
      nombre_periodes: this.periodes.length
    };
  }

  async onRefresh() {
    await this.loadEntrepriseData();
    this.showSuccess('Données mises à jour');
  }

  async voirReservationsPeriode(periode: PeriodeFinanciere) {
    const loading = await this.loadingController.create({
      message: 'Chargement des réservations...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      await this.chargerReservationsPeriode(periode);
      this.selectedPeriode = periode;
      this.showReservationsModal = true;
      this.filterReservations();
    } catch (error) {
      console.error('Erreur chargement réservations:', error);
      this.showError('Erreur lors du chargement des réservations');
    } finally {
      await loading.dismiss();
    }
  }

  async chargerReservationsPeriode(periode: PeriodeFinanciere) {
    // Récupérer les réservations via la relation conducteurs → entreprises
    const { data: reservationsData, error: reservationsError } = await this.supabase.client
      .from('reservations')
      .select(`
        id,
        client_phone,
        depart_nom,
        destination_nom,
        prix_total,
        date_reservation,
        heure_reservation,
        minute_reservation,
        statut,
        distance_km,
        conducteur_id,
        conducteurs!inner(entreprise_id, nom, prenom)
      `)
      .eq('conducteurs.entreprise_id', this.entrepriseId)
      .eq('statut', 'completed')
      .gte('date_reservation', periode.periode_debut)
      .lte('date_reservation', periode.periode_fin);

    if (reservationsError) {
      console.error('Erreur requête réservations:', reservationsError);
      throw reservationsError;
    }

    // Pour déterminer le mode de paiement, vérifier si la réservation a été payée via Mobile Money
    // En l'absence du champ mode_paiement, on peut vérifier la table lengopay_payments
    const reservationIds = reservationsData?.map(res => res.id) || [];
    let paiementsData: any[] = [];
    
    if (reservationIds.length > 0) {
      const { data: paiements, error: paiementsError } = await this.supabase.client
        .from('lengopay_payments')
        .select('reservation_id, status')
        .in('reservation_id', reservationIds)
        .eq('status', 'SUCCESS');

      if (!paiementsError) {
        paiementsData = paiements || [];
      }
    }

    // Debug log pour vérifier la détection
    console.log(`💰 ${paiementsData.length} paiements Mobile Money SUCCESS trouvés sur ${reservationIds.length} réservations`);
    
    // Traiter les données
    this.allReservations = (reservationsData || []).map(res => {
      const paiementMM = paiementsData.find(p => p.reservation_id === res.id);
      const mode_paiement = paiementMM ? 'mobile_money' : 'cash';
      const conducteur = res.conducteurs as any;
      
      // Debug log par réservation
      console.log(`🔍 Reservation ${res.id.substring(0, 8)}: ${mode_paiement} ${paiementMM ? '(Payment found)' : '(No payment)'}`);
      
      return {
        id: res.id,
        client_phone: res.client_phone,
        depart_nom: res.depart_nom,
        destination_nom: res.destination_nom,
        prix_total: res.prix_total,
        date_reservation: res.date_reservation,
        heure_reservation: res.heure_reservation,
        minute_reservation: res.minute_reservation,
        statut: res.statut,
        mode_paiement,
        conducteur_nom: conducteur && conducteur.prenom && conducteur.nom
          ? `${conducteur.prenom} ${conducteur.nom}` 
          : 'N/A',
        distance_km: res.distance_km,
        commission_calculee: res.prix_total * 0.11, // 11% commission
        revenus_entreprise: mode_paiement === 'mobile_money' 
          ? res.prix_total * 0.89  // 89% pour Mobile Money
          : res.prix_total - (res.prix_total * 0.11) // Prix - commission pour Cash
      };
    });
  }

  closeReservationsModal() {
    this.showReservationsModal = false;
    this.selectedPeriode = null;
    this.allReservations = [];
    this.filteredReservations = [];
    this.searchTerm = '';
    this.filterType = 'all';
  }

  onSearchChange(event: any) {
    this.searchTerm = event.detail.value;
    this.filterReservations();
  }

  onFilterChange(event: any) {
    this.filterType = event.detail.value;
    this.filterReservations();
  }

  filterReservations() {
    let filtered = [...this.allReservations];

    // Filtre par type de paiement
    if (this.filterType !== 'all') {
      filtered = filtered.filter(res => res.mode_paiement === this.filterType);
    }

    // Filtre par recherche
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(res => 
        res.client_phone.toLowerCase().includes(term) ||
        res.depart_nom.toLowerCase().includes(term) ||
        res.destination_nom.toLowerCase().includes(term) ||
        (res.conducteur_nom && res.conducteur_nom.toLowerCase().includes(term))
      );
    }

    this.filteredReservations = filtered;
  }

  goBack() {
    this.router.navigate(['/entreprise/dashboard']);
  }

  // Utilitaires
  formatPrice(amount: number): string {
    return new Intl.NumberFormat('fr-GN', {
      style: 'currency',
      currency: 'GNF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('fr-FR');
  }

  formatPeriodeName(debut: string, fin: string): string {
    const startDate = new Date(debut);
    const endDate = new Date(fin);
    
    if (startDate.getMonth() === endDate.getMonth()) {
      return startDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    }
    
    return `${startDate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} - ${endDate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
  }

  getBalanceIcon(): string {
    if (this.resume.balance_actuelle > 0) return 'trending-up-outline';
    if (this.resume.balance_actuelle < 0) return 'trending-down-outline';
    return 'checkmark-circle-outline';
  }

  getBalanceText(): string {
    if (this.resume.balance_actuelle > 0) return '📈 Balance Positive - On me doit';
    if (this.resume.balance_actuelle < 0) return '📉 Balance Négative - Je dois';
    return '✅ Balance Équilibrée - Tout est payé';
  }

  getAbsoluteValue(value: number): number {
    return Math.abs(value);
  }

  getMethodeColor(methode: string): string {
    switch(methode) {
      case 'mobile_money': return 'success';
      case 'virement': return 'primary';
      case 'especes': return 'warning';
      default: return 'medium';
    }
  }

  getMethodeIcon(methode: string): string {
    switch(methode) {
      case 'mobile_money': return 'phone-portrait-outline';
      case 'virement': return 'business-outline';
      case 'especes': return 'cash-outline';
      default: return 'wallet-outline';
    }
  }

  getMethodeText(methode: string): string {
    switch(methode) {
      case 'mobile_money': return 'Mobile Money';
      case 'virement': return 'Virement';
      case 'especes': return 'Espèces';
      default: return methode;
    }
  }

  private async showSuccess(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
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
      duration: 2000,
      color: 'primary',
      position: 'top'
    });
    await toast.present();
  }

  // Utilitaires pour réservations
  formatTime(heure: number | null, minute: number | null): string {
    const h = heure !== null ? heure : 0;
    const m = minute !== null ? minute : 0;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  formatDateTime(date: string, heure: number | null, minute: number | null): string {
    if (!date) return 'Date non définie';
    return `${this.formatDate(date)} à ${this.formatTime(heure, minute)}`;
  }

  getStatusColor(statut: string): string {
    switch(statut) {
      case 'completed': return 'success';
      case 'confirmed': return 'primary';
      case 'pending': return 'warning';
      default: return 'medium';
    }
  }

  getStatusText(statut: string): string {
    switch(statut) {
      case 'completed': return 'Terminée';
      case 'confirmed': return 'Confirmée';
      case 'pending': return 'En attente';
      default: return statut;
    }
  }

  getPaymentIcon(mode: string): string {
    return mode === 'mobile_money' ? 'phone-portrait-outline' : 'cash-outline';
  }

  getPaymentColor(mode: string): string {
    return mode === 'mobile_money' ? 'success' : 'warning';
  }

  getPaymentText(mode: string): string {
    return mode === 'mobile_money' ? 'Mobile Money' : 'Cash';
  }

  getTotalByType(type: string): number {
    return this.filteredReservations
      .filter(res => type === 'all' || res.mode_paiement === type)
      .reduce((sum, res) => sum + res.prix_total, 0);
  }

  getRevenusNetsByType(type: string): number {
    return this.filteredReservations
      .filter(res => type === 'all' || res.mode_paiement === type)
      .reduce((sum, res) => sum + res.revenus_entreprise, 0);
  }

  trackByReservation(index: number, reservation: ReservationDetail): string {
    return reservation.id;
  }
}