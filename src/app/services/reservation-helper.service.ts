import { Injectable } from '@angular/core';

/**
 * Service helper pour les fonctions utilitaires des réservations
 * Centralise la logique de détection du mode de paiement et autres utilitaires
 */
@Injectable({
  providedIn: 'root'
})
export class ReservationHelperService {

  constructor() { }

  /**
   * Détermine si une réservation a été payée par Mobile Money
   * @param reservation - L'objet réservation à vérifier
   * @returns true si Mobile Money, false si Cash
   */
  isMobileMoneyPayment(reservation: any): boolean {
    // Debug log pour voir la structure des données
    if (reservation?.id === 'fdf89666-5ea3-44cd-9a97-8de18e08b386') {
      console.log('🔍 Debug reservation payment:', {
        id: reservation.id,
        mode_paiement: reservation?.mode_paiement,
        lengopay_payment: reservation?.lengopay_payment,
        lengopay_payments: reservation?.lengopay_payments
      });
    }
    
    // Vérifier plusieurs formats possibles selon la source des données
    // 1. Si on a un champ mode_paiement directement (depuis les vues SQL)
    if (reservation?.mode_paiement) {
      return reservation.mode_paiement === 'mobile_money';
    }
    
    // 2. Si on a lengopay_payment (objet unique) avec status SUCCESS
    if (reservation?.lengopay_payment?.status === 'SUCCESS') {
      return true;
    }
    
    // 3. Si on a lengopay_payments (array) - pour les jointures multiples
    // Prendre uniquement le premier avec status SUCCESS
    if (reservation?.lengopay_payments && Array.isArray(reservation.lengopay_payments)) {
      // Filtrer uniquement les paiements SUCCESS et prendre le premier
      const successPayments = reservation.lengopay_payments.filter((payment: any) => payment.status === 'SUCCESS');
      return successPayments.length > 0;
    }
    
    // Par défaut, c'est un paiement Cash
    return false;
  }

  /**
   * Retourne l'icône appropriée selon le mode de paiement
   * @param reservation - L'objet réservation
   * @returns Le nom de l'icône Ionic
   */
  getPaymentModeIcon(reservation: any): string {
    return this.isMobileMoneyPayment(reservation) ? 'phone-portrait-outline' : 'cash';
  }

  /**
   * Retourne la couleur appropriée selon le mode de paiement
   * @param reservation - L'objet réservation
   * @returns La couleur Ionic (primary pour Mobile Money, success pour Cash)
   */
  getPaymentModeColor(reservation: any): string {
    return this.isMobileMoneyPayment(reservation) ? 'primary' : 'success';
  }

  /**
   * Retourne le label textuel du mode de paiement
   * @param reservation - L'objet réservation
   * @returns Le texte à afficher
   */
  getPaymentModeLabel(reservation: any): string {
    return this.isMobileMoneyPayment(reservation) ? 'Mobile Money' : 'Cash';
  }

  /**
   * Retourne un objet complet avec toutes les infos du mode de paiement
   * Pratique pour les templates qui ont besoin de toutes les infos
   * @param reservation - L'objet réservation
   * @returns Un objet avec icon, color, label et isMobileMoney
   */
  getPaymentModeInfo(reservation: any): {
    icon: string;
    color: string;
    label: string;
    isMobileMoney: boolean;
  } {
    const isMobileMoney = this.isMobileMoneyPayment(reservation);
    return {
      icon: isMobileMoney ? 'phone-portrait-outline' : 'cash',
      color: isMobileMoney ? 'primary' : 'success',
      label: isMobileMoney ? 'Mobile Money' : 'Cash',
      isMobileMoney: isMobileMoney
    };
  }

  /**
   * Filtre une liste de réservations pour ne garder que les paiements Cash
   * @param reservations - Liste des réservations
   * @returns Liste filtrée des réservations Cash uniquement
   */
  filterCashOnly(reservations: any[]): any[] {
    return reservations.filter(r => !this.isMobileMoneyPayment(r));
  }

  /**
   * Filtre une liste de réservations pour ne garder que les paiements Mobile Money
   * @param reservations - Liste des réservations
   * @returns Liste filtrée des réservations Mobile Money uniquement
   */
  filterMobileMoneyOnly(reservations: any[]): any[] {
    return reservations.filter(r => this.isMobileMoneyPayment(r));
  }

  /**
   * Calcule les statistiques de paiement d'une liste de réservations
   * @param reservations - Liste des réservations
   * @returns Objet avec les statistiques
   */
  getPaymentStats(reservations: any[]): {
    total: number;
    cash: number;
    mobileMoney: number;
    cashAmount: number;
    mobileMoneyAmount: number;
    totalAmount: number;
  } {
    const stats = {
      total: reservations.length,
      cash: 0,
      mobileMoney: 0,
      cashAmount: 0,
      mobileMoneyAmount: 0,
      totalAmount: 0
    };

    reservations.forEach(r => {
      const amount = r.prix_total || 0;
      stats.totalAmount += amount;
      
      if (this.isMobileMoneyPayment(r)) {
        stats.mobileMoney++;
        stats.mobileMoneyAmount += amount;
      } else {
        stats.cash++;
        stats.cashAmount += amount;
      }
    });

    return stats;
  }
}