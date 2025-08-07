/**
 * SERVICE MODAL CONDUCTEUR BLOQUÉ
 * Gère l'affichage de la modal non-fermable pour conducteurs bloqués
 */

import { Injectable } from '@angular/core';
import { ModalController, AlertController } from '@ionic/angular';

export interface ConducteurBlockedModalData {
  motif: string;
  bloque_par: string;
  date_blocage: string;
}

@Injectable({
  providedIn: 'root'
})
export class ConducteurBlockedModalService {
  private currentModal: any = null;

  constructor(
    private modalController: ModalController,
    private alertController: AlertController
  ) {}

  async showBlockedModal(data: ConducteurBlockedModalData): Promise<void> {
    // Si une modal est déjà ouverte, la fermer d'abord
    if (this.currentModal) {
      try {
        await this.currentModal.dismiss();
      } catch (e) {
        console.warn('Erreur fermeture modal précédente:', e);
      }
    }

    // Créer une alerte non-fermable
    const alert = await this.alertController.create({
      header: '🚫 Compte Bloqué',
      message: this.generateBlockedMessage(data),
      backdropDismiss: false, // Empêche la fermeture en cliquant à l'extérieur
      keyboardClose: false,   // Empêche la fermeture avec Escape
      cssClass: 'blocked-conducteur-alert',
      buttons: [
        {
          text: '📞 Contacter Support',
          role: 'support',
          handler: () => {
            this.contactSupport();
            // Ne pas fermer la modal
            return false;
          }
        },
        {
          text: '❌ Fermer Application',
          role: 'cancel',
          cssClass: 'danger-button',
          handler: () => {
            this.closeApp();
            return false;
          }
        }
      ]
    });

    this.currentModal = alert;
    await alert.present();

    // Ajouter des listeners pour empêcher la fermeture
    this.preventModalClose(alert);
  }

  private generateBlockedMessage(data: ConducteurBlockedModalData): string {
    const bloquePar = this.getBlockedByLabel(data.bloque_par);
    const dateFormatted = this.formatDate(data.date_blocage);

    return `
      <div class="blocked-modal-content">
        <div class="blocked-icon">🔒</div>
        
        <div class="blocked-title">Votre compte conducteur a été bloqué</div>
        
        <div class="blocked-details">
          <div class="detail-item">
            <strong>Motif :</strong><br>
            <span class="motif-text">${data.motif}</span>
          </div>
          
          <div class="detail-item">
            <strong>Bloqué par :</strong> ${bloquePar}
          </div>
          
          <div class="detail-item">
            <strong>Date :</strong> ${dateFormatted}
          </div>
        </div>
        
        <div class="blocked-consequences">
          <p><strong>Conséquences :</strong></p>
          <ul>
            <li>Accès à l'application suspendu</li>
            <li>Impossible de recevoir de nouvelles courses</li>
            <li>Contactez le support pour plus d'informations</li>
          </ul>
        </div>
        
        <div class="blocked-warning">
          ⚠️ Cette restriction ne peut être levée que par l'administration.
        </div>
      </div>
    `;
  }

  private getBlockedByLabel(bloquePar: string): string {
    switch (bloquePar) {
      case 'super-admin':
        return 'Administration système';
      case 'super-admin-entreprise':
        return 'Administration (désactivation entreprise)';
      case 'entreprise':
        return 'Votre entreprise';
      default:
        return 'Non spécifié';
    }
  }

  private formatDate(dateString: string): string {
    if (!dateString) return 'Non spécifié';
    
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

  private preventModalClose(alert: any): void {
    // Désactiver les gestes de fermeture
    const alertElement = document.querySelector('ion-alert.blocked-conducteur-alert');
    if (alertElement) {
      alertElement.addEventListener('ionAlertWillDismiss', (event: any) => {
        // Empêcher la fermeture sauf si c'est déclenché par nos boutons
        if (event.detail.role !== 'support' && event.detail.role !== 'cancel') {
          event.preventDefault();
          event.stopPropagation();
          return false;
        }
        return true;
      });
    }
  }

  private contactSupport(): void {
    // Ouvrir l'application de téléphone avec le numéro de support
    try {
      window.open('tel:+224XXXXXXXX', '_system');
    } catch (e) {
      console.warn('Impossible d\'ouvrir le téléphone:', e);
      // Fallback : copier le numéro dans le presse-papier
      this.showSupportInfo();
    }
  }

  private async showSupportInfo(): Promise<void> {
    const supportAlert = await this.alertController.create({
      header: 'Support Technique',
      message: `
        <div class="support-info">
          <p><strong>Contactez le support :</strong></p>
          <p>📞 +224 XX XX XX XX</p>
          <p>📧 support&#64;lako.com</p>
          <p>🕒 Lundi - Vendredi : 8h - 18h</p>
        </div>
      `,
      buttons: [
        {
          text: 'Fermer',
          role: 'cancel'
        }
      ]
    });

    await supportAlert.present();
  }

  private closeApp(): void {
    // Tentative de fermeture de l'application
    try {
      // Si Capacitor App est disponible
      if ((window as any).Capacitor?.Plugins?.App) {
        (window as any).Capacitor.Plugins.App.exitApp();
      } else if ((navigator as any).app) {
        // Fallback Cordova
        (navigator as any).app.exitApp();
      } else {
        // Fallback web - fermer l'onglet
        window.close();
        
        // Si ça ne marche pas, rediriger vers une page blanche
        setTimeout(() => {
          window.location.href = 'about:blank';
        }, 1000);
      }
    } catch (e) {
      console.warn('Impossible de fermer l\'application:', e);
      // Dernière tentative : vider le contenu de la page
      document.body.innerHTML = `
        <div style="
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          font-family: Arial, sans-serif;
          text-align: center;
          background: #f5f5f5;
        ">
          <div>
            <h2>🚫 Application Fermée</h2>
            <p>Votre compte est suspendu.</p>
            <p>Vous pouvez fermer cet onglet.</p>
          </div>
        </div>
      `;
    }
  }

  async dismissModal(): Promise<void> {
    if (this.currentModal) {
      try {
        await this.currentModal.dismiss();
        this.currentModal = null;
      } catch (e) {
        console.warn('Erreur fermeture modal:', e);
      }
    }
  }

  isModalOpen(): boolean {
    return this.currentModal !== null;
  }
}