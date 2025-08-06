/**
 * SERVICE RÉSERVATIONS GLOBALES SUPER-ADMIN
 * Vue d'ensemble de toutes les réservations de toutes les entreprises
 */

import { Injectable } from '@angular/core';
import { SupabaseService } from '../../services/supabase.service';

export interface GlobalReservation {
  // Données réservation
  id: string;
  client_phone: string;
  depart_nom: string;
  destination_nom: string;
  position_depart: any;
  destination_position: any;
  distance_km: number;
  prix_total: number;
  prix_par_km: number;
  statut: string;
  created_at: string;
  date_code_validation: string | null;
  
  // Données conducteur
  conducteur_id: string;
  conducteur_nom: string;
  conducteur_prenom: string;
  conducteur_telephone: string;
  vehicle_type: string;
  
  // Données entreprise
  entreprise_id: string;
  entreprise_nom: string;
  entreprise_email: string;
  
  // Calculés
  commission_calculee?: number;
  taux_commission?: number;
}

export interface GlobalStats {
  total_reservations: number;
  reservations_completed: number;
  reservations_pending: number;
  reservations_refused: number;
  ca_total: number;
  commission_totale: number;
  entreprises_actives: number;
  conducteurs_actifs: number;
  distance_totale: number;
  prix_moyen: number;
  taux_completion: number;
}

export interface ReservationsFilter {
  dateDebut?: string;
  dateFin?: string;
  entrepriseId?: string;
  statut?: string;
  conducteurId?: string;
  recherche?: string;
}

@Injectable({
  providedIn: 'root'
})
export class GlobalReservationsService {

  constructor(private supabaseService: SupabaseService) {}

  /**
   * Récupérer toutes les réservations avec informations complètes
   */
  async getAllReservations(
    filters: ReservationsFilter = {},
    limit: number = 100,
    offset: number = 0
  ): Promise<{ data: GlobalReservation[]; count: number }> {
    try {
      console.log('🔍 Récupération réservations globales avec filtres:', filters);
      
      // Debug: afficher les IDs d'entreprises disponibles
      if (filters.entrepriseId) {
        console.log('🏢 Filtre par entreprise ID:', filters.entrepriseId);
      }

      // Construire la requête avec jointures
      let query = this.supabaseService.client
        .from('reservations')
        .select(`
          *,
          conducteurs (
            id,
            nom,
            prenom,
            telephone,
            vehicle_type,
            entreprise_id,
            entreprises (
              id,
              nom,
              email
            )
          )
        `, { count: 'exact' });

      // Appliquer les filtres
      if (filters.dateDebut) {
        query = query.gte('created_at', filters.dateDebut);
      }

      if (filters.dateFin) {
        query = query.lte('created_at', filters.dateFin + 'T23:59:59');
      }

      if (filters.entrepriseId) {
        // D'abord, récupérer les IDs des conducteurs de cette entreprise
        const { data: conducteursData } = await this.supabaseService.client
          .from('conducteurs')
          .select('id')
          .eq('entreprise_id', filters.entrepriseId);
        
        if (conducteursData && conducteursData.length > 0) {
          const conducteurIds = conducteursData.map(c => c.id);
          query = query.in('conducteur_id', conducteurIds);
        } else {
          // Aucun conducteur trouvé pour cette entreprise, retourner vide
          return { data: [], count: 0 };
        }
      }

      if (filters.statut) {
        query = query.eq('statut', filters.statut);
      }

      if (filters.conducteurId) {
        query = query.eq('conducteur_id', filters.conducteurId);
      }

      if (filters.recherche) {
        query = query.or(`client_phone.ilike.%${filters.recherche}%,depart_nom.ilike.%${filters.recherche}%,destination_nom.ilike.%${filters.recherche}%`);
      }

      // Pagination et tri
      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        console.error('❌ Erreur récupération réservations:', error);
        throw error;
      }

      // Transformer les données
      const globalReservations: GlobalReservation[] = (data || []).map((reservation: any) => {
        const conducteur = reservation.conducteurs;
        const entreprise = conducteur?.entreprises;

        return {
          // Données réservation
          id: reservation.id,
          client_phone: reservation.client_phone,
          depart_nom: reservation.depart_nom,
          destination_nom: reservation.destination_nom,
          position_depart: reservation.position_depart,
          destination_position: reservation.destination_position,
          distance_km: reservation.distance_km || 0,
          prix_total: reservation.prix_total || 0,
          prix_par_km: reservation.prix_par_km || 0,
          statut: reservation.statut,
          created_at: reservation.created_at,
          date_code_validation: reservation.date_code_validation,
          
          // Données conducteur
          conducteur_id: reservation.conducteur_id || '',
          conducteur_nom: conducteur?.nom || 'Non assigné',
          conducteur_prenom: conducteur?.prenom || '',
          conducteur_telephone: conducteur?.telephone || 'N/A',
          vehicle_type: conducteur?.vehicle_type || 'N/A',
          
          // Données entreprise
          entreprise_id: entreprise?.id || '',
          entreprise_nom: entreprise?.nom || 'Non assignée',
          entreprise_email: entreprise?.email || 'N/A',
          
          // Commission calculée (15% par défaut pour l'instant)
          taux_commission: 15,
          commission_calculee: (reservation.prix_total || 0) * 0.15
        };
      });

      console.log(`✅ ${globalReservations.length} réservations récupérées sur ${count} total`);

      return {
        data: globalReservations,
        count: count || 0
      };

    } catch (error) {
      console.error('💥 Erreur service réservations globales:', error);
      return { data: [], count: 0 };
    }
  }

  /**
   * Calculer les statistiques globales
   */
  async getGlobalStats(filters: ReservationsFilter = {}): Promise<GlobalStats> {
    try {
      console.log('📊 Calcul statistiques globales');

      // Récupérer toutes les réservations filtrées (sans limite)
      const { data: reservations } = await this.getAllReservations(filters, 10000, 0);

      // Calculer les statistiques
      const stats: GlobalStats = {
        total_reservations: reservations.length,
        reservations_completed: reservations.filter(r => r.statut === 'completed').length,
        reservations_pending: reservations.filter(r => r.statut === 'pending').length,
        reservations_refused: reservations.filter(r => r.statut === 'refused').length,
        ca_total: reservations.reduce((sum, r) => sum + r.prix_total, 0),
        commission_totale: reservations.reduce((sum, r) => sum + (r.commission_calculee || 0), 0),
        entreprises_actives: new Set(reservations.map(r => r.entreprise_id)).size,
        conducteurs_actifs: new Set(reservations.map(r => r.conducteur_id)).size,
        distance_totale: reservations.reduce((sum, r) => sum + r.distance_km, 0),
        prix_moyen: reservations.length > 0 ? reservations.reduce((sum, r) => sum + r.prix_total, 0) / reservations.length : 0,
        taux_completion: reservations.length > 0 ? (reservations.filter(r => r.statut === 'completed').length / reservations.length) * 100 : 0
      };

      console.log('✅ Statistiques calculées:', stats);
      return stats;

    } catch (error) {
      console.error('❌ Erreur calcul statistiques:', error);
      return {
        total_reservations: 0,
        reservations_completed: 0,
        reservations_pending: 0,
        reservations_refused: 0,
        ca_total: 0,
        commission_totale: 0,
        entreprises_actives: 0,
        conducteurs_actifs: 0,
        distance_totale: 0,
        prix_moyen: 0,
        taux_completion: 0
      };
    }
  }

  /**
   * Récupérer la liste des entreprises pour les filtres
   */
  async getEntreprisesList(): Promise<{id: string, nom: string}[]> {
    try {
      const { data, error } = await this.supabaseService.client
        .from('entreprises')
        .select('id, nom')
        .eq('actif', true)
        .order('nom');

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('❌ Erreur récupération entreprises:', error);
      return [];
    }
  }

  /**
   * Exporter les réservations au format CSV
   */
  async exportReservations(filters: ReservationsFilter = {}): Promise<string> {
    try {
      const { data: reservations } = await this.getAllReservations(filters, 10000, 0);

      // En-têtes CSV
      const headers = [
        'ID', 'Date', 'Client', 'Départ', 'Destination', 'Distance (km)',
        'Prix Total', 'Commission', 'Statut', 'Conducteur', 'Entreprise'
      ];

      // Données CSV
      const csvData = reservations.map(r => [
        r.id,
        new Date(r.created_at).toLocaleDateString('fr-FR'),
        r.client_phone,
        r.depart_nom,
        r.destination_nom,
        r.distance_km.toString(),
        r.prix_total.toString(),
        (r.commission_calculee || 0).toString(),
        r.statut,
        `${r.conducteur_prenom} ${r.conducteur_nom}`,
        r.entreprise_nom
      ]);

      // Construire le CSV
      const csvContent = [headers, ...csvData]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');

      return csvContent;

    } catch (error) {
      console.error('❌ Erreur export CSV:', error);
      return '';
    }
  }

  /**
   * Formater le statut pour l'affichage
   */
  formatStatut(statut: string): { text: string; color: string } {
    switch (statut) {
      case 'completed':
        return { text: 'Terminée', color: 'success' };
      case 'pending':
        return { text: 'En attente', color: 'warning' };
      case 'accepted':
        return { text: 'Acceptée', color: 'primary' };
      case 'refused':
        return { text: 'Refusée', color: 'danger' };
      default:
        return { text: statut, color: 'medium' };
    }
  }

  /**
   * Formater le prix en Francs Guinéens
   */
  formatPrice(price: number): string {
    return new Intl.NumberFormat('fr-GN', {
      style: 'currency',
      currency: 'GNF',
      minimumFractionDigits: 0
    }).format(price);
  }
}