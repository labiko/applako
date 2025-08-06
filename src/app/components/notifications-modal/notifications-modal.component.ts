/**
 * MODALE SIMPLE POUR LES NOTIFICATIONS
 * Style épuré sans couleurs supplémentaires
 */

import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonIcon,
  IonList,
  IonItem,
  IonLabel,
  IonNote,
  IonBadge,
  ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  closeOutline,
  timeOutline,
  checkmarkCircleOutline,
  businessOutline
} from 'ionicons/icons';

import { NotificationsService, Notification } from '../../services/notifications.service';

@Component({
  selector: 'app-notifications-modal',
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>Notifications</ion-title>
        <ion-button 
          slot="end" 
          fill="clear" 
          color="light"
          (click)="close()">
          <ion-icon name="close-outline" slot="icon-only"></ion-icon>
        </ion-button>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="modal-content">
        
        <!-- Actions rapides -->
        <div class="actions-header" *ngIf="unreadNotifications.length > 0">
          <ion-button 
            fill="outline" 
            size="small"
            (click)="markAllAsRead()">
            <ion-icon name="checkmark-circle-outline" slot="start"></ion-icon>
            Tout marquer lu ({{ unreadNotifications.length }})
          </ion-button>
        </div>

        <!-- Liste des notifications -->
        <ion-list *ngIf="notifications.length > 0">
          <ion-item 
            *ngFor="let notification of notifications"
            [class.unread]="!notification.lu"
            button="true"
            (click)="toggleRead(notification)">
            
            <div class="notification-item">
              <!-- En-tête -->
              <div class="notification-header">
                <ion-badge size="small">
                  {{ getTypeLabel(notification.type_notification) }}
                </ion-badge>
                <ion-note class="timestamp">
                  <ion-icon name="time-outline"></ion-icon>
                  {{ formatDate(notification.created_at) }}
                </ion-note>
              </div>

              <!-- Titre -->
              <h3 class="notification-title">{{ notification.titre }}</h3>

              <!-- Message -->
              <p class="notification-message">{{ notification.message }}</p>

              <!-- Détails commission -->
              <div 
                *ngIf="notification.metadata?.ancien_taux && notification.metadata?.nouveau_taux"
                class="commission-details">
                <span class="rate-change">
                  {{ notification.metadata.ancien_taux }}% → {{ notification.metadata.nouveau_taux }}%
                  <span class="difference" [class.positive]="notification.metadata.difference > 0">
                    ({{ notification.metadata.difference > 0 ? '+' : '' }}{{ notification.metadata.difference }}%)
                  </span>
                </span>
              </div>

              <!-- Statut -->
              <div class="notification-status" *ngIf="!notification.lu">
                <ion-note color="primary">● Non lu</ion-note>
              </div>
            </div>
          </ion-item>
        </ion-list>

        <!-- État vide -->
        <div *ngIf="notifications.length === 0" class="empty-state">
          <ion-icon name="business-outline" size="large"></ion-icon>
          <h3>Aucune notification</h3>
          <p>Vous serez informé des changements de commission ici.</p>
        </div>

      </div>
    </ion-content>
  `,
  styleUrls: ['./notifications-modal.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonIcon,
    IonList,
    IonItem,
    IonLabel,
    IonNote,
    IonBadge
  ]
})
export class NotificationsModalComponent implements OnInit {
  
  @Input() notifications: Notification[] = [];
  @Input() entrepriseId: string = '';

  constructor(
    private modalController: ModalController,
    private notificationsService: NotificationsService
  ) {
    addIcons({
      closeOutline,
      timeOutline,
      checkmarkCircleOutline,
      businessOutline
    });
  }

  ngOnInit() {
    // Trier par date décroissante
    this.notifications.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  get unreadNotifications(): Notification[] {
    return this.notifications.filter(n => !n.lu);
  }

  async close() {
    await this.modalController.dismiss();
  }

  async markAllAsRead() {
    if (this.unreadNotifications.length === 0) return;

    try {
      const unreadIds = this.unreadNotifications.map(n => n.id);
      await this.notificationsService.markAsRead(this.entrepriseId, unreadIds);
      
      // Mettre à jour localement
      this.notifications.forEach(n => {
        if (unreadIds.includes(n.id)) {
          n.lu = true;
          n.date_lecture = new Date().toISOString();
        }
      });
      
    } catch (error) {
      console.error('Erreur marquage notifications:', error);
    }
  }

  async toggleRead(notification: Notification) {
    if (notification.lu) return; // Déjà lu

    try {
      await this.notificationsService.markAsRead(this.entrepriseId, [notification.id]);
      notification.lu = true;
      notification.date_lecture = new Date().toISOString();
    } catch (error) {
      console.error('Erreur marquage notification:', error);
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
    // La base stocke en UTC, on doit calculer selon GMT+0 (Conakry = UTC+0)
    const dbDate = new Date(dateString); // Date UTC de la base
    const nowUTC = new Date(); // Maintenant en local
    
    // Convertir nowUTC en vraie heure UTC pour comparaison
    const nowUTCTime = nowUTC.getTime() + (nowUTC.getTimezoneOffset() * 60000);
    const conakryNow = new Date(nowUTCTime); // GMT+0 = UTC+0
    
    const diffMs = conakryNow.getTime() - dbDate.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    
    if (diffMinutes < 1) {
      return 'À l\'instant';
    } else if (diffMinutes < 60) {
      return `Il y a ${diffMinutes}min`;
    } else if (diffHours < 24) {
      return `Il y a ${diffHours}h`;
    } else if (diffHours < 48) {
      return 'Hier';
    } else {
      // Afficher la date en GMT+0 (Conakry)
      return dbDate.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC'
      });
    }
  }
}