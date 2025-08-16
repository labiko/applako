import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class RadiusChangeDetectionService {
  private lastKnownRayon: number | null = null;
  private lastKnownTestMode: boolean | null = null; // ✅ NOUVEAU : Suivi du mode test

  constructor(private authService: AuthService) {}

  /**
   * Vérifie si les réservations doivent être rechargées suite à un changement de rayon ou mode test
   * @returns true si rechargement nécessaire, false sinon
   */
  shouldReload(): boolean {
    const currentRayon = this.getCurrentRayon();
    const currentTestMode = this.getCurrentTestMode(); // ✅ NOUVEAU
    
    if (this.lastKnownRayon === null || this.lastKnownTestMode === null) {
      // Premier appel, initialiser les références
      this.lastKnownRayon = currentRayon;
      this.lastKnownTestMode = currentTestMode;
      console.log('📊 État initial mémorisé:', currentRayon + 'km', 'TestMode:', currentTestMode);
      return false; // Pas de rechargement au premier appel
    }
    
    // Vérifier changement de rayon
    if (currentRayon !== this.lastKnownRayon) {
      console.log(`📊 Rayon modifié: ${this.lastKnownRayon}km → ${currentRayon}km`);
      this.lastKnownRayon = currentRayon;
      return true; // Rechargement nécessaire
    }
    
    // ✅ NOUVEAU : Vérifier changement de mode test
    if (currentTestMode !== this.lastKnownTestMode) {
      console.log(`🐛 Mode test modifié: ${this.lastKnownTestMode} → ${currentTestMode}`);
      this.lastKnownTestMode = currentTestMode;
      return true; // Rechargement nécessaire
    }
    
    // Pas de changement
    return false;
  }

  /**
   * Récupère le rayon actuel du conducteur connecté
   * @returns rayon en km (5 par défaut si non défini)
   */
  private getCurrentRayon(): number {
    const conducteur = this.authService.getCurrentConducteur();
    return conducteur?.rayon_km_reservation || 5;
  }

  /**
   * ✅ NOUVEAU : Récupère l'état actuel du mode test
   * @returns true si mode test activé, false sinon
   */
  private getCurrentTestMode(): boolean {
    try {
      if (typeof Storage !== 'undefined') {
        const savedTestMode = localStorage.getItem('testMode');
        return savedTestMode ? JSON.parse(savedTestMode) : false;
      }
    } catch (error) {
      console.warn('Erreur chargement testMode dans RadiusChangeDetectionService:', error);
    }
    return false;
  }

  /**
   * Force la réinitialisation des états mémorisés (utile pour les tests)
   */
  reset(): void {
    this.lastKnownRayon = null;
    this.lastKnownTestMode = null; // ✅ NOUVEAU
  }
}