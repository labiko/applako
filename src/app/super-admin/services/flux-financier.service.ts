/**
 * SERVICE DE GESTION DU FLUX FINANCIER
 * Calcul et gestion Mobile Money vs Cash
 * SANS RÉGRESSION : Service autonome qui enrichit les données sans modifier l'existant
 */

import { Injectable } from '@angular/core';
import { SupabaseService } from '../../services/supabase.service';

export interface FluxFinancierPeriode {
  periode_id: string;
  entreprise_id: string;
  entreprise_nom?: string;
  
  // Données de base (existantes)
  nombre_reservations_total: number;
  ca_total: number;
  taux_commission: number;
  commission_totale: number;
  
  // Nouvelles données Mobile Money vs Cash
  nombre_reservations_mobile: number;
  nombre_reservations_cash: number;
  ca_mobile_money: number;
  ca_cash: number;
  
  // Calculs financiers
  montant_encaisse: number; // Reçu via MM
  montant_a_reverser: number; // Dû à l'entreprise
  montant_commission_cash: number; // Dû par l'entreprise
  balance_nette: number; // Positif = on doit, Négatif = on nous doit
  statut_balance: 'crediteur' | 'debiteur' | 'equilibre';
  
  // Détails
  reservations_mobile_ids: string[];
  reservations_cash_ids: string[];
  
  // Métadonnées
  flux_calcule: boolean;
  date_calcul?: string;
}

export interface BalanceEntreprise {
  entreprise_id: string;
  entreprise_nom: string;
  total_a_reverser: number;
  total_a_collecter: number;
  balance_courante: number;
  nombre_periodes: number;
  derniere_mise_a_jour: string;
}

@Injectable({
  providedIn: 'root'
})
export class FluxFinancierService {

  constructor(private supabase: SupabaseService) {}

  /**
   * Calcule le flux financier Mobile Money vs Cash pour une période
   * SANS RÉGRESSION : N'affecte pas les calculs existants
   */
  async calculerFluxFinancierPeriode(
    periodeId: string, 
    options = { updateDatabase: false }
  ): Promise<{ success: boolean, data?: FluxFinancierPeriode[], error?: any }> {
    try {
      console.log('💰 Calcul flux financier pour période:', periodeId);

      // 1. Récupérer les données de la période
      const { data: periode, error: periodeError } = await this.supabase.client
        .from('facturation_periodes')
        .select('*')
        .eq('id', periodeId)
        .single();

      if (periodeError || !periode) {
        throw new Error('Période non trouvée');
      }

      // 2. Récupérer les commissions existantes (sans les modifier)
      const { data: commissionsExistantes, error: commissionsError } = await this.supabase.client
        .from('commissions_detail')
        .select(`
          *,
          entreprises!inner(id, nom)
        `)
        .eq('periode_id', periodeId);

      if (commissionsError) {
        throw commissionsError;
      }

      const resultats: FluxFinancierPeriode[] = [];

      // 3. Pour chaque entreprise, calculer le flux MM vs Cash
      for (const commission of commissionsExistantes || []) {
        const fluxEntreprise = await this.calculerFluxEntreprise(
          periode,
          commission.entreprise_id,
          commission
        );

        if (fluxEntreprise) {
          resultats.push({
            ...fluxEntreprise,
            entreprise_nom: commission.entreprises?.nom
          });

          // 4. Optionnel : Mettre à jour la base de données
          if (options.updateDatabase) {
            await this.updateCommissionDetail(commission.id, fluxEntreprise);
          }
        }
      }

      console.log(`✅ Flux calculé pour ${resultats.length} entreprises`);
      return { success: true, data: resultats };

    } catch (error) {
      console.error('❌ Erreur calculerFluxFinancierPeriode:', error);
      return { success: false, error };
    }
  }

  /**
   * Calcule le flux pour une entreprise spécifique
   */
  private async calculerFluxEntreprise(
    periode: any,
    entrepriseId: string,
    commissionExistante: any
  ): Promise<FluxFinancierPeriode | null> {
    try {
      // Récupérer toutes les réservations validées de l'entreprise sur la période
      const { data: reservations, error } = await this.supabase.client
        .from('reservations')
        .select(`
          id,
          prix_total,
          date_code_validation,
          conducteurs!inner(entreprise_id)
        `)
        .eq('conducteurs.entreprise_id', entrepriseId)
        .gte('created_at', periode.periode_debut)
        .lt('created_at', new Date(periode.periode_fin + 'T23:59:59.999Z').toISOString())
        .not('date_code_validation', 'is', null);

      if (error) throw error;

      // Identifier Mobile Money vs Cash
      const { mobileMoneyData, cashData } = await this.separerMobileMoneyVsCash(reservations || []);

      // Récupérer le taux de commission
      const tauxCommission = commissionExistante.taux_commission_moyen || 11;

      // Calculs financiers
      const montantEncaisse = mobileMoneyData.total; // 100% du MM
      const montantCommissionMM = montantEncaisse * (tauxCommission / 100);
      const montantAReverser = montantEncaisse - montantCommissionMM; // 89% si taux = 11%
      
      const montantCommissionCash = cashData.total * (tauxCommission / 100);
      
      const balanceNette = montantAReverser - montantCommissionCash;
      
      return {
        periode_id: periode.id,
        entreprise_id: entrepriseId,
        
        // Données existantes (ne pas modifier)
        nombre_reservations_total: commissionExistante.nombre_reservations,
        ca_total: commissionExistante.chiffre_affaire_brut,
        taux_commission: tauxCommission,
        commission_totale: commissionExistante.montant_commission,
        
        // Nouvelles données
        nombre_reservations_mobile: mobileMoneyData.count,
        nombre_reservations_cash: cashData.count,
        ca_mobile_money: mobileMoneyData.total,
        ca_cash: cashData.total,
        
        montant_encaisse: montantEncaisse,
        montant_a_reverser: montantAReverser,
        montant_commission_cash: montantCommissionCash,
        balance_nette: balanceNette,
        statut_balance: this.getStatutBalance(balanceNette),
        
        reservations_mobile_ids: mobileMoneyData.ids,
        reservations_cash_ids: cashData.ids,
        
        flux_calcule: true,
        date_calcul: new Date().toISOString()
      };

    } catch (error) {
      console.error(`❌ Erreur calcul entreprise ${entrepriseId}:`, error);
      return null;
    }
  }

  /**
   * Sépare les réservations Mobile Money vs Cash
   */
  private async separerMobileMoneyVsCash(reservations: any[]) {
    const reservationIds = reservations.map(r => r.id);
    
    // Récupérer les paiements Mobile Money SUCCESS
    const { data: paiementsMM, error } = await this.supabase.client
      .from('lengopay_payments')
      .select('reservation_id')
      .in('reservation_id', reservationIds)
      .eq('status', 'SUCCESS');

    const mobileMoneyIds = new Set(paiementsMM?.map(p => p.reservation_id) || []);

    const mobileMoneyData = {
      ids: [] as string[],
      count: 0,
      total: 0
    };

    const cashData = {
      ids: [] as string[],
      count: 0,
      total: 0
    };

    for (const reservation of reservations) {
      if (mobileMoneyIds.has(reservation.id)) {
        mobileMoneyData.ids.push(reservation.id);
        mobileMoneyData.count++;
        mobileMoneyData.total += reservation.prix_total || 0;
      } else {
        cashData.ids.push(reservation.id);
        cashData.count++;
        cashData.total += reservation.prix_total || 0;
      }
    }

    return { mobileMoneyData, cashData };
  }

  /**
   * Met à jour les données dans commissions_detail
   */
  private async updateCommissionDetail(
    commissionId: string, 
    fluxData: FluxFinancierPeriode
  ): Promise<void> {
    try {
      const { error } = await this.supabase.client
        .from('commissions_detail')
        .update({
          ca_mobile_money: fluxData.ca_mobile_money,
          ca_cash: fluxData.ca_cash,
          nombre_reservations_mobile: fluxData.nombre_reservations_mobile,
          nombre_reservations_cash: fluxData.nombre_reservations_cash,
          montant_encaisse: fluxData.montant_encaisse,
          montant_a_reverser: fluxData.montant_a_reverser,
          montant_commission_cash: fluxData.montant_commission_cash,
          balance_nette: fluxData.balance_nette,
          statut_balance: fluxData.statut_balance,
          reservations_mobile_ids: fluxData.reservations_mobile_ids,
          reservations_cash_ids: fluxData.reservations_cash_ids,
          flux_financier_calcule: true,
          date_calcul_flux: fluxData.date_calcul,
          updated_at: new Date().toISOString()
        })
        .eq('id', commissionId);

      if (error) throw error;

    } catch (error) {
      console.error('❌ Erreur update commission detail:', error);
    }
  }

  /**
   * Génère les enregistrements de reversement et collecte
   */
  async genererEnregistrementsFinanciers(
    periodeId: string,
    fluxData: FluxFinancierPeriode[]
  ): Promise<{ success: boolean, error?: any }> {
    try {
      console.log('📝 Génération enregistrements financiers...');

      for (const flux of fluxData) {
        // 1. Créer enregistrement reversement si montant > 0
        if (flux.montant_a_reverser > 0) {
          await this.creerReversement(periodeId, flux);
        }

        // 2. Créer enregistrement collecte si commission cash > 0
        if (flux.montant_commission_cash > 0) {
          await this.creerCollecte(periodeId, flux);
        }

        // 3. Mettre à jour la balance entreprise
        await this.updateBalanceEntreprise(flux);
      }

      console.log('✅ Enregistrements financiers créés');
      return { success: true };

    } catch (error) {
      console.error('❌ Erreur génération enregistrements:', error);
      return { success: false, error };
    }
  }

  /**
   * Crée un enregistrement de reversement
   */
  private async creerReversement(periodeId: string, flux: FluxFinancierPeriode): Promise<void> {
    const { error } = await this.supabase.client
      .from('reversements_entreprises')
      .upsert({
        periode_id: periodeId,
        entreprise_id: flux.entreprise_id,
        montant_mobile_money_encaisse: flux.montant_encaisse,
        taux_commission_applique: flux.taux_commission,
        montant_commission_retenue: flux.montant_encaisse - flux.montant_a_reverser,
        montant_a_reverser: flux.montant_a_reverser,
        statut: 'en_attente'
      }, {
        onConflict: 'periode_id,entreprise_id'
      });

    if (error) {
      console.error('❌ Erreur création reversement:', error);
    }
  }

  /**
   * Crée un enregistrement de collecte
   */
  private async creerCollecte(periodeId: string, flux: FluxFinancierPeriode): Promise<void> {
    const { error } = await this.supabase.client
      .from('collectes_commissions_cash')
      .upsert({
        periode_id: periodeId,
        entreprise_id: flux.entreprise_id,
        ca_cash_total: flux.ca_cash,
        taux_commission_applique: flux.taux_commission,
        montant_du: flux.montant_commission_cash,
        statut: 'en_attente'
      }, {
        onConflict: 'periode_id,entreprise_id'
      });

    if (error) {
      console.error('❌ Erreur création collecte:', error);
    }
  }

  /**
   * Met à jour la balance globale de l'entreprise
   */
  private async updateBalanceEntreprise(flux: FluxFinancierPeriode): Promise<void> {
    // Récupérer la balance actuelle (peut ne pas exister)
    const { data: balanceData } = await this.supabase.client
      .from('balance_entreprises')
      .select('*')
      .eq('entreprise_id', flux.entreprise_id)
      .limit(1);
    
    const balanceActuelle = balanceData?.[0] || null;

    const nouvelleBalance = {
      entreprise_id: flux.entreprise_id,
      total_a_reverser: (balanceActuelle?.total_a_reverser || 0) + flux.montant_a_reverser,
      total_a_collecter: (balanceActuelle?.total_a_collecter || 0) + flux.montant_commission_cash,
      balance_courante: 0, // Sera calculée après
      total_mobile_money_encaisse: (balanceActuelle?.total_mobile_money_encaisse || 0) + flux.montant_encaisse,
      total_ca_cash: (balanceActuelle?.total_ca_cash || 0) + flux.ca_cash,
      nombre_periodes_traitees: (balanceActuelle?.nombre_periodes_traitees || 0) + 1,
      date_derniere_mise_a_jour: new Date().toISOString()
    };

    // Calculer la balance courante
    nouvelleBalance.balance_courante = nouvelleBalance.total_a_reverser - nouvelleBalance.total_a_collecter;

    // Upsert
    const { error } = await this.supabase.client
      .from('balance_entreprises')
      .upsert(nouvelleBalance, {
        onConflict: 'entreprise_id'
      });

    if (error) {
      console.error('❌ Erreur update balance entreprise:', error);
    }
  }

  /**
   * Détermine le statut de la balance
   */
  private getStatutBalance(balance: number): 'crediteur' | 'debiteur' | 'equilibre' {
    if (balance > 0) return 'crediteur'; // Admin doit
    if (balance < 0) return 'debiteur'; // Entreprise doit
    return 'equilibre';
  }

  /**
   * Récupère les balances de toutes les entreprises
   */
  async getBalancesEntreprises(): Promise<{ data: BalanceEntreprise[] | null, error: any }> {
    try {
      const { data, error } = await this.supabase.client
        .from('balance_entreprises')
        .select(`
          *,
          entreprises!inner(nom)
        `)
        .order('balance_courante', { ascending: false });

      const enrichedData = data?.map(item => ({
        ...item,
        entreprise_nom: item.entreprises?.nom
      })) || null;

      return { data: enrichedData, error };

    } catch (error) {
      console.error('❌ Erreur getBalancesEntreprises:', error);
      return { data: null, error };
    }
  }

  /**
   * Récupère le détail du flux financier d'une période
   */
  async getFluxFinancierPeriode(periodeId: string): Promise<{ data: any[] | null, error: any }> {
    try {
      const { data, error } = await this.supabase.client
        .from('commissions_detail')
        .select(`
          *,
          entreprises!inner(nom)
        `)
        .eq('periode_id', periodeId)
        .eq('flux_financier_calcule', true);

      return { data, error };

    } catch (error) {
      console.error('❌ Erreur getFluxFinancierPeriode:', error);
      return { data: null, error };
    }
  }
}