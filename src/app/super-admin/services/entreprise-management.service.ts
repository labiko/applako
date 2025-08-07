/**
 * SERVICE GESTION DES ENTREPRISES SUPER-ADMIN
 * Création, modification et gestion des entreprises
 */

import { Injectable } from '@angular/core';
import { SupabaseService } from '../../services/supabase.service';

export interface Entreprise {
  id: string;
  nom: string;
  email: string;
  telephone: string;
  adresse: string;
  siret?: string;
  responsable?: string;
  actif: boolean;
  first_login: boolean;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
  password_hash?: string;
}

export interface CreateEntrepriseData {
  nom: string;
  email: string;
  telephone: string;
  adresse: string;
  siret?: string;
  responsable?: string;
}

export interface EntrepriseStats {
  total_entreprises: number;
  entreprises_actives: number;
  entreprises_inactives: number;
  nouveaux_ce_mois: number;
  total_conducteurs: number;
  total_reservations: number;
  ca_total: number;
}

@Injectable({
  providedIn: 'root'
})
export class EntrepriseManagementService {

  constructor(private supabase: SupabaseService) {}

  /**
   * Récupérer toutes les entreprises avec statistiques
   */
  async getAllEntreprises(): Promise<{ data: Entreprise[] | null, error: any }> {
    try {
      console.log('📊 Récupération de toutes les entreprises...');

      const { data, error } = await this.supabase.client
        .from('entreprises')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      console.log(`✅ ${data?.length || 0} entreprises récupérées`);
      return { data, error: null };

    } catch (error) {
      console.error('❌ Erreur récupération entreprises:', error);
      return { data: null, error };
    }
  }

  /**
   * Créer une nouvelle entreprise
   */
  async createEntreprise(entrepriseData: CreateEntrepriseData): Promise<{ data: Entreprise | null, error: any }> {
    try {
      console.log('🏢 Création nouvelle entreprise:', entrepriseData.nom);

      // Vérifier si l'email existe déjà
      const { data: existingEntreprise } = await this.supabase.client
        .from('entreprises')
        .select('email')
        .eq('email', entrepriseData.email)
        .single();

      if (existingEntreprise) {
        throw new Error('Une entreprise avec cet email existe déjà');
      }

      // Créer l'entreprise avec les valeurs par défaut
      const { data, error } = await this.supabase.client
        .from('entreprises')
        .insert([{
          nom: entrepriseData.nom,
          email: entrepriseData.email,
          telephone: entrepriseData.telephone,
          adresse: entrepriseData.adresse,
          siret: entrepriseData.siret || null,
          responsable: entrepriseData.responsable || null,
          actif: true,
          first_login: true,   // Valeur par défaut modifiée
          is_admin: false,     // Valeur par défaut demandée
          password_hash: null  // Pas de mot de passe initial
        }])
        .select()
        .single();

      if (error) {
        throw error;
      }

      console.log('✅ Entreprise créée avec succès:', data.id);
      return { data, error: null };

    } catch (error) {
      console.error('❌ Erreur création entreprise:', error);
      return { data: null, error };
    }
  }

  /**
   * Réinitialiser le mot de passe d'une entreprise
   */
  async resetEntreprisePassword(entrepriseId: string): Promise<{ success: boolean, error?: any }> {
    try {
      console.log('🔒 Réinitialisation mot de passe entreprise:', entrepriseId);

      const { error } = await this.supabase.client
        .from('entreprises')
        .update({
          password_hash: null,
          first_login: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', entrepriseId);

      if (error) {
        throw error;
      }

      console.log('✅ Mot de passe réinitialisé avec succès');
      return { success: true };

    } catch (error) {
      console.error('❌ Erreur réinitialisation mot de passe:', error);
      return { success: false, error };
    }
  }

  /**
   * Activer/désactiver une entreprise (méthode simple pour compatibilité)
   */
  async toggleEntrepriseStatus(entrepriseId: string, actif: boolean): Promise<{ success: boolean, error?: any }> {
    try {
      console.log(`📊 ${actif ? 'Activation' : 'Désactivation'} entreprise:`, entrepriseId);

      const { error } = await this.supabase.client
        .from('entreprises')
        .update({
          actif: actif,
          updated_at: new Date().toISOString()
        })
        .eq('id', entrepriseId);

      if (error) {
        throw error;
      }

      console.log(`✅ Entreprise ${actif ? 'activée' : 'désactivée'} avec succès`);
      return { success: true };

    } catch (error) {
      console.error('❌ Erreur modification statut entreprise:', error);
      return { success: false, error };
    }
  }

  /**
   * Désactiver une entreprise avec motif (nouveau système de blocage)
   */
  async desactiverEntrepriseAvecMotif(entrepriseId: string, motif: string, desactivePar: string): Promise<{ success: boolean, error?: any }> {
    try {
      console.log('🔒 Désactivation entreprise avec motif:', entrepriseId);

      const { error } = await this.supabase.client
        .from('entreprises')
        .update({
          actif: false,
          motif_desactivation: motif,
          date_desactivation: new Date().toISOString(),
          desactive_par: desactivePar,
          updated_at: new Date().toISOString()
        })
        .eq('id', entrepriseId);

      if (error) {
        throw error;
      }

      console.log('✅ Entreprise désactivée avec motif avec succès');
      return { success: true };

    } catch (error) {
      console.error('❌ Erreur désactivation entreprise avec motif:', error);
      return { success: false, error };
    }
  }

  /**
   * Réactiver une entreprise
   */
  async reactiverEntreprise(entrepriseId: string, reactivePar: string): Promise<{ success: boolean, error?: any }> {
    try {
      console.log('🔓 Réactivation entreprise:', entrepriseId);

      const { error } = await this.supabase.client
        .from('entreprises')
        .update({
          actif: true,
          motif_desactivation: null,
          date_desactivation: null,
          desactive_par: reactivePar,
          updated_at: new Date().toISOString()
        })
        .eq('id', entrepriseId);

      if (error) {
        throw error;
      }

      console.log('✅ Entreprise réactivée avec succès');
      return { success: true };

    } catch (error) {
      console.error('❌ Erreur réactivation entreprise:', error);
      return { success: false, error };
    }
  }

  /**
   * Bloquer un conducteur par super-admin
   */
  async bloquerConducteur(conducteurId: string, motif: string, raison: string, bloquePar: string): Promise<{ success: boolean, error?: any }> {
    try {
      console.log('🔒 Blocage conducteur par super-admin:', conducteurId);

      const { error } = await this.supabase.client
        .from('conducteurs')
        .update({
          actif: false,
          motif_blocage: motif,
          bloque_par: 'super-admin',
          date_blocage: new Date().toISOString()
        })
        .eq('id', conducteurId);

      if (error) {
        throw error;
      }

      console.log('✅ Conducteur bloqué avec succès par super-admin');
      return { success: true };

    } catch (error) {
      console.error('❌ Erreur blocage conducteur:', error);
      return { success: false, error };
    }
  }

  /**
   * Débloquer un conducteur
   */
  async debloquerConducteur(conducteurId: string): Promise<{ success: boolean, error?: any }> {
    try {
      console.log('🔓 Déblocage conducteur:', conducteurId);

      const { error } = await this.supabase.client
        .from('conducteurs')
        .update({
          actif: true,
          motif_blocage: null,
          bloque_par: null,
          date_blocage: null
        })
        .eq('id', conducteurId);

      if (error) {
        throw error;
      }

      console.log('✅ Conducteur débloqué avec succès');
      return { success: true };

    } catch (error) {
      console.error('❌ Erreur déblocage conducteur:', error);
      return { success: false, error };
    }
  }

  /**
   * Récupérer les statistiques des entreprises
   */
  async getEntreprisesStats(): Promise<{ data: EntrepriseStats | null, error: any }> {
    try {
      console.log('📈 Calcul statistiques entreprises...');

      // Récupérer toutes les entreprises
      const { data: entreprises, error: entreprisesError } = await this.supabase.client
        .from('entreprises')
        .select('*');

      if (entreprisesError) {
        throw entreprisesError;
      }

      // Récupérer le nombre de conducteurs
      const { count: totalConducteurs, error: conducteursError } = await this.supabase.client
        .from('conducteurs')
        .select('*', { count: 'exact', head: true });

      if (conducteursError) {
        throw conducteursError;
      }

      // Récupérer le nombre de réservations et CA total
      const { data: reservationsStats, error: reservationsError } = await this.supabase.client
        .from('reservations')
        .select('prix_total')
        .in('statut', ['completed', 'accepted']);

      if (reservationsError) {
        throw reservationsError;
      }

      // Calculer les statistiques
      const now = new Date();
      const debutMois = new Date(now.getFullYear(), now.getMonth(), 1);

      const stats: EntrepriseStats = {
        total_entreprises: entreprises?.length || 0,
        entreprises_actives: entreprises?.filter(e => e.actif).length || 0,
        entreprises_inactives: entreprises?.filter(e => !e.actif).length || 0,
        nouveaux_ce_mois: entreprises?.filter(e => new Date(e.created_at) >= debutMois).length || 0,
        total_conducteurs: totalConducteurs || 0,
        total_reservations: reservationsStats?.length || 0,
        ca_total: reservationsStats?.reduce((sum, r) => sum + (r.prix_total || 0), 0) || 0
      };

      console.log('✅ Statistiques calculées:', stats);
      return { data: stats, error: null };

    } catch (error) {
      console.error('❌ Erreur calcul statistiques:', error);
      return { data: null, error };
    }
  }

  /**
   * Modifier une entreprise
   */
  async updateEntreprise(entrepriseId: string, updateData: Partial<CreateEntrepriseData>): Promise<{ success: boolean, error?: any }> {
    try {
      console.log('📝 Modification entreprise:', entrepriseId);

      const { error } = await this.supabase.client
        .from('entreprises')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', entrepriseId);

      if (error) {
        throw error;
      }

      console.log('✅ Entreprise modifiée avec succès');
      return { success: true };

    } catch (error) {
      console.error('❌ Erreur modification entreprise:', error);
      return { success: false, error };
    }
  }

  /**
   * Supprimer une entreprise (soft delete)
   */
  async deleteEntreprise(entrepriseId: string): Promise<{ success: boolean, error?: any }> {
    try {
      console.log('🗑️ Suppression entreprise:', entrepriseId);

      // Vérifier s'il y a des conducteurs liés
      const { data: conducteurs } = await this.supabase.client
        .from('conducteurs')
        .select('id')
        .eq('entreprise_id', entrepriseId);

      if (conducteurs && conducteurs.length > 0) {
        throw new Error(`Impossible de supprimer: ${conducteurs.length} conducteur(s) lié(s) à cette entreprise`);
      }

      // Désactiver au lieu de supprimer
      const { error } = await this.supabase.client
        .from('entreprises')
        .update({
          actif: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', entrepriseId);

      if (error) {
        throw error;
      }

      console.log('✅ Entreprise désactivée avec succès');
      return { success: true };

    } catch (error) {
      console.error('❌ Erreur suppression entreprise:', error);
      return { success: false, error };
    }
  }

  /**
   * Rechercher des entreprises
   */
  async searchEntreprises(query: string): Promise<{ data: Entreprise[] | null, error: any }> {
    try {
      console.log('🔍 Recherche entreprises:', query);

      const { data, error } = await this.supabase.client
        .from('entreprises')
        .select('*')
        .or(`nom.ilike.%${query}%,email.ilike.%${query}%,telephone.ilike.%${query}%`)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      console.log(`✅ ${data?.length || 0} entreprises trouvées`);
      return { data, error: null };

    } catch (error) {
      console.error('❌ Erreur recherche entreprises:', error);
      return { data: null, error };
    }
  }

  /**
   * Récupérer les conducteurs d'une entreprise
   */
  async getConducteursByEntreprise(entrepriseId: string): Promise<{ data: any[] | null, error: any }> {
    try {
      console.log('👥 Récupération conducteurs pour entreprise:', entrepriseId);

      const { data, error } = await this.supabase.client
        .from('conducteurs')
        .select(`
          id,
          nom,
          prenom,
          telephone,
          vehicle_type,
          vehicle_marque,
          vehicle_modele,
          vehicle_couleur,
          vehicle_plaque,
          actif,
          hors_ligne,
          note_moyenne,
          nombre_courses,
          date_inscription,
          derniere_activite,
          entreprise_id
        `)
        .eq('entreprise_id', entrepriseId)
        .order('date_inscription', { ascending: false });

      if (error) {
        throw error;
      }

      console.log(`✅ ${data?.length || 0} conducteur(s) trouvé(s)`);
      return { data, error: null };

    } catch (error) {
      console.error('❌ Erreur récupération conducteurs:', error);
      return { data: null, error };
    }
  }

  /**
   * Récupérer les réservations d'un conducteur
   */
  async getReservationsByConducteur(conducteurId: string): Promise<{ data: any[] | null, error: any }> {
    try {
      console.log('📋 Récupération réservations pour conducteur:', conducteurId);

      const { data, error } = await this.supabase.client
        .from('reservations')
        .select(`
          id,
          client_phone,
          vehicle_type,
          position_depart,
          depart_nom,
          destination_nom,
          statut,
          prix_total,
          distance_km,
          created_at,
          updated_at,
          code_validation,
          date_code_validation,
          commentaire,
          note_conducteur
        `)
        .eq('conducteur_id', conducteurId)
        .order('created_at', { ascending: false })
        .limit(10); // Limiter aux 10 dernières réservations

      if (error) {
        throw error;
      }

      console.log(`✅ ${data?.length || 0} réservation(s) trouvée(s)`);
      return { data, error: null };

    } catch (error) {
      console.error('❌ Erreur récupération réservations:', error);
      return { data: null, error };
    }
  }
}