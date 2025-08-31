import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, 
  IonHeader, 
  IonTitle, 
  IonToolbar, 
  IonCard, 
  IonCardHeader, 
  IonCardTitle, 
  IonCardContent,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
  IonText,
  IonIcon,
  IonBadge,
  IonInput,
  IonButton,
  ToastController,
  LoadingController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { location, time, person, call, checkmarkCircle, closeCircle, checkmarkDoneCircle, car, resize, card, shieldCheckmark, timeOutline, calendar, ban, copy, reload } from 'ionicons/icons';
import { SupabaseService } from '../services/supabase.service';
import { AuthService } from '../services/auth.service';
import { CallService } from '../services/call.service';
import { PaymentService, PaymentStatus } from '../services/payment.service';
import { Reservation } from '../models/reservation.model';

// Interface étendue pour inclure les données de paiement
interface ReservationWithPayment extends Reservation {
  paymentStatus?: PaymentStatus;
  isPaymentExpired?: boolean;
  canRetriggerPayment?: boolean;
}

@Component({
  selector: 'app-historique',
  templateUrl: './historique.page.html',
  styleUrls: ['./historique.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonRefresher,
    IonRefresherContent,
    IonSpinner,
    IonText,
    IonIcon,
    IonBadge,
    IonInput,
    IonButton,
    CommonModule,
    FormsModule,
  ],
})

export class HistoriquePage implements OnInit {
  reservations: ReservationWithPayment[] = [];
  isLoading = true;
  otpCodes: { [reservationId: string]: string[] } = {};

  constructor(
    private supabaseService: SupabaseService,
    private authService: AuthService,
    private callService: CallService,
    private paymentService: PaymentService,
    private toastController: ToastController,
    private loadingController: LoadingController
  ) {
    addIcons({ location, time, person, call, checkmarkCircle, closeCircle, checkmarkDoneCircle, car, resize, card, shieldCheckmark, timeOutline, calendar, ban, copy, reload });
  }

  ngOnInit() {
   
  }
  async ionViewWillEnter() {
    this.loadHistory();
  }

  async loadHistory() {
    this.isLoading = true;
    try {
      const conducteurId = this.authService.getCurrentConducteurId();
      if (conducteurId) {
        // Charger l'historique des réservations
        this.reservations = await this.supabaseService.getReservationHistory(conducteurId);
        
        // Charger le statut de paiement pour chaque réservation acceptée
        await this.loadPaymentStatusForReservations();
      } else {
        this.reservations = [];
        this.presentToast('Erreur: Conducteur non connecté', 'danger');
      }
    } catch (error) {
      console.error('Error loading history:', error);
      this.presentToast('Erreur lors du chargement de l\'historique', 'danger');
    } finally {
      this.isLoading = false;
    }
  }

  async handleRefresh(event: any) {
    await this.loadHistory();
    event.target.complete();
  }

  /**
   * Charge le statut de paiement pour toutes les réservations acceptées
   */
  private async loadPaymentStatusForReservations() {
    // Récupérer l'entreprise du conducteur connecté
    const conducteur = this.authService.getCurrentConducteur();
    const isLengoPayActive = conducteur?.entreprise_id ? 
      await this.paymentService.isLengoPayActiveForEntreprise(conducteur.entreprise_id) : false;

    for (const reservation of this.reservations) {
      if (reservation.statut === 'accepted' || reservation.statut === 'completed') {
        try {
          // Récupérer le dernier paiement pour cette réservation
          const paymentStatus = await this.paymentService.getLatestPaymentStatus(reservation.id);
          
          if (paymentStatus) {
            reservation.paymentStatus = paymentStatus;
            reservation.isPaymentExpired = this.paymentService.isPaymentExpired(paymentStatus.created_at);
          }
          
          // Déterminer si on peut relancer un paiement (inclut vérification is_active)
          const canRetriggerBasedOnStatus = this.paymentService.canRetriggerPayment(reservation);
          reservation.canRetriggerPayment = canRetriggerBasedOnStatus && isLengoPayActive;
        } catch (error) {
          console.error(`Erreur chargement paiement pour ${reservation.id}:`, error);
        }
      }
    }
  }

  /**
   * Relance un processus de paiement pour une réservation
   */
  async retriggerPayment(reservation: ReservationWithPayment) {
    // Vérifier d'abord si le paiement n'est pas déjà effectué
    if (reservation.paymentStatus?.status === 'SUCCESS') {
      this.presentToast('Le paiement a déjà été effectué pour cette réservation', 'warning');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Déclenchement du paiement...',
    });
    await loading.present();

    try {
      const conducteurId = this.authService.getCurrentConducteurId();
      if (!conducteurId) {
        throw new Error('Conducteur non connecté');
      }

      const result = await this.paymentService.triggerPayment(reservation.id, conducteurId);
      
      if (result.success) {
        this.presentToast('Paiement relancé avec succès', 'success');
        
        // Recharger les données de paiement pour cette réservation
        await this.loadPaymentStatusForReservations();
      } else {
        throw new Error(result.message || 'Erreur lors du déclenchement');
      }
    } catch (error: any) {
      console.error('Erreur retriggerPayment:', error);
      this.presentToast(`Erreur: ${error.message}`, 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  private async presentToast(message: string, color: 'success' | 'danger' | 'warning') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'top',
    });
    await toast.present();
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'accepted':
        return 'success';
      case 'refused':
        return 'danger';
      case 'completed':
        return 'primary';
      case 'scheduled':
        return 'warning';
      case 'canceled':
        return 'danger';
      default:
        return 'medium';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'accepted':
        return 'checkmark-circle';
      case 'refused':
        return 'close-circle';
      case 'completed':
        return 'checkmark-done-circle';
      case 'scheduled':
        return 'calendar';
      case 'canceled':
        return 'ban';
      default:
        return 'time';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'accepted':
        return 'Acceptée';
      case 'refused':
        return 'Refusée';
      case 'completed':
        return 'Terminée';
      case 'scheduled':
        return 'Planifiée';
      case 'canceled':
        return 'Annulée';
      default:
        return status;
    }
  }

  formatDate(dateString?: string): string {
    if (!dateString) return 'Date non spécifiée';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  formatTime(timeString?: string): string {
    if (!timeString) return 'Heure non spécifiée';
    return timeString;
  }

  formatDateTime(dateString?: string): string {
    if (!dateString) return 'Date non spécifiée';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // ✅ NOUVEAU : Format date validation sans conversion timezone  
  formatValidationDate(dateString?: string): string {
    if (!dateString) return 'Date non spécifiée';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'GMT'  // Force GMT+0 pour date_code_validation uniquement
    });
  }

  // Formatage date de réservation planifiée
  formatScheduledDate(dateString?: string): string {
    if (!dateString) return 'Date non spécifiée';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  // Formatage heure de réservation planifiée
  formatScheduledTime(hour?: number | null, minute?: number | null): string {
    if (hour === null || hour === undefined) return 'Heure non spécifiée';
    
    const h = hour.toString().padStart(2, '0');
    const m = (minute || 0).toString().padStart(2, '0');
    return `${h}:${m}`;
  }

  // Appeler un client
  callClient(phoneNumber: string): void {
    this.callService.callPhoneNumber(phoneNumber);
  }

  // Gestion des inputs OTP
  onOtpInput(event: any, index: number, reservationId: string) {
    const value = event.target.value;
    
    if (!this.otpCodes[reservationId]) {
      this.otpCodes[reservationId] = ['', '', '', ''];
    }
    
    // Limiter à 1 chiffre
    if (value.length > 1) {
      event.target.value = value.slice(0, 1);
    }
    
    this.otpCodes[reservationId][index] = event.target.value;
    
    // Auto-focus sur le champ suivant
    if (event.target.value && index < 3) {
      const nextInput = document.querySelectorAll(`ion-input.otp-digit`)[index + 1] as any;
      if (nextInput) {
        nextInput.setFocus();
      }
    }
  }

  onOtpKeydown(event: any, index: number, reservationId: string) {
    // Backspace: focus sur le champ précédent
    if (event.key === 'Backspace' && !event.target.value && index > 0) {
      const prevInput = document.querySelectorAll(`ion-input.otp-digit`)[index - 1] as any;
      if (prevInput) {
        prevInput.setFocus();
      }
    }
  }

  isOtpComplete(reservationId: string): boolean {
    const codes = this.otpCodes[reservationId];
    return codes && codes.every(code => code.length === 1);
  }

  async validateOTP(reservation: Reservation) {
    const loading = await this.loadingController.create({
      message: 'Validation en cours...',
    });
    await loading.present();

    try {
      const otpCode = this.otpCodes[reservation.id].join('');
      
      const success = await this.supabaseService.validateOTP(reservation.id, otpCode);
      
      if (success) {
        this.presentToast('Code validé avec succès ! Course terminée.', 'success');
        // Recharger l'historique pour voir les changements
        await this.loadHistory();
      } else {
        this.presentToast('Code incorrect. Vérifiez avec le client.', 'danger');
      }
    } catch (error) {
      console.error('Error validating OTP:', error);
      this.presentToast('Erreur lors de la validation', 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  /**
   * Copie l'URL de paiement dans le presse-papiers
   */
  async copyPaymentUrl(reservation: ReservationWithPayment) {
    const paymentUrl = this.paymentService.getPaymentUrl(reservation.paymentStatus?.raw_json);
    
    if (!paymentUrl) {
      this.presentToast('URL de paiement non disponible', 'warning');
      return;
    }

    try {
      await navigator.clipboard.writeText(paymentUrl);
      this.presentToast('URL de paiement copiée !', 'success');
    } catch (error) {
      console.error('Erreur copie URL:', error);
      this.presentToast('Erreur lors de la copie', 'danger');
    }
  }

  /**
   * Obtient le temps restant avant expiration
   */
  getExpirationTime(reservation: ReservationWithPayment): string {
    if (!reservation.paymentStatus || reservation.paymentStatus.status === 'SUCCESS' || reservation.paymentStatus.status === 'Success') {
      return '';
    }

    const minutesLeft = this.paymentService.getMinutesUntilExpiration(reservation.paymentStatus.created_at);
    
    if (minutesLeft <= 0) {
      return 'Expiré';
    }
    
    return `Expire dans ${minutesLeft} min`;
  }

  /**
   * Rafraîchit le statut de paiement pour une réservation spécifique
   */
  async refreshPaymentStatus(reservation: ReservationWithPayment) {
    const loading = await this.loadingController.create({
      message: 'Vérification du paiement...',
    });
    await loading.present();

    try {
      // Vérifier la configuration LengoPay
      const conducteur = this.authService.getCurrentConducteur();
      const isLengoPayActive = conducteur?.entreprise_id ? 
        await this.paymentService.isLengoPayActiveForEntreprise(conducteur.entreprise_id) : false;

      // Recharger le statut de paiement pour cette réservation
      const paymentStatus = await this.paymentService.getLatestPaymentStatus(reservation.id);
      
      if (paymentStatus) {
        reservation.paymentStatus = paymentStatus;
        reservation.isPaymentExpired = this.paymentService.isPaymentExpired(paymentStatus.created_at);
        
        // Appliquer la logique complète pour canRetriggerPayment
        const canRetriggerBasedOnStatus = this.paymentService.canRetriggerPayment(reservation);
        reservation.canRetriggerPayment = canRetriggerBasedOnStatus && isLengoPayActive;
        
        // Message selon le statut
        if (paymentStatus.status === 'SUCCESS' || paymentStatus.status === 'Success') {
          this.presentToast('Paiement confirmé !', 'success');
        } else if (paymentStatus.status === 'FAILED' || paymentStatus.status === 'Failed') {
          this.presentToast('Paiement échoué', 'warning');
        } else {
          this.presentToast('Statut mis à jour', 'success');
        }
      } else {
        // Pas de paiement mais vérifier si config active pour permettre le déclenchement
        const canRetriggerBasedOnStatus = this.paymentService.canRetriggerPayment(reservation);
        reservation.canRetriggerPayment = canRetriggerBasedOnStatus && isLengoPayActive;
        
        this.presentToast('Aucun paiement trouvé', 'warning');
      }
    } catch (error) {
      console.error('Erreur refresh paiement:', error);
      this.presentToast('Erreur lors de la vérification', 'danger');
    } finally {
      await loading.dismiss();
    }
  }
}