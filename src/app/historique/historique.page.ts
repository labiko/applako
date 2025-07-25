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
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { location, time, person, call, checkmarkCircle, closeCircle, checkmarkDoneCircle, car, resize, card } from 'ionicons/icons';
import { SupabaseService } from '../services/supabase.service';
import { AuthService } from '../services/auth.service';
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
    CommonModule,
    FormsModule,
  ],
})
export class HistoriquePage implements OnInit {
  reservations: Reservation[] = [];
  isLoading = true;

  constructor(
    private supabaseService: SupabaseService,
    private authService: AuthService,
    private toastController: ToastController
  ) {
    addIcons({ location, time, person, call, checkmarkCircle, closeCircle, checkmarkDoneCircle, car, resize, card });
  }

  ngOnInit() {
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
}