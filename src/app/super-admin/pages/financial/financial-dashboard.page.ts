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
  returnUpBackOutline
} from 'ionicons/icons';

import { 
  FinancialManagementService, 
  FacturationPeriode, 
  CommissionDetail,
  StatistiquesFinancieres 
} from '../../services/financial-management.service';

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
                <ion-badge 
                  [color]="getPeriodeStatusColor(periode.statut)"
                  class="status-badge">
                  {{ getPeriodeStatusText(periode.statut) }}
                </ion-badge>
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
    IonRefresherContent
  ]
})
export class FinancialDashboardPage implements OnInit {

  // Données
  periodes: FacturationPeriode[] = [];
  stats: StatistiquesFinancieres | null = null;
  periodeCourante: FacturationPeriode | null = null;

  // État de l'interface
  isLoading = true;

  constructor(
    private financialService: FinancialManagementService,
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
      returnUpBackOutline
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
      
      // Charger les statistiques
      await this.loadStatistiques();
      
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
    
    if (annee < 2020 || annee > 2030) {
      this.showError('L\'année doit être entre 2020 et 2030');
      return;
    }

    // Calculer les dates de début et fin du mois
    const debut = new Date(annee, mois - 1, 1, 0, 0, 0); // 1er du mois à 00:00:00
    const fin = new Date(annee, mois, 0, 23, 59, 59); // Dernier jour du mois à 23:59:59

    const debutISO = debut.toISOString();
    const finISO = fin.toISOString();

    console.log(`🗓️ Création période: ${this.formatMonth(mois)} ${annee}`);
    console.log(`📅 Du ${debutISO} au ${finISO}`);

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

      this.showSuccess(`✅ Période créée avec succès !\\n${this.formatMonth(mois)} ${annee}\\nDu ${debut.toLocaleDateString('fr-FR')} au ${fin.toLocaleDateString('fr-FR')}`);
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

  goBack() {
    this.router.navigate(['/super-admin/dashboard']);
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
}