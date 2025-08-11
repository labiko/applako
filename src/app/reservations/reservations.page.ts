import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
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
  IonToggle,
  IonBadge,
  IonSegment,
  IonSegmentButton,
  ToastController,
  LoadingController,
  AlertController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { location, time, person, call, checkmark, close, car, resize, card, carSportOutline, openOutline, timeOutline, checkmarkCircle, closeCircle, flag, calendar } from 'ionicons/icons';
import { SupabaseService } from '../services/supabase.service';
import { AuthService } from '../services/auth.service';
import { GeolocationService } from '../services/geolocation.service';
import { OneSignalService } from '../services/onesignal.service';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
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
  
  // Système d'actualisation automatique optimisé
  private refreshInterval: any = null;
  private readonly REFRESH_INTERVAL_MS = 120000; // 2 minutes (économie batterie)
  private lastRefreshTime: number = 0;
  private isRefreshing: boolean = false;
  
  // Listener pour événement resume
  private resumeListener: any = null;

  constructor(
    private supabaseService: SupabaseService,
    private authService: AuthService,
    private geolocationService: GeolocationService,
    private oneSignalService: OneSignalService,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private alertController: AlertController,
    private cdr: ChangeDetectorRef
  ) {
    addIcons({ location, time, person, call, checkmark, close, car, resize, card, carSportOutline, openOutline, timeOutline, checkmarkCircle, closeCircle, flag, calendar });
  }

  ngOnInit() {
    // Initialiser le statut en ligne basé sur les données du conducteur
    const conducteur = this.authService.getCurrentConducteur();
    if (conducteur) {
      console.log('🔍 Conducteur actuel:', { 
        id: conducteur.id, 
        hors_ligne: conducteur.hors_ligne, 
        hors_ligne_type: typeof conducteur.hors_ligne,
        isOnlineCalculated: !conducteur.hors_ligne 
      });
      
      // Si hors_ligne n'est pas défini, considérer comme en ligne par défaut
      const horsLigne = conducteur.hors_ligne ?? false;
      this.isOnline = !horsLigne;
      
      console.log('📊 État initial calculé:', { horsLigne, isOnline: this.isOnline });
    } else {
      console.log('❌ Aucun conducteur connecté');
    }
  }


   async ionViewWillEnter() {
     // Synchroniser l'état hors_ligne avec la base de données
     await this.syncConducteurStatus();
     
     // Mettre à jour la position du conducteur
    // await this.updateConducteurPositionOnce();
     
     // Charger les réservations
     this.loadReservations();
     
     // Démarrer l'actualisation automatique
     this.startAutoRefresh();
     
     // Configurer le listener resume
     this.setupResumeListener();
     
     // ✅ NOUVEAU : Activer la réception des notifications OneSignal et enregistrer callback
     this.oneSignalService.enableReservationsNotifications();
     this.oneSignalService.setReservationsCallback(this.refreshReservationsFromNotification.bind(this));
  }

  ionViewWillLeave() {
    // Arrêter l'actualisation automatique quand on quitte la page
    this.stopAutoRefresh();
    
    // Supprimer le listener resume
    this.removeResumeListener();
    
    // ✅ NOUVEAU : Désactiver la réception des notifications OneSignal
    this.oneSignalService.disableReservationsNotifications();
  }

  // Synchroniser l'état du conducteur avec la base de données
  async syncConducteurStatus() {
    const conducteurId = this.authService.getCurrentConducteurId();
    if (!conducteurId) return;

    try {
      const status = await this.supabaseService.getConducteurStatus(conducteurId);
      if (status) {
        console.log('🔄 Synchronisation statut depuis la base:', status);
        this.isOnline = !status.hors_ligne;
        
        // Mettre à jour les données locales
        const conducteur = this.authService.getCurrentConducteur();
        if (conducteur) {
          conducteur.hors_ligne = status.hors_ligne;
          conducteur.derniere_activite = status.derniere_activite;
          (this.authService as any).currentConducteurSubject.next(conducteur);
        }
        
        console.log('📊 État synchronisé:', { 
          hors_ligne: status.hors_ligne, 
          isOnline: this.isOnline 
        });
      }
    } catch (error) {
      console.error('Erreur lors de la synchronisation du statut:', error);
    }
  }

  // Mettre à jour la position une seule fois avec optimisation
  private async updateConducteurPositionOnce() {
    try {
      const { Geolocation } = await import('@capacitor/geolocation');
      const { Capacitor } = await import('@capacitor/core');
      
      // Désactiver sur web (Vercel) - fonctionne seulement sur mobile
      if (Capacitor.getPlatform() === 'web') {
        console.log('GPS disabled on web - mobile only feature');
        return;
      }
      
      const conducteurId = this.authService.getCurrentConducteurId();
      
      if (!conducteurId) {
        console.log('Pas de conducteur connecté');
        return;
      }

      // Vérifier les permissions
      const permissions = await Geolocation.checkPermissions();
      if (permissions.location !== 'granted') {
        const requestResult = await Geolocation.requestPermissions();
        if (requestResult.location !== 'granted') {
          console.warn('Permission de géolocalisation refusée');
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
      
      console.log(`Position actuelle: ${latitude}, ${longitude} (précision: ${accuracy}m)`);

      // Mettre à jour dans la base de données
      const success = await this.supabaseService.updateConducteurPosition(
        conducteurId,
        longitude,
        latitude,
        accuracy
      );

      if (success) {
        console.log('Position mise à jour avec succès');
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
        console.log(`Position attempt ${attempt}/${maxRetries}`);
        
        const config = {
          enableHighAccuracy: true,
          timeout: attempt === 1 ? 12000 : 18000, // Timeouts plus courts pour l'UI
          maximumAge: attempt === 1 ? 0 : 60000
        };

        const position = await Geolocation.getCurrentPosition(config);
        const accuracy = position.coords.accuracy;

        console.log(`Attempt ${attempt}: accuracy ${accuracy}m`);

        if (accuracy < bestAccuracy) {
          bestPosition = position;
          bestAccuracy = accuracy;
        }

        // Si c'est assez précis, on s'arrête
        if (accuracy <= desiredAccuracy) {
          console.log(`Good accuracy achieved: ${accuracy}m`);
          break;
        }

        // Pause courte entre les tentatives
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (error) {
        console.warn(`Position attempt ${attempt} failed:`, error);
        
        // Fallback final
        if (attempt === maxRetries && !bestPosition) {
          try {
            console.log('Fallback to network location');
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
      console.log(`Best position: accuracy ${bestPosition.coords.accuracy}m`);
    }

    return bestPosition;
  }

  async loadReservations() {
    this.isLoading = true;
    try {
      // Charger les nouvelles réservations (pending et scheduled non assignées)
      this.allReservations = await this.supabaseService.getPendingReservations();
      
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
        console.warn('❌ Aucun conducteur connecté');
        this.scheduledReservations = [];
      }
    } catch (error) {
      console.error('Error loading scheduled reservations:', error);
      this.scheduledReservations = [];
    }
  }

  // Gestionnaire changement de segment
  onSegmentChange(event: any) {
    console.log('Segment event:', event);
    console.log('Event detail:', event.detail);
    const newValue = event.detail?.value || event.target?.value;
    console.log('Segment changed to:', newValue);
    
    if (newValue) {
      this.selectedSegment = newValue;
      this.filterReservationsBySegment();
    }
  }

  // Filtrer les réservations selon le segment sélectionné
  private filterReservationsBySegment() {
    console.log('🎯 Filtrage segment:', this.selectedSegment);
    console.log('📊 Nouvelles réservations:', this.allReservations.length);
    console.log('📅 Réservations planifiées:', this.scheduledReservations.length);
    
    if (this.selectedSegment === 'nouvelles') {
      this.reservations = this.allReservations;
      console.log('✅ Affichage nouvelles réservations:', this.reservations.length);
    } else if (this.selectedSegment === 'planifiees') {
      this.reservations = this.scheduledReservations;
      console.log('✅ Affichage réservations planifiées:', this.reservations.length);
    }
  }

  async handleRefresh(event: any) {
    await this.loadReservations();
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
        return;
      }

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
    
    console.log('🗺️ Opening navigation from current location to pickup client:', { 
      destination, 
      url,
      reservationId: reservation.id 
    });
    
    // Ouvrir dans l'app Google Maps ou navigateur
    window.open(url, '_system');
  }

  // Ouvrir Google Maps pour la destination finale (même logique que départ)
  openGoogleMapsDestination(reservation: Reservation) {
    console.log('🏁 DEBUG openGoogleMapsDestination - Réservation:', reservation.id);
    console.log('🏁 position_arrivee (brut):', reservation.position_arrivee);
    console.log('🏁 destination_nom:', reservation.destination_nom);
    console.log('🏁 Type de position_arrivee:', typeof reservation.position_arrivee);
    
    let destination = '';
    
    // Extraire la position d'arrivée (destination finale)
    if (reservation.position_arrivee) {
      console.log('🔍 Extraction coordonnées position_arrivee...');
      const arriveeCoords = this.extractCoordinates(reservation.position_arrivee);
      console.log('📊 Coordonnées extraites position_arrivee:', arriveeCoords);
      
      if (arriveeCoords) {
        destination = `${arriveeCoords.lat},${arriveeCoords.lng}`;
        console.log('✅ Destination avec coordonnées:', destination);
      } else {
        // Fallback sur le nom de la position d'arrivée
        destination = encodeURIComponent(reservation.position_arrivee);
        console.log('⚠️ Fallback position_arrivee comme texte:', destination);
      }
    }
    
    // Fallback ultime sur le nom de destination
    if (!destination) {
      destination = encodeURIComponent(reservation.destination_nom || 'Destination');
      console.log('❌ Fallback destination_nom:', destination);
    }
    
    // Navigation directe depuis la position actuelle vers la destination finale
    // Google Maps utilisera automatiquement la position GPS actuelle comme point de départ
    const url = `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`;
    
    console.log('🗺️ URL finale Google Maps destination:', url);
    console.log('🚀 Ouverture navigation vers destination finale');
    
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
      console.warn('No final destination available for reservation:', reservation.id);
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
      console.log('=== Calculating distance ===');
      console.log('Position départ réservation:', positionDepart);
      
      // Récupérer la position du conducteur connecté (mise à jour avant avec updateConducteurPositionOnce)
      const conducteurPosition = this.authService.getCurrentConducteurPosition();
      console.log('Position conducteur:', conducteurPosition);
      
      if (!conducteurPosition) {
        console.warn('Pas de position conducteur disponible');
        return 'Position manquante';
      }
      
      const conducteurCoords = this.extractCoordinates(conducteurPosition);
      console.log('Coordonnées conducteur décodées:', conducteurCoords);
      if (!conducteurCoords) {
        return 'Position invalide';
      }
      
      // Extraire les coordonnées de position_depart de la réservation
      const departCoords = this.extractCoordinates(positionDepart);
      console.log('Coordonnées départ décodées:', departCoords);
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
      
      console.log('Distance calculée:', distance, 'km');
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
      
      console.log("calculateDuration - conductor position:", conducteurPosition);
      console.log("calculateDuration - reservation position_depart:", positionDepart);
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
  private extractCoordinates(pointString: string): {lat: number, lng: number} | null {
    try {
      console.log('🔍 DEBUG extractCoordinates - Input:', pointString);
      console.log('🔍 Type:', typeof pointString);
      console.log('🔍 Length:', pointString?.length);
      
      // Vérifier si pointString est undefined ou null
      if (!pointString) {
        console.log('❌ pointString est null/undefined');
        return null;
      }
      
      // Format texte: POINT(2.5847236 48.6273519) - utilisé par les réservations
      if (pointString.startsWith('POINT(')) {
        console.log('✅ Format POINT détecté');
        const coords = pointString.replace('POINT(', '').replace(')', '').split(' ');
        console.log('📊 Coordonnées brutes extraites:', coords);
        const result = {
          lng: parseFloat(coords[0]),
          lat: parseFloat(coords[1])
        };
        console.log('✅ POINT coordinates extraites:', result);
        return result;
      }
      
      // Format WKB (format binaire PostGIS) - utilisé par les conducteurs
      // Exemple: 0101000020E6100000BC96900F7AB604401C7C613255504840
      // Doit commencer par 0101000020E6100000 (POINT avec SRID 4326)
      if (pointString.length >= 50 && 
          pointString.match(/^[0-9A-F]+$/i) && 
          pointString.toUpperCase().startsWith('0101000020E6100000')) {
        console.log('✅ Format WKB détecté');
        const result = this.decodeWKB(pointString);
        console.log('✅ WKB coordinates extraites:', result);
        return result;
      }
      
      console.warn('❌ Format de coordonnées inconnu:', pointString);
      console.warn('❌ Longueur:', pointString.length);
      console.warn('❌ Débute par WKB?', pointString.toUpperCase().startsWith('0101000020E6100000'));
      return null;
    } catch (error) {
      console.error('Error extracting coordinates:', error, 'from:', pointString);
      return null;
    }
  }

  // Décoder le format WKB (Well-Known Binary) de PostGIS
  private decodeWKB(wkbHex: string): {lat: number, lng: number} | null {
    try {
      console.log('Decoding WKB:', wkbHex);
      
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
        
        console.log('Geometry type:', geometryType);
        console.log('SRID:', srid);
        
        if (geometryType.toUpperCase() === '01000020' && srid.toUpperCase() === 'E6100000') {
          // Extraire les coordonnées (little-endian)
          const xHex = wkbHex.substring(18, 34); // 8 bytes pour longitude
          const yHex = wkbHex.substring(34, 50); // 8 bytes pour latitude
          
          console.log('X hex:', xHex);
          console.log('Y hex:', yHex);
          
          // Convertir de little-endian hex vers float64
          const lng = this.hexToFloat64LittleEndian(xHex);
          const lat = this.hexToFloat64LittleEndian(yHex);
          
          console.log('Decoded coordinates:', { lat, lng });
          
          // Vérifier que les coordonnées sont valides
          if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
            return { lat, lng };
          } else {
            console.warn('Invalid coordinates range:', { lat, lng });
          }
        } else {
          console.warn('Not a POINT geometry or wrong SRID');
        }
      }
      
      console.warn('Format WKB non supporté:', wkbHex);
      return null;
    } catch (error) {
      console.error('Error decoding WKB:', error);
      return null;
    }
  }

  // Convertir hex little-endian vers float64
  private hexToFloat64LittleEndian(hexStr: string): number {
    try {
      console.log('Converting hex to float64:', hexStr);
      
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
      console.log('Converted result:', result);
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
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private toRad(value: number): number {
    return value * Math.PI / 180;
  }

  // Mettre à jour l'affichage de la position du conducteur
  private async updateConducteurPosition() {
    try {
      const conducteur = this.authService.getCurrentConducteur();
      console.log("Conducteur complet:", conducteur);
      
      const conducteurPositionData = this.authService.getCurrentConducteurPosition();
      console.log("Position du conducteur:", conducteurPositionData);
      
      if (conducteurPositionData && this.reservations.length > 0) {
        const conducteurCoords = this.extractCoordinates(conducteurPositionData);
        
        if (conducteurCoords) {
          console.log("Coordonnées conducteur décodées:", conducteurCoords);
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
            console.log("Position calculée:", this.conducteurPosition);
          } else {
            this.conducteurPosition = 'Position disponible';
            console.log("Aucune réservation valide pour calcul");
          }
        } else {
          this.conducteurPosition = 'Position non disponible';
        }
      } else if (this.reservations.length === 0) {
        this.conducteurPosition = 'Aucune réservation à proximité';
        console.log("Aucune réservation trouvée");
      } else {
        this.conducteurPosition = 'Position du conducteur non définie';
        console.log("Position conducteur non définie");
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
    
    console.log('🔄 Toggle status:', { 
      isOnline, 
      willSetHorsLigne: !isOnline,
      currentIsOnline: this.isOnline
    });
    
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
        
        // ✅ NOUVEAU : Mettre à jour le statut OneSignal (appel simple)
        this.oneSignalService.updateConducteurOnlineStatus(isOnline);
        
        // Gérer le tracking GPS selon le statut
        if (isOnline) {
          // Passer en ligne : démarrer le tracking GPS
          console.log('✅ Passage en ligne - Démarrage du tracking GPS');
          
          await this.geolocationService.startLocationTracking();
        } else {
          // Passer hors ligne : arrêter le tracking GPS
          console.log('⏸️ Passage hors ligne - Arrêt du tracking GPS');
          
          this.geolocationService.stopLocationTracking();
        }
        
        // Mettre à jour les données locales du conducteur
        const conducteur = this.authService.getCurrentConducteur();
        if (conducteur) {
          console.log('📝 Mise à jour données locales:', { 
            avant: conducteur.hors_ligne, 
            après: !isOnline 
          });
          conducteur.hors_ligne = !isOnline;
          conducteur.derniere_activite = new Date().toISOString();
          (this.authService as any).currentConducteurSubject.next(conducteur);
        }

        // Afficher message de confirmation
        const statusText = isOnline ? 'en ligne' : 'hors ligne';
        this.presentToast(`Vous êtes maintenant ${statusText}`, 'success');
        
        // Si on passe hors ligne, arrêter le tracking GPS
        // Si on passe en ligne, le redémarrer
        if (!isOnline) {
          console.log('Statut hors ligne: arrêt du tracking GPS');
        } else {
          console.log('Statut en ligne: activation du tracking GPS');
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

  // NOUVEAU : Système d'actualisation automatique optimisé
  private startAutoRefresh() {
    // Arrêter l'actualisation existante si elle existe
    this.stopAutoRefresh();
    
    console.log(`🔄 Démarrage actualisation automatique réservations (toutes les ${this.REFRESH_INTERVAL_MS/60000} min)`);
    
    this.refreshInterval = setInterval(async () => {
      await this.performOptimizedRefresh();
    }, this.REFRESH_INTERVAL_MS);
  }

  private async performOptimizedRefresh() {
    // Éviter les fuites mémoire et les appels multiples
    if (this.isRefreshing) {
      console.log('⏭️ Actualisation déjà en cours, ignoré');
      return;
    }

    // Actualiser seulement si le conducteur est EN LIGNE
    if (!this.isOnline) {
      console.log('⏸️ Conducteur HORS LIGNE - Actualisation automatique suspendue');
      return;
    }

    // Vérifier si on n'a pas actualisé trop récemment (protection double)
    const now = Date.now();
    if (now - this.lastRefreshTime < this.REFRESH_INTERVAL_MS - 5000) {
      console.log('⏭️ Actualisation trop récente, ignoré');
      return;
    }

    this.isRefreshing = true;
    this.lastRefreshTime = now;
    
    try {
      console.log('🔄 Actualisation automatique des réservations...');
      
      // Actualisation silencieuse (sans loader visuel)
      const originalIsLoading = this.isLoading;
      this.isLoading = false; // Éviter le spinner lors de l'actualisation auto
      
      await this.loadReservations();
      
      console.log('✅ Actualisation automatique terminée');
    } catch (error) {
      console.error('❌ Erreur actualisation automatique:', error);
      
      // En cas d'erreur répétée, réduire la fréquence
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
        console.log('🐌 Erreur réseau - Actualisation ralentie temporairement');
        this.temporarySlowRefresh();
      }
    } finally {
      this.isRefreshing = false;
    }
  }

  // Ralentir temporairement en cas d'erreurs réseau
  private temporarySlowRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      
      // Ralentir à 5 minutes temporairement
      console.log('🐌 Passage en mode actualisation lente (5 min)');
      this.refreshInterval = setInterval(async () => {
        await this.performOptimizedRefresh();
        
        // Reprendre le rythme normal après 15 minutes
        setTimeout(() => {
          if (this.refreshInterval) {
            console.log('🚀 Retour au rythme normal (2 min)');
            this.startAutoRefresh();
          }
        }, 15 * 60 * 1000); // 15 minutes
        
      }, 5 * 60 * 1000); // 5 minutes
    }
  }

  private stopAutoRefresh() {
    if (this.refreshInterval) {
      console.log('⏹️ Arrêt actualisation automatique réservations');
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
    
    // Nettoyer les variables de contrôle
    this.isRefreshing = false;
    this.lastRefreshTime = 0;
  }

  // Nettoyer les ressources à la destruction du composant
  ngOnDestroy() {
    console.log('🧹 Nettoyage composant réservations...');
    this.stopAutoRefresh();
    this.removeResumeListener();
    
    // Nettoyer les données pour libérer la mémoire
    this.reservations = [];
  }

  // NOUVEAU : Configurer le listener pour l'événement resume (déverrouillage téléphone)
  private async setupResumeListener() {
    // Supprimer listener existant si présent
    this.removeResumeListener();
    
    // Désactiver sur web (Vercel) - fonctionne seulement sur mobile
    if (Capacitor.getPlatform() === 'web') {
      console.log('📱 Resume listener disabled on web - mobile only feature');
      return;
    }
    
    try {
      console.log('📱 Configuration du listener resume (déverrouillage)');
      this.resumeListener = await App.addListener('appStateChange', async (state) => {
        console.log('📱 App state change:', state);
        
        if (state.isActive) {
          console.log('📱 App resumed (téléphone déverrouillé)');
          await this.handleAppResume();
        }
      });
    } catch (error) {
      console.error('❌ Erreur configuration resume listener:', error);
    }
  }

  // Supprimer le listener resume
  private removeResumeListener() {
    if (this.resumeListener) {
      console.log('🧹 Suppression resume listener');
      this.resumeListener.remove();
      this.resumeListener = null;
    }
  }

  // Gérer le déverrouillage de l'app
  private async handleAppResume() {
    console.log('🔄 Traitement déverrouillage app...');
    
    try {
      // D'abord synchroniser le statut depuis la base de données
      await this.syncConducteurStatus();
      
      // Vérifier si le conducteur est en ligne après synchronisation
      if (!this.isOnline) {
        console.log('⏸️ Conducteur HORS LIGNE - Actualisation réservations uniquement');
        
        // Même hors ligne, actualiser les réservations pour info
        await this.refreshReservationsOnResume();
        return;
      }
      
      console.log('📍 Conducteur EN LIGNE - Actualisation complète (position + réservations)');
      
      // 1. Mettre à jour la position du conducteur en base (seulement si en ligne)
      await this.updateConducteurPositionOnResume();
      
      // 2. Actualiser la liste des réservations
      await this.refreshReservationsOnResume();
      
      console.log('✅ Actualisation au déverrouillage terminée');
    } catch (error) {
      console.error('❌ Erreur lors de l\'actualisation au déverrouillage:', error);
    }
  }

  // Mettre à jour la position GPS au déverrouillage (seulement si en ligne)
  private async updateConducteurPositionOnResume() {
    try {
      // Double vérification : conducteur doit être EN LIGNE
      if (!this.isOnline) {
        console.log('⏸️ Conducteur HORS LIGNE - Pas de mise à jour position GPS');
        return;
      }

      const { Geolocation } = await import('@capacitor/geolocation');
      const conducteurId = this.authService.getCurrentConducteurId();
      
      if (!conducteurId) {
        console.log('❌ Pas de conducteur connecté pour mise à jour position');
        return;
      }

      console.log('📍 Conducteur EN LIGNE - Mise à jour position GPS au déverrouillage...');

      // Vérifier les permissions GPS
      let permissions = await Geolocation.checkPermissions();
      if (permissions.location !== 'granted') {
        console.log('🔒 Permissions GPS requises');
        permissions = await Geolocation.requestPermissions();
        if (permissions.location !== 'granted') {
          console.warn('❌ Permission GPS refusée');
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
      
      console.log(`📍 Position déverrouillage: ${latitude}, ${longitude} (${accuracy}m)`);

      // Mettre à jour en base de données
      const success = await this.supabaseService.updateConducteurPosition(
        conducteurId,
        longitude,
        latitude,
        accuracy
      );

      if (success) {
        console.log('✅ Position mise à jour au déverrouillage');
      } else {
        console.warn('⚠️ Échec mise à jour position');
      }
    } catch (error) {
      console.error('❌ Erreur mise à jour position déverrouillage:', error);
    }
  }

  // Actualiser les réservations au déverrouillage
  private async refreshReservationsOnResume() {
    try {
      console.log('🔄 Actualisation réservations au déverrouillage...');
      
      // Actualisation silencieuse (pas de loader)
      const originalIsLoading = this.isLoading;
      this.isLoading = false;
      
      await this.loadReservations();
      
      this.isLoading = originalIsLoading;
      console.log('✅ Réservations actualisées au déverrouillage');
    } catch (error) {
      console.error('❌ Erreur actualisation réservations déverrouillage:', error);
    }
  }

  // ✅ NOUVEAU : Callback simple pour actualisation déclenché par OneSignal
  async refreshReservationsFromNotification(): Promise<void> {
    console.log('🔔 OneSignal : Actualisation réservations demandée');
    
    try {
      // Actualisation silencieuse (pas de loader)
      const originalIsLoading = this.isLoading;
      this.isLoading = false;
      
      await this.loadReservations();
      
      this.isLoading = originalIsLoading;
      
      // Afficher toast informatif
      this.presentToast('🔔 Nouvelles réservations disponibles', 'success');
      
      console.log('✅ Actualisation OneSignal terminée');
    } catch (error) {
      console.error('❌ Erreur actualisation OneSignal:', error);
    }
  }

}