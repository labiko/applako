import { Injectable } from '@angular/core';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class GeolocationService {
  private locationInterval: any = null;
  private isTracking = false;

  constructor(
    private supabaseService: SupabaseService,
    private authService: AuthService
  ) {}

  // Démarrer le tracking de position
  async startLocationTracking() {
    if (this.isTracking) {
      console.log('Location tracking already active');
      return;
    }

    // Désactiver sur web (Vercel) - fonctionne seulement sur mobile
    if (Capacitor.getPlatform() === 'web') {
      console.log('GPS tracking disabled on web - mobile only feature');
      return;
    }

    try {
      // Demander les permissions
      const permissions = await Geolocation.requestPermissions();
      if (permissions.location !== 'granted') {
        console.error('Location permission denied');
        return;
      }

      this.isTracking = true;
      
      // Mise à jour immédiate
      await this.updateLocation();
      
      // Mise à jour toutes les 5 minutes (300000 ms)
      this.locationInterval = setInterval(async () => {
        if (this.isTracking) {
          await this.updateLocation();
        }
      }, 300000); // 5 minutes

      console.log('Location tracking started');
    } catch (error) {
      console.error('Error starting location tracking:', error);
      this.isTracking = false;
    }
  }

  // Arrêter le tracking
  stopLocationTracking() {
    if (this.locationInterval) {
      clearInterval(this.locationInterval);
      this.locationInterval = null;
    }
    this.isTracking = false;
    console.log('Location tracking stopped');
  }

  // Mettre à jour la position une fois
  private async updateLocation() {
    try {
      const conducteurId = this.authService.getCurrentConducteurId();
      const conducteur = this.authService.getCurrentConducteur();
      
      if (!conducteurId) {
        console.warn('No conductor logged in, skipping location update');
        return;
      }

      // Vérifier si le conducteur est hors ligne
      if (conducteur?.hors_ligne) {
        console.log('Conductor is offline, skipping location update');
        return;
      }

      // Obtenir la meilleure position possible
      const position = await this.getBestPosition();
      
      if (!position) {
        console.error('Failed to get position');
        return;
      }

      const longitude = position.coords.longitude;
      const latitude = position.coords.latitude;
      const accuracy = position.coords.accuracy;

      console.log(`Updating position: ${latitude}, ${longitude} (accuracy: ${accuracy}m)`);

      // Mettre à jour dans la base de données
      const success = await this.supabaseService.updateConducteurPosition(
        conducteurId,
        longitude,
        latitude,
        accuracy
      );

      if (success) {
        console.log('Position updated successfully');
        
        // Mettre à jour aussi la position dans le service auth local
        const conducteur = this.authService.getCurrentConducteur();
        if (conducteur) {
          conducteur.position_actuelle = this.createWKBPoint(longitude, latitude);
          // Rafraîchir les données locales
          (this.authService as any).currentConducteurSubject.next(conducteur);
        }
      } else {
        console.error('Failed to update position in database');
      }
    } catch (error) {
      console.error('Error updating location:', error);
    }
  }

  // Obtenir la meilleure position possible avec plusieurs tentatives
  private async getBestPosition(): Promise<any> {
    const maxRetries = 3;
    const desiredAccuracy = 50; // Précision souhaitée en mètres
    let bestPosition: any = null;
    let bestAccuracy = Infinity;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Position attempt ${attempt}/${maxRetries}`);
        
        // Configuration adaptée selon la tentative
        const config = {
          enableHighAccuracy: true,
          timeout: attempt === 1 ? 15000 : 25000, // Plus de temps aux tentatives suivantes
          maximumAge: attempt === 1 ? 0 : 30000    // Pas de cache pour la première tentative
        };

        const position = await Geolocation.getCurrentPosition(config);
        const accuracy = position.coords.accuracy;

        console.log(`Attempt ${attempt}: accuracy ${accuracy}m`);

        // Garder la meilleure position
        if (accuracy < bestAccuracy) {
          bestPosition = position;
          bestAccuracy = accuracy;
        }

        // Si on atteint la précision désirée, arrêter
        if (accuracy <= desiredAccuracy) {
          console.log(`Desired accuracy achieved: ${accuracy}m`);
          break;
        }

        // Attendre un peu avant la prochaine tentative (sauf dernière)
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

      } catch (error) {
        console.warn(`Position attempt ${attempt} failed:`, error);
        
        // Si c'est la dernière tentative et qu'on n'a rien, essayer une config moins stricte
        if (attempt === maxRetries && !bestPosition) {
          try {
            console.log('Final fallback attempt with relaxed settings');
            bestPosition = await Geolocation.getCurrentPosition({
              enableHighAccuracy: false,  // Utiliser le réseau si nécessaire
              timeout: 30000,
              maximumAge: 300000  // Accepter une position récente (5 min)
            });
          } catch (fallbackError) {
            console.error('All position attempts failed:', fallbackError);
          }
        }
      }
    }

    if (bestPosition) {
      console.log(`Best position selected: accuracy ${bestPosition.coords.accuracy}m`);
    }

    return bestPosition;
  }

  // Créer un point WKB (copie de la méthode du service Supabase pour la cohérence)
  private createWKBPoint(longitude: number, latitude: number): string {
    const buffer = new ArrayBuffer(25);
    const view = new DataView(buffer);
    
    let offset = 0;
    view.setUint8(offset, 1);
    offset += 1;
    view.setUint32(offset, 0x20000001, true);
    offset += 4;
    view.setUint32(offset, 4326, true);
    offset += 4;
    view.setFloat64(offset, longitude, true);
    offset += 8;
    view.setFloat64(offset, latitude, true);
    
    let hex = '0101000020E6100000';
    const bytes = new Uint8Array(buffer);
    for (let i = 9; i < bytes.length; i++) {
      hex += bytes[i].toString(16).padStart(2, '0').toUpperCase();
    }
    
    return hex;
  }

  // Nettoyer les ressources
  ngOnDestroy() {
    this.stopLocationTracking();
  }
}