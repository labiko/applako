import { Injectable, Optional } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { EntrepriseAuthService } from './entreprise-auth.service';
import { WhatsAppService } from './whatsapp.service';
import * as bcrypt from 'bcryptjs';
// Import conditionnel du service super-admin (isolation garantie)
import { CommissionManagementService } from '../super-admin/services/commission-management.service';

export interface DashboardMetrics {
  courses_total: number;
  ca_brut: number;
  ca_net: number;
  commission: number;
  conducteurs_actifs: number;
  note_moyenne: number;
  taux_completion: number;
  periode_description: string;
  // Nouveau champ pour traçabilité des commissions dynamiques
  taux_commission?: number;
  commission_type?: 'global' | 'specifique' | 'fallback';
  evolution: {
    courses: string;
    ca: string;
    note: string;
  };
}

export interface ConducteurStats {
  id: string;
  nom: string;
  prenom: string;
  telephone: string;
  vehicle_type: string;
  vehicle_marque?: string;
  vehicle_modele?: string;
  vehicle_couleur?: string;
  vehicle_plaque?: string;
  statut: string;
  note_moyenne: number;
  nombre_courses: number;
  total_reservations?: number; // Toutes les réservations
  derniere_activite: string;
  hors_ligne: boolean;
  position_actuelle?: any; // Type geography dans la DB
  date_update_position?: string; // Date de dernière mise à jour de position GPS
  date_inscription?: string;
  actif?: boolean;
  password?: string;
  // Champs calculés côté client
  chiffre_affaires?: number;
  taux_acceptation?: number;
}

@Injectable({
  providedIn: 'root'
})
export class EntrepriseService {

  constructor(
    private supabaseService: SupabaseService,
    private entrepriseAuthService: EntrepriseAuthService,
    private whatsAppService: WhatsAppService,
    // ✅ INJECTION CONDITIONNELLE - Service super-admin avec @Optional()
    // Si module super-admin non chargé, commissionService sera null
    @Optional() private commissionService?: CommissionManagementService
  ) {}

  // Obtenir les métriques du dashboard
  async getDashboardMetrics(periode: 'today' | 'week' | 'month' = 'today'): Promise<DashboardMetrics | null> {
    try {
      const entrepriseId = this.entrepriseAuthService.getCurrentEntrepriseId();
      if (!entrepriseId) return null;

      // Calculer les dates selon la période
      const now = new Date();
      let dateDebut: string;
      let dateFin: string = now.toISOString();
      
      switch (periode) {
        case 'today':
          // Aujourd'hui : de 00:00 à maintenant
          dateDebut = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
          break;
        case 'week':
          // Semaine courante : du lundi au jour actuel
          const startOfWeek = new Date(now);
          const dayOfWeek = now.getDay(); // 0 = dimanche, 1 = lundi, etc.
          const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Ajuster pour que lundi = 0
          startOfWeek.setDate(now.getDate() - diff);
          startOfWeek.setHours(0, 0, 0, 0);
          dateDebut = startOfWeek.toISOString();
          break;
        case 'month':
          // Mois courant : du 1er au jour actuel
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          monthStart.setHours(0, 0, 0, 0);
          dateDebut = monthStart.toISOString();
          break;
      }

      // Récupérer les conducteurs de l'entreprise
      const { data: conducteurs, error: conducteursError } = await this.supabaseService.client
        .from('conducteurs')
        .select('id, statut, hors_ligne, note_moyenne')
        .eq('entreprise_id', entrepriseId);

      if (conducteursError) {
        console.error('Error fetching conducteurs:', conducteursError);
        return null;
      }

      const conducteurIds = conducteurs?.map(c => c.id) || [];
      const conducteursActifs = conducteurs?.filter(c => !c.hors_ligne && c.statut !== 'inactif').length || 0;

      // Récupérer les réservations complétées
      const { data: reservations, error: reservationsError } = await this.supabaseService.client
        .from('reservations')
        .select('*')
        .in('conducteur_id', conducteurIds)
        .eq('statut', 'completed')
        .gte('date_code_validation', dateDebut);

      if (reservationsError) {
        console.error('Error fetching reservations:', reservationsError);
        return null;
      }

      // Calculer les métriques
      const coursesTotal = reservations?.length || 0;
      const caBrut = reservations?.reduce((sum, r) => sum + (r.prix_total || 0), 0) || 0;
      
      // 🔄 NOUVEAU SYSTÈME DE COMMISSION DYNAMIQUE (NON-INVASIF)
      let tauxCommission = 15; // Fallback par défaut sécurisé
      let commissionType: 'global' | 'specifique' | 'fallback' = 'fallback';
      
      if (this.commissionService) {
        // ✅ Service super-admin disponible - Utiliser taux dynamique
        try {
          console.log(`📊 Calcul commission dynamique pour entreprise: ${entrepriseId}`);
          tauxCommission = await this.commissionService.getCommissionRateIsolated(entrepriseId);
          
          // Déterminer le type de commission appliqué
          const globalRate = await this.commissionService.getCurrentGlobalRate();
          commissionType = tauxCommission === globalRate ? 'global' : 'specifique';
          
          console.log(`✅ Taux commission dynamique: ${tauxCommission}% (${commissionType})`);
        } catch (error) {
          console.warn('⚠️ Erreur taux dynamique, utilisation fallback 15%:', error);
          tauxCommission = 15; // Fallback sécurisé
          commissionType = 'fallback';
        }
      } else {
        // ⚠️ Service super-admin non disponible - Utiliser fallback
        console.log('📋 Service commission non disponible, utilisation fallback 15%');
        commissionType = 'fallback';
      }
      
      const commission = caBrut * (tauxCommission / 100);
      const caNet = caBrut - commission;
      
      // Note moyenne des conducteurs
      const noteMoyenne = conducteurs?.reduce((sum, c) => sum + (c.note_moyenne || 5), 0) / (conducteurs?.length || 1) || 5;
      
      // Taux de completion (réservations complétées vs acceptées)
      const { data: reservationsAcceptees } = await this.supabaseService.client
        .from('reservations')
        .select('id')
        .in('conducteur_id', conducteurIds)
        .in('statut', ['accepted', 'completed'])
        .gte('created_at', dateDebut);

      const tauxCompletion = reservationsAcceptees?.length 
        ? (coursesTotal / reservationsAcceptees.length) * 100 
        : 0;

      return {
        courses_total: coursesTotal,
        ca_brut: Math.round(caBrut),
        ca_net: Math.round(caNet),
        commission: Math.round(commission),
        conducteurs_actifs: conducteursActifs,
        note_moyenne: Math.round(noteMoyenne * 10) / 10,
        taux_completion: Math.round(tauxCompletion * 10) / 10,
        periode_description: this.getPeriodeDescription(periode),
        // ✅ NOUVEAUX CHAMPS - Traçabilité commission dynamique
        taux_commission: tauxCommission,
        commission_type: commissionType,
        evolution: {
          courses: '+12%', // TODO: calculer la vraie évolution
          ca: '+8%',
          note: '+0.3'
        }
      };

    } catch (error) {
      console.error('Error getting dashboard metrics:', error);
      return null;
    }
  }

  // Obtenir la liste des conducteurs de l'entreprise avec leurs statistiques
  async getConducteursEntreprise(): Promise<ConducteurStats[]> {
    try {
      const entrepriseId = this.entrepriseAuthService.getCurrentEntrepriseId();
      if (!entrepriseId) return [];

      // Récupérer les conducteurs avec déduplication dans la requête
      const { data: conducteurs, error } = await this.supabaseService.client
        .from('conducteurs')
        .select('*')
        .eq('entreprise_id', entrepriseId)
        .order('derniere_activite', { ascending: false });
      

      if (error) {
        console.error('Error fetching conducteurs:', error);
        return [];
      }

      if (!conducteurs || conducteurs.length === 0) return [];

      // Récupérer les statistiques des réservations pour chaque conducteur
      const conducteurIds = conducteurs.map(c => c.id);
      
      const { data: reservations, error: reservationsError } = await this.supabaseService.client
        .from('reservations')
        .select('conducteur_id, statut, prix_total, date_code_validation')
        .in('conducteur_id', conducteurIds);

      if (reservationsError) {
        console.error('Error fetching reservations stats:', reservationsError);
        // Retourner les conducteurs sans statistiques si erreur
        return conducteurs.map(c => ({
          ...c,
          nombre_courses: 0,
          chiffre_affaires: 0,
          taux_acceptation: 0
        }));
      }

      // Calculer les statistiques pour chaque conducteur
      const statsMap = new Map<string, {courses: number, ca: number, completed: number, total: number, allReservations: number}>();
      
      reservations?.forEach(r => {
        const stats = statsMap.get(r.conducteur_id) || {courses: 0, ca: 0, completed: 0, total: 0, allReservations: 0};
        
        // Compter TOUTES les réservations
        stats.allReservations++;
        
        // Compter toutes les réservations pour le taux d'acceptation
        if (r.statut === 'completed' || r.statut === 'accepted' || r.statut === 'refused') {
          stats.total++;
        }
        
        // Compter les courses terminées avec date_code_validation (comme dans votre requête SQL)
        if (r.statut === 'completed' && r.date_code_validation != null) {
          stats.completed++;
          stats.courses++; // Nombre de courses = réservations complétées avec date_code_validation
          if (r.prix_total) stats.ca += r.prix_total;
        }
        
        statsMap.set(r.conducteur_id, stats);
      });

      // Combiner les données
      const result = conducteurs.map(conducteur => {
        const stats = statsMap.get(conducteur.id) || {courses: 0, ca: 0, completed: 0, total: 0, allReservations: 0};
        
        const conducteurWithStats = {
          ...conducteur,
          nombre_courses: stats.courses,
          total_reservations: stats.allReservations,
          chiffre_affaires: stats.ca,
          taux_acceptation: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0
        };
        
        
        return conducteurWithStats;
      });
      
      return result;

    } catch (error) {
      console.error('Error in getConducteursEntreprise:', error);
      return [];
    }
  }

  // Créer un nouveau conducteur
  async createConducteur(conducteurData: any): Promise<boolean> {
    try {
      const entrepriseId = this.entrepriseAuthService.getCurrentEntrepriseId();
      if (!entrepriseId) {
        console.error('Entreprise non connectée');
        return false;
      }

      // Générer un mot de passe à 6 chiffres
      const motDePasse = this.genererMotDePasse6Chiffres();
      // Hasher le mot de passe avec bcrypt
      const hashedPassword = bcrypt.hashSync(motDePasse, 10);

      // Préparons les données pour le conducteur
      const newConducteur = {
        nom: conducteurData.nom,
        prenom: conducteurData.prenom,
        telephone: conducteurData.telephone,
        vehicle_type: conducteurData.vehicle_type || 'voiture',
        vehicle_marque: conducteurData.vehicle_marque || '',
        vehicle_modele: conducteurData.vehicle_modele || '',
        vehicle_plaque: conducteurData.vehicle_plaque || '',
        entreprise_id: entrepriseId,
        statut: 'disponible', // Valeur conforme à la contrainte DB
        hors_ligne: false,
        password: hashedPassword, // ✅ Mot de passe hashé avec bcrypt
        first_login: false // ✅ IMPORTANT: false car mot de passe déjà généré
      };

      console.log('Création conducteur avec données:', newConducteur);

      const { data, error } = await this.supabaseService.client
        .from('conducteurs')
        .insert(newConducteur)
        .select();

      if (error) {
        console.error('Erreur création conducteur - Détails:', {
          error,
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        return false;
      }

      console.log('Conducteur créé avec succès:', data);

      // Envoyer le mot de passe par WhatsApp
      await this.whatsAppService.envoyerMotDePasseConducteur(
        conducteurData.telephone,
        motDePasse,
        `${conducteurData.prenom} ${conducteurData.nom}`
      );

      return true;
    } catch (error) {
      console.error('Erreur création conducteur:', error);
      return false;
    }
  }

  // Mettre à jour un conducteur
  async updateConducteur(conducteurId: string, updates: any): Promise<boolean> {
    try {
      const { error } = await this.supabaseService.client
        .from('conducteurs')
        .update({
          nom: updates.nom,
          prenom: updates.prenom,
          telephone: updates.telephone,
          vehicle_type: updates.vehicle_type,
          vehicle_marque: updates.vehicle_marque,
          vehicle_modele: updates.vehicle_modele,
          vehicle_plaque: updates.vehicle_plaque,
          statut: updates.statut,
          hors_ligne: updates.hors_ligne
        })
        .eq('id', conducteurId);

      if (error) {
        console.error('Erreur update conducteur:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erreur update conducteur:', error);
      return false;
    }
  }

  // Obtenir les réservations de l'entreprise
  async getReservationsEntreprise(): Promise<any[]> {
    try {
      const entrepriseId = this.entrepriseAuthService.getCurrentEntrepriseId();
      if (!entrepriseId) return [];

      // D'abord récupérer les conducteurs de l'entreprise
      const { data: conducteurs, error: conducteursError } = await this.supabaseService.client
        .from('conducteurs')
        .select('id')
        .eq('entreprise_id', entrepriseId);

      if (conducteursError) {
        console.error('Error fetching conducteurs:', conducteursError);
        return [];
      }

      const conducteurIds = conducteurs?.map(c => c.id) || [];

      if (conducteurIds.length === 0) return [];

      // Ensuite récupérer toutes les réservations sans limite avec les données de paiement
      const { data, error } = await this.supabaseService.client
        .from('reservations')
        .select(`
          *,
          conducteurs:conducteur_id (nom, prenom, telephone),
          lengopay_payments!left (
            id,
            status,
            amount,
            currency,
            payment_id,
            processed_at
          )
        `)
        .in('conducteur_id', conducteurIds)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching reservations:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getReservationsEntreprise:', error);
      return [];
    }
  }

  // Obtenir les réservations d'un conducteur spécifique (toutes les réservations)
  async getReservationsByConducteur(conducteurId: string): Promise<any[]> {
    try {
      const { data, error } = await this.supabaseService.client
        .from('reservations')
        .select('*')
        .eq('conducteur_id', conducteurId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching conducteur reservations:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getReservationsByConducteur:', error);
      return [];
    }
  }

  // Valider une course avec le code OTP
  async validateCourse(reservationId: string, otpCode: string): Promise<boolean> {
    try {
      return await this.supabaseService.validateOTP(reservationId, otpCode);
    } catch (error) {
      console.error('Error validating course:', error);
      return false;
    }
  }

  // Obtenir la description de la période
  private getPeriodeDescription(periode: 'today' | 'week' | 'month'): string {
    const now = new Date();
    
    switch (periode) {
      case 'today':
        return `Aujourd'hui (${now.toLocaleDateString('fr-FR', { 
          weekday: 'long', 
          day: 'numeric', 
          month: 'long' 
        })})`;
      case 'week':
        const startOfWeek = new Date(now);
        const dayOfWeek = now.getDay();
        const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        startOfWeek.setDate(now.getDate() - diff);
        
        return `Cette semaine (du ${startOfWeek.toLocaleDateString('fr-FR', { 
          day: 'numeric', 
          month: 'short' 
        })} au ${now.toLocaleDateString('fr-FR', { 
          day: 'numeric', 
          month: 'short' 
        })})`;
      case 'month':
        return `Ce mois (${now.toLocaleDateString('fr-FR', { 
          month: 'long', 
          year: 'numeric' 
        })})`;
      default:
        return '';
    }
  }

  // Générer un mot de passe à 6 chiffres
  private genererMotDePasse6Chiffres(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // ============================================================================
  // MÉTHODES UTILITAIRES COMMISSION DYNAMIQUE
  // ============================================================================

  /**
   * Vérifier si le système de commission dynamique est actif
   * Utilisé par les composants pour afficher des informations
   */
  public isCommissionSystemActive(): boolean {
    return !!this.commissionService;
  }

  /**
   * Obtenir des informations détaillées sur la commission appliquée
   * Utilisé pour l'affichage dans le dashboard entreprise
   */
  public async getCommissionInfo(): Promise<{
    taux: number;
    type: 'global' | 'specifique' | 'fallback';
    description: string;
    system_active: boolean;
  }> {
    try {
      const entrepriseId = this.entrepriseAuthService.getCurrentEntrepriseId();
      if (!entrepriseId) {
        return {
          taux: 15,
          type: 'fallback',
          description: 'Taux par défaut (entreprise non identifiée)',
          system_active: false
        };
      }

      if (this.commissionService) {
        try {
          const taux = await this.commissionService.getCommissionRateIsolated(entrepriseId);
          const globalRate = await this.commissionService.getCurrentGlobalRate();
          
          const type: 'global' | 'specifique' = taux === globalRate ? 'global' : 'specifique';
          const description = type === 'global' 
            ? `Taux global LokoTaxi (${taux}%)`
            : `Taux spécifique à votre entreprise (${taux}%)`;

          return {
            taux,
            type,
            description,
            system_active: true
          };
        } catch (error) {
          console.warn('⚠️ Erreur récupération info commission:', error);
          return {
            taux: 15,
            type: 'fallback',
            description: 'Taux de sécurité (15%) - Erreur système',
            system_active: true
          };
        }
      } else {
        return {
          taux: 15,
          type: 'fallback',
          description: 'Taux par défaut (15%) - Système avancé non activé',
          system_active: false
        };
      }
    } catch (error) {
      console.error('❌ Erreur récupération info commission:', error);
      return {
        taux: 15,
        type: 'fallback',
        description: 'Taux par défaut (15%) - Erreur système',
        system_active: false
      };
    }
  }

  /**
   * Bloquer/Débloquer un conducteur (champ actif)
   * Utilise la même logique que le super-admin
   */
  async toggleConducteurActif(conducteurId: string, actif: boolean): Promise<{ success: boolean; error?: any }> {
    try {
      const entrepriseId = this.entrepriseAuthService.getCurrentEntrepriseId();
      if (!entrepriseId) {
        return { success: false, error: 'Entreprise non connectée' };
      }

      // Vérifier que le conducteur appartient bien à cette entreprise
      const { data: conducteur, error: checkError } = await this.supabaseService.client
        .from('conducteurs')
        .select('id, entreprise_id')
        .eq('id', conducteurId)
        .eq('entreprise_id', entrepriseId)
        .single();

      if (checkError || !conducteur) {
        console.error('Conducteur non trouvé ou non autorisé:', checkError);
        return { success: false, error: 'Conducteur non trouvé ou non autorisé' };
      }

      // Mettre à jour le statut actif
      const { error } = await this.supabaseService.client
        .from('conducteurs')
        .update({
          actif,
          derniere_activite: new Date().toISOString()
        })
        .eq('id', conducteurId);

      if (error) {
        console.error('Erreur toggle conducteur actif:', error);
        return { success: false, error };
      }

      console.log(`✅ Conducteur ${actif ? 'débloqué' : 'bloqué'} avec succès`);
      return { success: true };
    } catch (error) {
      console.error('❌ Erreur toggle conducteur actif:', error);
      return { success: false, error };
    }
  }

  /**
   * Calculer la commission pour un montant donné
   * Utilise le taux dynamique si disponible
   */
  public async calculateCommission(montantBrut: number): Promise<{
    commission: number;
    montantNet: number;
    taux: number;
    type: 'global' | 'specifique' | 'fallback';
  }> {
    try {
      const entrepriseId = this.entrepriseAuthService.getCurrentEntrepriseId();
      let taux = 15; // Fallback
      let type: 'global' | 'specifique' | 'fallback' = 'fallback';

      if (entrepriseId && this.commissionService) {
        try {
          taux = await this.commissionService.getCommissionRateIsolated(entrepriseId);
          const globalRate = await this.commissionService.getCurrentGlobalRate();
          type = taux === globalRate ? 'global' : 'specifique';
        } catch (error) {
          console.warn('⚠️ Erreur calcul commission, utilisation fallback:', error);
        }
      }

      const commission = montantBrut * (taux / 100);
      const montantNet = montantBrut - commission;

      return {
        commission: Math.round(commission),
        montantNet: Math.round(montantNet),
        taux,
        type
      };
    } catch (error) {
      console.error('❌ Erreur calcul commission:', error);
      const commission = montantBrut * 0.15;
      return {
        commission: Math.round(commission),
        montantNet: Math.round(montantBrut - commission),
        taux: 15,
        type: 'fallback'
      };
    }
  }

}