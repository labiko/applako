/**
 * SERVICE DE GESTION FINANCIÈRE DES COMMISSIONS
 * Gestion des périodes, facturation, paiements et relances
 */

import { Injectable } from '@angular/core';
import { SupabaseService } from '../../services/supabase.service';

export interface FacturationPeriode {
  id: string;
  periode_debut: string;
  periode_fin: string;
  statut: 'en_cours' | 'cloturee' | 'facturee' | 'payee';
  total_commissions: number;
  total_facture: number;
  nombre_entreprises: number;
  created_at: string;
  updated_at: string;
}

export interface CommissionDetail {
  id: string;
  periode_id: string;
  entreprise_id: string;
  entreprise_nom?: string;
  nombre_reservations: number;
  chiffre_affaire_brut: number;
  taux_commission_moyen: number;
  montant_commission: number;
  taux_global_utilise?: number;
  taux_specifique_utilise?: number;
  jours_taux_global: number;
  jours_taux_specifique: number;
  statut: 'calcule' | 'facture' | 'paye' | 'conteste';
  date_calcul: string;
  date_facturation?: string;
  date_paiement?: string;
  date_versement_commission?: string;
  statut_paiement: 'non_paye' | 'paye' | 'en_attente';
  metadata: any;
}

export interface PaiementCommission {
  id: string;
  commission_detail_id: string;
  periode_id: string;
  entreprise_id: string;
  montant_paye: number;
  mode_paiement: 'virement' | 'cheque' | 'especes' | 'mobile_money' | 'compensation';
  reference_paiement?: string;
  date_paiement: string;
  date_echeance?: string;
  statut: 'en_attente' | 'valide' | 'rejete' | 'rembourse';
  valide_par?: string;
  date_validation?: string;
  notes?: string;
  justificatifs: string[];
  created_by: string;
}

export interface RelancePaiement {
  id: string;
  commission_detail_id: string;
  entreprise_id: string;
  type_relance: 'rappel_gentil' | 'mise_en_demeure' | 'suspension_service';
  niveau_relance: number;
  montant_du: number;
  date_echeance_originale: string;
  jours_retard: number;
  date_relance: string;
  prochaine_relance?: string;
  statut: 'programmee' | 'envoyee' | 'lue' | 'ignoree' | 'resolue';
  canal: 'email' | 'sms' | 'notification' | 'courrier';
  message_envoye?: string;
}

export interface StatistiquesFinancieres {
  periode_courante: {
    total_commissions: number;
    total_facture: number;
    total_paye: number;
    taux_recouvrement: number;
    nombre_entreprises: number;
  };
  retards_paiement: {
    total_en_retard: number;
    montant_en_retard: number;
    nombre_relances_actives: number;
  };
  evolution_mensuelle: {
    mois: string;
    commissions: number;
    paiements: number;
  }[];
}

@Injectable({
  providedIn: 'root'
})
export class FinancialManagementService {

  constructor(private supabase: SupabaseService) {}

  // ===============================================
  // GESTION DES PÉRIODES DE FACTURATION
  // ===============================================

  /**
   * Récupère toutes les périodes de facturation
   */
  async getPeriodes(statut?: string): Promise<{ data: FacturationPeriode[] | null, error: any }> {
    try {
      let query = this.supabase.client
        .from('facturation_periodes')
        .select('*')
        .order('created_at', { ascending: false });

      if (statut) {
        query = query.eq('statut', statut);
      }

      const { data, error } = await query;
      return { data, error };
    } catch (error) {
      console.error('❌ Erreur getPeriodes:', error);
      return { data: null, error };
    }
  }

  /**
   * Crée une nouvelle période de facturation
   */
  async createPeriode(periodeData: Partial<FacturationPeriode>): Promise<{ data: FacturationPeriode | null, error: any }> {
    try {
      const { data, error } = await this.supabase.client
        .from('facturation_periodes')
        .insert([periodeData])
        .select()
        .single();

      if (!error) {
        console.log('✅ Période créée:', data);
      }

      return { data, error };
    } catch (error) {
      console.error('❌ Erreur createPeriode:', error);
      return { data: null, error };
    }
  }

  /**
   * Clôture une période et calcule les commissions
   */
  async cloturerPeriode(periodeId: string): Promise<{ success: boolean, error?: any }> {
    try {
      console.log('🔄 Clôture de la période:', periodeId);

      // 1. Calculer les commissions pour toutes les entreprises
      const calculResult = await this.calculerCommissionsPeriode(periodeId);
      if (!calculResult.success) {
        return { success: false, error: calculResult.error };
      }

      // 2. Mettre à jour le statut de la période
      const { error: updateError } = await this.supabase.client
        .from('facturation_periodes')
        .update({ 
          statut: 'cloturee',
          total_commissions: calculResult.totalCommissions,
          nombre_entreprises: calculResult.nombreEntreprises
        })
        .eq('id', periodeId);

      if (updateError) {
        throw updateError;
      }

      console.log('✅ Période clôturée avec succès');
      return { success: true };

    } catch (error) {
      console.error('❌ Erreur cloturerPeriode:', error);
      return { success: false, error };
    }
  }

  /**
   * Annule la clôture d'une période (pour les tests)
   */
  async annulerCloture(periodeId: string): Promise<{ success: boolean, error?: any }> {
    try {
      console.log('🔄 Annulation de la clôture:', periodeId);

      // 1. Supprimer tous les détails de commissions de cette période
      const { error: deleteError } = await this.supabase.client
        .from('commissions_detail')
        .delete()
        .eq('periode_id', periodeId);

      if (deleteError) {
        throw deleteError;
      }

      // 2. Remettre la période en statut 'en_cours' avec montants à zéro
      const { error: updateError } = await this.supabase.client
        .from('facturation_periodes')
        .update({ 
          statut: 'en_cours',
          total_commissions: 0,
          total_facture: 0,
          nombre_entreprises: 0
        })
        .eq('id', periodeId);

      if (updateError) {
        throw updateError;
      }

      console.log('✅ Clôture annulée avec succès - période remise en "en_cours"');
      return { success: true };

    } catch (error) {
      console.error('❌ Erreur annulerCloture:', error);
      return { success: false, error };
    }
  }

  // ===============================================
  // CALCUL DES COMMISSIONS
  // ===============================================

  /**
   * Calcule les commissions pour une période donnée
   */
  private async calculerCommissionsPeriode(periodeId: string): Promise<{ success: boolean, totalCommissions?: number, nombreEntreprises?: number, error?: any }> {
    try {
      // Récupérer la période
      const { data: periode, error: periodeError } = await this.supabase.client
        .from('facturation_periodes')
        .select('*')
        .eq('id', periodeId)
        .single();

      if (periodeError || !periode) {
        throw new Error('Période non trouvée');
      }

      // Récupérer toutes les réservations VALIDÉES de la période avec leurs entreprises
      // IMPORTANT: Seules les réservations avec date_code_validation NOT NULL comptent pour les commissions
      const { data: reservationsAvecEntreprises, error: reservationsError } = await this.supabase.client
        .from('reservations')
        .select(`
          *,
          conducteurs!inner(
            entreprise_id,
            entreprises!inner(id, nom)
          )
        `)
        .gte('created_at', periode.periode_debut)
        .lte('created_at', periode.periode_fin)
        .in('statut', ['completed', 'accepted'])
        .not('date_code_validation', 'is', null); // ✅ UNIQUEMENT les réservations validées

      if (reservationsError) {
        throw reservationsError;
      }

      // Grouper par entreprise
      const reservationsParEntreprise = new Map();
      reservationsAvecEntreprises?.forEach(reservation => {
        const entrepriseId = reservation.conducteurs?.entreprise_id;
        if (entrepriseId) {
          if (!reservationsParEntreprise.has(entrepriseId)) {
            reservationsParEntreprise.set(entrepriseId, []);
          }
          reservationsParEntreprise.get(entrepriseId).push(reservation);
        }
      });

      let totalCommissions = 0;
      let nombreEntreprises = 0;

      // Calculer pour chaque entreprise ayant des réservations
      for (const [entrepriseId, reservations] of reservationsParEntreprise) {
        const calculEntreprise = await this.calculerCommissionEntrepriseAvecReservations(
          periodeId, 
          entrepriseId,
          reservations
        );

        if (calculEntreprise.success && calculEntreprise.montantCommission && calculEntreprise.montantCommission > 0) {
          totalCommissions += calculEntreprise.montantCommission;
          nombreEntreprises++;
        }
      }

      return { 
        success: true, 
        totalCommissions, 
        nombreEntreprises 
      };

    } catch (error) {
      console.error('❌ Erreur calculerCommissionsPeriode:', error);
      return { success: false, error };
    }
  }

  /**
   * Calcule la commission pour une entreprise avec ses réservations
   */
  private async calculerCommissionEntrepriseAvecReservations(
    periodeId: string, 
    entrepriseId: string, 
    reservations: any[]
  ): Promise<{ success: boolean, montantCommission?: number, error?: any }> {
    try {
      if (!reservations || reservations.length === 0) {
        return { success: true, montantCommission: 0 };
      }

      // Calculer le chiffre d'affaires brut
      const chiffreAffaireBrut = reservations.reduce((total: number, reservation: any) => {
        return total + (reservation.prix_total || 0);
      }, 0);

      // Récupérer les taux de commission applicables
      const { data: commissionConfig, error: configError } = await this.supabase.client
        .from('commission_config')
        .select('*')
        .or(`entreprise_id.eq.${entrepriseId},entreprise_id.is.null`)
        .eq('actif', true)
        .order('created_at', { ascending: false });

      if (configError) {
        throw configError;
      }

      // Déterminer le taux applicable (spécifique en priorité, sinon global, sinon 15%)
      let tauxApplicable = 15;
      let tauxGlobalUtilise: number | null = null;
      let tauxSpecifiqueUtilise: number | null = null;

      if (commissionConfig && commissionConfig.length > 0) {
        const tauxSpecifique = commissionConfig.find((c: any) => c.entreprise_id === entrepriseId);
        const tauxGlobal = commissionConfig.find((c: any) => c.entreprise_id === null);

        if (tauxSpecifique) {
          tauxApplicable = tauxSpecifique.taux_commission;
          tauxSpecifiqueUtilise = tauxSpecifique.taux_commission;
        } else if (tauxGlobal) {
          tauxApplicable = tauxGlobal.taux_commission;
          tauxGlobalUtilise = tauxGlobal.taux_commission;
        }
      }

      const montantCommission = (chiffreAffaireBrut * tauxApplicable) / 100;

      // Sauvegarder le détail de commission
      const commissionDetail: Partial<CommissionDetail> = {
        periode_id: periodeId,
        entreprise_id: entrepriseId,
        nombre_reservations: reservations.length,
        chiffre_affaire_brut: chiffreAffaireBrut,
        taux_commission_moyen: tauxApplicable,
        montant_commission: montantCommission,
        taux_global_utilise: tauxGlobalUtilise || undefined,
        taux_specifique_utilise: tauxSpecifiqueUtilise || undefined,
        jours_taux_global: tauxGlobalUtilise ? 30 : 0, // Approximation
        jours_taux_specifique: tauxSpecifiqueUtilise ? 30 : 0,
        statut: 'calcule',
        metadata: {
          reservations_ids: reservations.map(r => r.id),
          calcul_date: new Date().toISOString(),
          entreprise_nom: reservations[0]?.conducteurs?.entreprises?.nom
        }
      };

      const { error: insertError } = await this.supabase.client
        .from('commissions_detail')
        .upsert([commissionDetail], { 
          onConflict: 'periode_id,entreprise_id' 
        });

      if (insertError) {
        throw insertError;
      }

      const entrepriseNom = reservations[0]?.conducteurs?.entreprises?.nom || 'Inconnue';
      console.log(`✅ Commission calculée pour ${entrepriseNom}: ${this.formatPrice(montantCommission)} (${tauxApplicable}%)`);
      return { success: true, montantCommission };

    } catch (error) {
      console.error('❌ Erreur calculerCommissionEntrepriseAvecReservations:', error);
      return { success: false, error };
    }
  }

  /**
   * Ancienne méthode - gardée pour compatibilité mais non utilisée
   */
  private async calculerCommissionEntreprise(
    periodeId: string, 
    entrepriseId: string, 
    periodeDebut: string, 
    periodeFin: string
  ): Promise<{ success: boolean, montantCommission?: number, error?: any }> {
    try {
      // Récupérer les réservations de l'entreprise sur la période avec jointure
      const { data: reservations, error: reservationsError } = await this.supabase.client
        .from('reservations')
        .select(`
          *,
          conducteurs!inner(
            entreprise_id,
            entreprises!inner(id, nom)
          )
        `)
        .eq('conducteurs.entreprise_id', entrepriseId)
        .gte('created_at', periodeDebut)
        .lte('created_at', periodeFin)
        .in('statut', ['completed', 'accepted']); // Seulement les courses terminées

      if (reservationsError) {
        throw reservationsError;
      }

      if (!reservations || reservations.length === 0) {
        return { success: true, montantCommission: 0 };
      }

      // Calculer le chiffre d'affaires brut
      const chiffreAffaireBrut = reservations.reduce((total: number, reservation: any) => {
        return total + (reservation.prix_total || 0);
      }, 0);

      // Récupérer les taux de commission applicables
      const { data: commissionConfig, error: configError } = await this.supabase.client
        .from('commission_config')
        .select('*')
        .or(`entreprise_id.eq.${entrepriseId},entreprise_id.is.null`)
        .eq('actif', true)
        .order('created_at', { ascending: false });

      if (configError) {
        throw configError;
      }

      // Déterminer le taux applicable (spécifique en priorité, sinon global, sinon 15%)
      let tauxApplicable = 15;
      let tauxGlobalUtilise: number | null = null;
      let tauxSpecifiqueUtilise: number | null = null;

      if (commissionConfig && commissionConfig.length > 0) {
        const tauxSpecifique = commissionConfig.find((c: any) => c.entreprise_id === entrepriseId);
        const tauxGlobal = commissionConfig.find((c: any) => c.entreprise_id === null);

        if (tauxSpecifique) {
          tauxApplicable = tauxSpecifique.taux_commission;
          tauxSpecifiqueUtilise = tauxSpecifique.taux_commission;
        } else if (tauxGlobal) {
          tauxApplicable = tauxGlobal.taux_commission;
          tauxGlobalUtilise = tauxGlobal.taux_commission;
        }
      }

      const montantCommission = (chiffreAffaireBrut * tauxApplicable) / 100;

      // Sauvegarder le détail de commission
      const commissionDetail: Partial<CommissionDetail> = {
        periode_id: periodeId,
        entreprise_id: entrepriseId,
        nombre_reservations: reservations.length,
        chiffre_affaire_brut: chiffreAffaireBrut,
        taux_commission_moyen: tauxApplicable,
        montant_commission: montantCommission,
        taux_global_utilise: tauxGlobalUtilise || undefined,
        taux_specifique_utilise: tauxSpecifiqueUtilise || undefined,
        jours_taux_global: tauxGlobalUtilise ? 30 : 0, // Approximation
        jours_taux_specifique: tauxSpecifiqueUtilise ? 30 : 0,
        statut: 'calcule',
        metadata: {
          reservations_ids: reservations.map(r => r.id),
          calcul_date: new Date().toISOString()
        }
      };

      const { error: insertError } = await this.supabase.client
        .from('commissions_detail')
        .upsert([commissionDetail], { 
          onConflict: 'periode_id,entreprise_id' 
        });

      if (insertError) {
        throw insertError;
      }

      console.log(`✅ Commission calculée pour ${entrepriseId}: ${montantCommission} GNF`);
      return { success: true, montantCommission };

    } catch (error) {
      console.error('❌ Erreur calculerCommissionEntreprise:', error);
      return { success: false, error };
    }
  }

  // ===============================================
  // GESTION DES COMMISSIONS DÉTAIL
  // ===============================================

  /**
   * Récupère les détails de commission pour une période
   */
  async getCommissionsDetail(periodeId: string): Promise<{ data: CommissionDetail[] | null, error: any }> {
    try {
      const { data, error } = await this.supabase.client
        .from('commissions_detail')
        .select(`
          *,
          entreprises!inner(nom)
        `)
        .eq('periode_id', periodeId)
        .order('montant_commission', { ascending: false });

      // Ajouter le nom d'entreprise au résultat
      const enrichedData = data?.map(item => ({
        ...item,
        entreprise_nom: item.entreprises?.nom
      })) || null;

      return { data: enrichedData, error };
    } catch (error) {
      console.error('❌ Erreur getCommissionsDetail:', error);
      return { data: null, error };
    }
  }

  /**
   * Récupère toutes les réservations d'une période avec détails complets
   */
  async getReservationsPeriode(periodeDebut: string, periodeFin: string): Promise<{ data: any[] | null, error: any }> {
    try {
      const { data, error } = await this.supabase.client
        .from('reservations')
        .select(`
          id,
          conducteur_id,
          client_phone,
          depart_nom,
          destination_nom,
          prix_total,
          distance_km,
          statut,
          created_at,
          updated_at,
          code_validation,
          date_code_validation,
          commentaire,
          note_conducteur,
          conducteurs!inner(
            nom,
            telephone,
            entreprise_id,
            entreprises!inner(
              id,
              nom
            )
          )
        `)
        .gte('created_at', periodeDebut)
        .lte('created_at', periodeFin)
        .in('statut', ['completed', 'accepted'])
        .order('created_at', { ascending: false });

      // Enrichir les données pour un accès plus facile
      const enrichedData = data?.map((reservation: any) => {
        // Gérer le cas où conducteurs est un tableau ou un objet
        const conducteur = Array.isArray(reservation.conducteurs) 
          ? reservation.conducteurs[0] 
          : reservation.conducteurs;
        
        const entreprise = Array.isArray(conducteur?.entreprises)
          ? conducteur.entreprises[0]
          : conducteur?.entreprises;

        return {
          ...reservation,
          // Mapper vers l'interface attendue par la page
          customer_name: `Client ${reservation.client_phone?.slice(-4) || 'Anonyme'}`,
          customer_phone: reservation.client_phone || '',
          pickup_location: reservation.depart_nom || 'Lieu de départ',
          destination: reservation.destination_nom || 'Destination',
          pickup_date: reservation.created_at?.split('T')[0] || '',
          pickup_time: reservation.created_at?.split('T')[1]?.slice(0, 5) || '',
          conducteur: {
            nom: conducteur?.nom || 'Conducteur inconnu',
            telephone: conducteur?.telephone || '',
            entreprise: {
              id: entreprise?.id || '',
              nom: entreprise?.nom || 'Entreprise inconnue'
            }
          }
        };
      }) || null;

      return { data: enrichedData, error };
    } catch (error) {
      console.error('❌ Erreur getReservationsPeriode:', error);
      return { data: null, error };
    }
  }

  // ===============================================
  // STATISTIQUES FINANCIÈRES
  // ===============================================

  /**
   * Récupère les statistiques financières globales
   */
  async getStatistiquesFinancieres(): Promise<{ data: StatistiquesFinancieres | null, error: any }> {
    try {
      console.log('📊 Chargement des statistiques financières...');

      // Statistiques période courante
      const { data: periodeCourante } = await this.supabase.client
        .from('facturation_periodes')
        .select('*')
        .eq('statut', 'en_cours')
        .order('periode_debut', { ascending: false })
        .limit(1)
        .single();

      const stats: StatistiquesFinancieres = {
        periode_courante: {
          total_commissions: periodeCourante?.total_commissions || 0,
          total_facture: periodeCourante?.total_facture || 0,
          total_paye: 0, // À calculer
          taux_recouvrement: 0,
          nombre_entreprises: periodeCourante?.nombre_entreprises || 0
        },
        retards_paiement: {
          total_en_retard: 0,
          montant_en_retard: 0,
          nombre_relances_actives: 0
        },
        evolution_mensuelle: []
      };

      return { data: stats, error: null };

    } catch (error) {
      console.error('❌ Erreur getStatistiquesFinancieres:', error);
      return { data: null, error };
    }
  }

  // ===============================================
  // GESTION DES PAIEMENTS DE COMMISSION
  // ===============================================

  /**
   * Marque une commission comme payée
   */
  async marquerCommissionPayee(
    commissionId: string, 
    dateVersement: string
  ): Promise<{ success: boolean, error?: any }> {
    try {
      console.log(`💰 Marquage commission ${commissionId} comme payée...`);

      const { error } = await this.supabase.client
        .from('commissions_detail')
        .update({
          statut_paiement: 'paye',
          date_versement_commission: dateVersement,
          updated_at: new Date().toISOString()
        })
        .eq('id', commissionId);

      if (error) {
        throw error;
      }

      console.log(`✅ Commission ${commissionId} marquée comme payée`);
      return { success: true };

    } catch (error) {
      console.error('❌ Erreur marquerCommissionPayee:', error);
      return { success: false, error };
    }
  }

  /**
   * Marque une commission comme non payée
   */
  async marquerCommissionNonPayee(commissionId: string): Promise<{ success: boolean, error?: any }> {
    try {
      console.log(`💰 Marquage commission ${commissionId} comme non payée...`);

      const { error } = await this.supabase.client
        .from('commissions_detail')
        .update({
          statut_paiement: 'non_paye',
          date_versement_commission: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', commissionId);

      if (error) {
        throw error;
      }

      console.log(`✅ Commission ${commissionId} marquée comme non payée`);
      return { success: true };

    } catch (error) {
      console.error('❌ Erreur marquerCommissionNonPayee:', error);
      return { success: false, error };
    }
  }

  // ===============================================
  // UTILITAIRES
  // ===============================================

  /**
   * Formate un montant en devise locale
   */
  formatPrice(amount: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'GNF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  /**
   * Formate une date
   */
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC'
    });
  }
}