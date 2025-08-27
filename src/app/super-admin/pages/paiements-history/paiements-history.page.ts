/**
 * PAGE HISTORIQUE DES PAIEMENTS
 * Visualisation et gestion de tous les paiements effectués aux entreprises
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
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonChip,
  IonGrid,
  IonRow,
  IonCol,
  IonText,
  IonButtons,
  LoadingController,
  ToastController,
  AlertController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  arrowBackOutline,
  cashOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  timeOutline,
  businessOutline,
  receiptOutline,
  walletOutline,
  searchOutline,
  filterOutline,
  downloadOutline,
  eyeOutline,
  banOutline
} from 'ionicons/icons';

import { PaiementEntrepriseService, PaiementEntreprise } from '../../services/paiement-entreprise.service';
import { SupabaseService } from '../../../services/supabase.service';

@Component({
  selector: 'app-paiements-history',
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
          <ion-icon name="receipt-outline"></ion-icon>
        </div>
        <div class="title-text">
          <span class="main-title">Historique</span>
          <span class="sub-title">Paiements Entreprises</span>
        </div>
      </div>
    </ion-title>
    <ion-buttons slot="end">
      <ion-button fill="clear" (click)="exportPaiements()">
        <ion-icon name="download-outline" slot="icon-only"></ion-icon>
      </ion-button>
    </ion-buttons>
  </ion-toolbar>
</ion-header>

<ion-content>
  <div class="page-container">
    
    <!-- Statistiques globales -->
    <ion-card class="stats-card">
      <ion-card-header>
        <ion-card-title>
          <ion-icon name="wallet-outline"></ion-icon>
          Résumé des Paiements
        </ion-card-title>
      </ion-card-header>
      <ion-card-content>
        <ion-grid>
          <ion-row>
            <ion-col size="6" size-md="3">
              <div class="stat-item">
                <div class="stat-number">{{ stats.totalPaiements }}</div>
                <div class="stat-label">Total Paiements</div>
              </div>
            </ion-col>
            <ion-col size="6" size-md="3">
              <div class="stat-item">
                <div class="stat-number success">{{ formatPrice(stats.montantTotal) }}</div>
                <div class="stat-label">Montant Total</div>
              </div>
            </ion-col>
            <ion-col size="6" size-md="3">
              <div class="stat-item">
                <div class="stat-number warning">{{ stats.paiementsEnAttente }}</div>
                <div class="stat-label">En Attente</div>
              </div>
            </ion-col>
            <ion-col size="6" size-md="3">
              <div class="stat-item">
                <div class="stat-number">{{ stats.entreprisesPayees }}</div>
                <div class="stat-label">Entreprises Payées</div>
              </div>
            </ion-col>
          </ion-row>
        </ion-grid>
      </ion-card-content>
    </ion-card>

    <!-- Filtres et recherche -->
    <ion-card class="filter-card">
      <ion-card-content>
        <ion-searchbar
          [(ngModel)]="searchTerm"
          (ionInput)="filterPaiements()"
          placeholder="Rechercher par entreprise ou référence..."
          [animated]="true">
        </ion-searchbar>
        
        <ion-segment [(ngModel)]="filterStatus" (ionChange)="filterPaiements()">
          <ion-segment-button value="all">
            <ion-label>Tous</ion-label>
          </ion-segment-button>
          <ion-segment-button value="confirme">
            <ion-label>Confirmés</ion-label>
          </ion-segment-button>
          <ion-segment-button value="en_attente">
            <ion-label>En Attente</ion-label>
          </ion-segment-button>
          <ion-segment-button value="annule">
            <ion-label>Annulés</ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-card-content>
    </ion-card>

    <!-- Liste des paiements -->
    <ion-card class="paiements-list-card">
      <ion-card-header>
        <ion-card-title>
          Paiements ({{ filteredPaiements.length }})
        </ion-card-title>
      </ion-card-header>
      <ion-card-content>
        
        <!-- Loading -->
        <div *ngIf="isLoading" class="loading-container">
          <ion-spinner></ion-spinner>
          <p>Chargement des paiements...</p>
        </div>

        <!-- Liste -->
        <ion-list *ngIf="!isLoading && filteredPaiements.length > 0">
          <ion-item *ngFor="let paiement of filteredPaiements" [button]="true" (click)="viewPaiementDetails(paiement)">
            <div class="paiement-item">
              
              <!-- Header avec entreprise et statut -->
              <div class="paiement-header">
                <div class="entreprise-info">
                  <ion-icon name="business-outline" color="primary"></ion-icon>
                  <strong>{{ paiement.entreprise_nom || 'Entreprise' }}</strong>
                </div>
                <ion-badge [color]="getStatutColor(paiement.statut)">
                  {{ getStatutText(paiement.statut) }}
                </ion-badge>
              </div>

              <!-- Montant et méthode -->
              <div class="paiement-amount">
                <div class="amount">
                  <span class="label">Montant:</span>
                  <span class="value">{{ formatPrice(paiement.montant_paye) }}</span>
                </div>
                <ion-chip [color]="getMethodeColor(paiement.methode_paiement)" outline="true">
                  <ion-icon [name]="getMethodeIcon(paiement.methode_paiement)"></ion-icon>
                  <ion-label>{{ getMethodeText(paiement.methode_paiement) }}</ion-label>
                </ion-chip>
              </div>

              <!-- Détails -->
              <div class="paiement-details">
                <div class="detail-item" *ngIf="paiement.reference_paiement">
                  <ion-icon name="receipt-outline"></ion-icon>
                  <span>{{ paiement.reference_paiement }}</span>
                </div>
                <div class="detail-item">
                  <ion-icon name="time-outline"></ion-icon>
                  <span>{{ formatDateTime(paiement.date_paiement) }}</span>
                </div>
                <div class="detail-item" *ngIf="paiement.numero_beneficiaire">
                  <ion-icon name="call-outline"></ion-icon>
                  <span>{{ paiement.numero_beneficiaire }}</span>
                </div>
              </div>

              <!-- Balance avant/après -->
              <div class="balance-info" *ngIf="paiement.balance_avant !== null">
                <div class="balance-item">
                  <span class="label">Balance avant:</span>
                  <span class="value">{{ formatPrice(paiement.balance_avant) }}</span>
                </div>
                <ion-icon name="arrow-forward-outline"></ion-icon>
                <div class="balance-item">
                  <span class="label">Balance après:</span>
                  <span class="value">{{ formatPrice(paiement.balance_apres) }}</span>
                </div>
              </div>

              <!-- Actions -->
              <div class="paiement-actions" *ngIf="paiement.statut === 'confirme'">
                <ion-button 
                  fill="clear" 
                  size="small"
                  color="danger"
                  (click)="annulerPaiement(paiement, $event)">
                  <ion-icon name="ban-outline" slot="icon-only"></ion-icon>
                </ion-button>
              </div>
              
            </div>
          </ion-item>
        </ion-list>

        <!-- Message vide -->
        <div *ngIf="!isLoading && filteredPaiements.length === 0" class="empty-state">
          <ion-icon name="receipt-outline"></ion-icon>
          <h3>Aucun paiement trouvé</h3>
          <p>{{ searchTerm ? 'Aucun résultat pour votre recherche' : 'Aucun paiement enregistré' }}</p>
        </div>

      </ion-card-content>
    </ion-card>

  </div>
</ion-content>
  `,
  styleUrls: ['./paiements-history.page.scss'],
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
    IonSearchbar,
    IonSegment,
    IonSegmentButton,
    IonChip,
    IonGrid,
    IonRow,
    IonCol,
    IonText,
    IonButtons
  ]
})
export class PaiementsHistoryPage implements OnInit {

  // Données
  allPaiements: any[] = [];
  filteredPaiements: any[] = [];
  
  // Filtres
  searchTerm = '';
  filterStatus: 'all' | 'confirme' | 'en_attente' | 'annule' = 'all';
  
  // Statistiques
  stats = {
    totalPaiements: 0,
    montantTotal: 0,
    paiementsEnAttente: 0,
    entreprisesPayees: 0
  };
  
  // État
  isLoading = true;

  constructor(
    private paiementService: PaiementEntrepriseService,
    private supabase: SupabaseService,
    private router: Router,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private alertController: AlertController
  ) {
    addIcons({
      arrowBackOutline,
      cashOutline,
      checkmarkCircleOutline,
      closeCircleOutline,
      timeOutline,
      businessOutline,
      receiptOutline,
      walletOutline,
      searchOutline,
      filterOutline,
      downloadOutline,
      eyeOutline,
      banOutline
    });
  }

  async ngOnInit() {
    await this.loadPaiements();
  }

  async loadPaiements() {
    try {
      this.isLoading = true;
      
      // Charger tous les paiements avec infos entreprises
      const { data: paiements, error } = await this.supabase.client
        .from('paiements_entreprises')
        .select(`
          *,
          entreprises!inner(nom)
        `)
        .order('date_paiement', { ascending: false });

      if (error) {
        throw error;
      }

      this.allPaiements = paiements?.map(p => ({
        ...p,
        entreprise_nom: p.entreprises?.nom
      })) || [];

      this.calculateStats();
      this.filterPaiements();

    } catch (error) {
      console.error('❌ Erreur chargement paiements:', error);
      this.showError('Erreur lors du chargement des paiements');
    } finally {
      this.isLoading = false;
    }
  }

  calculateStats() {
    const entreprisesSet = new Set();
    
    this.stats = {
      totalPaiements: 0,
      montantTotal: 0,
      paiementsEnAttente: 0,
      entreprisesPayees: 0
    };

    this.allPaiements.forEach(paiement => {
      this.stats.totalPaiements++;
      
      if (paiement.statut === 'confirme') {
        this.stats.montantTotal += parseFloat(paiement.montant_paye) || 0;
        entreprisesSet.add(paiement.entreprise_id);
      }
      
      if (paiement.statut === 'en_attente') {
        this.stats.paiementsEnAttente++;
      }
    });

    this.stats.entreprisesPayees = entreprisesSet.size;
  }

  filterPaiements() {
    let filtered = [...this.allPaiements];

    // Filtre par statut
    if (this.filterStatus !== 'all') {
      filtered = filtered.filter(p => p.statut === this.filterStatus);
    }

    // Filtre par recherche
    if (this.searchTerm) {
      const search = this.searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.entreprise_nom?.toLowerCase().includes(search) ||
        p.reference_paiement?.toLowerCase().includes(search) ||
        p.numero_beneficiaire?.toLowerCase().includes(search)
      );
    }

    this.filteredPaiements = filtered;
  }

  async viewPaiementDetails(paiement: any) {
    const alert = await this.alertController.create({
      header: 'Détails du Paiement',
      message: this.formatPaiementDetails(paiement),
      buttons: ['Fermer']
    });
    await alert.present();
  }

  formatPaiementDetails(paiement: any): string {
    return `
📊 INFORMATIONS PAIEMENT
━━━━━━━━━━━━━━━━━━━━
🏢 Entreprise: ${paiement.entreprise_nom}
💰 Montant: ${this.formatPrice(paiement.montant_paye)}
💳 Méthode: ${this.getMethodeText(paiement.methode_paiement)}
📄 Référence: ${paiement.reference_paiement || 'N/A'}
📱 Bénéficiaire: ${paiement.numero_beneficiaire || 'N/A'}
📅 Date: ${this.formatDateTime(paiement.date_paiement)}
🔖 Statut: ${this.getStatutText(paiement.statut)}

💼 IMPACT BALANCE
━━━━━━━━━━━━━━━━━━━━
Balance avant: ${this.formatPrice(paiement.balance_avant || 0)}
Balance après: ${this.formatPrice(paiement.balance_apres || 0)}
Différence: ${this.formatPrice((paiement.balance_avant || 0) - (paiement.balance_apres || 0))}

📝 Notes: ${paiement.notes || 'Aucune'}
    `.trim();
  }

  async annulerPaiement(paiement: any, event: Event) {
    event.stopPropagation();

    const alert = await this.alertController.create({
      header: '⚠️ Annuler le Paiement',
      message: `Êtes-vous sûr de vouloir annuler ce paiement ?

🏢 ${paiement.entreprise_nom}
💰 ${this.formatPrice(paiement.montant_paye)}
📄 ${paiement.reference_paiement || 'Sans référence'}

Cette action restaurera la balance de l'entreprise.`,
      inputs: [
        {
          name: 'raison',
          type: 'text',
          placeholder: 'Raison de l\'annulation (obligatoire)'
        }
      ],
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel'
        },
        {
          text: 'Confirmer Annulation',
          handler: async (data) => {
            if (!data.raison) {
              this.showError('Veuillez saisir une raison');
              return false;
            }
            await this.processAnnulation(paiement.id, data.raison);
            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  async processAnnulation(paiementId: string, raison: string) {
    const loading = await this.loadingController.create({
      message: 'Annulation en cours...'
    });
    await loading.present();

    try {
      const { success, error } = await this.paiementService.annulerPaiement(paiementId, raison);

      if (!success) {
        throw error;
      }

      this.showSuccess('Paiement annulé avec succès');
      await this.loadPaiements();

    } catch (error) {
      console.error('❌ Erreur annulation:', error);
      this.showError('Erreur lors de l\'annulation');
    } finally {
      await loading.dismiss();
    }
  }

  async exportPaiements() {
    // TODO: Implémenter l'export CSV/Excel
    this.showInfo('Export en cours de développement');
  }

  goBack() {
    this.router.navigate(['/super-admin/financial']);
  }

  // Utilitaires
  formatPrice(amount: number): string {
    if (amount === null || amount === undefined) return '0 GNF';
    return new Intl.NumberFormat('fr-GN', {
      style: 'currency',
      currency: 'GNF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  formatDateTime(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  getStatutColor(statut: string): string {
    switch(statut) {
      case 'confirme': return 'success';
      case 'en_attente': return 'warning';
      case 'annule': return 'danger';
      case 'echec': return 'danger';
      default: return 'medium';
    }
  }

  getStatutText(statut: string): string {
    switch(statut) {
      case 'confirme': return '✅ Confirmé';
      case 'en_attente': return '⏳ En Attente';
      case 'annule': return '❌ Annulé';
      case 'echec': return '⚠️ Échec';
      default: return statut;
    }
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
      duration: 3000,
      color: 'success',
      position: 'top'
    });
    await toast.present();
  }

  private async showError(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 4000,
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