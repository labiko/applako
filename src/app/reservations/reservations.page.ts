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
  IonToggle,
  ToastController,
  LoadingController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { location, time, person, call, checkmark, close, car, resize, card, carSportOutline, openOutline, timeOutline, checkmarkCircle, closeCircle } from 'ionicons/icons';
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
    IonToggle,
    CommonModule,
    FormsModule,
  ],
})
export class ReservationsPage implements OnInit {
  reservations: Reservation[] = [];
  isLoading = true;
  conducteurPosition: string = 'Chargement de la position...';
  isOnline: boolean = true; // Statut en ligne par défaut

  constructor(
    private supabaseService: SupabaseService,
    private authService: AuthService,
    private toastController: ToastController,
    private loadingController: LoadingController
  ) {
    addIcons({ location, time, person, call, checkmark, close, car, resize, card, carSportOutline, openOutline, timeOutline, checkmarkCircle, closeCircle });
  }

  ngOnInit() {
    // Initialiser le statut en ligne basé sur les données du conducteur
    const conducteur = this.authService.getCurrentConducteur();
    if (conducteur) {
      this.isOnline = !conducteur.hors_ligne; // Inverser car hors_ligne = false signifie en ligne
    }
  }


   async ionViewWillEnter() {
     // Mettre à jour la position du conducteur
     await this.updateConducteurPositionOnce();
     
     // Charger les réservations
     this.loadReservations();
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
      // Get reservations that are pending and not assigned to any driver
      this.reservations = await this.supabaseService.getPendingReservations();
      console.log("Réservations chargées:", this.reservations);
      
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

  formatPrice(price?: number): string {
    if (!price) return '0';
    return price.toLocaleString('fr-FR');
  }

  // Ouvrir Google Maps avec la destination
  openGoogleMaps(reservation: Reservation) {
    // Extraire les coordonnées de position_arrivee si disponible
    let url = '';
    
    if (reservation.position_arrivee) {
      const coords = this.extractCoordinates(reservation.position_arrivee);
      if (coords) {
        url = `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`;
      }
    }
    
    // Fallback sur le nom de destination
    if (!url) {
      const destination = encodeURIComponent(reservation.destination_nom);
      url = `https://www.google.com/maps/search/?api=1&query=${destination}`;
    }
    
    // Ouvrir dans un nouvel onglet/app
    window.open(url, '_blank');
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
      console.log('Extracting coordinates from:', pointString);
      
      // Format texte: POINT(2.5847236 48.6273519) - utilisé par les réservations
      if (pointString.startsWith('POINT(')) {
        const coords = pointString.replace('POINT(', '').replace(')', '').split(' ');
        const result = {
          lng: parseFloat(coords[0]),
          lat: parseFloat(coords[1])
        };
        console.log('Extracted POINT coordinates:', result);
        return result;
      }
      
      // Format WKB (format binaire PostGIS) - utilisé par les conducteurs
      // Exemple: 0101000020E6100000BC96900F7AB604401C7C613255504840
      // Doit commencer par 0101000020E6100000 (POINT avec SRID 4326)
      if (pointString.length >= 50 && 
          pointString.match(/^[0-9A-F]+$/i) && 
          pointString.toUpperCase().startsWith('0101000020E6100000')) {
        const result = this.decodeWKB(pointString);
        console.log('Extracted WKB coordinates:', result);
        return result;
      }
      
      console.warn('Unknown coordinate format:', pointString);
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
        
        // Mettre à jour les données locales du conducteur
        const conducteur = this.authService.getCurrentConducteur();
        if (conducteur) {
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
}