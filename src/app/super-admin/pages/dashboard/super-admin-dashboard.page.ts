/**
 * DASHBOARD SUPER-ADMIN
 * Interface globale de gestion - Version basique pour tests
 */

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  shieldCheckmarkOutline, 
  logOutOutline, 
  statsChartOutline, 
  businessOutline,
  settingsOutline,
  peopleOutline,
  cashOutline
} from 'ionicons/icons';

import { SuperAdminAuthService } from '../../services/super-admin-auth.service';
import { SuperAdminUser } from '../../models/super-admin.model';

@Component({
  selector: 'app-super-admin-dashboard',
  template: `
<ion-header>
  <ion-toolbar color="primary">
    <ion-title>
      <ion-icon name="shield-checkmark-outline"></ion-icon>
      Dashboard Super Admin
    </ion-title>
    <ion-button 
      slot="end" 
      fill="clear" 
      (click)="onLogout()"
      color="light">
      <ion-icon name="log-out-outline" slot="icon-only"></ion-icon>
    </ion-button>
  </ion-toolbar>
</ion-header>

<ion-content>
  <div class="dashboard-container">
    
    <!-- Message d'accueil -->
    <ion-card class="welcome-card">
      <ion-card-content>
        <div class="welcome-content">
          <div class="welcome-text">
            <h2>{{ welcomeMessage }}</h2>
            <p>Interface d'administration globale LokoTaxi</p>
          </div>
          <div class="session-info">
            <ion-text color="medium">
              <small>Session: {{ sessionTimeFormatted }}</small>
            </ion-text>
          </div>
        </div>
      </ion-card-content>
    </ion-card>

    <!-- Informations utilisateur -->
    <ion-card class="user-info-card" *ngIf="currentUser">
      <ion-card-header>
        <ion-card-title>
          <ion-icon name="people-outline"></ion-icon>
          Informations Administrateur
        </ion-card-title>
      </ion-card-header>
      <ion-card-content>
        <ion-grid>
          <ion-row>
            <ion-col size="12" size-md="6">
              <div class="info-item">
                <strong>Nom:</strong> {{ currentUser.nom }}
              </div>
            </ion-col>
            <ion-col size="12" size-md="6">
              <div class="info-item">
                <strong>Email:</strong> {{ currentUser.email }}
              </div>
            </ion-col>
            <ion-col size="12" size-md="6">
              <div class="info-item">
                <strong>Statut:</strong> 
                <ion-text color="success">Super Administrateur</ion-text>
              </div>
            </ion-col>
            <ion-col size="12" size-md="6">
              <div class="info-item">
                <strong>Droits:</strong> 
                <ion-text color="primary">Accès Global</ion-text>
              </div>
            </ion-col>
          </ion-row>
        </ion-grid>
      </ion-card-content>
    </ion-card>

    <!-- Fonctionnalités (placeholder) -->
    <ion-card class="features-card">
      <ion-card-header>
        <ion-card-title>
          <ion-icon name="settings-outline"></ion-icon>
          Fonctionnalités Disponibles
        </ion-card-title>
      </ion-card-header>
      <ion-card-content>
        <ion-grid>
          <ion-row>
            <ion-col size="12" size-md="6">
              <ion-button 
                expand="block" 
                fill="outline" 
                color="primary"
                (click)="onViewReservations()">
                <ion-icon name="stats-chart-outline" slot="start"></ion-icon>
                Vue Globale Réservations
              </ion-button>
            </ion-col>
            <ion-col size="12" size-md="6">
              <ion-button 
                expand="block" 
                fill="outline" 
                color="secondary"
                (click)="onManageCommissions()">
                <ion-icon name="business-outline" slot="start"></ion-icon>
                Gestion Commissions
              </ion-button>
            </ion-col>
          </ion-row>
          <ion-row>
            <ion-col size="12" size-md="6">
              <ion-button 
                expand="block" 
                fill="outline" 
                color="success"
                (click)="onFinancialManagement()">
                <ion-icon name="cash-outline" slot="start"></ion-icon>
                Gestion Financière
              </ion-button>
            </ion-col>
            <ion-col size="12" size-md="6">
              <ion-button 
                expand="block" 
                fill="outline" 
                color="tertiary"
                (click)="onViewAuditLogs()">
                <ion-icon name="shield-checkmark-outline" slot="start"></ion-icon>
                Audit Commissions
              </ion-button>
            </ion-col>
          </ion-row>
          <ion-row>
            <ion-col size="12" size-md="6">
              <ion-button 
                expand="block" 
                fill="clear" 
                color="medium"
                (click)="onRefreshSession()">
                <ion-icon name="settings-outline" slot="start"></ion-icon>
                Rafraîchir Session
              </ion-button>
            </ion-col>
            <ion-col size="12" size-md="6">
              <ion-button 
                expand="block" 
                fill="clear" 
                color="medium"
                disabled>
                <ion-icon name="settings-outline" slot="start"></ion-icon>
                Paramètres Système
              </ion-button>
            </ion-col>
          </ion-row>
          <ion-row>
            <ion-col size="12">
              <ion-text color="medium">
                <p class="features-note">
                  ℹ️ Interface complète en cours de développement<br>
                  📊 Système backend fonctionnel et sécurisé<br>
                  🔐 Authentification et audit trail activés
                </p>
              </ion-text>
            </ion-col>
          </ion-row>
        </ion-grid>
      </ion-card-content>
    </ion-card>

    <!-- Test de déconnexion -->
    <ion-card class="logout-card">
      <ion-card-content>
        <ion-button 
          expand="block" 
          color="danger" 
          (click)="onLogout()">
          <ion-icon name="log-out-outline" slot="start"></ion-icon>
          Déconnexion Sécurisée
        </ion-button>
      </ion-card-content>
    </ion-card>

  </div>
</ion-content>
  `,
  styleUrls: ['./super-admin-dashboard.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
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
    IonCol
  ]
})
export class SuperAdminDashboardPage implements OnInit {

  currentUser: SuperAdminUser | null = null;
  sessionTimeRemaining: number = 0;

  constructor(
    private superAdminAuthService: SuperAdminAuthService,
    private router: Router,
    private toastController: ToastController
  ) {
    // Ajouter les icônes
    addIcons({
      shieldCheckmarkOutline,
      logOutOutline,
      statsChartOutline,
      businessOutline,
      settingsOutline,
      peopleOutline,
      cashOutline
    });
  }

  ngOnInit() {
    this.loadUserData();
    this.updateSessionTimer();
  }

  private loadUserData() {
    this.currentUser = this.superAdminAuthService.getCurrentSuperAdmin();
    
    if (!this.currentUser) {
      console.warn('⚠️ Aucun utilisateur super-admin trouvé');
      this.redirectToLogin();
    }
  }

  private updateSessionTimer() {
    setInterval(() => {
      this.sessionTimeRemaining = this.superAdminAuthService.getSessionTimeRemaining();
      
      // Avertir quand il reste moins de 5 minutes
      if (this.sessionTimeRemaining < 300000 && this.sessionTimeRemaining > 0) {
        const minutesLeft = Math.ceil(this.sessionTimeRemaining / 60000);
        if (minutesLeft <= 5 && minutesLeft > 0) {
          this.showSessionWarning(minutesLeft);
        }
      }
    }, 30000); // Vérifier toutes les 30 secondes
  }

  async onLogout() {
    try {
      await this.superAdminAuthService.logoutSuperAdmin();
      
      const toast = await this.toastController.create({
        message: 'Déconnexion sécurisée réussie',
        duration: 2000,
        color: 'success',
        position: 'top'
      });
      await toast.present();
      
      await this.router.navigate(['/super-admin/login']);
    } catch (error) {
      console.error('❌ Erreur lors de la déconnexion:', error);
    }
  }

  async onViewReservations() {
    console.log('🚀 Navigation vers Vue Globale Réservations');
    await this.router.navigate(['/super-admin/reservations']);
  }

  async onManageCommissions() {
    console.log('🚀 Navigation vers Gestion Commissions');
    await this.router.navigate(['/super-admin/commissions']);
  }

  async onRefreshSession() {
    try {
      await this.superAdminAuthService.updateSessionActivity();
      this.sessionTimeRemaining = this.superAdminAuthService.getSessionTimeRemaining();
      
      const toast = await this.toastController.create({
        message: '🔄 Session rafraîchie avec succès',
        duration: 2000,
        color: 'success',
        position: 'top'
      });
      await toast.present();
    } catch (error) {
      console.error('❌ Erreur rafraîchissement session:', error);
      const toast = await this.toastController.create({
        message: '❌ Erreur lors du rafraîchissement',
        duration: 2000,
        color: 'danger',
        position: 'top'
      });
      await toast.present();
    }
  }

  async onViewAuditLogs() {
    console.log('🚀 Navigation vers Logs d\'Audit');
    await this.router.navigate(['/super-admin/audit']);
  }

  async onFinancialManagement() {
    console.log('🚀 Navigation vers Gestion Financière');
    await this.router.navigate(['/super-admin/financial']);
  }

  private async redirectToLogin() {
    await this.router.navigate(['/super-admin/login']);
  }

  private async showSessionWarning(minutesLeft: number) {
    const toast = await this.toastController.create({
      message: `⚠️ Session expire dans ${minutesLeft} minute(s)`,
      duration: 4000,
      color: 'warning',
      position: 'top'
    });
    await toast.present();
  }

  // Getters pour la template
  get sessionTimeFormatted(): string {
    if (this.sessionTimeRemaining <= 0) return 'Expirée';
    
    const minutes = Math.floor(this.sessionTimeRemaining / 60000);
    const seconds = Math.floor((this.sessionTimeRemaining % 60000) / 1000);
    
    if (minutes > 0) {
      return `${minutes}min ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  }

  get welcomeMessage(): string {
    const hour = new Date().getHours();
    let greeting = 'Bonsoir';
    
    if (hour < 12) greeting = 'Bonjour';
    else if (hour < 18) greeting = 'Bon après-midi';
    
    return `${greeting}, ${this.currentUser?.nom || 'Administrateur'}`;
  }
}