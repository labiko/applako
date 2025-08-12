import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class RadiusChangeDetectionService {
  private lastKnownRayon: number | null = null;

  constructor(private authService: AuthService) {}

  /**
   * Vérifie si les réservations doivent être rechargées suite à un changement de rayon
   * @returns true si rechargement nécessaire, false sinon
   */
  shouldReload(): boolean {
    const currentRayon = this.getCurrentRayon();
    
    if (this.lastKnownRayon === null) {
      // Premier appel, initialiser la référence
      this.lastKnownRayon = currentRayon;
      console.log('📊 Rayon initial mémorisé:', currentRayon + 'km');
      return false; // Pas de rechargement au premier appel
    }
    
    if (currentRayon !== this.lastKnownRayon) {
      // Changement détecté
      console.log(`📊 Rayon modifié: ${this.lastKnownRayon}km → ${currentRayon}km`);
      this.lastKnownRayon = currentRayon;
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
   * Force la réinitialisation du rayon mémorisé (utile pour les tests)
   */
  reset(): void {
    this.lastKnownRayon = null;
  }
}