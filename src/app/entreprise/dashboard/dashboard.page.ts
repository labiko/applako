import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { 
  IonContent, 
  IonHeader, 
  IonTitle, 
  IonToolbar,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonGrid,
  IonRow,
  IonCol,
  IonButton,
  IonIcon,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonText,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  IonBadge,
  ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  statsChart, 
  car, 
  wallet, 
  people, 
  trendingUp, 
  refresh,
  star,
  checkmarkCircle,
  notificationsOutline,
  receiptOutline
} from 'ionicons/icons';
import { EntrepriseService, DashboardMetrics } from '../../services/entreprise.service';
import { EntrepriseAuthService } from '../../services/entreprise-auth.service';
import { NotificationsService } from '../../services/notifications.service';
import { NotificationsModalComponent } from '../../components/notifications-modal/notifications-modal.component';
import { Subscription, interval } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonContent, 
    IonHeader, 
    IonTitle, 
    IonToolbar,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardTitle,
    IonGrid,
    IonRow,
    IonCol,
    IonButton,
    IonIcon,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonText,
    IonSpinner,
    IonRefresher,
    IonRefresherContent,
    IonBadge
  ]
})
export class DashboardPage implements OnInit, OnDestroy {
  metrics: DashboardMetrics | null = null;
  selectedPeriod: 'today' | 'week' | 'month' = 'today';
  isLoading = true;
  entreprise: any = null;
  unreadCount = 0;
  
  private refreshSubscription?: Subscription;
  private notificationSubscription?: Subscription;

  constructor(
    private entrepriseService: EntrepriseService,
    private entrepriseAuthService: EntrepriseAuthService,
    private notificationsService: NotificationsService,
    private modalController: ModalController,
    private router: Router
  ) {
    addIcons({ 
      statsChart, 
      car, 
      wallet, 
      people, 
      trendingUp, 
      refresh,
      star,
      checkmarkCircle,
      notificationsOutline,
      receiptOutline
    });
  }

  ngOnInit() {
    this.entreprise = this.entrepriseAuthService.getCurrentEntreprise();
    this.loadMetrics();
    this.loadNotificationCount();
    
    // Actualiser les données toutes les 5 minutes
    this.refreshSubscription = interval(300000).subscribe(() => {
      this.loadMetrics(false);
    });
    
    // Écouter les changements de notifications
    if (this.entreprise) {
      this.notificationSubscription = this.notificationsService.getUnreadCountObservable()
        .subscribe(count => {
          this.unreadCount = count;
        });
    }
  }

  ngOnDestroy() {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
    if (this.notificationSubscription) {
      this.notificationSubscription.unsubscribe();
    }
  }

  async loadMetrics(showLoading = true) {
    if (showLoading) {
      this.isLoading = true;
    }
    
    try {
      this.metrics = await this.entrepriseService.getDashboardMetrics(this.selectedPeriod);
    } catch (error) {
      console.error('Error loading metrics:', error);
    } finally {
      this.isLoading = false;
    }
  }

  onPeriodChange(event: any) {
    this.selectedPeriod = event.detail.value;
    this.loadMetrics();
  }

  async doRefresh(event: any) {
    await this.loadMetrics(false);
    event.target.complete();
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('fr-GN', {
      style: 'currency',
      currency: 'GNF',
      minimumFractionDigits: 0
    }).format(amount);
  }

  async loadNotificationCount() {
    if (this.entreprise) {
      this.unreadCount = await this.notificationsService.getUnreadCount(this.entreprise.id);
    }
  }

  async openNotifications() {
    if (!this.entreprise) return;

    const notifications = await this.notificationsService.getNotificationsForEnterprise(this.entreprise.id);
    
    const modal = await this.modalController.create({
      component: NotificationsModalComponent,
      componentProps: {
        notifications,
        entrepriseId: this.entreprise.id
      },
      cssClass: 'notifications-modal'
    });

    modal.onDidDismiss().then(() => {
      // Recharger le compteur après fermeture de la modale
      this.loadNotificationCount();
    });

    return await modal.present();
  }

  getPeriodLabel(): string {
    switch (this.selectedPeriod) {
      case 'today': return "aujourd'hui";
      case 'week': return 'cette semaine';
      case 'month': return 'ce mois';
      default: return '';
    }
  }

  // ===============================================
  // MÉTHODES DE NAVIGATION
  // ===============================================

  navigateToMesCommissions() {
    this.router.navigate(['/entreprise/mes-commissions']);
  }

  navigateToFinancialOverview() {
    this.router.navigate(['/entreprise/financial-overview']);
  }
}