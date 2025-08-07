/**
 * PAGE GESTION DES ENTREPRISES - SUPER-ADMIN
 * Création, modification et gestion des entreprises
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
  IonList,
  IonBadge,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonToggle,
  IonModal,
  IonButtons,
  IonAvatar,
  LoadingController,
  ToastController,
  AlertController,
  RefresherCustomEvent
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  arrowBackOutline,
  businessOutline,
  addOutline,
  eyeOutline,
  createOutline,
  trashOutline,
  refreshOutline,
  searchOutline,
  mailOutline,
  callOutline,
  locationOutline,
  location,
  statsChartOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  closeOutline,
  keyOutline,
  peopleOutline,
  cardOutline,
  timeOutline,
  personOutline,
  carOutline,
  downloadOutline,
  star,
  chevronDownOutline,
  flag,
  speedometerOutline
} from 'ionicons/icons';

import { 
  EntrepriseManagementService, 
  Entreprise, 
  CreateEntrepriseData, 
  EntrepriseStats 
} from '../../services/entreprise-management.service';

@Component({
  selector: 'app-entreprises-management',
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
      Gestion des Entreprises
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
          Statistiques Entreprises
        </ion-card-title>
      </ion-card-header>
      <ion-card-content>
        <ion-grid>
          <ion-row>
            <ion-col size="6" size-md="3">
              <div class="stat-item">
                <div class="stat-number">{{ stats.total_entreprises }}</div>
                <div class="stat-label">Total</div>
              </div>
            </ion-col>
            <ion-col size="6" size-md="3">
              <div class="stat-item">
                <div class="stat-number success">{{ stats.entreprises_actives }}</div>
                <div class="stat-label">Actives</div>
              </div>
            </ion-col>
            <ion-col size="6" size-md="3">
              <div class="stat-item">
                <div class="stat-number warning">{{ stats.entreprises_inactives }}</div>
                <div class="stat-label">Inactives</div>
              </div>
            </ion-col>
            <ion-col size="6" size-md="3">
              <div class="stat-item">
                <div class="stat-number primary">{{ stats.nouveaux_ce_mois }}</div>
                <div class="stat-label">Ce mois</div>
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
            <ion-col size="12" size-md="4">
              <ion-button 
                expand="block" 
                fill="solid"
                color="primary"
                (click)="onCreateEntreprise()">
                <ion-icon name="add-outline" slot="start"></ion-icon>
                Nouvelle Entreprise
              </ion-button>
            </ion-col>
            <ion-col size="12" size-md="4">
              <ion-button 
                expand="block" 
                fill="outline"
                color="warning"
                (click)="onResetPassword()">
                <ion-icon name="key-outline" slot="start"></ion-icon>
                Réinitialiser Mot de Passe
              </ion-button>
            </ion-col>
            <ion-col size="12" size-md="4">
              <ion-button 
                expand="block" 
                fill="outline"
                color="medium"
                (click)="onExportData()">
                <ion-icon name="stats-chart-outline" slot="start"></ion-icon>
                Export Données
              </ion-button>
            </ion-col>
          </ion-row>
        </ion-grid>
      </ion-card-content>
    </ion-card>

    <!-- Recherche -->
    <ion-card class="search-card">
      <ion-card-content>
        <ion-searchbar
          [(ngModel)]="searchQuery"
          placeholder="Rechercher entreprise..."
          (ionInput)="onSearch()"
          debounce="500">
        </ion-searchbar>
      </ion-card-content>
    </ion-card>

    <!-- Loading -->
    <div *ngIf="isLoading" class="loading-container">
      <ion-spinner></ion-spinner>
      <p>Chargement des entreprises...</p>
    </div>

    <!-- Liste des entreprises -->
    <ion-card *ngIf="!isLoading" class="entreprises-card">
      <ion-card-header>
        <ion-card-title>
          <ion-icon name="business-outline"></ion-icon>
          Entreprises ({{ filteredEntreprises.length }})
        </ion-card-title>
      </ion-card-header>
      <ion-card-content>
        
        <!-- Message si aucune entreprise -->
        <div *ngIf="filteredEntreprises.length === 0" class="empty-state">
          <ion-icon name="business-outline" size="large"></ion-icon>
          <h3>Aucune entreprise trouvée</h3>
          <p>Créez votre première entreprise pour commencer.</p>
          <ion-button fill="outline" (click)="onCreateEntreprise()">
            <ion-icon name="add-outline" slot="start"></ion-icon>
            Créer une entreprise
          </ion-button>
        </div>

        <!-- Liste des entreprises -->
        <ion-list *ngIf="filteredEntreprises.length > 0">
          <ion-item 
            *ngFor="let entreprise of filteredEntreprises; trackBy: trackByEntreprise"
            class="entreprise-item">
            
            <div class="entreprise-content">
              <!-- Header avec nom et statut -->
              <div class="entreprise-header">
                <div class="entreprise-info">
                  <h3>{{ entreprise.nom }}</h3>
                  <p class="entreprise-email">{{ entreprise.email }}</p>
                </div>
                <div class="status-section">
                  <ion-badge 
                    [color]="entreprise.actif ? 'success' : 'danger'"
                    class="status-badge">
                    {{ entreprise.actif ? 'Active' : 'Inactive' }}
                  </ion-badge>
                  <ion-badge 
                    *ngIf="!entreprise.password_hash"
                    color="warning"
                    class="password-badge">
                    Pas de mot de passe
                  </ion-badge>
                </div>
              </div>

              <!-- Détails -->
              <div class="entreprise-details">
                <div class="detail-row" *ngIf="entreprise.telephone">
                  <ion-icon name="call-outline"></ion-icon>
                  <span>{{ entreprise.telephone }}</span>
                </div>
                <div class="detail-row" *ngIf="entreprise.adresse">
                  <ion-icon name="location-outline"></ion-icon>
                  <span>{{ entreprise.adresse }}</span>
                </div>
                <div class="detail-row" *ngIf="entreprise.siret">
                  <ion-icon name="card-outline"></ion-icon>
                  <span>SIRET: {{ entreprise.siret }}</span>
                </div>
                <div class="detail-row" *ngIf="entreprise.responsable">
                  <ion-icon name="person-outline"></ion-icon>
                  <span>Responsable: {{ entreprise.responsable }}</span>
                </div>
                <div class="detail-row">
                  <ion-icon name="time-outline"></ion-icon>
                  <span>Créée le {{ formatDate(entreprise.created_at) }}</span>
                </div>
              </div>

              <!-- Actions -->
              <div class="entreprise-actions">
                <ion-button 
                  size="small" 
                  fill="clear" 
                  (click)="onViewDetails(entreprise)">
                  <ion-icon name="eye-outline" slot="icon-only"></ion-icon>
                </ion-button>
                
                <ion-button 
                  size="small" 
                  fill="clear" 
                  color="primary"
                  (click)="onViewConducteurs(entreprise)">
                  <ion-icon name="people-outline" slot="icon-only"></ion-icon>
                </ion-button>
                
                <ion-button 
                  size="small" 
                  fill="clear" 
                  (click)="onEditEntreprise(entreprise)">
                  <ion-icon name="create-outline" slot="icon-only"></ion-icon>
                </ion-button>
                
                <ion-button 
                  size="small" 
                  fill="clear" 
                  color="warning"
                  (click)="onResetPasswordSpecific(entreprise)">
                  <ion-icon name="key-outline" slot="icon-only"></ion-icon>
                </ion-button>
                
                <ion-toggle
                  [checked]="entreprise.actif"
                  (ionChange)="onToggleStatus(entreprise, $event)"
                  color="success">
                </ion-toggle>
              </div>
            </div>
          </ion-item>
        </ion-list>
      </ion-card-content>
    </ion-card>

  </div>

  <!-- Modal Création/Modification Entreprise -->
  <ion-modal [isOpen]="isCreateModalOpen" (didDismiss)="closeCreateModal()">
    <ng-template>
      <ion-header>
        <ion-toolbar color="primary">
          <ion-title>{{ editingEntreprise ? 'Modifier' : 'Créer' }} Entreprise</ion-title>
          <ion-buttons slot="end">
            <ion-button (click)="closeCreateModal()">
              <ion-icon name="close-circle-outline"></ion-icon>
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding">
        <div class="modal-content">
          
          <ion-item>
            <ion-label position="stacked">Nom de l'entreprise *</ion-label>
            <ion-input
              [(ngModel)]="formData.nom"
              placeholder="Ex: Taxi Express Conakry"
              required>
            </ion-input>
          </ion-item>

          <ion-item>
            <ion-label position="stacked">Email *</ion-label>
            <ion-input
              [(ngModel)]="formData.email"
              type="email"
              placeholder="contact@entreprise.com"
              required>
            </ion-input>
          </ion-item>

          <ion-item>
            <ion-label position="stacked">Téléphone *</ion-label>
            <ion-input
              [(ngModel)]="formData.telephone"
              type="tel"
              placeholder="+224 123 456 789"
              required>
            </ion-input>
          </ion-item>

          <ion-item>
            <ion-label position="stacked">Adresse *</ion-label>
            <ion-textarea
              [(ngModel)]="formData.adresse"
              placeholder="Adresse complète de l'entreprise"
              rows="3"
              required>
            </ion-textarea>
          </ion-item>

          <ion-item>
            <ion-label position="stacked">SIRET (optionnel)</ion-label>
            <ion-input
              [(ngModel)]="formData.siret"
              placeholder="12345678901234">
            </ion-input>
          </ion-item>

          <ion-item>
            <ion-label position="stacked">Responsable (optionnel)</ion-label>
            <ion-input
              [(ngModel)]="formData.responsable"
              placeholder="Nom du responsable">
            </ion-input>
          </ion-item>

          <div class="modal-actions">
            <ion-button 
              expand="block" 
              (click)="onSaveEntreprise()"
              [disabled]="!isFormValid()">
              {{ editingEntreprise ? 'Modifier' : 'Créer' }} Entreprise
            </ion-button>
            <ion-button 
              expand="block" 
              fill="outline" 
              (click)="closeCreateModal()">
              Annuler
            </ion-button>
          </div>
        </div>
      </ion-content>
    </ng-template>
  </ion-modal>

  <!-- Modal Liste Conducteurs -->
  <ion-modal [isOpen]="isConducteursModalOpen" (didDismiss)="closeConducteursModal()" class="conducteurs-modal">
    <ng-template>
      <ion-header class="conducteurs-modal-header">
        <ion-toolbar>
          <ion-title>
            <ion-icon name="people-outline"></ion-icon>
            Conducteurs - {{ selectedEntreprise?.nom }}
          </ion-title>
          <ion-buttons slot="end">
            <ion-button (click)="closeConducteursModal()">
              <ion-icon name="close-outline"></ion-icon>
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding">
        
        <!-- Stats Conducteurs -->
        <ion-card class="conducteurs-stats-card" *ngIf="conducteursList.length > 0">
          <ion-card-content>
            <ion-grid>
              <ion-row>
                <ion-col size="4">
                  <div class="stat-mini">
                    <div class="stat-value">{{ conducteursList.length }}</div>
                    <div class="stat-label">Total</div>
                  </div>
                </ion-col>
                <ion-col size="4">
                  <div class="stat-mini">
                    <div class="stat-value success">{{ conducteursActifs }}</div>
                    <div class="stat-label">Actifs</div>
                  </div>
                </ion-col>
                <ion-col size="4">
                  <div class="stat-mini">
                    <div class="stat-value warning">{{ conducteursInactifs }}</div>
                    <div class="stat-label">Inactifs</div>
                  </div>
                </ion-col>
              </ion-row>
            </ion-grid>
          </ion-card-content>
        </ion-card>

        <!-- Loading -->
        <div *ngIf="isLoadingConducteurs" class="loading-container">
          <ion-spinner></ion-spinner>
          <p>Chargement des conducteurs...</p>
        </div>

        <!-- Liste vide -->
        <div *ngIf="!isLoadingConducteurs && conducteursList.length === 0" class="empty-state">
          <ion-icon name="people-outline" size="large"></ion-icon>
          <h3>Aucun conducteur</h3>
          <p>Cette entreprise n'a pas encore de conducteurs.</p>
        </div>

        <!-- Liste des conducteurs avec collapse -->
        <div *ngIf="!isLoadingConducteurs && conducteursList.length > 0">
          <div *ngFor="let conducteur of conducteursList" class="conducteur-item">
            <!-- Header du conducteur (clickable) -->
            <div class="conducteur-header" 
                 [class.expanded]="isExpanded(conducteur.id)"
                 (click)="toggleConducteur(conducteur)">
              <div class="conducteur-main">
                <div class="conducteur-info">
                  <ion-avatar>
                    <div class="avatar-placeholder">{{ getInitials(conducteur) }}</div>
                  </ion-avatar>
                  <div class="info-text">
                    <h3>{{ conducteur.prenom }} {{ conducteur.nom }}</h3>
                    <div class="info-line">
                      <ion-icon name="call-outline"></ion-icon>
                      {{ conducteur.telephone }}
                    </div>
                    <div class="info-line">
                      <ion-icon name="car-outline"></ion-icon>
                      {{ getVehicleTypeLabel(conducteur.vehicle_type) }}
                      <span *ngIf="conducteur.vehicle_marque"> - {{ conducteur.vehicle_marque }}</span>
                    </div>
                    <div class="info-line" *ngIf="conducteur.note_moyenne">
                      <ion-icon name="star"></ion-icon>
                      {{ conducteur.note_moyenne }}/5 - {{ conducteur.nombre_courses }} courses
                    </div>
                  </div>
                </div>
                <div class="conducteur-actions">
                  <div class="status-badges">
                    <ion-badge [color]="conducteur.actif ? 'success' : 'danger'">
                      {{ conducteur.actif ? 'Actif' : 'Inactif' }}
                    </ion-badge>
                    <ion-badge [color]="!conducteur.hors_ligne ? 'primary' : 'medium'" *ngIf="conducteur.actif">
                      {{ !conducteur.hors_ligne ? 'En ligne' : 'Hors ligne' }}
                    </ion-badge>
                  </div>
                  <ion-icon name="chevron-down-outline" 
                           class="expand-icon" 
                           [class.rotated]="isExpanded(conducteur.id)"></ion-icon>
                </div>
              </div>
            </div>
            
            <!-- Section réservations (collapse) -->
            <div class="conducteur-reservations" [class.expanded]="isExpanded(conducteur.id)">
              <div class="reservations-content">
                <div class="reservations-header">
                  <h4>Réservations récentes</h4>
                  <span class="reservation-count">
                    {{ getReservationsCount(conducteur.id) }} réservation(s)
                  </span>
                </div>
                
                <!-- Loading réservations -->
                <div *ngIf="loadingReservations.has(conducteur.id)" class="ion-text-center ion-padding">
                  <ion-spinner name="crescent"></ion-spinner>
                </div>
                
                <!-- Liste des réservations -->
                <div *ngIf="!loadingReservations.has(conducteur.id)">
                  <div *ngFor="let reservation of getReservations(conducteur.id)" class="reservation-item">
                    <!-- Header avec statut et prix -->
                    <div class="reservation-header">
                      <div class="reservation-status">
                        <span class="status-badge" [ngClass]="reservation.statut">
                          {{ getStatusLabel(reservation.statut) }}
                        </span>
                        <span class="reservation-date">
                          {{ formatRelativeTime(reservation.created_at) }}
                        </span>
                      </div>
                      <div class="reservation-price">
                        {{ formatCurrency(reservation.prix_total) }}
                      </div>
                    </div>
                    
                    <!-- Timeline départ/destination -->
                    <div class="reservation-timeline">
                      <div class="timeline-point departure">
                        <div class="point-label">Départ</div>
                        <div class="point-value">
                          <ion-icon name="location"></ion-icon>
                          {{ reservation.depart_nom || extractLocationName(reservation.position_depart) || 'Position non définie' }}
                        </div>
                      </div>
                      
                      <div class="timeline-point destination">
                        <div class="point-label">Destination</div>
                        <div class="point-value">
                          <ion-icon name="flag"></ion-icon>
                          {{ reservation.destination_nom || 'Destination non définie' }}
                        </div>
                        <div class="point-distance" *ngIf="reservation.distance_km">
                          <ion-icon name="speedometer-outline"></ion-icon>
                          {{ reservation.distance_km }} km
                        </div>
                      </div>
                    </div>
                    
                    <!-- Footer avec infos client et note -->
                    <div class="reservation-footer">
                      <div class="client-info">
                        <ion-icon name="person-outline"></ion-icon>
                        {{ reservation.client_phone }}
                      </div>
                      <div class="reservation-note" *ngIf="reservation.note_conducteur">
                        <ion-icon name="star"></ion-icon>
                        <span>{{ reservation.note_conducteur }}/5</span>
                      </div>
                    </div>
                  </div>
                  
                  <div *ngIf="getReservations(conducteur.id).length === 0" class="no-reservations">
                    Aucune réservation trouvée
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="modal-actions" *ngIf="!isLoadingConducteurs && conducteursList.length > 0">
          <ion-button expand="block" fill="outline" (click)="exportConducteursList()">
            <ion-icon name="download-outline" slot="start"></ion-icon>
            Exporter la liste
          </ion-button>
        </div>

      </ion-content>
    </ng-template>
  </ion-modal>

</ion-content>
  `,
  styleUrls: ['./entreprises-management.page.scss'],
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
    IonList,
    IonBadge,
    IonSpinner,
    IonRefresher,
    IonRefresherContent,
    IonSearchbar,
    IonSelect,
    IonSelectOption,
    IonTextarea,
    IonToggle,
    IonModal,
    IonButtons,
    IonAvatar
  ]
})
export class EntreprisesManagementPage implements OnInit {

  // Données
  entreprises: Entreprise[] = [];
  filteredEntreprises: Entreprise[] = [];
  stats: EntrepriseStats = {
    total_entreprises: 0,
    entreprises_actives: 0,
    entreprises_inactives: 0,
    nouveaux_ce_mois: 0,
    total_conducteurs: 0,
    total_reservations: 0,
    ca_total: 0
  };

  // Recherche
  searchQuery = '';

  // État de l'interface
  isLoading = true;
  
  // Modal de création/modification
  isCreateModalOpen = false;
  editingEntreprise: Entreprise | null = null;
  formData: CreateEntrepriseData = {
    nom: '',
    email: '',
    telephone: '',
    adresse: ''
  };

  // Modal conducteurs
  isConducteursModalOpen = false;
  selectedEntreprise: Entreprise | null = null;
  conducteursList: any[] = [];
  isLoadingConducteurs = false;
  expandedConducteurs: Set<string> = new Set();
  conducteursReservations: Map<string, any[]> = new Map();
  loadingReservations: Set<string> = new Set();

  constructor(
    private entrepriseService: EntrepriseManagementService,
    private router: Router,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private alertController: AlertController
  ) {
    // Ajouter les icônes
    addIcons({
      arrowBackOutline,
      businessOutline,
      addOutline,
      eyeOutline,
      createOutline,
      trashOutline,
      refreshOutline,
      searchOutline,
      mailOutline,
      callOutline,
      locationOutline,
      location,
      statsChartOutline,
      checkmarkCircleOutline,
      closeCircleOutline,
      closeOutline,
      keyOutline,
      peopleOutline,
      cardOutline,
      timeOutline,
      personOutline,
      carOutline,
      downloadOutline,
      star,
      chevronDownOutline,
      flag,
      speedometerOutline
    });
  }

  async ngOnInit() {
    await this.loadData();
  }

  private async loadData() {
    try {
      this.isLoading = true;
      
      // Charger entreprises et statistiques en parallèle
      await Promise.all([
        this.loadEntreprises(),
        this.loadStats()
      ]);
      
    } catch (error) {
      console.error('❌ Erreur chargement données:', error);
      this.showError('Erreur lors du chargement des données');
    } finally {
      this.isLoading = false;
    }
  }

  private async loadEntreprises() {
    const { data, error } = await this.entrepriseService.getAllEntreprises();
    
    if (error) {
      throw error;
    }
    
    this.entreprises = data || [];
    this.applyFilters();
  }

  private async loadStats() {
    const { data, error } = await this.entrepriseService.getEntreprisesStats();
    
    if (error) {
      console.error('❌ Erreur chargement stats:', error);
    } else {
      this.stats = data || this.stats;
    }
  }

  // Event handlers
  async onRefresh(event?: RefresherCustomEvent) {
    await this.loadData();
    if (event) {
      event.target.complete();
    }
  }

  onSearch() {
    this.applyFilters();
  }

  private applyFilters() {
    let filtered = [...this.entreprises];

    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(e => 
        e.nom.toLowerCase().includes(query) ||
        e.email.toLowerCase().includes(query) ||
        e.telephone?.toLowerCase().includes(query)
      );
    }

    this.filteredEntreprises = filtered;
  }

  // Actions entreprises
  onCreateEntreprise() {
    this.editingEntreprise = null;
    this.formData = {
      nom: '',
      email: '',
      telephone: '',
      adresse: ''
    };
    this.isCreateModalOpen = true;
  }

  onEditEntreprise(entreprise: Entreprise) {
    this.editingEntreprise = entreprise;
    this.formData = {
      nom: entreprise.nom,
      email: entreprise.email,
      telephone: entreprise.telephone,
      adresse: entreprise.adresse,
      siret: entreprise.siret || undefined,
      responsable: entreprise.responsable || undefined
    };
    this.isCreateModalOpen = true;
  }

  async onSaveEntreprise() {
    if (!this.isFormValid()) {
      this.showError('Veuillez remplir tous les champs obligatoires');
      return;
    }

    const loading = await this.loadingController.create({
      message: this.editingEntreprise ? 'Modification...' : 'Création...'
    });
    await loading.present();

    try {
      if (this.editingEntreprise) {
        // Modification
        const { success, error } = await this.entrepriseService.updateEntreprise(
          this.editingEntreprise.id,
          this.formData
        );

        if (!success) {
          throw error;
        }

        this.showSuccess('Entreprise modifiée avec succès');
      } else {
        // Création
        const { data, error } = await this.entrepriseService.createEntreprise(this.formData);

        if (!data) {
          throw error;
        }

        this.showSuccess('Entreprise créée avec succès');
      }

      this.closeCreateModal();
      await this.loadEntreprises();

    } catch (error: any) {
      console.error('❌ Erreur sauvegarde:', error);
      this.showError(error.message || 'Erreur lors de la sauvegarde');
    } finally {
      await loading.dismiss();
    }
  }

  closeCreateModal() {
    this.isCreateModalOpen = false;
    this.editingEntreprise = null;
  }

  async onToggleStatus(entreprise: Entreprise, event: any) {
    const newStatus = event.detail.checked;
    
    try {
      const { success, error } = await this.entrepriseService.toggleEntrepriseStatus(
        entreprise.id,
        newStatus
      );

      if (!success) {
        throw error;
      }

      // Mettre à jour localement
      entreprise.actif = newStatus;
      this.showSuccess(`Entreprise ${newStatus ? 'activée' : 'désactivée'}`);
      await this.loadStats();

    } catch (error: any) {
      console.error('❌ Erreur changement statut:', error);
      this.showError('Erreur lors du changement de statut');
      // Revenir à l'état précédent
      event.target.checked = !newStatus;
    }
  }

  // Reset de mot de passe simple
  async onResetPassword() {
    // Vérifier qu'il y a des entreprises
    if (this.entreprises.length === 0) {
      this.showError('Aucune entreprise disponible pour réinitialisation');
      return;
    }

    // Créer liste des entreprises pour sélection avec plus d'informations
    const inputs = this.entreprises.map(e => ({
      name: 'entreprise',
      type: 'radio' as const,
      label: `${e.nom}\n📧 ${e.email}\n📱 ${e.telephone}\n${e.password_hash ? '🔒 Mot de passe défini' : '⚠️ Aucun mot de passe'}`,
      value: e.id,
      checked: false
    }));

    const alert = await this.alertController.create({
      header: '🔐 Réinitialisation Mot de Passe',
      subHeader: 'Sélectionnez l\'entreprise à réinitialiser',
      message: `Cette action va:\n• Supprimer le mot de passe actuel\n• Forcer une nouvelle connexion\n• Permettre la définition d'un nouveau mot de passe`,
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
          handler: async (entrepriseId) => {
            if (entrepriseId) {
              const entreprise = this.entreprises.find(e => e.id === entrepriseId);
              if (entreprise) {
                await this.confirmResetPassword(entreprise);
                return true;
              }
              return false;
            } else {
              this.showError('Veuillez sélectionner une entreprise');
              return false;
            }
          }
        }
      ]
    });

    await alert.present();
  }

  private async confirmResetPassword(entreprise: Entreprise) {
    const confirmAlert = await this.alertController.create({
      header: '⚠️ Confirmation Réinitialisation',
      message: `
        <div style="text-align: left;">
          <p><strong>Entreprise:</strong> ${entreprise.nom}</p>
          <p><strong>Email:</strong> ${entreprise.email}</p>
          <p><strong>Statut actuel:</strong> ${entreprise.password_hash ? 'Mot de passe défini' : 'Aucun mot de passe'}</p>
          <br>
          <p>⚠️ <strong>Cette action va:</strong></p>
          <ul style="margin-left: 20px;">
            <li>Supprimer le mot de passe actuel</li>
            <li>Marquer le compte comme "première connexion"</li>
            <li>L'entreprise devra créer un nouveau mot de passe</li>
          </ul>
        </div>
      `,
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
            await this.resetPasswordForEntreprise(entreprise.id);
          }
        }
      ]
    });

    await confirmAlert.present();
  }

  async onResetPasswordSpecific(entreprise: Entreprise) {
    await this.confirmResetPassword(entreprise);
  }

  private async resetPasswordForEntreprise(entrepriseId: string) {
    const loading = await this.loadingController.create({
      message: 'Réinitialisation...'
    });
    await loading.present();

    try {
      const { success, error } = await this.entrepriseService.resetEntreprisePassword(entrepriseId);

      if (!success) {
        throw error;
      }

      this.showSuccess('Mot de passe réinitialisé avec succès');
      await this.loadEntreprises();

    } catch (error: any) {
      console.error('❌ Erreur reset password:', error);
      this.showError('Erreur lors de la réinitialisation');
    } finally {
      await loading.dismiss();
    }
  }

  async onViewDetails(entreprise: Entreprise) {
    // TODO: Implémenter page détails entreprise
    this.showInfo('Page détails entreprise - À implémenter');
  }

  async onViewConducteurs(entreprise: Entreprise) {
    this.selectedEntreprise = entreprise;
    this.isConducteursModalOpen = true;
    this.isLoadingConducteurs = true;
    this.conducteursList = [];

    try {
      console.log(`👥 Chargement des conducteurs pour l'entreprise ${entreprise.nom}`);
      
      const { data, error } = await this.entrepriseService.getConducteursByEntreprise(entreprise.id);
      
      if (error) {
        throw error;
      }

      this.conducteursList = data || [];
      console.log(`✅ ${this.conducteursList.length} conducteur(s) trouvé(s)`);

    } catch (error) {
      console.error('❌ Erreur chargement conducteurs:', error);
      this.showError('Erreur lors du chargement des conducteurs');
    } finally {
      this.isLoadingConducteurs = false;
    }
  }

  closeConducteursModal() {
    this.isConducteursModalOpen = false;
    this.selectedEntreprise = null;
    this.conducteursList = [];
    this.expandedConducteurs.clear();
    this.conducteursReservations.clear();
    this.loadingReservations.clear();
  }

  // Toggle collapse conducteur
  async toggleConducteur(conducteur: any) {
    const conducteurId = conducteur.id;
    
    if (this.expandedConducteurs.has(conducteurId)) {
      this.expandedConducteurs.delete(conducteurId);
    } else {
      this.expandedConducteurs.add(conducteurId);
      
      // Charger les réservations si pas déjà chargées
      if (!this.conducteursReservations.has(conducteurId)) {
        await this.loadConducteurReservations(conducteur);
      }
    }
  }

  // Charger les réservations d'un conducteur
  async loadConducteurReservations(conducteur: any) {
    const conducteurId = conducteur.id;
    this.loadingReservations.add(conducteurId);
    
    try {
      const { data, error } = await this.entrepriseService.getReservationsByConducteur(conducteurId);
      
      if (!error && data) {
        this.conducteursReservations.set(conducteurId, data);
      } else {
        this.conducteursReservations.set(conducteurId, []);
      }
    } catch (error) {
      console.error('Erreur chargement réservations:', error);
      this.conducteursReservations.set(conducteurId, []);
    } finally {
      this.loadingReservations.delete(conducteurId);
    }
  }

  // Vérifier si un conducteur est expanded
  isExpanded(conducteurId: string): boolean {
    return this.expandedConducteurs.has(conducteurId);
  }

  // Obtenir les réservations d'un conducteur
  getReservations(conducteurId: string): any[] {
    return this.conducteursReservations.get(conducteurId) || [];
  }

  // Obtenir le nombre de réservations
  getReservationsCount(conducteurId: string): number {
    return this.getReservations(conducteurId).length;
  }

  // Formater la devise
  formatCurrency(amount: number): string {
    if (!amount) return '0 GNF';
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount) + ' GNF';
  }

  // Obtenir le label du statut
  getStatusLabel(status: string): string {
    const labels: any = {
      'pending': 'En attente',
      'accepted': 'Acceptée',
      'refused': 'Refusée',
      'completed': 'Terminée',
      'canceled': 'Annulée'
    };
    return labels[status] || status;
  }

  // Formater le temps relatif
  formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `Il y a ${diffMins} min`;
    } else if (diffHours < 24) {
      return `Il y a ${diffHours}h`;
    } else if (diffDays < 7) {
      return `Il y a ${diffDays}j`;
    } else {
      return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
    }
  }

  // Extraire le nom de lieu d'une position
  extractLocationName(position: string): string {
    if (!position) return '';
    
    // Si c'est une adresse texte simple
    if (!position.startsWith('POINT') && !position.match(/^[0-9A-F]+$/i)) {
      return position;
    }
    
    // Si c'est un format POINT ou WKB, retourner une description générique
    return 'Position GPS';
  }

  async exportConducteursList() {
    if (!this.selectedEntreprise) return;
    
    try {
      // Créer le CSV
      const csvContent = this.generateConducteursCSV();
      
      // Créer un blob et télécharger
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `conducteurs_${this.selectedEntreprise.nom}_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      this.showSuccess('Liste exportée avec succès');
    } catch (error) {
      console.error('❌ Erreur export:', error);
      this.showError('Erreur lors de l\'export');
    }
  }

  private generateConducteursCSV(): string {
    const headers = ['Nom', 'Prénom', 'Téléphone', 'Type Véhicule', 'Marque', 'Plaque', 'Note', 'Courses', 'Actif', 'En ligne'];
    const rows = this.conducteursList.map(c => [
      c.nom || '',
      c.prenom || '',
      c.telephone || '',
      this.getVehicleTypeLabel(c.vehicle_type) || '',
      c.vehicle_marque || '',
      c.vehicle_plaque || '',
      c.note_moyenne || '5',
      c.nombre_courses || '0',
      c.actif ? 'Oui' : 'Non',
      !c.hors_ligne ? 'Oui' : 'Non'
    ]);
    
    const csvRows = [
      headers.join(','),
      ...rows.map(row => row.map(field => `"${field}"`).join(','))
    ];
    
    return csvRows.join('\n');
  }

  // Getters pour les stats conducteurs
  get conducteursActifs(): number {
    return this.conducteursList.filter(c => c.actif).length;
  }

  get conducteursInactifs(): number {
    return this.conducteursList.filter(c => !c.actif).length;
  }

  getInitials(conducteur: any): string {
    const prenom = conducteur.prenom || '';
    const nom = conducteur.nom || '';
    return `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase();
  }

  getVehicleTypeLabel(type: string): string {
    switch(type) {
      case 'moto': return 'Moto';
      case 'voiture': return 'Voiture';
      default: return 'Non défini';
    }
  }

  async onExportData() {
    this.showInfo('Export données - Fonctionnalité en développement');
  }

  goBack() {
    this.router.navigate(['/super-admin/dashboard']);
  }

  // Utilitaires
  isFormValid(): boolean {
    return !!(
      this.formData.nom?.trim() &&
      this.formData.email?.trim() &&
      this.formData.telephone?.trim() &&
      this.formData.adresse?.trim()
    );
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  trackByEntreprise(index: number, entreprise: Entreprise): string {
    return entreprise.id;
  }

  private async showSuccess(message: string) {
    const toast = await this.toastController.create({
      message: `✅ ${message}`,
      duration: 3000,
      color: 'success',
      position: 'top'
    });
    await toast.present();
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

  private async showInfo(message: string) {
    const toast = await this.toastController.create({
      message: `ℹ️ ${message}`,
      duration: 3000,
      color: 'primary',
      position: 'top'
    });
    await toast.present();
  }
}