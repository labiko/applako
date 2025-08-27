/**
 * PAGE TABLEAU DE BORD FINANCIER SUPER-ADMIN
 * Gestion des périodes, commissions et paiements
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
  IonSelect,
  IonSelectOption,
  IonModal,
  IonInput,
  IonTextarea,
  LoadingController,
  ToastController,
  AlertController,
  RefresherCustomEvent
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  arrowBackOutline,
  cashOutline,
  cardOutline,
  statsChartOutline,
  timeOutline,
  businessOutline,
  refreshOutline,
  addOutline,
  eyeOutline,
  downloadOutline,
  warningOutline,
  checkmarkCircleOutline,
  walletOutline,
  trendingUpOutline,
  calendarOutline,
  returnUpBackOutline,
  trashOutline,
  sendOutline,
  cardOutline as cardIcon,
  receiptOutline
} from 'ionicons/icons';

import { 
  FinancialManagementService, 
  FacturationPeriode, 
  CommissionDetail,
  StatistiquesFinancieres 
} from '../../services/financial-management.service';
import { FluxFinancierService } from '../../services/flux-financier.service';
import { PaiementEntrepriseService, EntreprisePaiementDue, PaiementEntreprise } from '../../services/paiement-entreprise.service';
import { SupabaseService } from '../../../services/supabase.service';

@Component({
  selector: 'app-financial-dashboard',
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
      <ion-icon name="cash-outline"></ion-icon>
      Gestion Financière
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
    
    <!-- Statistiques générales -->
    <ion-card class="stats-card">
      <ion-card-header>
        <ion-card-title>
          <ion-icon name="stats-chart-outline"></ion-icon>
          Vue d'ensemble financière
        </ion-card-title>
      </ion-card-header>
      <ion-card-content>
        <ion-grid>
          <ion-row>
            <ion-col size="6" size-md="3">
              <div class="stat-item">
                <div class="stat-number">{{ formatPrice(stats?.periode_courante?.total_commissions || 0) }}</div>
                <div class="stat-label">Commissions Calculées</div>
              </div>
            </ion-col>
            <ion-col size="6" size-md="3">
              <div class="stat-item">
                <div class="stat-number">{{ formatPrice(stats?.periode_courante?.total_paye || 0) }}</div>
                <div class="stat-label">Montant Payé</div>
              </div>
            </ion-col>
            <ion-col size="6" size-md="3">
              <div class="stat-item">
                <div class="stat-number">{{ stats?.periode_courante?.taux_recouvrement || 0 }}%</div>
                <div class="stat-label">Taux Recouvrement</div>
              </div>
            </ion-col>
            <ion-col size="6" size-md="3">
              <div class="stat-item">
                <div class="stat-number warning">{{ stats?.retards_paiement?.total_en_retard || 0 }}</div>
                <div class="stat-label">Retards de Paiement</div>
              </div>
            </ion-col>
          </ion-row>
        </ion-grid>
      </ion-card-content>
    </ion-card>

    <!-- Sélecteur Vue Global / Par Période -->
    <ion-card class="view-selector-card">
      <ion-card-content>
        <ion-segment [(ngModel)]="viewMode" (ionChange)="onViewModeChange($event)">
          <ion-segment-button value="global">
            <ion-label>🌍 Vue Globale</ion-label>
          </ion-segment-button>
          <ion-segment-button value="periode">
            <ion-label>📅 Par Période</ion-label>
          </ion-segment-button>
        </ion-segment>
        
        <!-- Sélecteur de période -->
        <div *ngIf="viewMode === 'periode' && fluxParPeriode.length > 0" class="periode-selector">
          <ion-item>
            <ion-label>Période:</ion-label>
            <ion-select [(ngModel)]="selectedPeriodeId" (ionChange)="onPeriodeChange($event)">
              <ion-select-option *ngFor="let flux of fluxParPeriode" [value]="flux.periode_id">
                {{ formatDate(flux.periode_debut) }} - {{ formatDate(flux.periode_fin) }}
              </ion-select-option>
            </ion-select>
            <ion-button 
              *ngIf="selectedPeriodeId"
              slot="end" 
              fill="outline" 
              size="small"
              (click)="voirDetailPeriode(selectedPeriodeId)">
              <ion-icon name="eye-outline" slot="start"></ion-icon>
              Voir détail
            </ion-button>
          </ion-item>
        </div>
      </ion-card-content>
    </ion-card>

    <!-- Flux Financier Mobile Money vs Cash -->
    <ion-card *ngIf="(viewMode === 'global' && fluxFinancierStats) || (viewMode === 'periode' && getSelectedPeriodeFlux())" class="flux-financier-card">
      <ion-card-header>
        <ion-card-title>
          <ion-icon name="wallet-outline"></ion-icon>
          Flux Financier Mobile Money vs Cash
          <span *ngIf="viewMode === 'global'" class="view-badge global">CUMULÉ</span>
          <span *ngIf="viewMode === 'periode'" class="view-badge periode">PÉRIODE</span>
        </ion-card-title>
      </ion-card-header>
      <ion-card-content>
        <ion-grid>
          <!-- Vue Global -->
          <ng-container *ngIf="viewMode === 'global' && fluxFinancierStats">
            <ion-row>
              <ion-col size="6" size-md="3">
                <div class="stat-item mobile-money">
                  <div class="stat-number">{{ formatPrice(fluxFinancierStats.totalMobileMoneyEncaisse) }}</div>
                  <div class="stat-label">Mobile Money Encaissé</div>
                </div>
              </ion-col>
              <ion-col size="6" size-md="3">
                <div class="stat-item cash">
                  <div class="stat-number">{{ formatPrice(fluxFinancierStats.totalCACash) }}</div>
                  <div class="stat-label">CA Cash Total</div>
                </div>
              </ion-col>
              <ion-col size="6" size-md="3">
                <div class="stat-item reverser">
                  <div class="stat-number">{{ formatPrice(fluxFinancierStats.totalAReverser) }}</div>
                  <div class="stat-label">À Reverser (89%)</div>
                </div>
              </ion-col>
              <ion-col size="6" size-md="3">
                <div class="stat-item collecter">
                  <div class="stat-number">{{ formatPrice(fluxFinancierStats.totalACollecter) }}</div>
                  <div class="stat-label">À Collecter (11%)</div>
                </div>
              </ion-col>
            </ion-row>
            <ion-row>
              <ion-col size="12" size-md="6">
                <div class="stat-item balance" [class.positive]="fluxFinancierStats.balanceGlobale > 0" [class.negative]="fluxFinancierStats.balanceGlobale < 0">
                  <div class="stat-number">{{ formatPrice(fluxFinancierStats.balanceGlobale) }}</div>
                  <div class="stat-label">Balance Globale Cumulative</div>
                </div>
              </ion-col>
              <ion-col size="12" size-md="6">
                <div class="stat-item">
                  <div class="stat-number">{{ fluxFinancierStats.nombreEntreprises }}</div>
                  <div class="stat-label">Entreprises Actives</div>
                </div>
              </ion-col>
            </ion-row>
          </ng-container>

          <!-- Vue Par Période -->
          <ng-container *ngIf="viewMode === 'periode' && getSelectedPeriodeFlux() as periodeFlux">
            <ion-row>
              <ion-col size="6" size-md="3">
                <div class="stat-item mobile-money">
                  <div class="stat-number">{{ formatPrice(periodeFlux.totalMobileMoneyEncaisse) }}</div>
                  <div class="stat-label">Mobile Money Période</div>
                </div>
              </ion-col>
              <ion-col size="6" size-md="3">
                <div class="stat-item cash">
                  <div class="stat-number">{{ formatPrice(periodeFlux.totalCACash) }}</div>
                  <div class="stat-label">CA Cash Période</div>
                </div>
              </ion-col>
              <ion-col size="6" size-md="3">
                <div class="stat-item reverser">
                  <div class="stat-number">{{ formatPrice(periodeFlux.totalAReverser) }}</div>
                  <div class="stat-label">À Reverser Période</div>
                </div>
              </ion-col>
              <ion-col size="6" size-md="3">
                <div class="stat-item collecter">
                  <div class="stat-number">{{ formatPrice(periodeFlux.totalACollecter) }}</div>
                  <div class="stat-label">À Collecter Période</div>
                </div>
              </ion-col>
            </ion-row>
            <ion-row>
              <ion-col size="12" size-md="6">
                <div class="stat-item balance" [class.positive]="(periodeFlux.totalAReverser - periodeFlux.totalACollecter) > 0" [class.negative]="(periodeFlux.totalAReverser - periodeFlux.totalACollecter) < 0">
                  <div class="stat-number">{{ formatPrice(periodeFlux.totalAReverser - periodeFlux.totalACollecter) }}</div>
                  <div class="stat-label">Balance Période</div>
                </div>
              </ion-col>
              <ion-col size="12" size-md="6">
                <div class="stat-item">
                  <div class="stat-number">{{ periodeFlux.entreprises.length }}</div>
                  <div class="stat-label">Entreprises Période</div>
                </div>
              </ion-col>
            </ion-row>
          </ng-container>
        </ion-grid>
      </ion-card-content>
    </ion-card>

    <!-- Balances par Entreprise avec Paiements -->
    <ion-card *ngIf="balancesEntreprises.length > 0" class="balances-card">
      <ion-card-header>
        <ion-card-title>
          <ion-icon name="business-outline"></ion-icon>
          Balances par Entreprise ({{ balancesEntreprises.length }})
        </ion-card-title>
      </ion-card-header>
      <ion-card-content>
        <ion-list>
          <ion-item *ngFor="let balance of balancesEntreprises">
            <div class="balance-item">
              <div class="balance-header">
                <strong>{{ balance.entreprises?.nom || 'Entreprise Inconnue' }}</strong>
                <div class="balance-actions">
                  <ion-badge [color]="balance.balance_courante > 0 ? 'success' : balance.balance_courante < 0 ? 'danger' : 'medium'">
                    {{ formatPrice(balance.balance_courante || 0) }}
                  </ion-badge>
                  <ion-button 
                    *ngIf="balance.balance_courante > 0"
                    fill="clear" 
                    size="small" 
                    color="success"
                    (click)="ouvrirModalPaiement(balance)"
                    title="Effectuer un paiement">
                    <ion-icon name="send-outline" slot="icon-only"></ion-icon>
                  </ion-button>
                </div>
              </div>
              <div class="balance-details">
                <div class="balance-row">
                  <span class="label">💰 Mobile Money:</span>
                  <span class="value">{{ formatPrice(balance.total_mobile_money_encaisse || 0) }}</span>
                </div>
                <div class="balance-row">
                  <span class="label">💵 CA Cash:</span>
                  <span class="value">{{ formatPrice(balance.total_ca_cash || 0) }}</span>
                </div>
                <div class="balance-row">
                  <span class="label">↩️ À Reverser:</span>
                  <span class="value success">{{ formatPrice(balance.total_a_reverser || 0) }}</span>
                </div>
                <div class="balance-row">
                  <span class="label">📥 À Collecter:</span>
                  <span class="value warning">{{ formatPrice(balance.total_a_collecter || 0) }}</span>
                </div>
                <div class="balance-row">
                  <span class="label">📊 Périodes:</span>
                  <span class="value">{{ balance.nombre_periodes_traitees || 0 }}</span>
                </div>
              </div>
            </div>
          </ion-item>
        </ion-list>
      </ion-card-content>
    </ion-card>

    <!-- Actions rapides -->
    <ion-card class="actions-card">
      <ion-card-header>
        <ion-card-title>Actions Rapides</ion-card-title>
      </ion-card-header>
      <ion-card-content>
        <ion-grid>
          <ion-row>
            <ion-col size="6" size-md="3">
              <ion-button 
                expand="block" 
                fill="outline"
                (click)="onCreatePeriode()">
                <ion-icon name="add-outline" slot="start"></ion-icon>
                Nouvelle Période
              </ion-button>
            </ion-col>
            <ion-col size="6" size-md="3">
              <ion-button 
                expand="block" 
                fill="outline"
                (click)="onCloturerPeriode()"
                [disabled]="!periodeCourante">
                <ion-icon name="checkmark-circle-outline" slot="start"></ion-icon>
                Clôturer Période
              </ion-button>
            </ion-col>
            <ion-col size="6" size-md="3">
              <ion-button 
                expand="block" 
                fill="outline"
                (click)="onExportRapport()">
                <ion-icon name="download-outline" slot="start"></ion-icon>
                Export Rapport
              </ion-button>
            </ion-col>
            <ion-col size="6" size-md="3">
              <ion-button 
                expand="block" 
                fill="outline"
                color="secondary"
                (click)="onVoirHistoriquePaiements()">
                <ion-icon name="receipt-outline" slot="start"></ion-icon>
                Historique Paiements
              </ion-button>
            </ion-col>
            <ion-col size="6" size-md="3">
              <ion-button 
                expand="block" 
                fill="outline"
                color="warning"
                (click)="onGererRelances()">
                <ion-icon name="warning-outline" slot="start"></ion-icon>
                Gérer Relances
              </ion-button>
            </ion-col>
          </ion-row>
        </ion-grid>
      </ion-card-content>
    </ion-card>

    <!-- Loading -->
    <div *ngIf="isLoading" class="loading-container">
      <ion-spinner></ion-spinner>
      <p>Chargement des données financières...</p>
    </div>

    <!-- Périodes de facturation -->
    <ion-card *ngIf="!isLoading" class="periodes-card">
      <ion-card-header>
        <ion-card-title>
          <ion-icon name="calendar-outline"></ion-icon>
          Périodes de Facturation ({{ periodes.length }})
        </ion-card-title>
      </ion-card-header>
      <ion-card-content>
        
        <!-- Message si aucune période -->
        <div *ngIf="periodes.length === 0" class="empty-state">
          <ion-icon name="calendar-outline" size="large"></ion-icon>
          <h3>Aucune période trouvée</h3>
          <p>Créez votre première période de facturation pour commencer.</p>
          <ion-button fill="outline" (click)="onCreatePeriode()">
            <ion-icon name="add-outline" slot="start"></ion-icon>
            Créer une période
          </ion-button>
        </div>

        <!-- Liste des périodes -->
        <ion-list *ngIf="periodes.length > 0">
          <ion-item 
            *ngFor="let periode of periodes; trackBy: trackByPeriode"
            button="true"
            (click)="onViewPeriode(periode)">
            
            <div class="periode-item">
              <!-- Header avec dates et statut -->
              <div class="periode-header">
                <div class="periode-dates">
                  <strong>{{ formatDate(periode.periode_debut) }} - {{ formatDate(periode.periode_fin) }}</strong>
                </div>
                <div class="periode-actions">
                  <ion-badge 
                    [color]="getPeriodeStatusColor(periode.statut)"
                    class="status-badge">
                    {{ getPeriodeStatusText(periode.statut) }}
                  </ion-badge>
                  <ion-button
                    fill="clear"
                    size="small"
                    color="danger"
                    (click)="onDeletePeriode(periode, $event)"
                    title="Supprimer cette période">
                    <ion-icon name="trash-outline" slot="icon-only"></ion-icon>
                  </ion-button>
                </div>
              </div>

              <!-- Détails financiers -->
              <div class="periode-details">
                <div class="detail-row">
                  <span class="detail-label">
                    <ion-icon name="business-outline"></ion-icon>
                    Entreprises:
                  </span>
                  <span class="detail-value">{{ periode.nombre_entreprises || 0 }}</span>
                </div>
                
                <div class="detail-row">
                  <span class="detail-label">
                    <ion-icon name="cash-outline"></ion-icon>
                    Commissions:
                  </span>
                  <span class="detail-value">{{ formatPrice(periode.total_commissions || 0) }}</span>
                </div>
                
                <div class="detail-row" *ngIf="periode.total_facture > 0">
                  <span class="detail-label">
                    <ion-icon name="card-outline"></ion-icon>
                    Facturé:
                  </span>
                  <span class="detail-value">{{ formatPrice(periode.total_facture) }}</span>
                </div>
              </div>

              <!-- Actions -->
              <div class="periode-actions">
                <ion-button 
                  size="small" 
                  fill="clear" 
                  (click)="onViewPeriode(periode); $event.stopPropagation()">
                  <ion-icon name="eye-outline" slot="icon-only"></ion-icon>
                </ion-button>
                
                <ion-button 
                  *ngIf="periode.statut === 'en_cours'"
                  size="small" 
                  fill="clear" 
                  color="success"
                  (click)="onCloturerPeriodeSpecific(periode); $event.stopPropagation()">
                  <ion-icon name="checkmark-circle-outline" slot="icon-only"></ion-icon>
                </ion-button>
                
                <ion-button 
                  *ngIf="periode.statut === 'cloturee'"
                  size="small" 
                  fill="clear" 
                  color="warning"
                  (click)="onAnnulerCloture(periode); $event.stopPropagation()">
                  <ion-icon name="return-up-back-outline" slot="icon-only"></ion-icon>
                </ion-button>
              </div>
            </div>
          </ion-item>
        </ion-list>
      </ion-card-content>
    </ion-card>

    <!-- Informations système -->
    <ion-card class="system-info-card">
      <ion-card-content>
        <div class="system-info">
          <ion-icon name="wallet-outline" color="success"></ion-icon>
          <div class="info-text">
            <strong>Système Financier Actif</strong>
            <p>Suivi automatique des commissions, facturation et relances de paiement.</p>
          </div>
        </div>
      </ion-card-content>
    </ion-card>

    <!-- Modal de Paiement Entreprise -->
    <ion-modal [isOpen]="paiementModalOpen" (didDismiss)="fermerModalPaiement()">
      <ng-template>
        <ion-header>
          <ion-toolbar color="primary">
            <ion-title>
              <ion-icon name="send-outline"></ion-icon>
              Paiement Entreprise
            </ion-title>
            <ion-button 
              slot="end" 
              fill="clear" 
              color="light"
              (click)="fermerModalPaiement()">
              <ion-icon name="close-circle-outline"></ion-icon>
            </ion-button>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <div *ngIf="selectedEntreprisePaiement" class="paiement-form">
            
            <!-- Informations Entreprise -->
            <ion-card class="entreprise-info-card">
              <ion-card-content>
                <div class="entreprise-header">
                  <h2>{{ selectedEntreprisePaiement.entreprise_nom }}</h2>
                  <ion-badge color="success" class="balance-badge">
                    Balance: {{ formatPrice(selectedEntreprisePaiement.balance_courante) }}
                  </ion-badge>
                </div>
                <div class="entreprise-details">
                  <div class="detail-item">
                    <span class="label">💰 À reverser:</span>
                    <span class="value">{{ formatPrice(selectedEntreprisePaiement.total_a_reverser) }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="label">📥 À collecter:</span>
                    <span class="value warning">{{ formatPrice(selectedEntreprisePaiement.total_a_collecter) }}</span>
                  </div>
                  <div class="detail-item" *ngIf="selectedEntreprisePaiement.dernier_paiement_date">
                    <span class="label">📅 Dernier paiement:</span>
                    <span class="value">{{ formatDate(selectedEntreprisePaiement.dernier_paiement_date) }}</span>
                  </div>
                </div>
              </ion-card-content>
            </ion-card>

            <!-- Formulaire de Paiement -->
            <ion-item>
              <ion-label position="stacked">Montant à payer *</ion-label>
              <ion-input
                type="number"
                [(ngModel)]="paiementForm.montant_paye"
                [placeholder]="'Max: ' + formatPrice(selectedEntreprisePaiement.balance_courante)"
                [max]="selectedEntreprisePaiement.balance_courante"
                min="1">
              </ion-input>
            </ion-item>

            <ion-item>
              <ion-label position="stacked">Méthode de paiement *</ion-label>
              <ion-select [(ngModel)]="paiementForm.methode_paiement" placeholder="Sélectionner">
                <ion-select-option value="mobile_money">💳 Mobile Money</ion-select-option>
                <ion-select-option value="virement">🏦 Virement bancaire</ion-select-option>
                <ion-select-option value="especes">💵 Espèces</ion-select-option>
              </ion-select>
            </ion-item>

            <ion-item>
              <ion-label position="stacked">Référence de paiement</ion-label>
              <ion-input
                [(ngModel)]="paiementForm.reference_paiement"
                placeholder="Ex: TX123456789">
              </ion-input>
            </ion-item>

            <ion-item>
              <ion-label position="stacked">Numéro bénéficiaire</ion-label>
              <ion-input
                [(ngModel)]="paiementForm.numero_beneficiaire"
                placeholder="Ex: +224 123 456 789">
              </ion-input>
            </ion-item>

            <ion-item>
              <ion-label position="stacked">Notes (optionnel)</ion-label>
              <ion-textarea
                [(ngModel)]="paiementForm.notes"
                placeholder="Commentaires sur le paiement"
                rows="3">
              </ion-textarea>
            </ion-item>

            <div class="modal-actions">
              <ion-button 
                expand="block" 
                color="success"
                (click)="effectuerPaiement()"
                [disabled]="isProcessingPaiement || !paiementForm.montant_paye || !paiementForm.methode_paiement">
                <ion-icon name="send-outline" slot="start" *ngIf="!isProcessingPaiement"></ion-icon>
                <ion-spinner *ngIf="isProcessingPaiement"></ion-spinner>
                {{ isProcessingPaiement ? 'Traitement...' : 'Effectuer le paiement' }}
              </ion-button>
              <ion-button 
                expand="block" 
                fill="outline" 
                color="medium"
                (click)="fermerModalPaiement()"
                [disabled]="isProcessingPaiement">
                Annuler
              </ion-button>
            </div>
          </div>
        </ion-content>
      </ng-template>
    </ion-modal>

  </div>
</ion-content>
  `,
  styleUrls: ['./financial-dashboard.page.scss'],
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
    IonSelect,
    IonSelectOption,
    IonModal,
    IonInput,
    IonTextarea
  ]
})
export class FinancialDashboardPage implements OnInit {

  // Données
  periodes: FacturationPeriode[] = [];
  stats: StatistiquesFinancieres | null = null;
  periodeCourante: FacturationPeriode | null = null;
  balancesEntreprises: any[] = [];
  fluxFinancierStats: any = null;
  fluxParPeriode: any[] = [];
  selectedPeriodeId: string | null = null;
  viewMode: 'global' | 'periode' = 'global';
  
  // Paiements entreprises
  entreprisesPaiementsDus: EntreprisePaiementDue[] = [];
  paiementModalOpen = false;
  selectedEntreprisePaiement: EntreprisePaiementDue | null = null;
  paiementForm = {
    montant_paye: 0,
    methode_paiement: 'mobile_money' as 'mobile_money' | 'virement' | 'especes',
    reference_paiement: '',
    numero_beneficiaire: '',
    notes: ''
  };

  // État de l'interface
  isLoading = true;
  isProcessingPaiement = false;

  constructor(
    private financialService: FinancialManagementService,
    private fluxFinancierService: FluxFinancierService,
    private paiementService: PaiementEntrepriseService,
    private supabase: SupabaseService,
    private router: Router,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private alertController: AlertController
  ) {
    // Ajouter les icônes
    addIcons({
      arrowBackOutline,
      cashOutline,
      cardOutline,
      statsChartOutline,
      timeOutline,
      businessOutline,
      refreshOutline,
      addOutline,
      eyeOutline,
      downloadOutline,
      warningOutline,
      checkmarkCircleOutline,
      walletOutline,
      trendingUpOutline,
      calendarOutline,
      returnUpBackOutline,
      trashOutline,
      sendOutline,
      cardIcon,
      receiptOutline
    });
  }

  async ngOnInit() {
    await this.loadFinancialData();
  }

  private async loadFinancialData() {
    try {
      this.isLoading = true;
      
      // Charger les périodes
      await this.loadPeriodes();
      
      // Charger les statistiques (peut échouer s'il n'y a pas de période courante)
      try {
        await this.loadStatistiques();
      } catch (statsError) {
        console.warn('⚠️ Statistiques non disponibles (pas de période courante):', statsError);
        this.stats = null;
      }
      
      // Charger les données flux financier
      await this.loadFluxFinancierData();
      
      // Charger les flux par période
      await this.loadFluxParPeriode();
      
      // Charger les entreprises dues
      await this.loadEntreprisesPaiementsDus();
      
    } catch (error) {
      console.error('❌ Erreur chargement données financières:', error);
      this.showError('Erreur lors du chargement des données financières');
    } finally {
      this.isLoading = false;
    }
  }

  private async loadPeriodes() {
    const { data, error } = await this.financialService.getPeriodes();
    
    if (error) {
      console.error('❌ Erreur chargement périodes:', error);
      this.periodes = [];
    } else {
      this.periodes = data || [];
      this.periodeCourante = this.periodes.find(p => p.statut === 'en_cours') || null;
    }
  }

  private async loadStatistiques() {
    const { data, error } = await this.financialService.getStatistiquesFinancieres();
    
    if (error) {
      console.error('❌ Erreur chargement statistiques:', error);
      this.stats = null;
    } else {
      this.stats = data;
    }
  }

  // Event handlers
  async onRefresh(event?: RefresherCustomEvent) {
    await this.loadFinancialData();
    if (event) {
      event.target.complete();
    }
  }

  async onCreatePeriode() {
    const alert = await this.alertController.create({
      header: '📅 Créer une Nouvelle Période',
      subHeader: 'Sélectionnez le mois et l\'année pour la période de facturation',
      inputs: [
        {
          name: 'mois',
          type: 'number',
          placeholder: 'Mois (1-12)',
          min: 1,
          max: 12,
          value: new Date().getMonth() + 1
        },
        {
          name: 'annee',
          type: 'number',
          placeholder: 'Année (ex: 2025)',
          min: 2020,
          max: 2030,
          value: new Date().getFullYear()
        }
      ],
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel'
        },
        {
          text: 'Créer Période',
          handler: async (data) => {
            if (data.mois && data.annee) {
              await this.createPeriodeFromMonth(parseInt(data.mois), parseInt(data.annee));
              return true;
            } else {
              this.showError('Veuillez saisir un mois et une année valides');
              return false;
            }
          }
        }
      ]
    });

    await alert.present();
  }

  private async createPeriodeFromMonth(mois: number, annee: number) {
    // Validation des entrées
    if (mois < 1 || mois > 12) {
      this.showError('Le mois doit être entre 1 et 12');
      return;
    }
    
    // Calculer automatiquement le premier et dernier jour du mois
    const dateDebut = new Date(annee, mois - 1, 1); // Premier jour du mois
    const dateFin = new Date(annee, mois, 0); // Dernier jour du mois (0 = dernier jour du mois précédent)
    
    if (annee < 2020 || annee > 2030) {
      this.showError('L\'année doit être entre 2020 et 2030');
      return;
    }

    // Calculer les dates de début et fin du mois
    const debut = new Date(annee, mois - 1, 1); // 1er du mois
    const fin = new Date(annee, mois, 0); // Dernier jour du mois

    // Forcer le format YYYY-MM-DD pour éviter les problèmes de timezone
    const debutISO = `${annee}-${mois.toString().padStart(2, '0')}-01`;
    const finISO = `${annee}-${mois.toString().padStart(2, '0')}-${fin.getDate().toString().padStart(2, '0')}`;
    
    console.log(`🗓️ Création période: ${this.formatMonth(mois)} ${annee}`);
    console.log(`📅 Du ${debutISO} au ${finISO}`);
    console.log(`📅 Debug - Input: mois=${mois}, annee=${annee}`);
    console.log(`📅 Debug - Calcul: debut=${debut.toISOString()}, fin=${fin.toISOString()}`);
    console.log(`📅 Debug - Final: debutISO=${debutISO}, finISO=${finISO}`);
    
    // Test spécifique pour août 2025
    if (mois === 8 && annee === 2025) {
      console.log('🔍 Test spécifique AOÛT 2025:');
      console.log('Expected: 2025-08-01 to 2025-08-31');
      console.log(`Actual: ${debutISO} to ${finISO}`);
      console.log('Date objects:', { 
        debutObj: new Date(2025, 7, 1), 
        finObj: new Date(2025, 8, 0) 
      });
    }

    // Vérifier si une période identique existe déjà
    const periodeExistante = this.periodes.find(p => {
      const existantDebut = new Date(p.periode_debut);
      const existantFin = new Date(p.periode_fin);
      
      return existantDebut.getFullYear() === annee && 
             existantDebut.getMonth() === mois - 1 &&
             existantFin.getFullYear() === annee && 
             existantFin.getMonth() === mois - 1;
    });

    if (periodeExistante) {
      this.showError(`Une période existe déjà pour ${this.formatMonth(mois)} ${annee}!\n\nStatut: ${this.getStatutText(periodeExistante.statut)}`);
      return;
    }

    const loading = await this.loadingController.create({
      message: `Création de la période ${this.formatMonth(mois)} ${annee}...`
    });
    await loading.present();

    try {
      const { data, error } = await this.financialService.createPeriode({
        periode_debut: debutISO,
        periode_fin: finISO,
        statut: 'en_cours'
      });

      if (error) {
        throw error;
      }

      this.showSuccess(`✅ Période créée avec succès !\\n${this.formatMonth(mois)} ${annee}\\nDu ${debutISO} au ${finISO}\\nSauvegardé en base: ${data?.periode_debut} → ${data?.periode_fin}`);
      await this.loadPeriodes();

    } catch (error) {
      console.error('❌ Erreur création période:', error);
      this.showError('Erreur lors de la création de la période');
    } finally {
      await loading.dismiss();
    }
  }

  private formatMonth(mois: number): string {
    const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
                   'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    return months[mois - 1] || 'Mois invalide';
  }

  private getStatutText(statut: string): string {
    switch (statut) {
      case 'en_cours': return 'En Cours';
      case 'cloturee': return 'Clôturée';
      case 'facturee': return 'Facturée';
      default: return statut;
    }
  }

  async onCloturerPeriode() {
    if (!this.periodeCourante) {
      this.showError('Aucune période courante à clôturer');
      return;
    }

    await this.onCloturerPeriodeSpecific(this.periodeCourante);
  }

  async onCloturerPeriodeSpecific(periode: FacturationPeriode) {
    const alert = await this.alertController.create({
      header: 'Clôturer la période',
      message: `Êtes-vous sûr de vouloir clôturer la période ${this.formatDate(periode.periode_debut)} - ${this.formatDate(periode.periode_fin)} ?\n\nCette action calculera toutes les commissions et ne pourra pas être annulée.`,
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel'
        },
        {
          text: 'Clôturer',
          handler: async () => {
            await this.cloturerPeriode(periode.id);
          }
        }
      ]
    });

    await alert.present();
  }

  private async cloturerPeriode(periodeId: string) {
    const loading = await this.loadingController.create({
      message: 'Clôture en cours... Calcul des commissions...'
    });
    await loading.present();

    try {
      const { success, error } = await this.financialService.cloturerPeriode(periodeId);

      if (!success) {
        throw error;
      }

      this.showSuccess('Période clôturée avec succès');
      await this.loadFinancialData();

    } catch (error) {
      console.error('❌ Erreur clôture période:', error);
      this.showError('Erreur lors de la clôture de la période');
    } finally {
      await loading.dismiss();
    }
  }

  async onViewPeriode(periode: FacturationPeriode) {
    this.router.navigate(['/super-admin/financial/periode', periode.id]);
  }

  async showPeriodeDetails(periode: FacturationPeriode) {
    const loading = await this.loadingController.create({
      message: 'Chargement des détails...'
    });
    await loading.present();

    try {
      // Récupérer les détails de commission pour cette période
      const { data: commissions, error } = await this.financialService.getCommissionsDetail(periode.id);
      
      if (error) {
        throw error;
      }

      await loading.dismiss();

      // Créer le contenu texte simple pour l'alert (pas de HTML)
      let alertMessage = `Période: ${this.formatDate(periode.periode_debut)} - ${this.formatDate(periode.periode_fin)}\n\n`;
      alertMessage += `📊 RÉSUMÉ:\n`;
      alertMessage += `• Statut: ${this.getPeriodeStatusText(periode.statut)}\n`;
      alertMessage += `• Total Commissions: ${this.formatPrice(periode.total_commissions || 0)}\n`;
      alertMessage += `• Nombre d'entreprises: ${periode.nombre_entreprises || 0}\n\n`;

      if (commissions && commissions.length > 0) {
        alertMessage += `💰 COMMISSIONS PAR ENTREPRISE:\n\n`;
        
        commissions.forEach((commission, index) => {
          const pourcentageTaux = commission.taux_commission_moyen || 0;
          alertMessage += `${index + 1}. ${commission.entreprise_nom || 'Entreprise Inconnue'}\n`;
          alertMessage += `   💰 Commission: ${this.formatPrice(commission.montant_commission)}\n`;
          alertMessage += `   📊 Réservations: ${commission.nombre_reservations}\n`;
          alertMessage += `   💳 CA Brut: ${this.formatPrice(commission.chiffre_affaire_brut)}\n`;
          alertMessage += `   📈 Taux: ${pourcentageTaux.toFixed(1)}%\n`;
          alertMessage += `   📅 Calculé: ${this.formatDate(commission.date_calcul)}\n`;
          if (commission.date_paiement) {
            alertMessage += `   ✅ Payé le: ${this.formatDate(commission.date_paiement)}\n`;
          } else {
            alertMessage += `   ⏳ En attente de paiement\n`;
          }
          alertMessage += `\n`;
        });
      } else {
        alertMessage += `ℹ️ Aucun détail trouvé.\n`;
        alertMessage += `La période n'a peut-être pas encore été clôturée.`;
      }

      const alert = await this.alertController.create({
        header: 'Détails de la Période',
        message: alertMessage,
        cssClass: 'wide-alert',
        buttons: [
          {
            text: 'Exporter PDF',
            handler: () => {
              this.onExportPeriodePDF(periode.id);
            }
          },
          {
            text: 'Fermer',
            role: 'cancel'
          }
        ]
      });

      await alert.present();

    } catch (error) {
      await loading.dismiss();
      console.error('❌ Erreur chargement détails période:', error);
      this.showError('Erreur lors du chargement des détails');
    }
  }

  async onExportPeriodePDF(periodeId: string) {
    const toast = await this.toastController.create({
      message: '🚧 Export PDF période - Fonctionnalité en développement',
      duration: 3000,
      color: 'warning',
      position: 'top'
    });
    await toast.present();
  }

  async onExportRapport() {
    const toast = await this.toastController.create({
      message: '🚧 Export rapport - Fonctionnalité en développement',
      duration: 3000,
      color: 'warning',
      position: 'top'
    });
    await toast.present();
  }

  async onAnnulerCloture(periode: FacturationPeriode) {
    const alert = await this.alertController.create({
      header: 'Annuler la clôture',
      message: `Êtes-vous sûr de vouloir annuler la clôture de la période ${this.formatDate(periode.periode_debut)} - ${this.formatDate(periode.periode_fin)} ?\n\nCette action :\n• Supprimera tous les calculs de commissions\n• Remettra la période en statut "En Cours"\n• Permettra de refaire la clôture`,
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel'
        },
        {
          text: 'Confirmer',
          handler: async () => {
            await this.annulerCloture(periode.id);
          }
        }
      ]
    });

    await alert.present();
  }

  private async annulerCloture(periodeId: string) {
    const loading = await this.loadingController.create({
      message: 'Annulation de la clôture...'
    });
    await loading.present();

    try {
      const { success, error } = await this.financialService.annulerCloture(periodeId);

      if (!success) {
        throw error;
      }

      this.showSuccess('Clôture annulée avec succès - période remise en "En Cours"');
      await this.loadFinancialData();

    } catch (error) {
      console.error('❌ Erreur annulation clôture:', error);
      this.showError('Erreur lors de l\'annulation de la clôture');
    } finally {
      await loading.dismiss();
    }
  }

  async onGererRelances() {
    this.router.navigate(['/super-admin/financial/relances']);
  }

  async onVoirHistoriquePaiements() {
    this.router.navigate(['/super-admin/paiements-history']);
  }

  async onDeletePeriode(periode: FacturationPeriode, event: Event) {
    // Empêcher la propagation du clic vers l'item parent
    event.stopPropagation();
    
    const alert = await this.alertController.create({
      header: '🗑️ Supprimer la Période',
      message: `⚠️ ATTENTION: Cette action est irréversible!\n\nVous êtes sur le point de supprimer :\n• Période : ${this.formatDate(periode.periode_debut)} - ${this.formatDate(periode.periode_fin)}\n• Statut : ${this.getPeriodeStatusText(periode.statut)}\n• Commissions : ${this.formatPrice(periode.total_commissions || 0)}\n• Entreprises : ${periode.nombre_entreprises || 0}\n\nTOUTES les données de facturation liées seront définitivement supprimées :\n• Détails des commissions\n• Paiements enregistrés\n• Historique de la période\n\nÊtes-vous absolument certain(e) ?`,
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel',
          cssClass: 'secondary'
        },
        {
          text: 'Supprimer Définitivement',
          cssClass: 'danger',
          handler: async () => {
            await this.deletePeriodeWithConfirmation(periode);
          }
        }
      ]
    });

    await alert.present();
  }

  private async deletePeriodeWithConfirmation(periode: FacturationPeriode) {
    const loading = await this.loadingController.create({
      message: 'Suppression de la période et des données liées...'
    });
    await loading.present();

    try {
      // Appel au service pour supprimer la période et toutes les données liées
      const { success, error } = await this.financialService.deletePeriodeComplete(periode.id);

      if (!success) {
        throw error;
      }

      this.showSuccess(`Période supprimée avec succès !\n${this.formatDate(periode.periode_debut)} - ${this.formatDate(periode.periode_fin)}`);
      await this.loadFinancialData(); // Recharger les données

    } catch (error) {
      console.error('❌ Erreur suppression période:', error);
      this.showError('Erreur lors de la suppression de la période. Vérifiez les logs.');
    } finally {
      await loading.dismiss();
    }
  }

  goBack() {
    this.router.navigate(['/super-admin/dashboard']);
  }

  voirDetailPeriode(periodeId: string) {
    this.router.navigate(['/super-admin/financial-detail', periodeId]);
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

  formatPrice(amount: number): string {
    return this.financialService.formatPrice(amount);
  }

  formatDate(dateString: string): string {
    return this.financialService.formatDate(dateString);
  }

  trackByPeriode(index: number, periode: FacturationPeriode): string {
    return periode.id;
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

  private async loadFluxFinancierData() {
    try {
      // Charger les balances entreprises
      const { data: balances, error: balanceError } = await this.fluxFinancierService.getBalancesEntreprises();
      
      if (balanceError) {
        console.error('❌ Erreur chargement balances:', balanceError);
      } else {
        this.balancesEntreprises = balances || [];
      }

      // Calculer les stats du flux financier
      this.calculateFluxFinancierStats();

    } catch (error) {
      console.error('❌ Erreur chargement flux financier:', error);
    }
  }

  private calculateFluxFinancierStats() {
    if (!this.balancesEntreprises.length) {
      this.fluxFinancierStats = null;
      return;
    }

    const totalAReverser = this.balancesEntreprises.reduce((sum, balance) => sum + (balance.total_a_reverser || 0), 0);
    const totalACollecter = this.balancesEntreprises.reduce((sum, balance) => sum + (balance.total_a_collecter || 0), 0);
    const totalMobileMoneyEncaisse = this.balancesEntreprises.reduce((sum, balance) => sum + (balance.total_mobile_money_encaisse || 0), 0);
    const totalCACash = this.balancesEntreprises.reduce((sum, balance) => sum + (balance.total_ca_cash || 0), 0);

    this.fluxFinancierStats = {
      totalAReverser,
      totalACollecter,
      totalMobileMoneyEncaisse,
      totalCACash,
      balanceGlobale: totalAReverser - totalACollecter,
      nombreEntreprises: this.balancesEntreprises.length
    };
  }

  private async loadFluxParPeriode() {
    try {
      // Charger les flux pour chaque période clôturée
      const { data, error } = await this.financialService.getCommissionsDetailAvecFlux();
      
      if (error) {
        console.error('❌ Erreur chargement flux par période:', error);
      } else {
        // Charger aussi les paiements effectués pour corriger les balances
        const { data: paiementsData, error: paiementsError } = await this.supabase.client
          .from('paiements_entreprises')
          .select('*')
          .eq('statut', 'confirme');

        if (paiementsError) {
          console.error('❌ Erreur chargement paiements:', paiementsError);
        }

        // Grouper par période avec les paiements
        this.fluxParPeriode = this.groupFluxByPeriode(data || [], paiementsData || []);
        
        // Sélectionner la période la plus récente par défaut
        if (this.fluxParPeriode.length > 0) {
          this.selectedPeriodeId = this.fluxParPeriode[0].periode_id;
        }
      }
    } catch (error) {
      console.error('❌ Erreur loadFluxParPeriode:', error);
    }
  }

  private groupFluxByPeriode(commissions: any[], paiements: any[]): any[] {
    const groupedByPeriode = new Map();

    commissions.forEach(commission => {
      const periodeId = commission.periode_id;
      if (!groupedByPeriode.has(periodeId)) {
        // Trouver la période correspondante
        const periode = this.periodes.find(p => p.id === periodeId);
        groupedByPeriode.set(periodeId, {
          periode_id: periodeId,
          periode_debut: periode?.periode_debut,
          periode_fin: periode?.periode_fin,
          entreprises: [],
          totalMobileMoneyEncaisse: 0,
          totalCACash: 0,
          totalAReverser: 0,
          totalACollecter: 0
        });
      }

      const groupe = groupedByPeriode.get(periodeId);
      
      // Calculer les montants après paiements pour cette entreprise
      const entrepriseId = commission.entreprise_id;
      const paiementsEntreprise = paiements.filter(p => 
        p.entreprise_id === entrepriseId && 
        (p.periode_id === periodeId || p.periode_id === null) // Gérer les paiements sans période
      );
      
      const totalPaiementRecu = paiementsEntreprise.reduce((sum, p) => sum + (p.montant_paye || 0), 0);
      
      // Calculer les balances réelles après paiement
      const montantAReverserBrut = commission.montant_a_reverser || 0;
      const montantACollecterBrut = commission.montant_commission_cash || 0;
      
      // Appliquer les paiements (pour Mobile Money on déduit des reversements, pour Cash des collectes)
      let montantAReverserNet = montantAReverserBrut;
      let montantACollecterNet = montantACollecterBrut;
      
      if (totalPaiementRecu > 0) {
        // Si paiement reçu, on considère que l'entreprise est soldée côté Mobile Money
        montantAReverserNet = Math.max(0, montantAReverserBrut - totalPaiementRecu);
      }

      groupe.entreprises.push({
        entreprise_nom: commission.entreprise_nom,
        ca_mobile_money: commission.ca_mobile_money || 0,
        ca_cash: commission.ca_cash || 0,
        montant_a_reverser: montantAReverserNet,
        montant_commission_cash: montantACollecterNet,
        balance_nette: montantAReverserNet - montantACollecterNet,
        paiement_recu: totalPaiementRecu
      });

      // Cumuls par période avec montants nets
      groupe.totalMobileMoneyEncaisse += commission.ca_mobile_money || 0;
      groupe.totalCACash += commission.ca_cash || 0;
      groupe.totalAReverser += montantAReverserNet;
      groupe.totalACollecter += montantACollecterNet;
    });

    return Array.from(groupedByPeriode.values()).sort((a, b) => 
      new Date(b.periode_debut).getTime() - new Date(a.periode_debut).getTime()
    );
  }

  onViewModeChange(event: any) {
    const mode = event.detail.value;
    if (mode === 'global' || mode === 'periode') {
      this.viewMode = mode;
    }
  }

  onPeriodeChange(event: any) {
    const periodeId = event.detail.value;
    if (periodeId) {
      this.selectedPeriodeId = periodeId;
    }
  }

  getSelectedPeriodeFlux() {
    return this.fluxParPeriode.find(flux => flux.periode_id === this.selectedPeriodeId);
  }

  /**
   * Charge les entreprises éligibles pour un paiement
   */
  private async loadEntreprisesPaiementsDus() {
    try {
      const { data, error } = await this.paiementService.getEntreprisesPaiementsDus();
      
      if (error) {
        console.error('❌ Erreur chargement entreprises dues:', error);
        this.entreprisesPaiementsDus = [];
      } else {
        this.entreprisesPaiementsDus = data || [];
        console.log(`✅ ${this.entreprisesPaiementsDus.length} entreprises éligibles pour paiement`);
      }
    } catch (error) {
      console.error('❌ Exception loadEntreprisesPaiementsDus:', error);
      this.entreprisesPaiementsDus = [];
    }
  }

  /**
   * Ouvre le modal de paiement pour une entreprise
   */
  ouvrirModalPaiement(balance: any) {
    // Convertir balance vers EntreprisePaiementDue
    this.selectedEntreprisePaiement = {
      entreprise_id: balance.entreprise_id,
      entreprise_nom: balance.entreprises?.nom || 'Entreprise Inconnue',
      balance_courante: balance.balance_courante || 0,
      total_a_reverser: balance.total_a_reverser || 0,
      total_a_collecter: balance.total_a_collecter || 0,
      dernier_paiement_date: balance.date_derniere_mise_a_jour,
      peut_payer: balance.balance_courante > 0
    };

    // Réinitialiser le formulaire avec montant suggéré
    this.paiementForm = {
      montant_paye: Math.min(balance.balance_courante, balance.total_a_reverser || balance.balance_courante),
      methode_paiement: 'mobile_money',
      reference_paiement: '',
      numero_beneficiaire: '',
      notes: ''
    };

    this.paiementModalOpen = true;
  }

  /**
   * Ferme le modal de paiement
   */
  fermerModalPaiement() {
    this.paiementModalOpen = false;
    this.selectedEntreprisePaiement = null;
    this.isProcessingPaiement = false;
  }

  /**
   * Effectue le paiement à l'entreprise
   */
  async effectuerPaiement() {
    if (!this.selectedEntreprisePaiement || !this.paiementForm.montant_paye) {
      this.showError('Veuillez saisir un montant valide');
      return;
    }

    // Validation du montant
    if (this.paiementForm.montant_paye > this.selectedEntreprisePaiement.balance_courante) {
      this.showError('Le montant ne peut pas dépasser la balance courante');
      return;
    }

    if (this.paiementForm.montant_paye <= 0) {
      this.showError('Le montant doit être positif');
      return;
    }

    const alert = await this.alertController.create({
      header: '💰 Confirmer le Paiement',
      message: `Êtes-vous sûr de vouloir effectuer ce paiement ?\n\n🏢 Entreprise: ${this.selectedEntreprisePaiement.entreprise_nom}\n💰 Montant: ${this.formatPrice(this.paiementForm.montant_paye)}\n💳 Méthode: ${this.getMethodePaiementText(this.paiementForm.methode_paiement)}\n📝 Référence: ${this.paiementForm.reference_paiement || 'N/A'}\n\nLa balance sera automatiquement mise à jour.`,
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel'
        },
        {
          text: 'Confirmer Paiement',
          handler: async () => {
            await this.processPaiement();
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Traite le paiement
   */
  private async processPaiement() {
    if (!this.selectedEntreprisePaiement) return;

    this.isProcessingPaiement = true;

    try {
      const paiementData: Partial<PaiementEntreprise> = {
        entreprise_id: this.selectedEntreprisePaiement.entreprise_id,
        montant_paye: this.paiementForm.montant_paye,
        methode_paiement: this.paiementForm.methode_paiement,
        reference_paiement: this.paiementForm.reference_paiement || undefined,
        numero_beneficiaire: this.paiementForm.numero_beneficiaire || undefined,
        notes: this.paiementForm.notes || undefined,
        statut: 'confirme'
      };

      const { success, data, error } = await this.paiementService.effectuerPaiement(paiementData);

      if (!success) {
        throw error;
      }

      this.showSuccess(`✅ Paiement effectué avec succès !\n\n🏢 ${this.selectedEntreprisePaiement.entreprise_nom}\n💰 ${this.formatPrice(this.paiementForm.montant_paye)}\n📋 ID: ${data?.id}`);
      
      // Recharger les données
      await this.loadFluxFinancierData();
      await this.loadEntreprisesPaiementsDus();
      
      this.fermerModalPaiement();

    } catch (error) {
      console.error('❌ Erreur paiement:', error);
      this.showError('Erreur lors du traitement du paiement');
    } finally {
      this.isProcessingPaiement = false;
    }
  }

  /**
   * Retourne le texte de la méthode de paiement
   */
  private getMethodePaiementText(methode: string): string {
    switch (methode) {
      case 'mobile_money': return '💳 Mobile Money';
      case 'virement': return '🏦 Virement bancaire';
      case 'especes': return '💵 Espèces';
      default: return methode;
    }
  }
}