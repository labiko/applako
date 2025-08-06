/**
 * COMPOSANT NOTIFICATIONS ENTREPRISE
 * Affiche les notifications de changement de commission
 */

import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton,
  IonIcon,
  IonText,
  IonBadge,
  IonList,
  IonItem,
  IonLabel,
  IonNote,
  IonChip,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  IonAlert,
  AlertController,
  ToastController,
  RefresherCustomEvent
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  notificationsOutline,
  checkmarkCircleOutline,
  alertCircleOutline,
  timeOutline,
  trendingUpOutline,
  trendingDownOutline,
  businessOutline,
  eyeOutline,
  archiveOutline,
  refreshOutline
} from 'ionicons/icons';

import { NotificationsService, Notification, NotificationStats } from '../../services/notifications.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-notifications',
  template: `
    <ion-card class="notifications-card">
      <ion-card-header>
        <ion-card-title>
          <ion-icon name="notifications-outline"></ion-icon>
          Notifications
          <ion-badge 
            *ngIf="stats.non_lues > 0" 
            color="danger" 
            class="notification-badge">
            {{ stats.non_lues }}
          </ion-badge>
        </ion-card-title>
      </ion-card-header>
      
      <ion-card-content>
        
        <!-- Contrôles -->
        <div class="notification-controls" *ngIf="notifications.length > 0">
          <ion-button 
            size="small" 
            fill="outline"
            color="primary"
            (click)="markAllAsRead()"
            [disabled]="stats.non_lues === 0">
            <ion-icon name="checkmark-circle-outline" slot="start"></ion-icon>
            Tout marquer lu
          </ion-button>
          
          <ion-button 
            size="small" 
            fill="clear"
            color="medium"
            (click)="refreshNotifications()">
            <ion-icon name="refresh-outline" slot="icon-only"></ion-icon>
          </ion-button>
        </div>

        <!-- Loading -->
        <div *ngIf="isLoading" class="loading-container">
          <ion-spinner></ion-spinner>
          <p>Chargement des notifications...</p>
        </div>

        <!-- Liste des notifications -->
        <ion-list *ngIf="!isLoading">
          
          <!-- Message si aucune notification -->
          <div *ngIf="notifications.length === 0" class="empty-notifications">
            <ion-icon name="notifications-outline" size="large" color="medium"></ion-icon>
            <h4>Aucune notification</h4>
            <p>Vous serez informé des changements de commission ici.</p>
          </div>

          <!-- Notifications -->
          <ion-item 
            *ngFor="let notification of notifications; trackBy: trackByNotification"
            [class.unread]="!notification.lu"
            [class.urgent]="notification.priority === 'urgent'"
            [class.high-priority]="notification.priority === 'high'">
            
            <div class="notification-content">
              
              <!-- Header avec type et priorité -->
              <div class="notification-header">
                <div class="notification-type">
                  <ion-badge 
                    [color]="getTypeColor(notification.type_notification)"
                    size="small">
                    {{ getTypeLabel(notification.type_notification) }}
                  </ion-badge>
                  <ion-badge 
                    *ngIf="notification.priority === 'high' || notification.priority === 'urgent'"
                    [color]="notification.priority === 'urgent' ? 'danger' : 'warning'"
                    size="small">
                    {{ notification.priority === 'urgent' ? 'URGENT' : 'IMPORTANT' }}
                  </ion-badge>
                </div>
                
                <div class="notification-time">
                  <ion-icon name="time-outline"></ion-icon>
                  <ion-note>{{ formatDate(notification.created_at) }}</ion-note>
                </div>
              </div>

              <!-- Titre -->
              <h3 class="notification-title">{{ notification.titre }}</h3>

              <!-- Message -->
              <p class="notification-message">{{ notification.message }}</p>

              <!-- Détails commission si disponible -->
              <div 
                *ngIf="notification.metadata?.ancien_taux && notification.metadata?.nouveau_taux"
                class="commission-details">
                <div class="rate-change">
                  <span class="old-rate">{{ notification.metadata.ancien_taux }}%</span>
                  <ion-icon 
                    [name]="notification.metadata.nouveau_taux > notification.metadata.ancien_taux ? 'trending-up-outline' : 'trending-down-outline'"
                    [color]="notification.metadata.nouveau_taux > notification.metadata.ancien_taux ? 'success' : 'danger'">
                  </ion-icon>
                  <span class="new-rate">{{ notification.metadata.nouveau_taux }}%</span>
                </div>
                
                <div *ngIf="notification.metadata.difference" class="difference">
                  <ion-chip 
                    [color]="notification.metadata.difference > 0 ? 'success' : 'danger'"
                    size="small">
                    {{ notification.metadata.difference > 0 ? '+' : '' }}{{ notification.metadata.difference }}%
                  </ion-chip>
                </div>
              </div>

              <!-- Actions -->
              <div class="notification-actions">
                <ion-button 
                  *ngIf="!notification.lu"
                  size="small"
                  fill="clear"
                  color="primary"
                  (click)="markAsRead(notification)">
                  <ion-icon name="checkmark-circle-outline" slot="start"></ion-icon>
                  Marquer lu
                </ion-button>
                
                <ion-button 
                  *ngIf="notification.action_required && notification.action_url"
                  size="small"
                  fill="outline"
                  color="success"
                  (click)="handleAction(notification)">
                  <ion-icon name="eye-outline" slot="start"></ion-icon>
                  {{ notification.action_label || 'Voir détails' }}
                </ion-button>
                
                <ion-button 
                  size="small"
                  fill="clear"
                  color="medium"
                  (click)="archiveNotification(notification)">
                  <ion-icon name="archive-outline" slot="icon-only"></ion-icon>
                </ion-button>
              </div>
            </div>
          </ion-item>
        </ion-list>

        <!-- Statistiques -->
        <div *ngIf="!isLoading && notifications.length > 0" class="notification-stats">
          <ion-note>
            {{ stats.total }} notification(s) • 
            {{ stats.non_lues }} non lue(s) • 
            {{ stats.actions_requises }} action(s) requise(s)
          </ion-note>
        </div>
      </ion-card-content>
    </ion-card>
  `,
  styleUrls: ['./notifications.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonButton,
    IonIcon,
    IonText,
    IonBadge,
    IonList,
    IonItem,
    IonLabel,
    IonNote,
    IonChip,
    IonSpinner,
    IonRefresher,
    IonRefresherContent
  ]
})
export class NotificationsComponent implements OnInit, OnDestroy {
  
  @Input() entrepriseId: string = '';
  @Input() maxItems: number = 10;
  @Input() showControls: boolean = true;
  
  notifications: Notification[] = [];
  stats: NotificationStats = {
    total: 0,
    non_lues: 0,
    urgentes: 0,
    actions_requises: 0
  };
  
  isLoading = true;
  
  private subscriptions: Subscription[] = [];

  constructor(
    private notificationsService: NotificationsService,
    private alertController: AlertController,
    private toastController: ToastController
  ) {
    // Ajouter les icônes
    addIcons({
      notificationsOutline,
      checkmarkCircleOutline,
      alertCircleOutline,
      timeOutline,
      trendingUpOutline,
      trendingDownOutline,
      businessOutline,
      eyeOutline,
      archiveOutline,
      refreshOutline
    });
  }

  async ngOnInit() {
    await this.loadNotifications();
    this.setupSubscriptions();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private async loadNotifications() {
    try {
      this.isLoading = true;
      
      if (this.entrepriseId) {
        this.notifications = await this.notificationsService.getNotificationsForEnterprise(this.entrepriseId);
        
        // Limiter le nombre d'éléments si spécifié
        if (this.maxItems > 0) {
          this.notifications = this.notifications.slice(0, this.maxItems);
        }
      }
      
      this.updateStats();
      
    } catch (error) {
      console.error('❌ Erreur chargement notifications:', error);
      this.showError('Erreur lors du chargement des notifications');
    } finally {
      this.isLoading = false;
    }
  }

  private setupSubscriptions() {
    // S'abonner aux changements de notifications
    const notificationsSub = this.notificationsService.getNotifications()
      .subscribe(notifications => {
        if (this.entrepriseId) {
          this.notifications = notifications.filter(n => n.entreprise_id === this.entrepriseId);
          
          if (this.maxItems > 0) {
            this.notifications = this.notifications.slice(0, this.maxItems);
          }
        }
        this.updateStats();
      });

    // S'abonner aux statistiques
    const statsSub = this.notificationsService.getNotificationStats()
      .subscribe(stats => {
        this.stats = stats;
      });

    this.subscriptions.push(notificationsSub, statsSub);
  }

  private updateStats() {
    this.stats = {
      total: this.notifications.length,
      non_lues: this.notifications.filter(n => !n.lu).length,
      urgentes: this.notifications.filter(n => n.priority === 'urgent' || n.priority === 'high').length,
      actions_requises: this.notifications.filter(n => n.action_required && !n.lu).length
    };
  }

  async markAsRead(notification: Notification) {
    try {
      const count = await this.notificationsService.markAsRead(this.entrepriseId, [notification.id]);
      
      if (count > 0) {
        notification.lu = true;
        notification.date_lecture = new Date().toISOString();
        this.updateStats();
        
        this.showSuccess('Notification marquée comme lue');
      }
    } catch (error) {
      console.error('❌ Erreur marquage notification:', error);
      this.showError('Erreur lors du marquage');
    }
  }

  async markAllAsRead() {
    try {
      const count = await this.notificationsService.markAsRead(this.entrepriseId);
      
      if (count > 0) {
        this.notifications.forEach(n => {
          n.lu = true;
          n.date_lecture = new Date().toISOString();
        });
        this.updateStats();
        
        this.showSuccess(`${count} notification(s) marquée(s) comme lues`);
      }
    } catch (error) {
      console.error('❌ Erreur marquage toutes notifications:', error);
      this.showError('Erreur lors du marquage');
    }
  }

  async archiveNotification(notification: Notification) {
    const alert = await this.alertController.create({
      header: 'Archiver la notification',
      message: 'Voulez-vous archiver cette notification ? Elle ne sera plus visible.',
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel'
        },
        {
          text: 'Archiver',
          handler: async () => {
            const success = await this.notificationsService.archiveNotification(notification.id);
            if (success) {
              this.notifications = this.notifications.filter(n => n.id !== notification.id);
              this.updateStats();
              this.showSuccess('Notification archivée');
            } else {
              this.showError('Erreur lors de l\'archivage');
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async refreshNotifications(event?: RefresherCustomEvent) {
    await this.loadNotifications();
    if (event) {
      event.target.complete();
    }
  }

  handleAction(notification: Notification) {
    if (notification.action_url) {
      // Naviguer vers l'URL d'action ou émettre un événement
      console.log('Action requise:', notification.action_url);
      // Vous pouvez implémenter la navigation ici
    }
  }

  // Utilitaires
  getTypeColor(type: string): string {
    switch (type) {
      case 'commission_change': return 'primary';
      case 'commission_specific_set': return 'success';
      case 'commission_specific_removed': return 'warning';
      case 'system_info': return 'medium';
      case 'alert': return 'danger';
      default: return 'medium';
    }
  }

  getTypeLabel(type: string): string {
    switch (type) {
      case 'commission_change': return 'Commission';
      case 'commission_specific_set': return 'Taux Spécifique';
      case 'commission_specific_removed': return 'Taux Supprimé';
      case 'system_info': return 'Information';
      case 'alert': return 'Alerte';
      default: return 'Notification';
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) {
      return 'À l\'instant';
    } else if (diffHours < 24) {
      return `Il y a ${diffHours}h`;
    } else if (diffHours < 48) {
      return 'Hier';
    } else {
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  }

  trackByNotification(index: number, notification: Notification): string {
    return notification.id;
  }

  private async showSuccess(message: string) {
    const toast = await this.toastController.create({
      message: `✅ ${message}`,
      duration: 2000,
      color: 'success',
      position: 'top'
    });
    await toast.present();
  }

  private async showError(message: string) {
    const toast = await this.toastController.create({
      message: `❌ ${message}`,
      duration: 3000,
      color: 'danger',
      position: 'top'
    });
    await toast.present();
  }
}