import { Injectable } from '@angular/core';
import { SupabaseService } from '../../services/supabase.service';

// Interfaces
export interface Conducteur {
  id: string;
  nom: string;
  prenom: string;
  telephone: string;
  adresse?: string;
  permis_numero?: string;
  date_naissance?: string;
  vehicule_marque?: string;
  vehicule_modele?: string;
  vehicule_immatriculation?: string;
  vehicule_annee?: number;
  actif: boolean;
  first_login?: boolean;
  entreprise_id?: string;
  date_inscription: string;
  derniere_activite: string;
  password?: string;
  entreprise?: {
    id: string;
    nom: string;
  };
}

export interface PasswordResetHistory {
  id: string;
  entity_type: 'conducteur' | 'entreprise';
  entity_id: string;
  entreprise_id?: string;
  reset_by: string;
  reset_at: string;
  ip_address?: string;
  user_agent?: string;
  reset_reason?: string;
}

export interface PasswordResetStats {
  total_resets: number;
  conducteur_resets: number;
  entreprise_resets: number;
  unique_conducteurs: number;
  unique_entreprises: number;
  independent_resets: number;
  entreprise_linked_resets: number;
}

@Injectable({
  providedIn: 'root'
})
export class ConducteurManagementService {

  constructor(private supabase: SupabaseService) {}

  // Récupérer tous les conducteurs avec leur statut de mot de passe
  async getConducteursWithPasswordStatus(): Promise<Conducteur[]> {
    try {
      const { data, error } = await this.supabase.client
        .from('conducteurs')
        .select(`
          *,
          entreprise:entreprises(id, nom)
        `)
        .order('date_inscription', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erreur récupération conducteurs:', error);
      return [];
    }
  }

  // Récupérer un conducteur spécifique
  async getConducteurById(conducteurId: string): Promise<Conducteur | null> {
    try {
      const { data, error } = await this.supabase.client
        .from('conducteurs')
        .select(`
          *,
          entreprise:entreprises(id, nom)
        `)
        .eq('id', conducteurId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erreur récupération conducteur:', error);
      return null;
    }
  }

  // Réinitialiser le mot de passe d'un conducteur
  async resetConducteurPassword(
    conducteurId: string, 
    resetBy: string = 'Super Admin',
    resetReason?: string
  ): Promise<{ success: boolean; error?: any; conducteur?: Conducteur }> {
    try {
      console.log('🔒 Réinitialisation mot de passe conducteur:', conducteurId);

      // 1. Récupérer les infos du conducteur
      const { data: conducteur, error: fetchError } = await this.supabase.client
        .from('conducteurs')
        .select('id, nom, prenom, entreprise_id, telephone')
        .eq('id', conducteurId)
        .single();

      if (fetchError || !conducteur) {
        throw new Error('Conducteur non trouvé');
      }

      // 2. Réinitialiser le mot de passe
      const { error: updateError } = await this.supabase.client
        .from('conducteurs')
        .update({
          password: null,
          first_login: true,
          derniere_activite: new Date().toISOString()
        })
        .eq('id', conducteurId);

      if (updateError) {
        throw updateError;
      }

      // 3. Enregistrer dans l'historique
      try {
        const { error: historyError } = await this.supabase.client
          .from('password_reset_history')
          .insert({
            entity_type: 'conducteur',
            entity_id: conducteurId,
            entreprise_id: conducteur.entreprise_id,
            reset_by: resetBy,
            reset_reason: resetReason || 'Réinitialisation manuelle par Super Admin',
            user_agent: navigator.userAgent,
            // ip_address sera géré côté serveur si nécessaire
          });

        if (historyError) {
          console.error('⚠️ Erreur enregistrement historique:', historyError);
          // Ne pas bloquer si l'historique échoue
        }
      } catch (histErr) {
        console.error('⚠️ Historique non enregistré:', histErr);
      }

      console.log('✅ Mot de passe conducteur réinitialisé avec succès');
      
      return { 
        success: true, 
        conducteur: conducteur as Conducteur 
      };

    } catch (error) {
      console.error('❌ Erreur réinitialisation mot de passe conducteur:', error);
      return { success: false, error };
    }
  }

  // Récupérer l'historique des réinitialisations
  async getPasswordResetHistory(filters?: {
    entrepriseId?: string;
    entityType?: 'conducteur' | 'entreprise';
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<PasswordResetHistory[]> {
    try {
      let query = this.supabase.client
        .from('v_password_reset_history')
        .select('*')
        .order('reset_at', { ascending: false });

      if (filters?.entrepriseId) {
        query = query.eq('entreprise_id', filters.entrepriseId);
      }
      
      if (filters?.entityType) {
        query = query.eq('entity_type', filters.entityType);
      }
      
      if (filters?.startDate) {
        query = query.gte('reset_at', filters.startDate);
      }
      
      if (filters?.endDate) {
        query = query.lte('reset_at', filters.endDate);
      }

      const { data, error } = await query.limit(filters?.limit || 100);
      
      if (error) {
        console.error('Erreur récupération historique:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Erreur getPasswordResetHistory:', error);
      return [];
    }
  }

  // Obtenir les statistiques de réinitialisation
  async getPasswordResetStats(entrepriseId?: string, daysBack: number = 30): Promise<PasswordResetStats | null> {
    try {
      const { data, error } = await this.supabase.client
        .rpc('get_password_reset_stats', {
          p_entreprise_id: entrepriseId || null,
          p_days_back: daysBack
        });

      if (error) throw error;
      return data?.[0] || null;
    } catch (error) {
      console.error('Erreur getPasswordResetStats:', error);
      return null;
    }
  }

  // Statistiques par entreprise
  async getResetStatsByEntreprise(entrepriseId: string): Promise<{
    total_resets: number;
    conducteurs_affected: number;
    last_reset: string | null;
    conducteurs_with_first_login: number;
    conducteurs_without_password: number;
  }> {
    try {
      // Historique des réinitialisations
      const { data: history } = await this.supabase.client
        .from('password_reset_history')
        .select('*')
        .eq('entreprise_id', entrepriseId)
        .eq('entity_type', 'conducteur')
        .order('reset_at', { ascending: false });

      // Conducteurs actuels
      const { data: conducteurs } = await this.supabase.client
        .from('conducteurs')
        .select('id, first_login, password')
        .eq('entreprise_id', entrepriseId);

      const uniqueConducteurs = new Set(history?.map(h => h.entity_id) || []);

      return {
        total_resets: history?.length || 0,
        conducteurs_affected: uniqueConducteurs.size,
        last_reset: history?.[0]?.reset_at || null,
        conducteurs_with_first_login: conducteurs?.filter(c => c.first_login).length || 0,
        conducteurs_without_password: conducteurs?.filter(c => !c.password).length || 0
      };
    } catch (error) {
      console.error('Erreur getResetStatsByEntreprise:', error);
      return {
        total_resets: 0,
        conducteurs_affected: 0,
        last_reset: null,
        conducteurs_with_first_login: 0,
        conducteurs_without_password: 0
      };
    }
  }

  // Activer/Désactiver un conducteur
  async toggleConducteurStatus(conducteurId: string, actif: boolean): Promise<{ success: boolean; error?: any }> {
    try {
      const { error } = await this.supabase.client
        .from('conducteurs')
        .update({ 
          actif,
          derniere_activite: new Date().toISOString()
        })
        .eq('id', conducteurId);

      if (error) throw error;
      
      console.log(`✅ Conducteur ${actif ? 'activé' : 'désactivé'} avec succès`);
      return { success: true };
    } catch (error) {
      console.error('❌ Erreur toggle conducteur status:', error);
      return { success: false, error };
    }
  }

  // Rechercher des conducteurs
  async searchConducteurs(searchTerm: string): Promise<Conducteur[]> {
    try {
      const { data, error } = await this.supabase.client
        .from('conducteurs')
        .select(`
          *,
          entreprise:entreprises(id, nom)
        `)
        .or(`nom.ilike.%${searchTerm}%,prenom.ilike.%${searchTerm}%,telephone.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
        .order('nom', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erreur recherche conducteurs:', error);
      return [];
    }
  }
}