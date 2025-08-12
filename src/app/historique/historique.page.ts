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
import { location, time, person, call, checkmarkCircle, closeCircle, checkmarkDoneCircle, car, resize, card, shieldCheckmark, timeOutline, calendar, ban } from 'ionicons/icons';
import { SupabaseService } from '../services/supabase.service';
import { AuthService } from '../services/auth.service';
import { CallService } from '../services/call.service';
import { Reservation } from '../models/reservation.model';

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
  reservations: Reservation[] = [];
  isLoading = true;
  otpCodes: { [reservationId: string]: string[] } = {};

  constructor(
    private supabaseService: SupabaseService,
    private authService: AuthService,
    private callService: CallService,
    private toastController: ToastController,
    private loadingController: LoadingController
  ) {
    addIcons({ location, time, person, call, checkmarkCircle, closeCircle, checkmarkDoneCircle, car, resize, card, shieldCheckmark, timeOutline, calendar, ban });
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
        this.reservations = await this.supabaseService.getReservationHistory(conducteurId);
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
}