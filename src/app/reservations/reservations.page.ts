import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
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
  IonToggle,
  IonBadge,
  IonSegment,
  IonSegmentButton,
  ToastController,
  LoadingController,
  AlertController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { location, time, person, call, checkmark, close, car, resize, card, carSportOutline, openOutline, timeOutline, checkmarkCircle, closeCircle, flag, calendar, sync, notificationsOutline, notificationsOffOutline } from 'ionicons/icons';
import { SupabaseService } from '../services/supabase.service';
import { AuthService } from '../services/auth.service';
import { GeolocationService } from '../services/geolocation.service';
import { AutoRefreshService, RefreshState } from '../services/auto-refresh.service';
import { RadiusChangeDetectionService } from '../services/radius-change-detection.service';
import { CallService } from '../services/call.service';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Reservation } from '../models/reservation.model';
import { Subscription } from 'rxjs';

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
    IonToggle,
    IonBadge,
    IonSegment,
    IonSegmentButton,
    CommonModule,
    FormsModule,
  ],
})
export class ReservationsPage implements OnInit, OnDestroy {
  reservations: Reservation[] = [];
  isLoading = true;
  conducteurPosition: string = 'Chargement de la position...';
  isOnline: boolean = true; // Statut en ligne par défaut

  // Segments pour séparer réservations nouvelles et planifiées
  selectedSegment: string = 'nouvelles'; // Par défaut sur nouvelles réservations
  allReservations: Reservation[] = []; // Toutes les réservations récupérées
  scheduledReservations: Reservation[] = []; // Réservations planifiées assignées

  // Alerte position GPS manquante
  showPositionAlert: boolean = false;

  // État du rafraîchissement automatique
  refreshState: RefreshState | null = null;
  private refreshStateSubscription: Subscription | null = null;

  // Timer pour mise à jour du timestamp et countdown
  private timestampUpdateInterval: any = null;
  private readonly REFRESH_INTERVAL_SECONDS = 120; // 2 minutes en secondes

  // Variables pour éviter les erreurs Angular NG0100
  private _nextRefreshCountdown: number = 120;
  private _progressPercentage: number = 0;
  private _timeSinceLastRefresh: string = 'jamais';

  // Listener pour événement resume
  private resumeListener: any = null;

  constructor(
    private supabaseService: SupabaseService,
    private authService: AuthService,
    private geolocationService: GeolocationService,
    private autoRefreshService: AutoRefreshService,
    private radiusChangeService: RadiusChangeDetectionService,
    private callService: CallService,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private alertController: AlertController,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {
    addIcons({ location, time, person, call, checkmark, close, car, resize, card, carSportOutline, openOutline, timeOutline, checkmarkCircle, closeCircle, flag, calendar, sync });
  }

  ngOnInit() {
    console.log('🚀 ngOnInit - Initialisation unique du composant');

    // ✅ IMPORTANT : Synchroniser d'abord avec la base de données
    this.syncConducteurStatusOnInit();

    // Arrêt du spinner pour affichage instantané
    this.isLoading = false;

    // ✅ S'abonner à l'état du rafraîchissement automatique
    this.refreshStateSubscription = this.autoRefreshService.refreshState$.subscribe(
      state => {
        this.refreshState = state;
        // Mettre à jour les valeurs cachées
        this.updateCountdownValues();
        // Forcer la détection de changements pour l'indicateur visuel
        this.cdr.markForCheck();
      }
    );

    // ✅ Démarrer la mise à jour du timestamp toutes les 10 secondes
    this.startTimestampUpdates();

    // ✅ Actions d'initialisation
    this.setupResumeListener();

    // ℹ️ Chargement initial des données (en arrière-plan)
    console.log('🔄 Chargement initial en arrière-plan...');
    this.loadReservationsInBackground();

    // 🔄 Démarrer le rafraîchissement automatique si en ligne
    if (this.isOnline) {
      this.startAutoRefresh();
    }
  }


  async ionViewWillEnter() {
    console.log('📱 ionViewWillEnter - Vérification changement rayon');
    //  if (this.radiusChangeService.shouldReload()) {
    console.log('📱 Rechargement nécessaire, actualisation des réservations...');
    this.loadReservations();
    //  } else {
    //    console.log('📱 Rayon inchangé, pas de rechargement');
    //  }
  }

  ionViewWillLeave() {
    // Arrêter le rafraîchissement automatique quand on quitte la page
    this.autoRefreshService.stopAutoRefresh();

    // Arrêter la mise à jour du timestamp
    this.stopTimestampUpdates();

    // Supprimer le listener resume
    this.removeResumeListener();
  }

  // Synchroniser l'état du conducteur avec la base de données
  async syncConducteurStatus() {
    const conducteurId = this.authService.getCurrentConducteurId();
    if (!conducteurId) return;

    try {
      const status = await this.supabaseService.getConducteurStatus(conducteurId);
      if (status) {
        this.isOnline = !status.hors_ligne;

        // Mettre à jour les données locales
        const conducteur = this.authService.getCurrentConducteur();
        if (conducteur) {
          conducteur.hors_ligne = status.hors_ligne;
          conducteur.derniere_activite = status.derniere_activite;
          (this.authService as any).currentConducteurSubject.next(conducteur);
        }

      }
    } catch (error) {
      console.error('Erreur lors de la synchronisation du statut:', error);
    }
  }

  // ✅ NOUVEAU : Synchronisation au démarrage (ngOnInit)
  async syncConducteurStatusOnInit() {
    console.log('🔄 Synchronisation statut conducteur au démarrage...');

    const conducteurId = this.authService.getCurrentConducteurId();
    if (!conducteurId) {
      // Fallback sur cache local si pas d'ID
      const conducteur = this.authService.getCurrentConducteur();
      if (conducteur) {
        const horsLigne = conducteur.hors_ligne ?? false;
        this.isOnline = !horsLigne;
        console.log('📱 Statut local:', this.isOnline ? 'EN LIGNE' : 'HORS LIGNE');
      }
      return;
    }

    try {
      const status = await this.supabaseService.getConducteurStatus(conducteurId);
      if (status) {
        const newIsOnline = !status.hors_ligne;

        // Vérifier si changement nécessaire
        if (this.isOnline !== newIsOnline) {
          console.log(`🔄 Mise à jour statut: ${this.isOnline ? 'EN LIGNE' : 'HORS LIGNE'} → ${newIsOnline ? 'EN LIGNE' : 'HORS LIGNE'}`);
          this.isOnline = newIsOnline;
          this.cdr.detectChanges(); // Force la détection de changement pour le toggle
        } else {
          console.log('✅ Statut déjà synchronisé:', this.isOnline ? 'EN LIGNE' : 'HORS LIGNE');
        }

        // Mettre à jour les données locales
        const conducteur = this.authService.getCurrentConducteur();
        if (conducteur) {
          conducteur.hors_ligne = status.hors_ligne;
          conducteur.derniere_activite = status.derniere_activite;
          (this.authService as any).currentConducteurSubject.next(conducteur);
        }

      }
    } catch (error) {
      console.error('❌ Erreur synchronisation statut au démarrage:', error);

      // Fallback sur cache local en cas d'erreur
      const conducteur = this.authService.getCurrentConducteur();
      if (conducteur) {
        const horsLigne = conducteur.hors_ligne ?? false;
        this.isOnline = !horsLigne;
        console.log('📱 Fallback sur cache local:', this.isOnline ? 'EN LIGNE' : 'HORS LIGNE');
      }
    }
  }

  // Mettre à jour la position une seule fois avec optimisation
  private async updateConducteurPositionOnce() {
    try {
      const { Geolocation } = await import('@capacitor/geolocation');
      const { Capacitor } = await import('@capacitor/core');

      // Désactiver sur web (Vercel) - fonctionne seulement sur mobile
      if (Capacitor.getPlatform() === 'web') {
        return;
      }

      const conducteurId = this.authService.getCurrentConducteurId();

      if (!conducteurId) {
        return;
      }

      // Vérifier les permissions
      const permissions = await Geolocation.checkPermissions();
      if (permissions.location !== 'granted') {
        const requestResult = await Geolocation.requestPermissions();
        if (requestResult.location !== 'granted') {
          return;
        }
      }

      // Obtenir la meilleure position possible (version simplifiée pour l'UI)
      const position = await this.getBestPositionQuick();

      if (!position) {
        console.error('Impossible d\'obtenir la position');
        return;
      }

      const longitude = position.coords.longitude;
      const latitude = position.coords.latitude;
      const accuracy = position.coords.accuracy;


      // Mettre à jour dans la base de données
      const success = await this.supabaseService.updateConducteurPosition(
        conducteurId,
        longitude,
        latitude,
        accuracy
      );

      if (success) {
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour de position:', error);
    }
  }

  // Version rapide pour l'interface utilisateur (max 2 tentatives)
  private async getBestPositionQuick(): Promise<any> {
    const { Geolocation } = await import('@capacitor/geolocation');
    const maxRetries = 2;
    const desiredAccuracy = 100; // Moins strict pour l'UI
    let bestPosition: any = null;
    let bestAccuracy = Infinity;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {

        const config = {
          enableHighAccuracy: true,
          timeout: attempt === 1 ? 12000 : 18000, // Timeouts plus courts pour l'UI
          maximumAge: attempt === 1 ? 0 : 60000
        };

        const position = await Geolocation.getCurrentPosition(config);
        const accuracy = position.coords.accuracy;


        if (accuracy < bestAccuracy) {
          bestPosition = position;
          bestAccuracy = accuracy;
        }

        // Si c'est assez précis, on s'arrête
        if (accuracy <= desiredAccuracy) {
          break;
        }

        // Pause courte entre les tentatives
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (error) {

        // Fallback final
        if (attempt === maxRetries && !bestPosition) {
          try {
            bestPosition = await Geolocation.getCurrentPosition({
              enableHighAccuracy: false,
              timeout: 15000,
              maximumAge: 120000
            });
          } catch (fallbackError) {
            console.error('All position attempts failed:', fallbackError);
          }
        }
      }
    }

    if (bestPosition) {
    }

    return bestPosition;
  }

  // Version sans spinner pour chargement en arrière-plan  
  async loadReservationsInBackground() {
    console.log('🔄 Chargement en arrière-plan - pas de spinner');
    try {
      // Charger les nouvelles réservations (pending et scheduled non assignées)
      // ✅ NOUVEAU : Récupérer mode test depuis localStorage
      const testMode = this.getTestMode();
      this.allReservations = await this.supabaseService.getPendingReservations(undefined, testMode);

      // Charger les réservations planifiées assignées au conducteur connecté
      await this.loadScheduledReservations();

      // Filtrer selon le segment actuel
      this.filterReservationsBySegment();

      // Calculate duration for each reservation and update conducteur position display
      await this.updateConducteurPosition();

      for (let reservation of this.reservations) {
        reservation.duration = await this.calculateDuration(reservation.position_depart);
        reservation.calculatedDistance = await this.calculateDistanceToReservation(reservation.position_depart);
      }

      console.log('✅ Chargement arrière-plan terminé');
    } catch (error) {
      console.error('Error loading reservations in background:', error);
    }
  }

  async loadReservations() {
    this.isLoading = true;
    try {
      // Vérifier si position GPS manquante pour conducteur connecté
      const conducteur = this.authService.getCurrentConducteur();
      if (conducteur && !conducteur.position_actuelle) {
        this.showPositionAlert = true;
        console.log('🚨 Position GPS manquante - affichage alerte');
      } else {
        this.showPositionAlert = false;
      }

      // Charger les nouvelles réservations (pending et scheduled non assignées)
      // ✅ NOUVEAU : Récupérer mode test depuis localStorage
      const testMode = this.getTestMode();
      this.allReservations = await this.supabaseService.getPendingReservations(undefined, testMode);


      // Charger les réservations planifiées assignées au conducteur connecté
      await this.loadScheduledReservations();

      // Filtrer selon le segment actuel
      this.filterReservationsBySegment();

      // Calculate duration for each reservation and update conducteur position display
      await this.updateConducteurPosition();

      for (let reservation of this.reservations) {
        reservation.duration = await this.calculateDuration(reservation.position_depart);
        reservation.calculatedDistance = await this.calculateDistanceToReservation(reservation.position_depart);
      }
    } catch (error) {
      console.error('Error loading reservations:', error);
      this.presentToast('Erreur lors du chargement des réservations', 'danger');
    } finally {
      this.isLoading = false;
    }
  }

  // Charger les réservations planifiées assignées au conducteur connecté
  private async loadScheduledReservations() {
    try {
      const conducteurId = this.authService.getCurrentConducteurId();
      console.log('🔍 Chargement réservations planifiées pour conducteur:', conducteurId);

      if (conducteurId) {
        this.scheduledReservations = await this.supabaseService.getScheduledReservationsForConducteur(conducteurId);
        console.log('📋 Réservations planifiées trouvées:', this.scheduledReservations.length, this.scheduledReservations);
      } else {
        this.scheduledReservations = [];
      }
    } catch (error) {
      console.error('Error loading scheduled reservations:', error);
      this.scheduledReservations = [];
    }
  }

  // Changement de segment via click direct (plus fiable)
  async changeSegment(segment: string) {
    if (segment !== this.selectedSegment) {
      this.selectedSegment = segment;

      // Forcer la mise à jour du segment visuel
      this.cdr.detectChanges();

      // Si les données ne sont pas chargées, les charger d'abord
      if (this.selectedSegment === 'planifiees' && this.scheduledReservations.length === 0) {
        await this.loadScheduledReservations();
      }

      this.filterReservationsBySegment();

      // Recalculer les distances pour les nouvelles réservations affichées
      await this.updateConducteurPosition();
      for (let reservation of this.reservations) {
        reservation.duration = await this.calculateDuration(reservation.position_depart);
        reservation.calculatedDistance = await this.calculateDistanceToReservation(reservation.position_depart);
      }
    }
  }

  // Filtrer les réservations selon le segment sélectionné
  private filterReservationsBySegment() {

    // Créer une copie pour éviter les références
    if (this.selectedSegment === 'nouvelles') {
      // ✅ NOUVEAU : Filtrer les réservations des 2 derniers jours + statut pending/scheduled
      this.reservations = [...this.allReservations].filter(reservation =>
        this.isWithinLastTwoDays(reservation.created_at) &&
        (reservation.statut === 'pending' || reservation.statut === 'scheduled')
      );
    } else if (this.selectedSegment === 'planifiees') {
      this.reservations = [...this.scheduledReservations];
    }

    // Forcer la mise à jour de l'affichage
    this.cdr.detectChanges();
  }

  // ✅ NOUVEAU : Vérifier si une réservation est dans les 2 derniers jours
  private isWithinLastTwoDays(dateString: string): boolean {
    if (!dateString) return false;

    const reservationDate = new Date(dateString);
    const now = new Date();
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(now.getDate() - 2);

    return reservationDate >= twoDaysAgo;
  }

  // ✅ NOUVEAU : Obtenir le count filtré pour l'onglet Nouvelles
  getFilteredNouvellesCount(): number {
    return this.allReservations.filter(reservation =>
      this.isWithinLastTwoDays(reservation.created_at) &&
      (reservation.statut === 'pending' || reservation.statut === 'scheduled')
    ).length;
  }

  // ✅ NOUVEAU : Récupérer le mode test depuis localStorage
  private getTestMode(): boolean {
    try {
      if (typeof Storage !== 'undefined') {
        const savedTestMode = localStorage.getItem('testMode');
        return savedTestMode ? JSON.parse(savedTestMode) : false;
      }
    } catch (error) {
      console.warn('Erreur chargement testMode:', error);
    }
    return false;
  }

  async handleRefresh(event: any) {
    console.log('🔄 Pull-to-refresh - Synchronisation complète');

    // 1. Synchroniser le statut conducteur depuis la base
    await this.syncConducteurStatus();

    // 2. Mettre à jour la position si conducteur en ligne
    if (this.isOnline) {
      console.log('🔄 Refresh - Mise à jour position GPS via GeolocationService...');
      await this.geolocationService.forceUpdateLocation();
    }

    // 3. Charger les réservations
    await this.loadReservations();

    console.log('✅ Pull-to-refresh terminé');
    event.target.complete();
  }

  async acceptReservation(reservation: Reservation) {
    // Vérifier si c'est une réservation planifiée
    if (reservation.statut === 'scheduled') {
      await this.confirmScheduledReservation(reservation);
      return;
    }

    // Pour les réservations pending normales
    await this.processAcceptReservation(reservation);
  }

  // Confirmation pour réservations planifiées
  private async confirmScheduledReservation(reservation: Reservation) {
    const scheduledDate = this.formatScheduledDate(reservation.date_reservation);
    const scheduledTime = this.formatScheduledTime(reservation.heure_reservation, reservation.minute_reservation);

    const alert = await this.alertController.create({
      header: '⚠️ RÉSERVATION PLANIFIÉE',
      cssClass: 'scheduled-reservation-alert',
      message: `📅 ${scheduledDate.toUpperCase()}
🕐 ${scheduledTime}

Accepter cette réservation planifiée ?`,
      buttons: [
        {
          text: 'NON',
          role: 'cancel',
          cssClass: 'alert-button-cancel'
        },
        {
          text: 'OUI',
          cssClass: 'alert-button-confirm',
          handler: () => {
            this.processAcceptReservation(reservation);
          }
        }
      ]
    });

    await alert.present();
  }

  // Traitement de l'acceptation (commun)
  private async processAcceptReservation(reservation: Reservation) {
    const loading = await this.loadingController.create({
      message: 'Acceptation en cours...',
    });
    await loading.present();

    try {
      const conducteurId = this.authService.getCurrentConducteurId();
      if (!conducteurId) {
        this.presentToast('Erreur: Conducteur non connecté', 'danger');
        await loading.dismiss();
        return;
      }

      // NOUVELLE VÉRIFICATION AVANT ACCEPTATION
      // Vérifier l'état actuel de la réservation en base
      try {
        const currentReservation = await this.supabaseService.getReservationById(reservation.id);

        if (currentReservation.conducteur_id !== null) {
          // La réservation a déjà été prise
          await loading.dismiss();

          const alert = await this.alertController.create({
            header: '⚠️ Réservation indisponible',
            message: 'Cette réservation a déjà été acceptée par un autre conducteur.',
            buttons: [{
              text: 'OK',
              handler: () => {
                // Actualiser la liste après fermeture
                this.loadReservations();
              }
            }],
            cssClass: 'reservation-taken-alert'
          });

          await alert.present();

          // Retirer immédiatement de la liste locale
          this.reservations = this.reservations.filter(r => r.id !== reservation.id);
          this.cdr.detectChanges();
          return;
        }
      } catch (checkError) {
        // Continuer avec le processus normal si erreur de vérification
      }

      // Tenter l'acceptation
      await this.supabaseService.updateReservationStatus(reservation.id, 'accepted', conducteurId);

      // Supprimer immédiatement de la liste locale
      console.log('Avant suppression:', this.reservations.length, 'réservations');
      this.reservations = this.reservations.filter(r => r.id !== reservation.id);
      console.log('Après suppression:', this.reservations.length, 'réservations');
      this.cdr.detectChanges(); // Forcer la détection des changements

      const message = reservation.statut === 'scheduled'
        ? 'Réservation planifiée acceptée avec succès'
        : 'Réservation acceptée avec succès';

      this.presentToast(message, 'success');
      this.router.navigate(['/tabs/historique']);
    } catch (error: any) {

      // Gestion spécifique de l'erreur RESERVATION_ALREADY_TAKEN
      if (error.message === 'RESERVATION_ALREADY_TAKEN') {
        // Retirer immédiatement de la liste locale
        this.reservations = this.reservations.filter(r => r.id !== reservation.id);
        this.cdr.detectChanges();

        const alert = await this.alertController.create({
          header: '⛔ Réservation non disponible',
          message: 'Cette réservation vient d\'être acceptée par un autre conducteur.',
          buttons: [{
            text: 'Actualiser la liste',
            handler: () => {
              this.loadReservations();
            }
          }],
          cssClass: 'reservation-conflict-alert'
        });
        await alert.present();
      } else {
        this.presentToast('Erreur lors de l\'acceptation', 'danger');
      }
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

  formatPrice(price?: number): string {
    if (!price) return '0';
    return price.toLocaleString('fr-FR');
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

  // Ouvrir Google Maps avec navigation directe vers le point de récupération du client
  openGoogleMaps(reservation: Reservation) {
    let destination = '';

    // Extraire la position de départ (où récupérer le client)
    if (reservation.position_depart) {
      const departCoords = this.extractCoordinates(reservation.position_depart);
      if (departCoords) {
        destination = `${departCoords.lat},${departCoords.lng}`;
      } else {
        // Fallback sur le nom de la position de départ
        destination = encodeURIComponent(reservation.position_depart);
      }
    }

    // Si pas de position de départ, utiliser la destination finale
    if (!destination && reservation.position_arrivee) {
      const arriveeCoords = this.extractCoordinates(reservation.position_arrivee);
      if (arriveeCoords) {
        destination = `${arriveeCoords.lat},${arriveeCoords.lng}`;
      }
    }

    // Fallback ultime sur le nom de destination
    if (!destination) {
      destination = encodeURIComponent(reservation.destination_nom);
    }

    // Navigation directe depuis la position actuelle vers le point de pickup
    // Google Maps utilisera automatiquement la position GPS actuelle comme point de départ
    const url = `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`;


    // Ouvrir dans l'app Google Maps ou navigateur
    window.open(url, '_system');
  }

  // Ouvrir Google Maps pour la destination finale (même logique que départ)
  openGoogleMapsDestination(reservation: Reservation) {

    let destination = '';

    // Extraire la position d'arrivée (destination finale)
    if (reservation.position_arrivee) {
      const arriveeCoords = this.extractCoordinates(reservation.position_arrivee);

      if (arriveeCoords) {
        destination = `${arriveeCoords.lat},${arriveeCoords.lng}`;
      } else {
        // Fallback sur le nom de la position d'arrivée
        destination = encodeURIComponent(reservation.position_arrivee);
      }
    }

    // Fallback ultime sur le nom de destination
    if (!destination) {
      destination = encodeURIComponent(reservation.destination_nom || 'Destination');
    }

    // Navigation directe depuis la position actuelle vers la destination finale
    // Google Maps utilisera automatiquement la position GPS actuelle comme point de départ
    const url = `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`;


    // Ouvrir dans l'app Google Maps ou navigateur
    window.open(url, '_system');
  }

  // Naviguer vers la destination finale (où déposer le client)
  navigateToDestination(reservation: Reservation) {
    let finalDestination = '';

    // Extraire la destination finale (où déposer le client)
    if (reservation.position_arrivee) {
      const arriveeCoords = this.extractCoordinates(reservation.position_arrivee);
      if (arriveeCoords) {
        finalDestination = `${arriveeCoords.lat},${arriveeCoords.lng}`;
      }
    }

    // Fallback sur le nom de destination
    if (!finalDestination) {
      finalDestination = encodeURIComponent(reservation.destination_nom);
    }

    if (!finalDestination) {
      return;
    }

    // Navigation directe depuis la position actuelle vers la destination finale
    const url = `https://www.google.com/maps/dir/?api=1&destination=${finalDestination}&travelmode=driving`;

    console.log('🗺️ Opening navigation from current location to final destination:', {
      finalDestination,
      url,
      reservationId: reservation.id
    });

    // Ouvrir dans l'app Google Maps ou navigateur
    window.open(url, '_system');
  }

  // Calculer la distance réelle entre conducteur et position de départ de la réservation
  private async calculateDistanceToReservation(positionDepart: string): Promise<string> {
    try {

      // Récupérer la position du conducteur connecté (mise à jour avant avec updateConducteurPositionOnce)
      const conducteurPosition = this.authService.getCurrentConducteurPosition();

      if (!conducteurPosition) {
        return 'Position manquante';
      }

      const conducteurCoords = this.extractCoordinates(conducteurPosition);
      if (!conducteurCoords) {
        return 'Position invalide';
      }

      // Extraire les coordonnées de position_depart de la réservation
      const departCoords = this.extractCoordinates(positionDepart);
      if (!departCoords) {
        return 'Destination invalide';
      }

      // Calculer la distance réelle (formule de Haversine)
      const distance = this.calculateDistance(
        conducteurCoords.lat,
        conducteurCoords.lng,
        departCoords.lat,
        departCoords.lng
      );

      return distance.toFixed(1); // Retourner distance en km avec 1 décimale
    } catch (error) {
      console.error('Error calculating distance to reservation:', error);
      return 'Erreur';
    }
  }

  // Calculer la durée entre position conducteur et réservation
  private async calculateDuration(positionDepart: string): Promise<string> {
    try {
      // Récupérer la position du conducteur connecté
      const conducteurPosition = this.authService.getCurrentConducteurPosition();

      let conducteurLat = 9.5092; // Position par défaut (Conakry centre)
      let conducteurLng = -13.7122;

      // Si le conducteur a une position enregistrée, l'utiliser
      if (conducteurPosition) {
        const conducteurCoords = this.extractCoordinates(conducteurPosition);
        if (conducteurCoords) {
          conducteurLat = conducteurCoords.lat;
          conducteurLng = conducteurCoords.lng;
        }
      }

      // Extraire les coordonnées de position_depart de la réservation
      const departCoords = this.extractCoordinates(positionDepart);
      if (!departCoords) {
        return 'Durée inconnue';
      }

      // Calculer la distance réelle (formule de Haversine)
      const distance = this.calculateDistance(conducteurLat, conducteurLng, departCoords.lat, departCoords.lng);
      const duration = Math.round(distance * 1.8); // ~1.8 min par km (33 km/h moyenne en ville)

      return `${duration} min (${distance.toFixed(1)} km)`;
    } catch (error) {
      console.error('Error calculating duration:', error);
      return 'Durée inconnue';
    }
  }

  // Extraire coordonnées depuis format POINT(lng lat) ou WKB
  private extractCoordinates(pointString: string): { lat: number, lng: number } | null {
    try {

      // Vérifier si pointString est undefined ou null
      if (!pointString) {
        return null;
      }

      // Format texte: POINT(2.5847236 48.6273519) - utilisé par les réservations
      if (pointString.startsWith('POINT(')) {
        const coords = pointString.replace('POINT(', '').replace(')', '').split(' ');
        const result = {
          lng: parseFloat(coords[0]),
          lat: parseFloat(coords[1])
        };
        return result;
      }

      // Format WKB (format binaire PostGIS) - utilisé par les conducteurs
      // Exemple: 0101000020E6100000BC96900F7AB604401C7C613255504840
      // Doit commencer par 0101000020E6100000 (POINT avec SRID 4326)
      if (pointString.length >= 50 &&
        pointString.match(/^[0-9A-F]+$/i) &&
        pointString.toUpperCase().startsWith('0101000020E6100000')) {
        return this.decodeWKB(pointString);
      }

      return null;
    } catch (error) {
      console.error('Error extracting coordinates:', error, 'from:', pointString);
      return null;
    }
  }

  // Décoder le format WKB (Well-Known Binary) de PostGIS
  private decodeWKB(wkbHex: string): { lat: number, lng: number } | null {
    try {

      // Format WKB PostGIS: 
      // - 1 byte: endian (01)
      // - 4 bytes: geometry type (01000020)
      // - 4 bytes: SRID (E6100000 = 4326)
      // - 8 bytes: X coordinate (longitude)
      // - 8 bytes: Y coordinate (latitude)

      if (wkbHex.length >= 50) { // Au minimum 25 bytes = 50 caractères hex
        // Vérifier que c'est bien un POINT avec SRID 4326
        const geometryType = wkbHex.substring(2, 10); // 01000020
        const srid = wkbHex.substring(10, 18); // E6100000


        if (geometryType.toUpperCase() === '01000020' && srid.toUpperCase() === 'E6100000') {
          // Extraire les coordonnées (little-endian)
          const xHex = wkbHex.substring(18, 34); // 8 bytes pour longitude
          const yHex = wkbHex.substring(34, 50); // 8 bytes pour latitude


          // Convertir de little-endian hex vers float64
          const lng = this.hexToFloat64LittleEndian(xHex);
          const lat = this.hexToFloat64LittleEndian(yHex);


          // Vérifier que les coordonnées sont valides
          if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
            return { lat, lng };
          } else {
          }
        } else {
        }
      }

      return null;
    } catch (error) {
      console.error('Error decoding WKB:', error);
      return null;
    }
  }

  // Convertir hex little-endian vers float64
  private hexToFloat64LittleEndian(hexStr: string): number {
    try {

      // Convertir hex vers ArrayBuffer directement (little-endian)
      const buffer = new ArrayBuffer(8);
      const view = new DataView(buffer);

      // Lire les bytes dans l'ordre little-endian
      for (let i = 0; i < 8; i++) {
        const byte = parseInt(hexStr.substr(i * 2, 2), 16);
        view.setUint8(i, byte);
      }

      // Lire comme float64 little-endian
      const result = view.getFloat64(0, true); // true = little-endian
      return result;
    } catch (error) {
      console.error('Error converting hex to float64:', error);
      return 0;
    }
  }

  // Calculer distance entre deux points GPS (formule de Haversine)
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Rayon de la Terre en km
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(value: number): number {
    return value * Math.PI / 180;
  }

  // Mettre à jour l'affichage de la position du conducteur
  private async updateConducteurPosition() {
    try {
      const conducteur = this.authService.getCurrentConducteur();

      const conducteurPositionData = this.authService.getCurrentConducteurPosition();

      if (conducteurPositionData && this.reservations.length > 0) {
        const conducteurCoords = this.extractCoordinates(conducteurPositionData);

        if (conducteurCoords) {
          // Calculer la distance moyenne vers toutes les réservations
          let totalDistance = 0;
          let validReservations = 0;

          for (let reservation of this.reservations) {
            const reservationCoords = this.extractCoordinates(reservation.position_depart);
            if (reservationCoords) {
              const distance = this.calculateDistance(
                conducteurCoords.lat,
                conducteurCoords.lng,
                reservationCoords.lat,
                reservationCoords.lng
              );
              totalDistance += distance;
              validReservations++;
            }
          }

          if (validReservations > 0) {
            const avgDistance = totalDistance / validReservations;
            const avgDuration = Math.round(avgDistance * 1.8); // ~1.8 min par km (33 km/h moyenne)
            this.conducteurPosition = `Vous êtes à ${avgDuration} mins en moyenne des réservations`;
          } else {
            this.conducteurPosition = 'Position disponible';
          }
        } else {
          this.conducteurPosition = 'Position non disponible';
        }
      } else if (this.reservations.length === 0) {
        this.conducteurPosition = 'Aucune réservation à proximité';
      } else {
        this.conducteurPosition = 'Position du conducteur non définie';
      }
    } catch (error) {
      console.error('Error updating conducteur position:', error);
      this.conducteurPosition = 'Erreur de localisation';
    }
  }

  // Gérer le changement de statut en ligne/hors ligne
  async onStatusToggle(event: any) {
    const isOnline = event.detail.checked;
    const conducteurId = this.authService.getCurrentConducteurId();


    if (!conducteurId) {
      this.presentToast('Erreur: Conducteur non connecté', 'danger');
      return;
    }

    const loading = await this.loadingController.create({
      message: isOnline ? 'Passage en ligne...' : 'Passage hors ligne...',
    });
    await loading.present();

    try {
      // Mettre à jour le statut dans la base de données
      const success = await this.supabaseService.updateConducteurStatus(
        conducteurId,
        !isOnline // hors_ligne = true si pas en ligne
      );

      if (success) {
        this.isOnline = isOnline;

        // ✅ IMPORTANT : Mettre à jour les données locales du conducteur EN PREMIER
        const conducteur = this.authService.getCurrentConducteur();
        if (conducteur) {
          conducteur.hors_ligne = !isOnline;
          conducteur.derniere_activite = new Date().toISOString();
          (this.authService as any).currentConducteurSubject.next(conducteur);
        }

        // Gérer le tracking GPS et le rafraîchissement automatique selon le statut
        if (isOnline) {
          // Passer en ligne : démarrer le tracking GPS et l'auto-refresh
          await this.geolocationService.startLocationTracking();

          // ✅ AJOUT : Force une mise à jour GPS immédiate pour garantir la position
          console.log('🔄 Force GPS update après passage en ligne...');
          await this.geolocationService.forceUpdateLocation();

          this.startAutoRefresh();

          // ✅ AJOUT : Recharger les réservations après passage en ligne
          console.log('🔄 Rechargement des réservations après passage en ligne...');
          await this.loadReservations();
        } else {
          // Passer hors ligne : arrêter le tracking GPS et l'auto-refresh
          this.geolocationService.stopLocationTracking();
          this.autoRefreshService.stopAutoRefresh();

          // ✅ AJOUT : Recharger les réservations après passage hors ligne (vider la liste)
          console.log('🔄 Rechargement des réservations après passage hors ligne...');
          await this.loadReservations();
        }

        // Afficher message de confirmation
        const statusText = isOnline ? 'en ligne' : 'hors ligne';
        this.presentToast(`Vous êtes maintenant ${statusText}`, 'success');

        // Si on passe hors ligne, arrêter le tracking GPS
        // Si on passe en ligne, le redémarrer
        if (!isOnline) {
        } else {
        }
      } else {
        // Rétablir l'état précédent en cas d'erreur
        this.isOnline = !isOnline;
        this.presentToast('Erreur lors de la mise à jour du statut', 'danger');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      // Rétablir l'état précédent
      this.isOnline = !isOnline;
      this.presentToast('Erreur lors de la mise à jour du statut', 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  // Démarrer le rafraîchissement automatique non-bloquant
  private startAutoRefresh() {
    console.log('🚀 Démarrage du rafraîchissement automatique (2 min)');

    // Définir le callback de rafraîchissement
    const refreshCallback = async () => {
      // Ne pas afficher de spinner lors du rafraîchissement automatique
      const originalIsLoading = this.isLoading;
      this.isLoading = false;

      try {
        console.log('🔄 Rafraîchissement automatique en cours...');

        // Charger les réservations sans bloquer l'interface
        const testMode = this.getTestMode();
        await Promise.all([
          this.supabaseService.getPendingReservations(undefined, testMode).then(res => {
            this.allReservations = res;
          }),
          this.loadScheduledReservations()
        ]);

        // Filtrer selon le segment actuel
        this.filterReservationsBySegment();

        // Calculer les durées pour chaque réservation (en parallèle)
        const durationPromises = this.reservations.map(async (reservation) => {
          reservation.duration = await this.calculateDuration(reservation.position_depart);
          reservation.calculatedDistance = await this.calculateDistanceToReservation(reservation.position_depart);
        });

        await Promise.all(durationPromises);

        // Forcer la mise à jour de l'affichage
        this.cdr.detectChanges();

        console.log('✅ Rafraîchissement automatique terminé');
        return true;

      } catch (error) {
        console.error('❌ Erreur rafraîchissement automatique:', error);
        throw error;
      } finally {
        // Restaurer l'état original du loading
        this.isLoading = originalIsLoading;
      }
    };

    // Démarrer le rafraîchissement automatique avec le service
    this.autoRefreshService.startAutoRefresh(refreshCallback, false);
  }

  // Obtenir le temps depuis le dernier rafraîchissement (avec cache)
  getTimeSinceLastRefresh(): string {
    return this._timeSinceLastRefresh;
  }

  // Obtenir le countdown pour le prochain rafraîchissement (avec cache)
  getNextRefreshCountdown(): number {
    return this._nextRefreshCountdown;
  }

  // Obtenir le pourcentage de progression du countdown (avec cache)
  getProgressPercentage(): number {
    return this._progressPercentage;
  }

  // Calculer et mettre en cache les valeurs
  private updateCountdownValues(): void {
    if (!this.refreshState?.lastRefreshTime) {
      this._nextRefreshCountdown = this.REFRESH_INTERVAL_SECONDS;
      this._progressPercentage = 0;
      this._timeSinceLastRefresh = 'jamais';
      return;
    }

    const now = new Date();
    const lastRefresh = this.refreshState.lastRefreshTime;
    const elapsedMs = now.getTime() - lastRefresh.getTime();
    const elapsedSeconds = Math.floor(elapsedMs / 1000);
    const remainingSeconds = Math.max(0, this.REFRESH_INTERVAL_SECONDS - elapsedSeconds);

    this._nextRefreshCountdown = remainingSeconds;

    const percentage = ((this.REFRESH_INTERVAL_SECONDS - remainingSeconds) / this.REFRESH_INTERVAL_SECONDS) * 100;
    this._progressPercentage = Math.min(100, Math.max(0, percentage));

    // Mettre en cache le timestamp aussi
    this._timeSinceLastRefresh = this.calculateTimeSinceLastRefresh(lastRefresh);
  }

  // Calculer le temps écoulé depuis le dernier refresh (méthode séparée)
  private calculateTimeSinceLastRefresh(lastRefresh: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - lastRefresh.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);

    if (diffSeconds < 5) return 'à l\'instant';
    if (diffSeconds < 60) return `il y a ${diffSeconds}s`;
    if (diffMinutes === 1) return 'il y a 1 minute';
    if (diffMinutes < 60) return `il y a ${diffMinutes} minutes`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours === 1) return 'il y a 1 heure';
    return `il y a ${diffHours} heures`;
  }

  // Démarrer la mise à jour du timestamp et countdown
  private startTimestampUpdates(): void {
    // Éviter les timers multiples
    this.stopTimestampUpdates();

    // Initialiser les valeurs une première fois
    this.updateCountdownValues();

    // Mettre à jour toutes les 5 secondes pour éviter l'erreur Angular
    this.timestampUpdateInterval = setInterval(() => {
      if (this.refreshState) {
        // Calculer les nouvelles valeurs en dehors du cycle de détection
        setTimeout(() => {
          this.updateCountdownValues();
          this.cdr.markForCheck();
        }, 0);
      }
    }, 5000); // 5 secondes pour éviter les erreurs Angular

    console.log('⏰ Countdown moderne démarré (5s)');
  }

  // Arrêter la mise à jour du timestamp
  private stopTimestampUpdates(): void {
    if (this.timestampUpdateInterval) {
      clearInterval(this.timestampUpdateInterval);
      this.timestampUpdateInterval = null;
      console.log('⏰ Mise à jour timestamp arrêtée');
    }
  }

  // Nettoyer les ressources à la destruction du composant
  ngOnDestroy() {
    console.log('🧹 Nettoyage du composant ReservationsPage');

    // Arrêter le rafraîchissement automatique
    this.autoRefreshService.stopAutoRefresh();

    // Arrêter la mise à jour du timestamp
    this.stopTimestampUpdates();

    // Désabonner de l'état du rafraîchissement
    if (this.refreshStateSubscription) {
      this.refreshStateSubscription.unsubscribe();
      this.refreshStateSubscription = null;
    }

    // Supprimer le listener resume
    this.removeResumeListener();

    // Nettoyer les données pour libérer la mémoire
    this.reservations = [];
    this.allReservations = [];
    this.scheduledReservations = [];
    this.refreshState = null;
  }

  // 🧪 TEST: Listener de déverrouillage désactivé pour éliminer le délai
  private async setupResumeListener() {
    console.log('🧪 setupResumeListener désactivé - pas de sync au déverrouillage');
    /*
    // Supprimer listener existant si présent
    this.removeResumeListener();
    
    // Désactiver sur web (Vercel) - fonctionne seulement sur mobile
    if (Capacitor.getPlatform() === 'web') {
      return;
    }
    
    try {
      this.resumeListener = await App.addListener('appStateChange', async (state) => {
        
        if (state.isActive) {
          await this.handleAppResume();
        }
      });
    } catch (error) {
    }
    */
  }

  // Supprimer le listener resume
  private removeResumeListener() {
    if (this.resumeListener) {
      this.resumeListener.remove();
      this.resumeListener = null;
    }
  }

  // Activer la position GPS automatiquement (pour l'alerte)
  async activatePosition() {
    if (this.isOnline) {
      // Déjà en ligne, juste forcer une mise à jour GPS
      console.log('🔄 Conducteur déjà en ligne - Force GPS update...');
      await this.geolocationService.forceUpdateLocation();
      this.showPositionAlert = false;
      this.presentToast('Position GPS mise à jour', 'success');
    } else {
      // Passer automatiquement en ligne
      console.log('🚀 Activation automatique du mode en ligne...');

      // Simuler un toggle pour passer en ligne
      const mockEvent = {
        detail: { checked: true }
      };

      await this.onStatusToggle(mockEvent);

      // Masquer l'alerte après activation
      this.showPositionAlert = false;
    }
  }

  // Gérer le déverrouillage de l'app
  private async handleAppResume() {

    try {
      // D'abord synchroniser le statut depuis la base de données
      await this.syncConducteurStatus();

      // Vérifier si le conducteur est en ligne après synchronisation
      if (!this.isOnline) {

        // Même hors ligne, actualiser les réservations pour info
        await this.refreshReservationsOnResume();
        return;
      }


      // 1. Mettre à jour la position du conducteur en base (seulement si en ligne)
      await this.updateConducteurPositionOnResume();

      // 2. Actualiser la liste des réservations
      await this.refreshReservationsOnResume();

    } catch (error) {
    }
  }

  // Mettre à jour la position GPS au déverrouillage (seulement si en ligne)
  private async updateConducteurPositionOnResume() {
    try {
      // Double vérification : conducteur doit être EN LIGNE
      if (!this.isOnline) {
        return;
      }

      const { Geolocation } = await import('@capacitor/geolocation');
      const conducteurId = this.authService.getCurrentConducteurId();

      if (!conducteurId) {
        return;
      }


      // Vérifier les permissions GPS
      let permissions = await Geolocation.checkPermissions();
      if (permissions.location !== 'granted') {
        permissions = await Geolocation.requestPermissions();
        if (permissions.location !== 'granted') {
          return;
        }
      }

      // Obtenir position GPS rapide
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000
      });

      const longitude = position.coords.longitude;
      const latitude = position.coords.latitude;
      const accuracy = position.coords.accuracy;


      // Mettre à jour en base de données
      const success = await this.supabaseService.updateConducteurPosition(
        conducteurId,
        longitude,
        latitude,
        accuracy
      );

      if (success) {
      } else {
      }
    } catch (error) {
    }
  }

  // Actualiser les réservations au déverrouillage
  private async refreshReservationsOnResume() {
    try {

      // Actualisation silencieuse (pas de loader)
      const originalIsLoading = this.isLoading;
      this.isLoading = false;

      await this.loadReservations();

      this.isLoading = originalIsLoading;
    } catch (error) {
    }
  }

  // Appeler un client
  callClient(phoneNumber: string): void {
    this.callService.callPhoneNumber(phoneNumber);
  }

}