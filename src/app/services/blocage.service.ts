/**
 * SERVICE DE GESTION DU BLOCAGE
 * Système de désactivation entreprises et conducteurs
 */

import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { ModalController, AlertController } from '@ionic/angular';
import { SupabaseService } from './supabase.service';
import { EntrepriseAuthService } from './entreprise-auth.service';
import { AuthService } from './auth.service';
import { ConducteurBlockedModalService, ConducteurBlockedModalData } from './conducteur-blocked-modal.service';

export interface EntrepriseStatus {
  id: string;
  actif: boolean;
  motif_desactivation?: string;
  date_desactivation?: string;
  desactive_par?: string;
}

export interface ConducteurStatus {
  id: string;
  actif: boolean;
  motif_blocage?: string;
  date_blocage?: string;
  bloque_par?: 'entreprise' | 'super-admin' | 'super-admin-entreprise';
}

export interface BlockageHistorique {
  id: string;
  type: 'entreprise' | 'conducteur';
  entite_id: string;
  action: 'bloquer' | 'debloquer';
  motif: string;
  par: string;
  date: string;
}

export interface DesactivationEntrepriseData {
  entrepriseId: string;
  motif: string;
  desactiverConducteurs: boolean;
  dateDesactivation: Date;
  desactivePar: string;
}

export interface BlocageConducteurData {
  conducteurId: string;
  motif: string;
  raison: 'comportement' | 'documents' | 'demande_entreprise' | 'autre';
  dateBlocage: Date;
  bloquePar: string;
}

export interface BlocageConducteurEntreprise {
  conducteurId: string;
  motif: string;
  raison: 'absence' | 'comportement' | 'documents' | 'temporaire' | 'autre';
  duree?: 'temporaire' | 'indefini';
  dateFin?: Date;
  dateBlocage: Date;
}

@Injectable({
  providedIn: 'root'
})
export class BlockageService {
  private checkInterval: any;
  private currentBlockedModal: any = null;
  
  constructor(
    private supabase: SupabaseService,
    private router: Router,
    private modalController: ModalController,
    private alertController: AlertController,
    private entrepriseAuth: EntrepriseAuthService,
    private conducteurAuth: AuthService,
    private conducteurBlockedModal: ConducteurBlockedModalService
  ) {}

  // ==================== MONITORING ET DÉTECTION ====================

  startMonitoring(): void {
    console.log('🔍 Démarrage monitoring blocage...');
    
    // 🧪 TEST: Monitoring désactivé pour éliminer les délais
    /*
    // Vérification toutes les 30 secondes
    this.checkInterval = setInterval(() => {
      this.checkBlockageStatus();
    }, 30000);
    */

    // 🧪 TEST: Désactivé pour éliminer le délai de 10s
    // this.checkBlockageStatus();
  }

  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('⏹️ Monitoring blocage arrêté');
    }
  }

  async checkBlockageStatus(): Promise<void> {
    try {
      // Vérifier si c'est une entreprise connectée
      const entrepriseId = this.entrepriseAuth.getCurrentEntrepriseId();
      if (entrepriseId) {
        const entrepriseStatus = await this.getEntrepriseStatus(entrepriseId);
        if (entrepriseStatus && !entrepriseStatus.actif) {
          await this.handleEntrepriseBlocked(entrepriseStatus.motif_desactivation || 'Non spécifié');
          return;
        }
      }

      // Vérifier statut conducteur si c'est un conducteur connecté
      const conducteurId = this.conducteurAuth.getCurrentConducteurId();
      if (conducteurId) {
        console.log('🚗 Vérification statut conducteur:', conducteurId);
        const conducteurStatus = await this.getConducteurStatus(conducteurId);
        if (conducteurStatus && !conducteurStatus.actif) {
          console.log('⚠️ Conducteur bloqué détecté:', conducteurStatus);
          await this.handleConducteurBlocked(
            conducteurStatus.motif_blocage || 'Non spécifié',
            conducteurStatus.bloque_par || 'super-admin',
            conducteurStatus.date_blocage || new Date().toISOString()
          );
          return;
        }
      }

    } catch (error) {
      console.error('❌ Erreur vérification statut blocage:', error);
    }
  }

  // ==================== GESTION BLOCAGE ENTREPRISE ====================

  async getEntrepriseStatus(entrepriseId: string): Promise<EntrepriseStatus | null> {
    try {
      const { data, error } = await this.supabase.client
        .from('entreprises')
        .select('id, actif, motif_desactivation, date_desactivation, desactive_par')
        .eq('id', entrepriseId)
        .single();

      if (error) {
        console.error('❌ Erreur récupération statut entreprise:', error);
        return null;
      }

      return data;

    } catch (error) {
      console.error('❌ Erreur getEntrepriseStatus:', error);
      return null;
    }
  }

  async desactiverEntreprise(data: DesactivationEntrepriseData): Promise<{ success: boolean; error?: any }> {
    try {
      console.log('🔒 Désactivation entreprise:', data.entrepriseId);

      const { error } = await this.supabase.client
        .from('entreprises')
        .update({
          actif: false,
          motif_desactivation: data.motif,
          date_desactivation: data.dateDesactivation.toISOString(),
          desactive_par: data.desactivePar,
          updated_at: new Date().toISOString()
        })
        .eq('id', data.entrepriseId);

      if (error) {
        console.error('❌ Erreur désactivation entreprise:', error);
        return { success: false, error };
      }

      // Le trigger PostgreSQL se charge de bloquer les conducteurs automatiquement
      console.log('✅ Entreprise désactivée avec succès');
      return { success: true };

    } catch (error) {
      console.error('❌ Erreur globale désactivation entreprise:', error);
      return { success: false, error };
    }
  }

  async reactiverEntreprise(entrepriseId: string, reactivePar: string): Promise<{ success: boolean; error?: any }> {
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
        console.error('❌ Erreur réactivation entreprise:', error);
        return { success: false, error };
      }

      // Le trigger PostgreSQL se charge de débloquer les conducteurs automatiquement
      console.log('✅ Entreprise réactivée avec succès');
      return { success: true };

    } catch (error) {
      console.error('❌ Erreur globale réactivation entreprise:', error);
      return { success: false, error };
    }
  }

  private async handleEntrepriseBlocked(motif: string): Promise<void> {
    console.log('🚫 Entreprise bloquée détectée, redirection...');
    
    // Nettoyer les données de session
    localStorage.clear();
    sessionStorage.clear();
    
    // Rediriger vers la page de blocage
    await this.router.navigate(['/entreprise/blocked'], { 
      queryParams: { motif, type: 'entreprise' } 
    });
  }

  // ==================== GESTION BLOCAGE CONDUCTEUR ====================

  async getConducteurStatus(conducteurId: string): Promise<ConducteurStatus | null> {
    try {
      const { data, error } = await this.supabase.client
        .from('conducteurs')
        .select('id, actif, motif_blocage, date_blocage, bloque_par')
        .eq('id', conducteurId)
        .single();

      if (error) {
        console.error('❌ Erreur récupération statut conducteur:', error);
        return null;
      }

      return data;

    } catch (error) {
      console.error('❌ Erreur getConducteurStatus:', error);
      return null;
    }
  }

  async bloquerConducteurParSuperAdmin(data: BlocageConducteurData): Promise<{ success: boolean; error?: any }> {
    try {
      console.log('🔒 Blocage conducteur par super-admin:', data.conducteurId);

      const { error } = await this.supabase.client
        .from('conducteurs')
        .update({
          actif: false,
          motif_blocage: data.motif,
          bloque_par: 'super-admin',
          date_blocage: data.dateBlocage.toISOString()
        })
        .eq('id', data.conducteurId);

      if (error) {
        console.error('❌ Erreur blocage conducteur:', error);
        return { success: false, error };
      }

      console.log('✅ Conducteur bloqué avec succès par super-admin');
      return { success: true };

    } catch (error) {
      console.error('❌ Erreur globale blocage conducteur:', error);
      return { success: false, error };
    }
  }

  async bloquerConducteurParEntreprise(data: BlocageConducteurEntreprise): Promise<{ success: boolean; error?: any }> {
    try {
      const entrepriseId = this.entrepriseAuth.getCurrentEntrepriseId();
      if (!entrepriseId) {
        return { success: false, error: 'Entreprise non connectée' };
      }

      console.log('🔒 Blocage conducteur par entreprise:', data.conducteurId);

      // Vérifier que le conducteur appartient à l'entreprise
      const { data: conducteur, error: checkError } = await this.supabase.client
        .from('conducteurs')
        .select('entreprise_id')
        .eq('id', data.conducteurId)
        .single();

      if (checkError || !conducteur) {
        return { success: false, error: 'Conducteur non trouvé' };
      }

      if (conducteur.entreprise_id !== entrepriseId) {
        return { success: false, error: 'Non autorisé: conducteur d\'une autre entreprise' };
      }

      // Vérifier que l'entreprise n'est pas elle-même bloquée
      const entrepriseStatus = await this.getEntrepriseStatus(entrepriseId);
      if (entrepriseStatus && !entrepriseStatus.actif) {
        return { success: false, error: 'Entreprise désactivée: impossible de gérer les conducteurs' };
      }

      // Procéder au blocage
      const { error } = await this.supabase.client
        .from('conducteurs')
        .update({
          actif: false,
          motif_blocage: data.motif,
          bloque_par: 'entreprise',
          date_blocage: data.dateBlocage.toISOString()
        })
        .eq('id', data.conducteurId)
        .eq('entreprise_id', entrepriseId); // Double sécurité

      if (error) {
        console.error('❌ Erreur blocage conducteur par entreprise:', error);
        return { success: false, error };
      }

      console.log('✅ Conducteur bloqué avec succès par entreprise');
      return { success: true };

    } catch (error) {
      console.error('❌ Erreur globale blocage conducteur par entreprise:', error);
      return { success: false, error };
    }
  }

  async debloquerConducteur(conducteurId: string, debloquePar: string): Promise<{ success: boolean; error?: any }> {
    try {
      console.log('🔓 Déblocage conducteur:', conducteurId);

      // Si c'est une entreprise qui débloque, vérifier les permissions
      const entrepriseId = this.entrepriseAuth.getCurrentEntrepriseId();
      if (entrepriseId) {
        const { data: conducteur, error: checkError } = await this.supabase.client
          .from('conducteurs')
          .select('bloque_par, entreprise_id')
          .eq('id', conducteurId)
          .single();

        if (checkError || !conducteur) {
          return { success: false, error: 'Conducteur non trouvé' };
        }

        if (conducteur.entreprise_id !== entrepriseId) {
          return { success: false, error: 'Non autorisé' };
        }

        if (conducteur.bloque_par !== 'entreprise') {
          return { success: false, error: `Impossible de débloquer: bloqué par ${conducteur.bloque_par}` };
        }
      }

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
        console.error('❌ Erreur déblocage conducteur:', error);
        return { success: false, error };
      }

      console.log('✅ Conducteur débloqué avec succès');
      return { success: true };

    } catch (error) {
      console.error('❌ Erreur globale déblocage conducteur:', error);
      return { success: false, error };
    }
  }

  private async handleConducteurBlocked(motif: string, bloque_par?: string, date_blocage?: string): Promise<void> {
    console.log('🚫 Conducteur bloqué détecté - déconnexion immédiate');
    
    // Sauvegarder le motif du blocage dans le localStorage pour l'afficher sur la page de login
    const blocageInfo = {
      motif: motif,
      bloque_par: bloque_par || 'Administration',
      date_blocage: date_blocage || new Date().toISOString()
    };
    
    localStorage.setItem('conducteur_bloque_info', JSON.stringify(blocageInfo));
    
    // Déconnecter immédiatement le conducteur
    await this.conducteurAuth.logout();
    
    // Rediriger vers la page de login
    this.router.navigate(['/login'], { replaceUrl: true });
  }

  async showBlockedModal(motif: string, bloque_par?: string, date_blocage?: string): Promise<void> {
    const modalData: ConducteurBlockedModalData = {
      motif: motif,
      bloque_par: bloque_par || '',
      date_blocage: date_blocage || new Date().toISOString()
    };
    
    await this.conducteurBlockedModal.showBlockedModal(modalData);
  }

  // ==================== HISTORIQUE ====================

  async getHistoriqueBlocage(entiteId?: string, type?: 'entreprise' | 'conducteur'): Promise<BlockageHistorique[]> {
    try {
      let query = this.supabase.client
        .from('historique_blocages')
        .select('*')
        .order('date', { ascending: false });

      if (entiteId) {
        query = query.eq('entite_id', entiteId);
      }

      if (type) {
        query = query.eq('type', type);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Erreur récupération historique:', error);
        return [];
      }

      return data || [];

    } catch (error) {
      console.error('❌ Erreur getHistoriqueBlocage:', error);
      return [];
    }
  }

  // ==================== MÉTHODES HELPER ====================

  getBlockedByLabel(bloquePar: string): string {
    switch (bloquePar) {
      case 'super-admin':
        return 'Administrateur système';
      case 'super-admin-entreprise':
        return 'Administrateur (désactivation entreprise)';
      case 'entreprise':
        return 'Votre entreprise';
      default:
        return 'Non spécifié';
    }
  }

  canEntrepriseUnblock(conducteur: any): boolean {
    // L'entreprise peut débloquer seulement si elle a bloqué
    return conducteur.bloque_par === 'entreprise';
  }

  canSuperAdminUnblock(conducteur: any): boolean {
    // Super-admin peut tout débloquer
    return true;
  }

  getRaisonBlocageOptions(): { value: string; label: string }[] {
    return [
      { value: 'comportement', label: 'Comportement inapproprié' },
      { value: 'documents', label: 'Documents expirés ou invalides' },
      { value: 'demande_entreprise', label: 'Demande de l\'entreprise' },
      { value: 'absence', label: 'Absence non justifiée' },
      { value: 'temporaire', label: 'Blocage temporaire' },
      { value: 'autre', label: 'Autre raison' }
    ];
  }

  // ==================== NETTOYAGE ====================

  ngOnDestroy(): void {
    this.stopMonitoring();
    if (this.currentBlockedModal) {
      this.currentBlockedModal.dismiss();
    }
  }
}