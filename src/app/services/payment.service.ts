import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';

// Interface pour le statut de paiement
export interface PaymentStatus {
  id: string;
  payment_id: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'Failed' | 'Pending' | 'Success';
  amount: number;
  currency: string;
  client_phone: string;
  message: string;
  raw_json: any;
  processed_at: string;
  created_at: string;
  updated_at: string;
  reservation_id: string;
  processed_client_notified_at: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private readonly API_URL = 'https://www.labico.net/api/TriggerPaymentOnAcceptance';

  constructor(
    private supabaseService: SupabaseService,
    private authService: AuthService
  ) {}

  /**
   * Récupère le dernier statut de paiement pour une réservation
   * @param reservationId ID de la réservation
   * @returns Dernier paiement ou null si aucun
   */
  async getLatestPaymentStatus(reservationId: string): Promise<PaymentStatus | null> {
    try {
      const { data, error } = await this.supabaseService.client
        .from('lengopay_payments')
        .select('*')
        .eq('reservation_id', reservationId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Erreur récupération paiement:', error);
        return null;
      }

      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('Erreur getLatestPaymentStatus:', error);
      return null;
    }
  }

  /**
   * Vérifie si un paiement a expiré (15 minutes après création)
   * @param createdAt Date de création du paiement
   * @returns true si expiré
   */
  isPaymentExpired(createdAt: string): boolean {
    const paymentDate = new Date(createdAt);
    const now = new Date();
    const diffMinutes = (now.getTime() - paymentDate.getTime()) / (1000 * 60);
    
    return diffMinutes > 15;
  }

  /**
   * Calcule le temps restant avant expiration (15 minutes)
   * @param createdAt Date de création du paiement
   * @returns Minutes restantes ou 0 si expiré
   */
  getMinutesUntilExpiration(createdAt: string): number {
    const paymentDate = new Date(createdAt);
    const now = new Date();
    const diffMinutes = (now.getTime() - paymentDate.getTime()) / (1000 * 60);
    
    const remainingMinutes = 15 - Math.floor(diffMinutes);
    return Math.max(0, remainingMinutes);
  }

  /**
   * Extrait l'URL de paiement du raw_json
   * @param rawJson Données JSON brutes
   * @returns URL de paiement ou null
   */
  getPaymentUrl(rawJson: any): string | null {
    try {
      if (typeof rawJson === 'string') {
        const parsed = JSON.parse(rawJson);
        return parsed.payment_url || null;
      }
      return rawJson?.payment_url || null;
    } catch (error) {
      console.error('Erreur extraction payment_url:', error);
      return null;
    }
  }

  /**
   * Déclenche un nouveau processus de paiement
   * @param reservationId ID de la réservation
   * @param conducteurId ID du conducteur
   * @returns Réponse de l'API
   */
  async triggerPayment(reservationId: string, conducteurId: string): Promise<any> {
    try {
      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `reservationId=${reservationId}&conducteurId=${conducteurId}`
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Erreur lors du déclenchement du paiement');
      }

      return result;
    } catch (error) {
      console.error('Erreur triggerPayment:', error);
      throw error;
    }
  }

  /**
   * Détermine si on peut relancer un paiement pour une réservation
   * @param reservation Réservation avec son statut de paiement
   * @returns true si on peut relancer
   */
  canRetriggerPayment(reservation: any): boolean {
    // Seulement pour les réservations acceptées
    if (reservation.statut !== 'accepted') {
      return false;
    }

    const payment = reservation.paymentStatus;
    
    // Pas de paiement = NE PEUT PAS déclencher (changé)
    if (!payment) {
      return false;
    }

    // Paiement réussi = ne peut pas relancer
    if (payment.status === 'SUCCESS' || payment.status === 'Success') {
      return false;
    }

    // Paiement en attente mais expiré = peut relancer
    if ((payment.status === 'PENDING' || payment.status === 'Pending') && this.isPaymentExpired(payment.created_at)) {
      return true;
    }

    // Paiement échoué = peut relancer
    if (payment.status === 'FAILED' || payment.status === 'Failed') {
      return true;
    }

    return false;
  }
}