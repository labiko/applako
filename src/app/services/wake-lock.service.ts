import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';

@Injectable({
  providedIn: 'root'
})
export class WakeLockService {
  private wakeLock: any = null;
  private isActive: boolean = false;

  constructor() {}

  // Activer le Wake Lock - maintenir l'écran allumé
  async enable(): Promise<boolean> {
    // Ne fonctionne que sur mobile
    if (!Capacitor.isNativePlatform()) {
      console.log('Wake Lock: Web platform - using Screen Wake Lock API');
      return await this.enableWebWakeLock();
    }

    // Sur mobile, utiliser l'API Web Wake Lock dans le WebView
    return await this.enableWebWakeLock();
  }

  // Désactiver le Wake Lock - permettre au téléphone de se verrouiller
  async disable(): Promise<void> {
    if (this.wakeLock && this.isActive) {
      try {
        await this.wakeLock.release();
        this.wakeLock = null;
        this.isActive = false;
        console.log('✅ Wake Lock désactivé - Écran peut se verrouiller');
      } catch (error) {
        console.error('Erreur désactivation Wake Lock:', error);
      }
    }
  }

  // Utiliser l'API Web Wake Lock (compatible Capacitor WebView)
  private async enableWebWakeLock(): Promise<boolean> {
    try {
      // Vérifier le support de l'API
      if ('wakeLock' in navigator) {
        this.wakeLock = await (navigator as any).wakeLock.request('screen');
        this.isActive = true;
        
        // Gérer la libération automatique (ex: changement d'onglet)
        this.wakeLock.addEventListener('release', () => {
          console.log('Wake Lock libéré automatiquement');
          this.isActive = false;
          this.wakeLock = null;
        });

        console.log('✅ Wake Lock activé - Écran restera allumé');
        return true;
      } else {
        console.warn('Wake Lock API non supportée sur cet appareil');
        return false;
      }
    } catch (error) {
      console.error('Erreur activation Wake Lock:', error);
      return false;
    }
  }

  // Vérifier si Wake Lock est actif
  isWakeLockActive(): boolean {
    return this.isActive;
  }

  // Gérer la reconnexion automatique du Wake Lock
  async handleVisibilityChange(): Promise<void> {
    // Si le document redevient visible et qu'on devrait avoir le Wake Lock
    if (document.visibilityState === 'visible' && !this.isActive) {
      // Note: La logique de réactivation sera gérée par le service appelant
      console.log('Document visible - Wake Lock peut être réactivé si nécessaire');
    }
  }

  // Obtenir des informations sur le statut
  getStatus(): { active: boolean, supported: boolean } {
    return {
      active: this.isActive,
      supported: 'wakeLock' in navigator
    };
  }
}