/**
 * SERVICE COMMISSIONS ENTREPRISE
 * Gestion des commissions pour une entreprise spécifique
 */

import { Injectable } from '@angular/core';
import { SupabaseService } from '../../services/supabase.service';
import { EntrepriseAuthService } from '../../services/entreprise-auth.service';
import { PeriodeCommission, ReservationCommission } from '../pages/commissions/mes-commissions.page';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EntrepriseCommissionService {

  constructor(
    private supabase: SupabaseService,
    private entrepriseAuth: EntrepriseAuthService
  ) {}

  /**
   * Récupère toutes les commissions de l'entreprise connectée
   */
  async getMesCommissions(): Promise<{ data: PeriodeCommission[] | null, error: any }> {
    try {
      console.log('📊 Chargement des commissions entreprise...');

      // Récupérer l'ID de l'entreprise connectée
      const currentEntreprise = await this.getCurrentEntreprise();
      if (!currentEntreprise) {
        throw new Error('Aucune entreprise connectée');
      }
      
      const entrepriseId = currentEntreprise.id;
      console.log(`📊 Entreprise connectée: ${currentEntreprise.nom} (${entrepriseId})`);

      // Récupérer les commissions de cette entreprise avec détails des réservations
      const { data: commissionsData, error: commissionsError } = await this.supabase.client
        .from('commissions_detail')
        .select(`
          id,
          periode_id,
          nombre_reservations,
          chiffre_affaire_brut,
          taux_commission_moyen,
          montant_commission,
          statut_paiement,
          date_versement_commission,
          created_at,
          facturation_periodes!inner(
            id,
            periode_debut,
            periode_fin,
            statut
          )
        `)
        .eq('entreprise_id', entrepriseId)
        .order('created_at', { ascending: false });

      if (commissionsError) {
        throw commissionsError;
      }

      if (!commissionsData || commissionsData.length === 0) {
        console.log('ℹ️  Aucune commission trouvée pour cette entreprise');
        return { data: [], error: null };
      }

      // Enrichir chaque commission avec ses réservations détaillées
      const commissionsAvecReservations = await Promise.all(
        commissionsData.map(async (commission: any) => {
          const periode = commission.facturation_periodes;
          
          // Récupérer les réservations de cette période pour cette entreprise
          const reservations = await this.getReservationsPeriode(
            entrepriseId,
            periode.periode_debut,
            periode.periode_fin
          );

          return {
            id: commission.id,
            periode_debut: periode.periode_debut,
            periode_fin: periode.periode_fin,
            statut: periode.statut,
            montant_commission: commission.montant_commission,
            chiffre_affaire_brut: commission.chiffre_affaire_brut,
            nombre_reservations: commission.nombre_reservations,
            taux_commission_moyen: commission.taux_commission_moyen,
            statut_paiement: commission.statut_paiement || 'non_paye',
            date_versement_commission: commission.date_versement_commission,
            reservations: reservations.data || []
          };
        })
      );

      console.log(`✅ ${commissionsAvecReservations.length} commissions chargées`);
      return { data: commissionsAvecReservations, error: null };

    } catch (error) {
      console.error('❌ Erreur getMesCommissions:', error);
      return { data: null, error };
    }
  }

  /**
   * Récupère les réservations d'une période pour une entreprise
   */
  private async getReservationsPeriode(
    entrepriseId: string, 
    periodeDebut: string, 
    periodeFin: string
  ): Promise<{ data: ReservationCommission[] | null, error: any }> {
    try {
      const { data, error } = await this.supabase.client
        .from('reservations')
        .select(`
          id,
          client_phone,
          depart_nom,
          destination_nom,
          prix_total,
          distance_km,
          created_at,
          date_code_validation,
          code_validation,
          conducteurs!inner(
            nom,
            prenom,
            entreprise_id,
            entreprises!inner(id)
          )
        `)
        .eq('conducteurs.entreprise_id', entrepriseId)
        .not('date_code_validation', 'is', null) // Uniquement les réservations validées
        .gte('created_at', periodeDebut)
        .lte('created_at', periodeFin)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      // Transformer les données pour correspondre à l'interface
      const reservationsFormatees = data?.map((reservation: any) => ({
        id: reservation.id,
        client_phone: reservation.client_phone,
        depart_nom: reservation.depart_nom,
        destination_nom: reservation.destination_nom,
        prix_total: reservation.prix_total,
        distance_km: reservation.distance_km,
        created_at: reservation.created_at,
        date_code_validation: reservation.date_code_validation,
        code_validation: reservation.code_validation,
        conducteur_nom: reservation.conducteurs 
          ? `${reservation.conducteurs.prenom || ''} ${reservation.conducteurs.nom || ''}`.trim() 
          : 'Conducteur inconnu'
      })) || [];

      return { data: reservationsFormatees, error: null };

    } catch (error) {
      console.error('❌ Erreur getReservationsPeriode:', error);
      return { data: null, error };
    }
  }

  /**
   * Récupère les statistiques de commissions pour l'entreprise
   */
  async getStatistiquesCommissions(): Promise<{ 
    totalCommissions: number;
    totalPaye: number;
    totalEnAttente: number;
    nombrePeriodes: number;
    error?: any 
  }> {
    try {
      const { data: commissions, error } = await this.getMesCommissions();
      
      if (error || !commissions) {
        return { 
          totalCommissions: 0, 
          totalPaye: 0, 
          totalEnAttente: 0, 
          nombrePeriodes: 0, 
          error 
        };
      }

      const stats = {
        totalCommissions: commissions.reduce((sum, c) => sum + c.montant_commission, 0),
        totalPaye: commissions
          .filter(c => c.statut_paiement === 'paye')
          .reduce((sum, c) => sum + c.montant_commission, 0),
        totalEnAttente: commissions
          .filter(c => c.statut_paiement !== 'paye')
          .reduce((sum, c) => sum + c.montant_commission, 0),
        nombrePeriodes: commissions.length
      };

      return stats;

    } catch (error) {
      console.error('❌ Erreur getStatistiquesCommissions:', error);
      return { 
        totalCommissions: 0, 
        totalPaye: 0, 
        totalEnAttente: 0, 
        nombrePeriodes: 0, 
        error 
      };
    }
  }

  /**
   * Exporte les détails d'une commission en PDF
   */
  async exportCommissionPDF(periodeId: string): Promise<{ success: boolean, error?: any }> {
    try {
      // TODO: Implémenter l'export PDF
      console.log('🚧 Export PDF - Fonctionnalité en développement');
      return { success: false, error: 'Fonctionnalité en développement' };
    } catch (error) {
      console.error('❌ Erreur exportCommissionPDF:', error);
      return { success: false, error };
    }
  }

  /**
   * Récupère l'entreprise actuellement connectée
   */
  private async getCurrentEntreprise(): Promise<{ id: string; nom: string } | null> {
    try {
      const entreprise = await firstValueFrom(this.entrepriseAuth.currentEntreprise$);
      return entreprise;
    } catch (error) {
      console.error('❌ Erreur récupération entreprise connectée:', error);
      return null;
    }
  }
}