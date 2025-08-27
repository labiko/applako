/**
 * SERVICE DE PAIEMENT DES ENTREPRISES
 * Gestion des paiements unitaires aux entreprises
 * Mise à jour des balances et historique des transactions
 */

import { Injectable } from '@angular/core';
import { SupabaseService } from '../../services/supabase.service';

export interface PaiementEntreprise {
  id?: string;
  entreprise_id: string;
  periode_id?: string;
  montant_paye: number;
  methode_paiement: 'mobile_money' | 'virement' | 'especes';
  reference_paiement?: string;
  numero_beneficiaire?: string;
  montant_reversement?: number;
  montant_compensation?: number;
  statut: 'en_attente' | 'confirme' | 'echec' | 'annule';
  date_paiement: string;
  date_confirmation?: string;
  notes?: string;
  raison_echec?: string;
  balance_avant?: number;
  balance_apres?: number;
  cree_par?: string;
}

export interface EntreprisePaiementDue {
  entreprise_id: string;
  entreprise_nom: string;
  balance_courante: number;
  total_a_reverser: number;
  total_a_collecter: number;
  dernier_paiement_date?: string;
  peut_payer: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class PaiementEntrepriseService {

  constructor(private supabase: SupabaseService) {}

  /**
   * Récupère les entreprises éligibles pour un paiement
   */
  async getEntreprisesPaiementsDus(): Promise<{ data: EntreprisePaiementDue[] | null, error: any }> {
    try {
      const { data, error } = await this.supabase.client
        .rpc('get_entreprises_paiements_dus');

      if (error) {
        console.error('❌ Erreur getEntreprisesPaiementsDus:', error);
        return { data: null, error };
      }

      return { data, error: null };

    } catch (error) {
      console.error('❌ Exception getEntreprisesPaiementsDus:', error);
      return { data: null, error };
    }
  }

  /**
   * Effectue un paiement unitaire à une entreprise
   */
  async effectuerPaiement(paiement: Partial<PaiementEntreprise>): Promise<{ success: boolean, data?: any, error?: any }> {
    try {
      console.log('💰 Traitement paiement entreprise:', paiement.entreprise_id);

      // 1. Récupérer la balance actuelle de l'entreprise
      const { data: balanceData, error: balanceError } = await this.supabase.client
        .from('balance_entreprises')
        .select('*')
        .eq('entreprise_id', paiement.entreprise_id)
        .single();

      if (balanceError) {
        throw new Error('Impossible de récupérer la balance de l\'entreprise');
      }

      const balanceAvant = balanceData.balance_courante || 0;

      // Vérifier si le montant est valide
      if (!paiement.montant_paye || paiement.montant_paye <= 0) {
        throw new Error('Le montant du paiement doit être positif');
      }

      // Vérifier si l'entreprise peut être payée
      if (balanceAvant <= 0) {
        throw new Error('Cette entreprise n\'a pas de crédit à recevoir');
      }

      // Limiter le paiement au montant dû
      const montantMaximal = Math.min(paiement.montant_paye, balanceAvant);
      const balanceApres = balanceAvant - montantMaximal;

      // 2. Créer l'enregistrement de paiement
      const paiementComplet: Partial<PaiementEntreprise> = {
        ...paiement,
        montant_paye: montantMaximal,
        balance_avant: balanceAvant,
        balance_apres: balanceApres,
        date_paiement: new Date().toISOString(),
        statut: paiement.statut || 'confirme'
      };

      const { data: paiementResult, error: paiementError } = await this.supabase.client
        .from('paiements_entreprises')
        .insert(paiementComplet)
        .select()
        .single();

      if (paiementError) {
        throw paiementError;
      }

      // 3. Mettre à jour la balance de l'entreprise
      const { error: updateBalanceError } = await this.supabase.client
        .from('balance_entreprises')
        .update({
          balance_courante: balanceApres,
          date_derniere_mise_a_jour: new Date().toISOString()
        })
        .eq('entreprise_id', paiement.entreprise_id);

      if (updateBalanceError) {
        console.error('❌ Erreur mise à jour balance:', updateBalanceError);
        // Ne pas faire échouer le paiement pour autant
      }

      // 4. Créer l'enregistrement dans l'historique des mouvements
      await this.creerMouvementBalance(
        paiement.entreprise_id!,
        paiementResult.id,
        'paiement',
        -montantMaximal, // Négatif car c'est une sortie
        balanceAvant,
        balanceApres,
        `Paiement ${paiement.methode_paiement} - ${paiement.reference_paiement || 'N/A'}`
      );

      console.log('✅ Paiement effectué avec succès:', paiementResult.id);
      return { success: true, data: paiementResult };

    } catch (error) {
      console.error('❌ Erreur effectuerPaiement:', error);
      return { success: false, error };
    }
  }

  /**
   * Crée un enregistrement de mouvement de balance
   */
  private async creerMouvementBalance(
    entrepriseId: string,
    paiementId: string,
    typeMouvement: string,
    montant: number,
    balanceAvant: number,
    balanceApres: number,
    description: string
  ): Promise<void> {
    try {
      const { error } = await this.supabase.client
        .from('mouvements_balance')
        .insert({
          entreprise_id: entrepriseId,
          paiement_id: paiementId,
          type_mouvement: typeMouvement,
          montant: montant,
          balance_avant: balanceAvant,
          balance_apres: balanceApres,
          description: description
        });

      if (error) {
        console.error('❌ Erreur création mouvement balance:', error);
      }

    } catch (error) {
      console.error('❌ Exception creerMouvementBalance:', error);
    }
  }

  /**
   * Récupère l'historique des paiements d'une entreprise
   */
  async getHistoriquePaiements(entrepriseId: string): Promise<{ data: PaiementEntreprise[] | null, error: any }> {
    try {
      const { data, error } = await this.supabase.client
        .from('paiements_entreprises')
        .select('*')
        .eq('entreprise_id', entrepriseId)
        .order('date_paiement', { ascending: false });

      return { data, error };

    } catch (error) {
      console.error('❌ Erreur getHistoriquePaiements:', error);
      return { data: null, error };
    }
  }

  /**
   * Récupère tous les paiements avec pagination
   */
  async getAllPaiements(
    limit: number = 50, 
    offset: number = 0
  ): Promise<{ data: any[] | null, error: any }> {
    try {
      const { data, error } = await this.supabase.client
        .from('paiements_entreprises')
        .select(`
          *,
          entreprises!inner(nom)
        `)
        .order('date_paiement', { ascending: false })
        .range(offset, offset + limit - 1);

      return { data, error };

    } catch (error) {
      console.error('❌ Erreur getAllPaiements:', error);
      return { data: null, error };
    }
  }

  /**
   * Annule un paiement
   */
  async annulerPaiement(
    paiementId: string, 
    raison: string
  ): Promise<{ success: boolean, error?: any }> {
    try {
      // 1. Récupérer le paiement
      const { data: paiement, error: paiementError } = await this.supabase.client
        .from('paiements_entreprises')
        .select('*')
        .eq('id', paiementId)
        .single();

      if (paiementError || !paiement) {
        throw new Error('Paiement non trouvé');
      }

      if (paiement.statut === 'annule') {
        throw new Error('Ce paiement est déjà annulé');
      }

      // 2. Rétablir la balance
      const { error: updateBalanceError } = await this.supabase.client
        .from('balance_entreprises')
        .update({
          balance_courante: paiement.balance_avant,
          date_derniere_mise_a_jour: new Date().toISOString()
        })
        .eq('entreprise_id', paiement.entreprise_id);

      if (updateBalanceError) {
        throw updateBalanceError;
      }

      // 3. Marquer le paiement comme annulé
      const { error: updatePaiementError } = await this.supabase.client
        .from('paiements_entreprises')
        .update({
          statut: 'annule',
          raison_echec: raison,
          updated_at: new Date().toISOString()
        })
        .eq('id', paiementId);

      if (updatePaiementError) {
        throw updatePaiementError;
      }

      // 4. Créer mouvement d'annulation
      await this.creerMouvementBalance(
        paiement.entreprise_id,
        paiementId,
        'annulation',
        paiement.montant_paye, // Positif car on recrédite
        paiement.balance_apres || 0,
        paiement.balance_avant || 0,
        `Annulation paiement - ${raison}`
      );

      console.log('✅ Paiement annulé avec succès:', paiementId);
      return { success: true };

    } catch (error) {
      console.error('❌ Erreur annulerPaiement:', error);
      return { success: false, error };
    }
  }
}