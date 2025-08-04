import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  IonRefresherContent
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
  checkmarkCircle
} from 'ionicons/icons';
import { EntrepriseService, DashboardMetrics } from '../../services/entreprise.service';
import { EntrepriseAuthService } from '../../services/entreprise-auth.service';
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
    IonRefresherContent
  ]
})
export class DashboardPage implements OnInit, OnDestroy {
  metrics: DashboardMetrics | null = null;
  selectedPeriod: 'today' | 'week' | 'month' = 'today';
  isLoading = true;
  entreprise: any = null;
  
  private refreshSubscription?: Subscription;

  constructor(
    private entrepriseService: EntrepriseService,
    private entrepriseAuthService: EntrepriseAuthService
  ) {
    addIcons({ 
      statsChart, 
      car, 
      wallet, 
      people, 
      trendingUp, 
      refresh,
      star,
      checkmarkCircle
    });
  }

  ngOnInit() {
    this.entreprise = this.entrepriseAuthService.getCurrentEntreprise();
    this.loadMetrics();
    
    // Actualiser les données toutes les 5 minutes
    this.refreshSubscription = interval(300000).subscribe(() => {
      this.loadMetrics(false);
    });
  }

  ngOnDestroy() {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
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

  getPeriodLabel(): string {
    switch (this.selectedPeriod) {
      case 'today': return "aujourd'hui";
      case 'week': return 'cette semaine';
      case 'month': return 'ce mois';
      default: return '';
    }
  }
}