/**
 * PAGE ENTREPRISE BLOQUÉE
 * Affichée quand une entreprise est désactivée
 */

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { 
  IonContent, 
  IonCard, 
  IonCardHeader, 
  IonCardTitle, 
  IonCardContent,
  IonButton,
  IonIcon,
  IonText
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  lockClosedOutline,
  callOutline,
  calendarOutline,
  warningOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-blocked',
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonButton,
    IonIcon,
    IonText
  ],
  template: `
    <ion-content class="blocked-content">
      <div class="blocked-container">
        <ion-card class="blocked-card">
          <ion-card-header class="blocked-header">
            <div class="lock-icon">
              <ion-icon name="lock-closed-outline" color="danger" size="large"></ion-icon>
            </div>
            <ion-card-title>Compte Entreprise Désactivé</ion-card-title>
          </ion-card-header>
          
          <ion-card-content>
            <div class="warning-section">
              <ion-icon name="warning-outline" color="warning"></ion-icon>
              <h3>Accès suspendu</h3>
              <p>Votre compte entreprise a été temporairement désactivé par l'administration.</p>
            </div>

            <div class="motif-section" *ngIf="motifDesactivation">
              <h4>Motif de désactivation :</h4>
              <div class="motif-box">
                <p>{{ motifDesactivation }}</p>
              </div>
            </div>
            
            <div class="info-section" *ngIf="dateDesactivation">
              <p class="date">
                <ion-icon name="calendar-outline"></ion-icon>
                <span>Désactivé le : {{ formatDate(dateDesactivation) }}</span>
              </p>
            </div>
            
            <div class="consequences-section">
              <h4>Conséquences :</h4>
              <ul>
                <li>Tous vos conducteurs ont été automatiquement suspendus</li>
                <li>L'accès aux fonctionnalités est temporairement bloqué</li>
                <li>Les données restent sauvegardées</li>
              </ul>
            </div>
            
            <div class="actions-section">
              <ion-button 
                expand="block" 
                fill="outline" 
                color="primary"
                (click)="contactSupport()">
                <ion-icon name="call-outline" slot="start"></ion-icon>
                Contacter le support
              </ion-button>

              <div class="support-info">
                <p><strong>Support technique :</strong></p>
                <p>📞 +224 XX XX XX XX</p>
                <p>📧 support&#64;lako.com</p>
                <p>🕒 Lundi - Vendredi : 8h - 18h</p>
              </div>
            </div>
          </ion-card-content>
        </ion-card>

        <div class="footer-info">
          <ion-text color="medium">
            <p>Cette restriction sera levée après résolution du problème identifié.</p>
          </ion-text>
        </div>
      </div>
    </ion-content>
  `,
  styleUrls: ['./blocked.page.scss']
})
export class BlockedPage implements OnInit {
  motifDesactivation: string = '';
  dateDesactivation: string = '';
  typeBloque: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {
    // Ajouter les icônes
    addIcons({
      lockClosedOutline,
      callOutline,
      calendarOutline,
      warningOutline
    });
  }

  ngOnInit() {
    // Récupérer les paramètres de l'URL
    this.route.queryParams.subscribe(params => {
      this.motifDesactivation = params['motif'] || 'Non spécifié';
      this.typeBloque = params['type'] || 'entreprise';
      
      // Récupérer la date depuis le localStorage si disponible
      const blocageData = localStorage.getItem('blocage_info');
      if (blocageData) {
        try {
          const data = JSON.parse(blocageData);
          this.dateDesactivation = data.date_desactivation;
        } catch (e) {
          console.warn('Erreur parsing données blocage:', e);
        }
      }
    });
  }

  contactSupport() {
    // Ouvrir l'application de téléphone avec le numéro de support
    window.open('tel:+224XXXXXXXX', '_system');
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateString;
    }
  }
}