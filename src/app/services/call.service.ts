import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CallService {

  constructor() {}

  /**
   * Compose un numéro de téléphone
   * @param phoneNumber Numéro de téléphone à composer
   */
  callPhoneNumber(phoneNumber: string): void {
    if (!phoneNumber) {
      console.warn('📞 Numéro de téléphone manquant');
      return;
    }

    // Nettoyer et formater le numéro
    const cleanNumber = this.formatPhoneNumber(phoneNumber);
    
    if (!this.isValidPhoneNumber(cleanNumber)) {
      console.warn('📞 Numéro de téléphone invalide:', phoneNumber);
      return;
    }

    try {
      console.log('📞 Composition du numéro:', cleanNumber);
      // Utilise le protocole tel: pour déclencher l'appel
      window.location.href = `tel:${cleanNumber}`;
    } catch (error) {
      console.error('📞 Erreur lors de la composition:', error);
    }
  }

  /**
   * Nettoie et formate le numéro de téléphone
   * @param phoneNumber Numéro brut
   * @returns Numéro nettoyé
   */
  private formatPhoneNumber(phoneNumber: string): string {
    // Supprimer tous les caractères non numériques sauf le +
    let cleaned = phoneNumber.replace(/[^\d+]/g, '');
    
    // Si le numéro commence par 33 (sans +), ajouter le +
    if (cleaned.startsWith('33') && !cleaned.startsWith('+33')) {
      cleaned = '+' + cleaned;
    }
    
    return cleaned;
  }

  /**
   * Valide un numéro de téléphone
   * @param phoneNumber Numéro à valider
   * @returns true si valide
   */
  private isValidPhoneNumber(phoneNumber: string): boolean {
    // Vérifications basiques
    if (!phoneNumber || phoneNumber.length < 8) {
      return false;
    }

    // Doit commencer par + ou être un numéro local
    if (!phoneNumber.startsWith('+') && !phoneNumber.match(/^[0-9]/)) {
      return false;
    }

    // Doit contenir uniquement des chiffres après le +
    const numberPart = phoneNumber.replace('+', '');
    return /^\d+$/.test(numberPart);
  }

  /**
   * Vérifie si la fonction d'appel est disponible sur cette plateforme
   * @returns true si l'appel est supporté
   */
  isCallSupported(): boolean {
    // La fonction tel: est supportée par tous les navigateurs modernes
    return typeof window !== 'undefined' && 'location' in window;
  }
}