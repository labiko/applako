import { Injectable } from '@angular/core';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { AlertController } from '@ionic/angular';
import { NativeSettings } from 'capacitor-native-settings';
import { WakeLockService } from './wake-lock.service';

@Injectable({
  providedIn: 'root'
})
export class GeolocationService {
  private locationInterval: any = null;
  private isTracking = false;

  constructor(
    private supabaseService: SupabaseService,
    private authService: AuthService,
    private alertController: AlertController,
    private wakeLockService: WakeLockService
  ) {}

  // Démarrer le tracking de position
  async startLocationTracking() {
    if (this.isTracking) {
      return;
    }

    // Désactiver sur web (Vercel) - fonctionne seulement sur mobile
    if (Capacitor.getPlatform() === 'web') {
      console.log('GPS tracking disabled on web - mobile only feature');
      return;
    }

    try {
      // Vérifier d'abord les permissions existantes
      let permissions = await Geolocation.checkPermissions();
      
      // Demander les permissions seulement si pas encore accordées
      if (permissions.location !== 'granted') {
        console.log('🔒 Permissions GPS requises, demande en cours...');
        permissions = await Geolocation.requestPermissions();
        
        if (permissions.location !== 'granted') {
          console.error('Location permission denied');
          await this.showLocationPermissionAlert();
          return;
        }
      }

      await this.wakeLockService.enable();

      this.isTracking = true;
      
      // Mise à jour immédiate
      await this.updateLocation();
      
      // Mise à jour toutes les 5 minutes (300000 ms)
      this.locationInterval = setInterval(async () => {
        if (this.isTracking) {
          await this.updateLocation();
        }
      }, 300000); // 5 minutes
    } catch (error) {
      console.error('Error starting location tracking:', error);
      await this.handleLocationError(error);
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
    
    // NOUVEAU : Désactiver Wake Lock - permettre au téléphone de se verrouiller
    console.log('🔋 Désactivation Wake Lock - Téléphone peut maintenant se verrouiller');
    this.wakeLockService.disable();
    
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

      console.log('🌍 Position obtenue:', { longitude, latitude });

      // Mettre à jour dans la base de données
      console.log('🚀 Appel updateConducteurPosition...');
      const success = await this.supabaseService.updateConducteurPosition(
        conducteurId,
        longitude,
        latitude,
        accuracy
      );
      console.log('🏁 updateConducteurPosition result:', success);

      if (success) {
        console.log('✅ Position mise à jour avec succès');
        
        // Mettre à jour aussi la position dans le service auth local
        const conducteur = this.authService.getCurrentConducteur();
        if (conducteur) {
          conducteur.position_actuelle = this.createWKBPoint(longitude, latitude);
          // Rafraîchir les données locales
          (this.authService as any).currentConducteurSubject.next(conducteur);
        }
      } else {
        console.error('❌ Échec mise à jour position');
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
        // Configuration adaptée selon la tentative
        const config = {
          enableHighAccuracy: true,
          timeout: attempt === 1 ? 15000 : 25000, // Plus de temps aux tentatives suivantes
          maximumAge: attempt === 1 ? 0 : 30000    // Pas de cache pour la première tentative
        };

        const position = await Geolocation.getCurrentPosition(config);
        const accuracy = position.coords.accuracy;

        // Garder la meilleure position
        if (accuracy < bestAccuracy) {
          bestPosition = position;
          bestAccuracy = accuracy;
        }

        // Si on atteint la précision désirée, arrêter
        if (accuracy <= desiredAccuracy) {
          break;
        }

        // Attendre un peu avant la prochaine tentative (sauf dernière)
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

      } catch (error) {
        // Si c'est la dernière tentative et qu'on n'a rien, essayer une config moins stricte
        if (attempt === maxRetries && !bestPosition) {
          try {
            bestPosition = await Geolocation.getCurrentPosition({
              enableHighAccuracy: false,  // Utiliser le réseau si nécessaire
              timeout: 30000,
              maximumAge: 300000  // Accepter une position récente (5 min)
            });
          } catch (fallbackError) {
            console.error('Tous les tentatives GPS ont échoué');
          }
        }
      }
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

  // Afficher alerte moderne pour permissions GPS
  private async showLocationPermissionAlert() {
    const alert = await this.alertController.create({
      cssClass: 'modern-gps-alert',
      header: '📍 Localisation requise',
      subHeader: 'Activez votre position pour recevoir des courses',
      message: 'Pour utiliser l\'application, vous devez activer la géolocalisation. Cela permet de vous connecter avec des clients proches et d\'optimiser vos trajets.',
      buttons: [
        {
          text: 'Plus tard',
          role: 'cancel',
          cssClass: 'alert-button-cancel'
        },
        {
          text: '🚀 Activer',
          cssClass: 'alert-button-primary',
          handler: () => {
            this.openLocationSettings();
          }
        }
      ]
    });

    await alert.present();
  }

  // Gérer les erreurs de géolocalisation
  private async handleLocationError(error: any) {
    const errorMessage = error?.message || error?.toString() || 'Erreur inconnue';
    
    console.log('🔍 Erreur GPS détaillée:', errorMessage);

    // Vérifier si c'est un problème de service désactivé
    if (errorMessage.includes('Location services are not enabled') || 
        errorMessage.includes('services are not enabled')) {
      await this.showLocationServicesAlert();
    } else {
      // Autre erreur GPS
      await this.showGenericLocationAlert(errorMessage);
    }
  }

  // Alerte moderne pour services de géolocalisation désactivés
  private async showLocationServicesAlert() {
    const alert = await this.alertController.create({
      cssClass: 'custom-alert-location-services',
      header: '🌍 GPS désactivé',
      subHeader: 'Activez la géolocalisation pour continuer',
      message: 'Le GPS est désactivé sur votre téléphone. Pour activer:\n\n1. Ouvrez les Paramètres\n2. Localisation/Position\n3. Activez la localisation\n4. Mode haute précision',
      buttons: [
        {
          text: 'Ignorer',
          role: 'cancel',
          cssClass: 'alert-button-cancel'
        },
        {
          text: '🔧 Ouvrir paramètres',
          cssClass: 'alert-button-primary',
          handler: () => {
            this.openLocationSettings();
          }
        }
      ]
    });

    await alert.present();
  }

  // Alerte générique pour autres erreurs GPS
  private async showGenericLocationAlert(errorMessage: string) {
    const alert = await this.alertController.create({
      header: '⚠️ Problème de géolocalisation',
      message: `Impossible d'accéder à votre position actuellement.
      
Erreur: ${errorMessage}

Vérifiez que :
• La géolocalisation est activée
• L'app a les permissions nécessaires
• Vous n'êtes pas en mode avion`,
      buttons: [
        {
          text: 'OK',
          role: 'cancel'
        },
        {
          text: 'Paramètres',
          cssClass: 'primary', 
          handler: () => {
            this.openLocationSettings();
          }
        }
      ]
    });

    await alert.present();
  }

  // Ouvrir les paramètres de géolocalisation
  private async openLocationSettings() {
    if (Capacitor.isNativePlatform()) {
      try {
        console.log('📱 Ouverture des paramètres de localisation...');
        
        if (Capacitor.getPlatform() === 'android') {
          // Pour Android, utiliser openAndroid avec l'enum correct
          await NativeSettings.openAndroid({
            option: 'location' as any // Type assertion car l'enum n'est pas importé
          });
        } else if (Capacitor.getPlatform() === 'ios') {
          // Pour iOS, ouvrir les paramètres de l'app
          await NativeSettings.openIOS({
            option: 'App' as any
          });
        }
        
        console.log('✅ Paramètres de localisation ouverts');
      } catch (error) {
        console.error('❌ Impossible d\'ouvrir les paramètres:', error);
        // En cas d'échec, afficher les instructions manuelles
        this.showManualSettingsInstructions();
      }
    } else {
      // Sur web, instructions manuelles
      console.log('ℹ️ Sur web: Activez la géolocalisation manuellement');
    }
  }

  // Instructions manuelles si ouverture automatique échoue
  private async showManualSettingsInstructions() {
    const alert = await this.alertController.create({
      header: '⚙️ Activer la localisation',
      message: 'Instructions pour activer le GPS:\n\n1. Ouvrez les Paramètres de votre téléphone\n2. Allez dans Localisation ou Position\n3. Activez la localisation\n4. Sélectionnez Haute précision\n5. Revenez à l\'application',
      buttons: ['Compris']
    });
    await alert.present();
  }

  // Méthode publique pour réessayer la géolocalisation
  async retryLocationTracking() {
    console.log('🔄 Nouvelle tentative de géolocalisation...');
    this.stopLocationTracking();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Attendre 1s
    await this.startLocationTracking();
  }

  // Obtenir le statut du Wake Lock
  getWakeLockStatus(): { active: boolean, supported: boolean } {
    return this.wakeLockService.getStatus();
  }

  // Force une mise à jour immédiate de la position (pour refresh)
  async forceUpdateLocation() {
    try {
      await this.updateLocation();
    } catch (error) {
      console.error('Erreur forceUpdateLocation:', error);
    }
  }

  // Vérifier si le tracking est actif ET l'écran maintenu allumé
  getFullTrackingStatus(): { tracking: boolean, wakeLockActive: boolean, wakeLockSupported: boolean } {
    const wakeLockStatus = this.wakeLockService.getStatus();
    return {
      tracking: this.isTracking,
      wakeLockActive: wakeLockStatus.active,
      wakeLockSupported: wakeLockStatus.supported
    };
  }

  // Nettoyer les ressources
  ngOnDestroy() {
    this.stopLocationTracking();
  }
}