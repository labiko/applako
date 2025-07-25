import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, 
  IonHeader, 
  IonTitle, 
  IonToolbar, 
  IonList, 
  IonItem, 
  IonLabel, 
  IonButton, 
  IonCard, 
  IonCardHeader, 
  IonCardTitle, 
  IonCardContent,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
  IonText,
  IonIcon,
  ToastController,
  LoadingController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { location, time, person, call, checkmark, close, car, resize, card, carSportOutline } from 'ionicons/icons';
import { SupabaseService } from '../services/supabase.service';
import { AuthService } from '../services/auth.service';
import { Reservation } from '../models/reservation.model';

@Component({
  selector: 'app-reservations',
  templateUrl: './reservations.page.html',
  styleUrls: ['./reservations.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonList,
    IonItem,
    IonLabel,
    IonButton,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonRefresher,
    IonRefresherContent,
    IonSpinner,
    IonText,
    IonIcon,
    CommonModule,
    FormsModule,
  ],
})
export class ReservationsPage implements OnInit {
  reservations: Reservation[] = [];
  isLoading = true;

  constructor(
    private supabaseService: SupabaseService,
    private authService: AuthService,
    private toastController: ToastController,
    private loadingController: LoadingController
  ) {
    addIcons({ location, time, person, call, checkmark, close, car, resize, card, carSportOutline });
  }

  ngOnInit() {
    this.loadReservations();
  }

  async loadReservations() {
    this.isLoading = true;
    try {
      // Get reservations that are pending and not assigned to any driver
      this.reservations = await this.supabaseService.getPendingReservations();
    } catch (error) {
      console.error('Error loading reservations:', error);
      this.presentToast('Erreur lors du chargement des réservations', 'danger');
    } finally {
      this.isLoading = false;
    }
  }

  async handleRefresh(event: any) {
    await this.loadReservations();
    event.target.complete();
  }

  async acceptReservation(reservation: Reservation) {
    const loading = await this.loadingController.create({
      message: 'Acceptation en cours...',
    });
    await loading.present();

    try {
      const conducteurId = this.authService.getCurrentConducteurId();
      if (!conducteurId) {
        this.presentToast('Erreur: Conducteur non connecté', 'danger');
        return;
      }

      await this.supabaseService.updateReservationStatus(reservation.id, 'accepted', conducteurId);
      this.reservations = this.reservations.filter(r => r.id !== reservation.id);
      this.presentToast('Réservation acceptée avec succès', 'success');
    } catch (error) {
      console.error('Error accepting reservation:', error);
      this.presentToast('Erreur lors de l\'acceptation', 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  async refuseReservation(reservation: Reservation) {
    const loading = await this.loadingController.create({
      message: 'Refus en cours...',
    });
    await loading.present();

    try {
      await this.supabaseService.updateReservationStatus(reservation.id, 'refused');
      this.reservations = this.reservations.filter(r => r.id !== reservation.id);
      this.presentToast('Réservation refusée', 'warning');
    } catch (error) {
      console.error('Error refusing reservation:', error);
      this.presentToast('Erreur lors du refus', 'danger');
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