/**
 * PAGE VUE GLOBALE DES RÉSERVATIONS SUPER-ADMIN
 * Vue d'ensemble de toutes les réservations de toutes les entreprises
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
  IonCheckbox,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonBadge,
  IonList,
  LoadingController,
  ToastController,
  AlertController,
  InfiniteScrollCustomEvent,
  RefresherCustomEvent
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  arrowBackOutline,
  statsChartOutline,
  downloadOutline,
  filterOutline,
  refreshOutline,
  searchOutline,
  calendarOutline,
  businessOutline,
  carOutline,
  callOutline,
  locationOutline,
  cashOutline,
  timeOutline,
  arrowForwardOutline,
  radioButtonOnOutline
} from 'ionicons/icons';

import { 
  GlobalReservationsService, 
  GlobalReservation, 
  GlobalStats, 
  ReservationsFilter 
} from '../../services/global-reservations.service';

@Component({
  selector: 'app-global-reservations',
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
      <ion-icon name="stats-chart-outline"></ion-icon>
      Vue Globale Réservations
    </ion-title>
    <ion-button 
      slot="end" 
      fill="clear" 
      (click)="onExport()"
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
    
    <!-- Statistiques globales -->
    <ion-card class="stats-card">
      <ion-card-header>
        <ion-card-title>
          <ion-icon name="stats-chart-outline"></ion-icon>
          Statistiques Globales
        </ion-card-title>
      </ion-card-header>
      <ion-card-content>
        <ion-grid>
          <ion-row>
            <ion-col size="6" size-md="3">
              <div class="stat-item">
                <div class="stat-number">{{ stats.total_reservations }}</div>
                <div class="stat-label">Total Réservations</div>
              </div>
            </ion-col>
            <ion-col size="6" size-md="3">
              <div class="stat-item">
                <div class="stat-number success">{{ stats.reservations_completed }}</div>
                <div class="stat-label">Terminées</div>
              </div>
            </ion-col>
            <ion-col size="6" size-md="3">
              <div class="stat-item">
                <div class="stat-number">{{ formatPrice(stats.ca_total) }}</div>
                <div class="stat-label">CA Total</div>
              </div>
            </ion-col>
            <ion-col size="6" size-md="3">
              <div class="stat-item">
                <div class="stat-number primary">{{ formatPrice(stats.commission_totale) }}</div>
                <div class="stat-label">Commission</div>
              </div>
            </ion-col>
          </ion-row>
          <ion-row>
            <ion-col size="6" size-md="3">
              <div class="stat-item">
                <div class="stat-number">{{ stats.entreprises_actives }}</div>
                <div class="stat-label">Entreprises</div>
              </div>
            </ion-col>
            <ion-col size="6" size-md="3">
              <div class="stat-item">
                <div class="stat-number">{{ stats.conducteurs_actifs }}</div>
                <div class="stat-label">Conducteurs</div>
              </div>
            </ion-col>
            <ion-col size="6" size-md="3">
              <div class="stat-item">
                <div class="stat-number">{{ stats.distance_totale.toFixed(1) }} km</div>
                <div class="stat-label">Distance</div>
              </div>
            </ion-col>
            <ion-col size="6" size-md="3">
              <div class="stat-item">
                <div class="stat-number">{{ stats.taux_completion.toFixed(1) }}%</div>
                <div class="stat-label">Taux Completion</div>
              </div>
            </ion-col>
          </ion-row>
        </ion-grid>
      </ion-card-content>
    </ion-card>

    <!-- Filtres -->
    <ion-card class="filters-card">
      <ion-card-header>
        <ion-card-title>
          <ion-icon name="filter-outline"></ion-icon>
          Filtres
          <ion-button 
            fill="clear" 
            size="small" 
            (click)="onClearFilters()">
            Effacer
          </ion-button>
        </ion-card-title>
      </ion-card-header>
      <ion-card-content>
        <ion-grid>
          <ion-row>
            <!-- Recherche -->
            <ion-col size="12" size-md="6">
              <ion-searchbar
                [(ngModel)]="filters.recherche"
                placeholder="Rechercher client, départ, destination..."
                (ionInput)="onFilterChange()"
                debounce="500">
              </ion-searchbar>
            </ion-col>
            
            <!-- Statut -->
            <ion-col size="12" size-md="6">
              <ion-item>
                <ion-label>Statut</ion-label>
                <ion-select
                  [(ngModel)]="filters.statut"
                  placeholder="Tous"
                  (ionChange)="onFilterChange()">
                  <ion-select-option value="">Tous</ion-select-option>
                  <ion-select-option value="pending">En attente</ion-select-option>
                  <ion-select-option value="accepted">Acceptée</ion-select-option>
                  <ion-select-option value="completed">Terminée</ion-select-option>
                  <ion-select-option value="refused">Refusée</ion-select-option>
                </ion-select>
              </ion-item>
            </ion-col>
          </ion-row>
          
          <ion-row>
            <!-- Entreprise -->
            <ion-col size="12" size-md="4">
              <ion-item>
                <ion-label position="stacked">Entreprise</ion-label>
                <ion-select
                  [(ngModel)]="filters.entrepriseId"
                  placeholder="Toutes"
                  (ionChange)="onFilterChange()">
                  <ion-select-option value="">Toutes</ion-select-option>
                  <ion-select-option 
                    *ngFor="let entreprise of entreprisesList" 
                    [value]="entreprise.id">
                    {{ entreprise.nom }}
                  </ion-select-option>
                </ion-select>
              </ion-item>
            </ion-col>
            
            <!-- Date début -->
            <ion-col size="12" size-md="4">
              <ion-item>
                <ion-label position="stacked">Date début</ion-label>
                <ion-input
                  type="date"
                  [(ngModel)]="filters.dateDebut"
                  (ionChange)="onFilterChange()"
                  placeholder="jj/mm/aaaa">
                </ion-input>
              </ion-item>
            </ion-col>
            
            <!-- Date fin -->
            <ion-col size="12" size-md="4">
              <ion-item>
                <ion-label position="stacked">Date fin</ion-label>
                <ion-input
                  type="date"
                  [(ngModel)]="filters.dateFin"
                  (ionChange)="onFilterChange()"
                  placeholder="jj/mm/aaaa">
                </ion-input>
              </ion-item>
            </ion-col>
          </ion-row>
        </ion-grid>
      </ion-card-content>
    </ion-card>

    <!-- Segmented control pour vue -->
    <ion-segment 
      [(ngModel)]="viewMode" 
      (ionChange)="onViewModeChange()">
      <ion-segment-button value="list">
        <ion-label>Liste</ion-label>
      </ion-segment-button>
      <ion-segment-button value="cards">
        <ion-label>Cartes</ion-label>
      </ion-segment-button>
    </ion-segment>

    <!-- Loading -->
    <div *ngIf="isLoading" class="loading-container">
      <ion-spinner></ion-spinner>
      <p>Chargement des réservations...</p>
    </div>

    <!-- Liste des réservations -->
    <div *ngIf="!isLoading && reservations.length > 0">
      
      <!-- Vue Liste -->
      <ion-card *ngIf="viewMode === 'list'" class="reservations-table">
        <ion-card-content>
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Client</th>
                  <th>Trajet</th>
                  <th>Conducteur</th>
                  <th>Entreprise</th>
                  <th>Prix</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let reservation of reservations">
                  <td>{{ formatDate(reservation.created_at) }}</td>
                  <td>{{ reservation.client_phone }}</td>
                  <td>
                    <div class="trajet">
                      <small>{{ reservation.depart_nom }}</small>
                      <ion-icon name="arrow-forward-outline"></ion-icon>
                      <small>{{ reservation.destination_nom }}</small>
                    </div>
                  </td>
                  <td>{{ reservation.conducteur_prenom }} {{ reservation.conducteur_nom }}</td>
                  <td>{{ reservation.entreprise_nom }}</td>
                  <td>{{ formatPrice(reservation.prix_total) }}</td>
                  <td>
                    <ion-badge [color]="getStatutColor(reservation.statut)">
                      {{ getStatutText(reservation.statut) }}
                    </ion-badge>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </ion-card-content>
      </ion-card>

      <!-- Vue Cartes Moderne -->
      <div *ngIf="viewMode === 'cards'" class="modern-cards-container">
        <div *ngFor="let reservation of reservations" class="modern-card">
          <!-- Card Header -->
          <div class="card-header">
            <div class="status-section">
              <ion-badge [color]="getStatutColor(reservation.statut)" class="status-badge">
                {{ getStatutText(reservation.statut) }}
              </ion-badge>
              <span class="card-date">{{ formatDate(reservation.created_at) }}</span>
            </div>
            <div class="price-section">
              <span class="price">{{ formatPrice(reservation.prix_total) }}</span>
            </div>
          </div>

          <!-- Card Body -->
          <div class="card-body">
            <!-- Client Info -->
            <div class="client-section">
              <div class="client-info">
                <ion-icon name="call-outline" class="client-icon"></ion-icon>
                <span class="client-phone">{{ reservation.client_phone }}</span>
              </div>
            </div>

            <!-- Journey Section -->
            <div class="journey-section">
              <div class="journey-item departure">
                <div class="journey-icon">
                  <ion-icon name="radio-button-on-outline"></ion-icon>
                </div>
                <div class="journey-text">
                  <span class="journey-label">Départ</span>
                  <span class="journey-location">{{ reservation.depart_nom }}</span>
                </div>
              </div>
              
              <div class="journey-connector">
                <div class="connector-line"></div>
              </div>
              
              <div class="journey-item destination">
                <div class="journey-icon">
                  <ion-icon name="location-outline"></ion-icon>
                </div>
                <div class="journey-text">
                  <span class="journey-label">Destination</span>
                  <span class="journey-location">{{ reservation.destination_nom }}</span>
                </div>
              </div>
            </div>

            <!-- Service Info -->
            <div class="service-section">
              <div class="service-item">
                <ion-icon name="car-outline" class="service-icon"></ion-icon>
                <div class="service-info">
                  <span class="driver-name">{{ reservation.conducteur_prenom }} {{ reservation.conducteur_nom }}</span>
                  <span class="enterprise-name">{{ reservation.entreprise_nom }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Message si aucune réservation -->
    <ion-card *ngIf="!isLoading && reservations.length === 0" class="empty-state">
      <ion-card-content>
        <div class="empty-content">
          <ion-icon name="search-outline" size="large"></ion-icon>
          <h3>Aucune réservation trouvée</h3>
          <p>Essayez de modifier vos filtres de recherche</p>
          <ion-button 
            fill="outline" 
            (click)="onClearFilters()">
            Effacer les filtres
          </ion-button>
        </div>
      </ion-card-content>
    </ion-card>

    <!-- Informations pagination -->
    <div *ngIf="reservations.length > 0" class="pagination-info">
      <ion-text color="medium">
        {{ reservations.length }} réservations affichées sur {{ totalCount }}
      </ion-text>
    </div>

  </div>

  <!-- Infinite scroll -->
  <ion-infinite-scroll 
    *ngIf="hasMore" 
    (ionInfinite)="onLoadMore($event)">
    <ion-infinite-scroll-content></ion-infinite-scroll-content>
  </ion-infinite-scroll>
</ion-content>
  `,
  styleUrls: ['./global-reservations.page.scss'],
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
    IonCheckbox,
    IonSpinner,
    IonRefresher,
    IonRefresherContent,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonSearchbar,
    IonSegment,
    IonSegmentButton,
    IonBadge,
    IonList
  ]
})
export class GlobalReservationsPage implements OnInit {

  // Données
  reservations: GlobalReservation[] = [];
  stats: GlobalStats = {
    total_reservations: 0,
    reservations_completed: 0,
    reservations_pending: 0,
    reservations_refused: 0,
    ca_total: 0,
    commission_totale: 0,
    entreprises_actives: 0,
    conducteurs_actifs: 0,
    distance_totale: 0,
    prix_moyen: 0,
    taux_completion: 0
  };

  entreprisesList: {id: string, nom: string}[] = [];
  
  // Filtres
  filters: ReservationsFilter = {};
  
  // État de l'interface
  isLoading = true;
  viewMode: 'list' | 'cards' = 'cards';
  currentPage = 0;
  pageSize = 20;
  totalCount = 0;
  hasMore = true;

  constructor(
    private globalReservationsService: GlobalReservationsService,
    private router: Router,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private alertController: AlertController
  ) {
    // Ajouter les icônes
    addIcons({
      arrowBackOutline,
      statsChartOutline,
      downloadOutline,
      filterOutline,
      refreshOutline,
      searchOutline,
      calendarOutline,
      businessOutline,
      carOutline,
      callOutline,
      locationOutline,
      cashOutline,
      timeOutline,
      arrowForwardOutline,
      radioButtonOnOutline
    });
  }

  async ngOnInit() {
    await this.loadInitialData();
  }

  private async loadInitialData() {
    try {
      this.isLoading = true;
      
      // Charger les entreprises pour les filtres
      this.entreprisesList = await this.globalReservationsService.getEntreprisesList();
      
      // Charger les données
      await this.loadReservations(true);
      await this.loadStats();
      
    } catch (error) {
      console.error('❌ Erreur chargement initial:', error);
      this.showError('Erreur lors du chargement des données');
    } finally {
      this.isLoading = false;
    }
  }

  private async loadReservations(reset = false) {
    try {
      if (reset) {
        this.currentPage = 0;
        this.reservations = [];
        this.hasMore = true;
      }

      const { data, count } = await this.globalReservationsService.getAllReservations(
        this.filters,
        this.pageSize,
        this.currentPage * this.pageSize
      );

      if (reset) {
        this.reservations = data;
      } else {
        this.reservations = [...this.reservations, ...data];
      }

      this.totalCount = count;
      this.hasMore = data.length === this.pageSize;
      this.currentPage++;

    } catch (error) {
      console.error('❌ Erreur chargement réservations:', error);
      this.showError('Erreur lors du chargement des réservations');
    }
  }

  private async loadStats() {
    try {
      this.stats = await this.globalReservationsService.getGlobalStats(this.filters);
    } catch (error) {
      console.error('❌ Erreur chargement statistiques:', error);
    }
  }

  // Events handlers
  async onFilterChange() {
    console.log('🔍 Filtre changé:', this.filters);
    await this.loadReservations(true);
    await this.loadStats();
  }

  async onClearFilters() {
    this.filters = {};
    await this.onFilterChange();
    
    const toast = await this.toastController.create({
      message: '🔄 Filtres effacés',
      duration: 2000,
      color: 'primary',
      position: 'top'
    });
    await toast.present();
  }

  async onRefresh(event: RefresherCustomEvent) {
    await this.loadReservations(true);
    await this.loadStats();
    event.target.complete();
  }

  async onLoadMore(event: InfiniteScrollCustomEvent) {
    await this.loadReservations(false);
    event.target.complete();
  }

  onViewModeChange() {
    // Sauvegarde du mode de vue
    localStorage.setItem('super_admin_view_mode', this.viewMode);
  }

  async onExport() {
    const loading = await this.loadingController.create({
      message: 'Export en cours...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const csvContent = await this.globalReservationsService.exportReservations(this.filters);
      
      // Créer et télécharger le fichier
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `reservations_globales_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      const toast = await this.toastController.create({
        message: '📊 Export CSV réussi',
        duration: 3000,
        color: 'success',
        position: 'top'
      });
      await toast.present();

    } catch (error) {
      console.error('❌ Erreur export:', error);
      this.showError('Erreur lors de l\'export');
    } finally {
      await loading.dismiss();
    }
  }

  goBack() {
    this.router.navigate(['/super-admin/dashboard']);
  }

  // Utilitaires
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatPrice(price: number): string {
    return this.globalReservationsService.formatPrice(price);
  }

  getStatutText(statut: string): string {
    return this.globalReservationsService.formatStatut(statut).text;
  }

  getStatutColor(statut: string): string {
    return this.globalReservationsService.formatStatut(statut).color;
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