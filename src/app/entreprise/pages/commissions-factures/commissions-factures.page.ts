/**
 * PAGE FACTURES DE COMMISSION - ENTREPRISE
 * Consultation des factures et détails de paiement
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
  IonNote,
  IonModal,
  IonButtons,
  LoadingController,
  ToastController,
  AlertController,
  RefresherCustomEvent
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  arrowBackOutline,
  receiptOutline,
  cardOutline,
  timeOutline,
  downloadOutline,
  eyeOutline,
  refreshOutline,
  calendarOutline,
  cashOutline,
  warningOutline,
  checkmarkCircleOutline,
  businessOutline,
  closeOutline,
  carOutline,
  locationOutline,
  personOutline
} from 'ionicons/icons';

import { EntrepriseCommissionService } from '../../services/entreprise-commission.service';

interface FactureCommission {
  id: string;
  periode_debut: string;
  periode_fin: string;
  nombre_reservations: number;
  chiffre_affaire_brut: number;
  taux_commission_moyen: number;
  montant_commission: number;
  statut: 'calcule' | 'facture' | 'paye' | 'conteste';
  date_calcul: string;
  date_facturation?: string;
  date_paiement?: string;
  metadata: any;
  reservations?: ReservationFacture[];
}

interface ReservationFacture {
  id: string;
  client_phone: string;
  depart_nom: string;
  destination_nom: string;
  prix_total: number;
  distance_km?: number;
  created_at: string;
  date_code_validation: string;
  conducteur_nom: string;
}

interface StatutPaiement {
  statut_global: 'a_jour' | 'retard' | 'impaye';
  total_du: number;
  total_paye: number;
  prochaine_echeance?: string;
  retard_jours?: number;
}

@Component({
  selector: 'app-commissions-factures',
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
      <ion-icon name="receipt-outline"></ion-icon>
      Factures de Commission
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
    
    <!-- Statut des paiements -->
    <ion-card class="status-card" [class]="getStatusCardClass()">
      <ion-card-header>
        <ion-card-title>
          <ion-icon [name]="getStatusIcon()"></ion-icon>
          Statut des Paiements
        </ion-card-title>
      </ion-card-header>
      <ion-card-content>
        <div class="status-content">
          <div class="status-main">
            <div class="status-badge">
              <ion-badge [color]="getStatusColor()" size="large">
                {{ getStatusText() }}
              </ion-badge>
            </div>
            <div class="status-details">
              <div class="detail-item">
                <span class="label">Total dû:</span>
                <span class="value">{{ formatPrice(statutPaiement?.total_du || 0) }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Total payé:</span>
                <span class="value success">{{ formatPrice(statutPaiement?.total_paye || 0) }}</span>
              </div>
              <div class="detail-item" *ngIf="statutPaiement?.prochaine_echeance">
                <span class="label">Prochaine échéance:</span>
                <span class="value">{{ formatDate(statutPaiement!.prochaine_echeance!) }}</span>
              </div>
              <div class="detail-item warning" *ngIf="statutPaiement?.retard_jours">
                <span class="label">Retard:</span>
                <span class="value">{{ statutPaiement!.retard_jours }} jour(s)</span>
              </div>
            </div>
          </div>
          <div class="status-actions">
            <ion-button 
              size="small" 
              fill="outline"
              (click)="onContactSupport()">
              Questions ?
            </ion-button>
          </div>
        </div>
      </ion-card-content>
    </ion-card>

    <!-- Filtres par période -->
    <ion-card class="filters-card">
      <ion-card-content>
        <ion-segment 
          [(ngModel)]="selectedPeriod" 
          (ionChange)="onPeriodChange()"
          class="period-selector">
          <ion-segment-button value="all">
            <ion-label>TOUTES</ion-label>
          </ion-segment-button>
          <ion-segment-button value="pending">
            <ion-label>EN ATTENTE</ion-label>
          </ion-segment-button>
          <ion-segment-button value="paid">
            <ion-label>PAYÉES</ion-label>
          </ion-segment-button>
          <ion-segment-button value="overdue">
            <ion-label>EN RETARD</ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-card-content>
    </ion-card>

    <!-- Loading -->
    <div *ngIf="isLoading" class="loading-container">
      <ion-spinner></ion-spinner>
      <p>Chargement des factures...</p>
    </div>

    <!-- Liste des factures -->
    <ion-card *ngIf="!isLoading" class="factures-card">
      <ion-card-header>
        <ion-card-title>
          <ion-icon name="business-outline"></ion-icon>
          Historique des Factures ({{ filteredFactures.length }})
        </ion-card-title>
      </ion-card-header>
      <ion-card-content>
        
        <!-- Message si aucune facture -->
        <div *ngIf="filteredFactures.length === 0" class="empty-state">
          <ion-icon name="receipt-outline" size="large"></ion-icon>
          <h3>Aucune facture trouvée</h3>
          <p>Aucune facture ne correspond aux critères sélectionnés.</p>
        </div>

        <!-- Liste des factures -->
        <ion-list *ngIf="filteredFactures.length > 0">
          <ion-item 
            *ngFor="let facture of filteredFactures; trackBy: trackByFacture"
            class="facture-item">
            
            <div class="facture-content">
              <!-- Header avec période et statut -->
              <div class="facture-header">
                <div class="periode-info">
                  <strong>{{ formatDate(facture.periode_debut) }} - {{ formatDate(facture.periode_fin) }}</strong>
                  <ion-note>{{ facture.nombre_reservations }} réservation(s)</ion-note>
                </div>
                <ion-badge 
                  [color]="getFactureStatusColor(facture.statut)"
                  class="status-badge">
                  {{ getFactureStatusText(facture.statut) }}
                </ion-badge>
              </div>

              <!-- Détails financiers -->
              <div class="facture-details">
                <ion-grid>
                  <ion-row>
                    <ion-col size="6">
                      <div class="detail-row">
                        <span class="detail-label">Chiffre d'affaires:</span>
                        <span class="detail-value">{{ formatPrice(facture.chiffre_affaire_brut) }}</span>
                      </div>
                    </ion-col>
                    <ion-col size="6">
                      <div class="detail-row">
                        <span class="detail-label">Taux commission:</span>
                        <span class="detail-value">{{ facture.taux_commission_moyen.toFixed(1) }}%</span>
                      </div>
                    </ion-col>
                    <ion-col size="6">
                      <div class="detail-row">
                        <span class="detail-label commission">Commission due:</span>
                        <span class="detail-value commission">{{ formatPrice(facture.montant_commission) }}</span>
                      </div>
                    </ion-col>
                    <ion-col size="6">
                      <div class="detail-row">
                        <span class="detail-label">Date calcul:</span>
                        <span class="detail-value">{{ formatDate(facture.date_calcul) }}</span>
                      </div>
                    </ion-col>
                  </ion-row>
                </ion-grid>
              </div>

              <!-- Dates importantes -->
              <div class="facture-dates" *ngIf="facture.date_facturation || facture.date_paiement">
                <div class="date-item" *ngIf="facture.date_facturation">
                  <ion-icon name="calendar-outline"></ion-icon>
                  <span>Facturé le {{ formatDate(facture.date_facturation) }}</span>
                </div>
                <div class="date-item success" *ngIf="facture.date_paiement">
                  <ion-icon name="checkmark-circle-outline"></ion-icon>
                  <span>Payé le {{ formatDate(facture.date_paiement) }}</span>
                </div>
              </div>

              <!-- Actions -->
              <div class="facture-actions">
                <ion-button 
                  size="small" 
                  fill="clear" 
                  (click)="onViewDetails(facture)">
                  <ion-icon name="eye-outline" slot="start"></ion-icon>
                  Détails
                </ion-button>
                
                <ion-button 
                  size="small" 
                  fill="clear" 
                  (click)="onDownloadPDF(facture)"
                  [disabled]="facture.statut === 'calcule'">
                  <ion-icon name="download-outline" slot="start"></ion-icon>
                  PDF
                </ion-button>
              </div>

            </div>
          </ion-item>
        </ion-list>
      </ion-card-content>
    </ion-card>

    <!-- Informations importantes -->
    <ion-card class="info-card">
      <ion-card-content>
        <div class="info-content">
          <ion-icon name="receipt-outline" color="primary"></ion-icon>
          <div class="info-text">
            <strong>À propos des commissions</strong>
            <p>Les commissions sont calculées automatiquement sur votre chiffre d'affaires mensuel. Vous recevez une notification lors de chaque modification de taux.</p>
          </div>
        </div>
      </ion-card-content>
    </ion-card>

  </div>

  <!-- Modal Détails de la Facture -->
  <ion-modal [isOpen]="isDetailsModalOpen" (didDismiss)="closeDetailsModal()" class="details-modal">
    <ng-template>
      <ion-header>
        <ion-toolbar color="primary">
          <ion-title>Détails de la Facture</ion-title>
          <ion-buttons slot="end">
            <ion-button (click)="closeDetailsModal()">
              <ion-icon name="close-outline"></ion-icon>
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding" *ngIf="selectedFacture">
        <div class="modal-content">
          
          <!-- Informations de période -->
          <div class="modal-section">
            <strong>Période:</strong> {{ formatDate(selectedFacture.periode_debut) }} - {{ formatDate(selectedFacture.periode_fin) }}<br>
            <strong>Réservations:</strong> {{ selectedFacture.nombre_reservations }}<br>
            <strong>Chiffre d'affaires:</strong> {{ formatPrice(selectedFacture.chiffre_affaire_brut) }}<br>
            <strong>Taux appliqué:</strong> {{ selectedFacture.taux_commission_moyen.toFixed(1) }}%<br>
            <strong>Commission:</strong> {{ formatPrice(selectedFacture.montant_commission) }}<br>
            <strong>Statut:</strong> {{ getFactureStatusText(selectedFacture.statut) }}<br>
            <div *ngIf="selectedFacture.date_paiement">
              <strong>Payé le:</strong> {{ formatDate(selectedFacture.date_paiement) }}
            </div>
          </div>

          <!-- Liste des réservations -->
          <div class="reservations-section" *ngIf="selectedFacture.reservations && selectedFacture.reservations.length > 0">
            <h4 class="section-title">
              <ion-icon name="car-outline"></ion-icon>
              Réservations Facturables ({{ selectedFacture.reservations.length }})
            </h4>
            
            <div class="reservations-list">
              <div 
                *ngFor="let reservation of selectedFacture.reservations; trackBy: trackByReservation"
                class="reservation-item">
                
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
                    Créée: {{ formatDate(reservation.created_at) }}
                  </p>
                  <p class="conducteur">
                    <ion-icon name="person-outline"></ion-icon>
                    {{ reservation.conducteur_nom }}
                  </p>
                  <p class="validation">
                    <ion-icon name="checkmark-circle-outline" color="success"></ion-icon>
                    Validée le {{ formatDateWithTime(reservation.date_code_validation) }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="modal-actions">
            <ion-button 
              expand="block" 
              (click)="closeDetailsModal()"
              color="primary">
              FERMER
            </ion-button>
          </div>
        </div>
      </ion-content>
    </ng-template>
  </ion-modal>

</ion-content>
  `,
  styleUrls: ['./commissions-factures.page.scss'],
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
    IonNote,
    IonModal,
    IonButtons
  ]
})
export class CommissionsFacturesPage implements OnInit {

  // Données
  factures: FactureCommission[] = [];
  filteredFactures: FactureCommission[] = [];
  statutPaiement: StatutPaiement | null = null;

  // Filtres
  selectedPeriod = 'all';

  // État de l'interface
  isLoading = true;
  
  // Modal de détails
  isDetailsModalOpen = false;
  selectedFacture: FactureCommission | null = null;


  constructor(
    private router: Router,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private alertController: AlertController,
    private commissionService: EntrepriseCommissionService
  ) {
    // Ajouter les icônes
    addIcons({
      arrowBackOutline,
      receiptOutline,
      cardOutline,
      timeOutline,
      downloadOutline,
      eyeOutline,
      refreshOutline,
      calendarOutline,
      cashOutline,
      warningOutline,
      checkmarkCircleOutline,
      businessOutline,
      closeOutline,
      carOutline,
      locationOutline,
      personOutline
    });
  }

  async ngOnInit() {
    await this.loadFacturesData();
  }

  private async loadFacturesData() {
    try {
      this.isLoading = true;
      
      console.log('📊 Chargement des factures de commission entreprise...');
      
      // Récupérer les commissions via le service
      const { data, error } = await this.commissionService.getMesCommissions();
      
      if (error) {
        throw error;
      }
      
      // Transformer les données de commissions en factures
      this.factures = (data || []).map(commission => ({
        id: commission.id,
        periode_debut: commission.periode_debut,
        periode_fin: commission.periode_fin,
        nombre_reservations: commission.nombre_reservations,
        chiffre_affaire_brut: commission.chiffre_affaire_brut,
        taux_commission_moyen: commission.taux_commission_moyen,
        montant_commission: commission.montant_commission,
        statut: this.mapStatutPaiementToFacture(commission.statut_paiement),
        date_calcul: commission.periode_fin,
        date_facturation: commission.statut_paiement !== 'non_paye' ? commission.periode_fin : undefined,
        date_paiement: commission.date_versement_commission,
        metadata: {},
        reservations: (commission.reservations || []).map(res => ({
          id: res.id,
          client_phone: res.client_phone,
          depart_nom: res.depart_nom,
          destination_nom: res.destination_nom,
          prix_total: res.prix_total,
          distance_km: res.distance_km,
          created_at: res.created_at,
          date_code_validation: res.date_code_validation,
          conducteur_nom: res.conducteur_nom
        }))
      }));
      
      console.log(`✅ ${this.factures.length} factures chargées`);
      this.calculateStatutPaiement();
      this.applyFilters();
      
    } catch (error) {
      console.error('❌ Erreur chargement factures:', error);
      this.showError('Erreur lors du chargement des factures');
    } finally {
      this.isLoading = false;
    }
  }

  private mapStatutPaiementToFacture(statutPaiement: string): 'calcule' | 'facture' | 'paye' | 'conteste' {
    switch (statutPaiement) {
      case 'paye': return 'paye';
      case 'en_attente': return 'facture';
      case 'non_paye': 
      default: return 'calcule';
    }
  }

  private calculateStatutPaiement() {
    const totalDu = this.factures
      .filter(f => f.statut !== 'paye')
      .reduce((sum, f) => sum + f.montant_commission, 0);
    
    const totalPaye = this.factures
      .filter(f => f.statut === 'paye')
      .reduce((sum, f) => sum + f.montant_commission, 0);

    let statutGlobal: 'a_jour' | 'retard' | 'impaye' = 'a_jour';
    if (totalDu > 0) {
      statutGlobal = 'impaye';
    }

    this.statutPaiement = {
      statut_global: statutGlobal,
      total_du: totalDu,
      total_paye: totalPaye
    };
  }

  // Event handlers
  async onRefresh(event?: RefresherCustomEvent) {
    await this.loadFacturesData();
    if (event) {
      event.target.complete();
    }
  }

  onPeriodChange() {
    this.applyFilters();
  }

  private applyFilters() {
    let filtered = [...this.factures];

    switch (this.selectedPeriod) {
      case 'pending':
        filtered = filtered.filter(f => f.statut === 'facture');
        break;
      case 'paid':
        filtered = filtered.filter(f => f.statut === 'paye');
        break;
      case 'overdue':
        // Simulation - en réalité il faudrait vérifier les dates d'échéance
        filtered = filtered.filter(f => f.statut === 'facture');
        break;
    }

    this.filteredFactures = filtered.sort((a, b) => 
      new Date(b.periode_debut).getTime() - new Date(a.periode_debut).getTime()
    );
  }

  onViewDetails(facture: FactureCommission) {
    this.selectedFacture = facture;
    this.isDetailsModalOpen = true;
  }

  closeDetailsModal() {
    this.isDetailsModalOpen = false;
    this.selectedFacture = null;
  }

  async onDownloadPDF(facture: FactureCommission) {
    const toast = await this.toastController.create({
      message: '🚧 Téléchargement PDF - Fonctionnalité en développement',
      duration: 3000,
      color: 'warning',
      position: 'top'
    });
    await toast.present();
  }

  async onContactSupport() {
    const alert = await this.alertController.create({
      header: 'Support Client',
      message: 'Pour toute question concernant vos factures de commission, contactez notre équipe support.',
      buttons: [
        {
          text: 'Fermer',
          role: 'cancel'
        },
        {
          text: 'Appeler Support',
          handler: () => {
            // Ouvrir l'application téléphone
            window.open('tel:+224123456789');
          }
        }
      ]
    });

    await alert.present();
  }

  goBack() {
    this.router.navigate(['/entreprise/dashboard']);
  }

  // Utilitaires pour l'affichage
  getStatusCardClass(): string {
    switch (this.statutPaiement?.statut_global) {
      case 'a_jour': return 'status-success';
      case 'retard': return 'status-warning';
      case 'impaye': return 'status-danger';
      default: return '';
    }
  }

  getStatusIcon(): string {
    switch (this.statutPaiement?.statut_global) {
      case 'a_jour': return 'checkmark-circle-outline';
      case 'retard': return 'time-outline';
      case 'impaye': return 'warning-outline';
      default: return 'cash-outline';
    }
  }

  getStatusColor(): string {
    switch (this.statutPaiement?.statut_global) {
      case 'a_jour': return 'success';
      case 'retard': return 'warning';
      case 'impaye': return 'danger';
      default: return 'medium';
    }
  }

  getStatusText(): string {
    switch (this.statutPaiement?.statut_global) {
      case 'a_jour': return 'À jour';
      case 'retard': return 'En retard';
      case 'impaye': return 'Impayé';
      default: return 'Non défini';
    }
  }

  getFactureStatusText(statut: string): string {
    switch (statut) {
      case 'calcule': return 'Calculé';
      case 'facture': return 'Facturé';
      case 'paye': return 'Payé';
      case 'conteste': return 'Contesté';
      default: return statut;
    }
  }

  getFactureStatusColor(statut: string): string {
    switch (statut) {
      case 'calcule': return 'medium';
      case 'facture': return 'warning';
      case 'paye': return 'success';
      case 'conteste': return 'danger';
      default: return 'medium';
    }
  }

  formatPrice(amount: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'GNF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC'
    });
  }

  formatDateWithTime(dateString: string): string {
    return new Date(dateString).toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Africa/Conakry' // GMT+0
    });
  }

  trackByFacture(index: number, facture: FactureCommission): string {
    return facture.id;
  }

  trackByReservation(index: number, reservation: ReservationFacture): string {
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