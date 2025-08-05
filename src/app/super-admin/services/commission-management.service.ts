/**
 * SERVICE DE GESTION DES COMMISSIONS DYNAMIQUES
 * Architecture isolée - Remplace le système hardcodé 15%
 * Pas de dépendance vers modules conducteur/entreprise
 */

import { Injectable } from '@angular/core';
import { SupabaseService } from '../../services/supabase.service';
import { 
  CommissionConfig,
  CommissionChangeRequest,
  CommissionSimulation,
  AuditLog,
  ApiResponse 
} from '../models/super-admin.model';

// Interfaces spécifiques à la gestion des commissions
export interface GlobalCommissionStats {
  taux_moyen: number;
  commission_totale: number;
  entreprises_avec_taux_global: number;
  entreprises_avec_taux_specifique: number;
  ca_total: number;
}

export interface EntrepriseCommissionInfo {
  id: string;
  nom: string;
  email: string;
  taux_actuel: number;
  taux_global: boolean;
  derniere_modification: string;
  ca_mensuel: number;
  commission_mensuelle: number;
  nb_reservations: number;
}

@Injectable({
  providedIn: 'root'
})
export class CommissionManagementService {
  
  // Cache pour optimiser les performances
  private commissionCache = new Map<string, { data: number; expires: number }>();
  private cacheTimeoutMs = 300000; // 5 minutes

  constructor(private supabaseService: SupabaseService) {}

  // ============================================================================
  // RÉCUPÉRATION TAUX DE COMMISSION (ISOLÉ)
  // ============================================================================

  /**
   * Récupère le taux de commission applicable pour une entreprise
   * MÉTHODE ISOLÉE - Ne dépend d'aucun autre service
   */
  async getCommissionRateIsolated(
    entrepriseId: string, 
    dateCalcul: Date = new Date(),
    useCache: boolean = true
  ): Promise<number> {
    try {
      // 1. Vérifier cache si demandé
      if (useCache) {
        const cached = this.getCachedRate(entrepriseId);
        if (cached !== null) {
          return cached;
        }
      }

      const dateString = dateCalcul.toISOString().split('T')[0];

      // 2. Chercher taux spécifique entreprise
      const { data: entrepriseRate, error: entrepriseError } = await this.supabaseService.client
        .from('commission_config')
        .select('taux_commission, date_debut, date_fin')
        .eq('entreprise_id', entrepriseId)
        .eq('type_config', 'enterprise_specific')
        .eq('actif', true)
        .lte('date_debut', dateString)
        .or(`date_fin.is.null,date_fin.gte.${dateString}`)
        .order('date_debut', { ascending: false })
        .limit(1);

      if (entrepriseError) {
        console.warn('⚠️ Erreur requête taux entreprise:', entrepriseError);
      }

      if (entrepriseRate && entrepriseRate.length > 0) {
        const taux = entrepriseRate[0].taux_commission;
        console.log(`📊 Taux spécifique trouvé pour entreprise ${entrepriseId}: ${taux}%`);
        
        // Mettre en cache
        this.setCachedRate(entrepriseId, taux);
        return taux;
      }

      // 3. Fallback sur taux global par défaut
      const { data: globalRate, error: globalError } = await this.supabaseService.client
        .from('commission_config')
        .select('taux_commission, date_debut, date_fin')
        .is('entreprise_id', null)
        .eq('type_config', 'global_default')
        .eq('actif', true)
        .lte('date_debut', dateString)
        .or(`date_fin.is.null,date_fin.gte.${dateString}`)
        .order('date_debut', { ascending: false })
        .limit(1);

      if (globalError) {
        console.warn('⚠️ Erreur requête taux global:', globalError);
      }

      if (globalRate && globalRate.length > 0) {
        const taux = globalRate[0].taux_commission;
        console.log(`📊 Taux global utilisé pour entreprise ${entrepriseId}: ${taux}%`);
        
        // Mettre en cache
        this.setCachedRate(entrepriseId, taux);
        return taux;
      }

      // 4. Fallback ultime hardcodé (sécurité)
      console.warn(`⚠️ Aucun taux configuré pour entreprise ${entrepriseId}, utilisation fallback 15%`);
      return 15.0;

    } catch (error) {
      console.error('❌ Erreur récupération taux commission:', error);
      // Fallback sécurisé en cas d'erreur système
      return 15.0;
    }
  }

  /**
   * Récupère le taux global par défaut actuel
   */
  async getCurrentGlobalRate(): Promise<number> {
    try {
      const { data, error } = await this.supabaseService.client
        .from('commission_config')
        .select('taux_commission')
        .is('entreprise_id', null)
        .eq('type_config', 'global_default')
        .eq('actif', true)
        .lte('date_debut', new Date().toISOString().split('T')[0])
        .or('date_fin.is.null,date_fin.gte.' + new Date().toISOString().split('T')[0])
        .order('date_debut', { ascending: false })
        .limit(1);

      if (error) throw error;

      return data && data.length > 0 ? data[0].taux_commission : 15.0;
    } catch (error) {
      console.error('❌ Erreur récupération taux global:', error);
      return 15.0;
    }
  }

  // ============================================================================
  // MODIFICATION TAUX GLOBAL
  // ============================================================================

  // Cette méthode sera remplacée par la version simplifiée plus bas

  // ============================================================================
  // MODIFICATION TAUX ENTREPRISE SPÉCIFIQUE
  // ============================================================================

  async updateEnterpriseCommissionRate(
    request: CommissionChangeRequest,
    createdBy: string
  ): Promise<ApiResponse<boolean>> {
    try {
      // 1. Validation
      const validation = this.validateCommissionRequest(request);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error
        };
      }

      if (!request.entreprise_id) {
        return {
          success: false,
          error: 'ID entreprise requis pour taux spécifique'
        };
      }

      // 2. Vérifier que l'entreprise existe
      const { data: entreprise, error: entrepriseError } = await this.supabaseService.client
        .from('entreprises')
        .select('id, nom')
        .eq('id', request.entreprise_id)
        .eq('actif', true)
        .single();

      if (entrepriseError || !entreprise) {
        return {
          success: false,
          error: 'Entreprise non trouvée ou inactive'
        };
      }

      // 3. Récupérer taux actuel pour audit
      const ancienTaux = await this.getCommissionRateIsolated(request.entreprise_id);

      // 4. Calculer impact business
      const impact = await this.calculateEnterpriseImpact(
        request.entreprise_id, 
        ancienTaux, 
        request.nouveau_taux
      );

      // 5. Désactiver anciens taux pour cette entreprise
      const { error: updateError } = await this.supabaseService.client
        .from('commission_config')
        .update({ 
          actif: false, 
          date_fin: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString()
        })
        .eq('entreprise_id', request.entreprise_id)
        .eq('type_config', 'enterprise_specific')
        .eq('actif', true);

      if (updateError) throw updateError;

      // 6. Créer nouveau taux entreprise
      const { error: insertError } = await this.supabaseService.client
        .from('commission_config')
        .insert({
          type_config: 'enterprise_specific',
          entreprise_id: request.entreprise_id,
          taux_commission: request.nouveau_taux,
          date_debut: request.date_debut,
          date_fin: request.date_fin || null,
          actif: true,
          created_by: createdBy,
          motif: request.motif.trim()
        });

      if (insertError) throw insertError;

      // 7. Vider cache pour cette entreprise
      this.clearCacheForEnterprise(request.entreprise_id);

      // 8. Log audit
      await this.logCommissionChange(
        'COMMISSION_CHANGE',
        'enterprise_specific',
        request.entreprise_id,
        { taux: ancienTaux, entreprise: entreprise.nom },
        { 
          taux: request.nouveau_taux, 
          date_debut: request.date_debut,
          date_fin: request.date_fin,
          motif: request.motif 
        },
        Math.abs(impact.variation) > 25000 ? 'HIGH' : 'MEDIUM',
        Math.abs(impact.variation)
      );

      console.log(`✅ Taux entreprise ${entreprise.nom} mis à jour: ${ancienTaux}% → ${request.nouveau_taux}%`);

      return {
        success: true,
        data: true,
        message: `Taux mis à jour pour ${entreprise.nom}: ${request.nouveau_taux}%`
      };

    } catch (error) {
      console.error('❌ Erreur mise à jour taux entreprise:', error);
      return {
        success: false,
        error: 'Erreur lors de la mise à jour du taux entreprise'
      };
    }
  }

  // ============================================================================
  // SIMULATION D'IMPACT
  // ============================================================================

  async simulateCommissionImpact(
    nouveauTaux: number, 
    periode: 'month' | 'year' = 'month',
    entrepriseId?: string
  ): Promise<CommissionSimulation> {
    try {
      // 1. Déterminer période de calcul
      const dateDebut = new Date();
      if (periode === 'month') {
        dateDebut.setMonth(dateDebut.getMonth() - 1);
      } else {
        dateDebut.setFullYear(dateDebut.getFullYear() - 1);
      }

      // 2. Base query pour réservations
      let query = this.supabaseService.client
        .from('reservations')
        .select(`
          prix_total, 
          conducteur_id,
          conducteurs!inner(entreprise_id, entreprises!inner(nom))
        `)
        .eq('statut', 'completed')
        .not('date_code_validation', 'is', null)
        .gte('date_code_validation', dateDebut.toISOString());

      // 3. Filtrer par entreprise si spécifié
      if (entrepriseId) {
        query = query.eq('conducteurs.entreprise_id', entrepriseId);
      }

      const { data: reservations, error } = await query;

      if (error) throw error;

      // 4. Calculer CA total période
      const caTotalPeriode = reservations?.reduce((sum, r) => sum + (r.prix_total || 0), 0) || 0;

      // 5. Calculer taux actuel moyen
      let tauxActuelMoyen = 15; // Fallback
      if (entrepriseId) {
        tauxActuelMoyen = await this.getCommissionRateIsolated(entrepriseId);
      } else {
        tauxActuelMoyen = await this.getCurrentGlobalRate();
      }

      // 6. Calculs simulation
      const revenusActuels = caTotalPeriode * (tauxActuelMoyen / 100);
      const revenusNouveau = caTotalPeriode * (nouveauTaux / 100);
      const variation = revenusNouveau - revenusActuels;
      const variationPourcentage = revenusActuels > 0 ? (variation / revenusActuels) * 100 : 0;

      // 7. Compter entreprises impactées
      const entreprisesUniques = new Set();
      reservations?.forEach((r: any) => {
        if (r.conducteurs?.entreprise_id) {
          entreprisesUniques.add(r.conducteurs.entreprise_id);
        }
      });

      return {
        taux_actuel: tauxActuelMoyen,
        taux_nouveau: nouveauTaux,
        periode,
        revenus_actuels: revenusActuels,
        revenus_nouveau: revenusNouveau,
        variation,
        variation_pourcentage: variationPourcentage,
        entreprises_impactees: entreprisesUniques.size,
        ca_total_periode: caTotalPeriode
      };

    } catch (error) {
      console.error('❌ Erreur simulation:', error);
      
      // Retourner simulation vide en cas d'erreur
      return {
        taux_actuel: 15,
        taux_nouveau: nouveauTaux,
        periode,
        revenus_actuels: 0,
        revenus_nouveau: 0,
        variation: 0,
        variation_pourcentage: 0,
        entreprises_impactees: 0,
        ca_total_periode: 0
      };
    }
  }

  // ============================================================================
  // GESTION CONFIGURATIONS
  // ============================================================================

  async getAllCommissionConfigs(): Promise<CommissionConfig[]> {
    try {
      const { data, error } = await this.supabaseService.client
        .from('commission_config')
        .select(`
          *,
          entreprises(nom)
        `)
        .eq('actif', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data?.map((config: any) => ({
        ...config,
        entreprise_nom: config.entreprises?.nom || 'Global',
        is_current: this.isConfigCurrent(config.date_debut, config.date_fin),
        days_remaining: this.calculateDaysRemaining(config.date_fin)
      })) || [];

    } catch (error) {
      console.error('❌ Erreur récupération configurations:', error);
      return [];
    }
  }

  async getCommissionHistory(
    entrepriseId?: string, 
    limit: number = 50
  ): Promise<CommissionConfig[]> {
    try {
      let query = this.supabaseService.client
        .from('commission_config')
        .select(`
          *,
          entreprises(nom)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (entrepriseId) {
        query = query.eq('entreprise_id', entrepriseId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data?.map(config => ({
        ...config,
        entreprise_nom: config.entreprises?.nom || 'Global'
      })) || [];

    } catch (error) {
      console.error('❌ Erreur récupération historique:', error);
      return [];
    }
  }

  // ============================================================================
  // UTILITAIRES PRIVÉS
  // ============================================================================

  private getCachedRate(entrepriseId: string): number | null {
    const cached = this.commissionCache.get(entrepriseId);
    if (!cached) return null;

    if (Date.now() > cached.expires) {
      this.commissionCache.delete(entrepriseId);
      return null;
    }

    return cached.data;
  }

  private setCachedRate(entrepriseId: string, taux: number): void {
    this.commissionCache.set(entrepriseId, {
      data: taux,
      expires: Date.now() + this.cacheTimeoutMs
    });
  }

  private clearCache(): void {
    this.commissionCache.clear();
  }

  private clearCacheForEnterprise(entrepriseId: string): void {
    this.commissionCache.delete(entrepriseId);
  }

  private validateCommissionRequest(request: CommissionChangeRequest): { valid: boolean; error?: string } {
    if (request.nouveau_taux < 0 || request.nouveau_taux > 100) {
      return { valid: false, error: 'Le taux doit être entre 0 et 100%' };
    }

    if (!request.motif.trim()) {
      return { valid: false, error: 'Un motif est requis' };
    }

    if (!request.date_debut) {
      return { valid: false, error: 'Date de début requise' };
    }

    if (request.date_fin && request.date_fin <= request.date_debut) {
      return { valid: false, error: 'Date de fin doit être après date de début' };
    }

    return { valid: true };
  }

  private isConfigCurrent(dateDebut: string, dateFin?: string): boolean {
    const now = new Date();
    const debut = new Date(dateDebut);
    const fin = dateFin ? new Date(dateFin) : null;

    return now >= debut && (!fin || now <= fin);
  }

  private calculateDaysRemaining(dateFin?: string): number | undefined {
    if (!dateFin) return undefined;

    const now = new Date();
    const fin = new Date(dateFin);
    const diffTime = fin.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return Math.max(0, diffDays);
  }

  private async calculateGlobalImpact(ancienTaux: number, nouveauTaux: number): Promise<{ variation: number }> {
    try {
      const simulation = await this.simulateCommissionImpact(nouveauTaux, 'month');
      return { variation: simulation.variation };
    } catch (error) {
      return { variation: 0 };
    }
  }

  private async calculateEnterpriseImpact(
    entrepriseId: string, 
    ancienTaux: number, 
    nouveauTaux: number
  ): Promise<{ variation: number }> {
    try {
      const simulation = await this.simulateCommissionImpact(nouveauTaux, 'month', entrepriseId);
      return { variation: simulation.variation };
    } catch (error) {
      return { variation: 0 };
    }
  }

  private async createCommissionBackup(type: string, metadata: any): Promise<string> {
    try {
      const backupId = `commission_${Date.now()}_${Math.random().toString(36).substring(2)}`;
      
      // Récupérer configurations actuelles
      const { data: configs } = await this.supabaseService.client
        .from('commission_config')
        .select('*')
        .eq('actif', true);

      await this.supabaseService.client.from('system_backups').insert({
        id: backupId,
        type,
        commission_data: configs,
        created_at: new Date().toISOString(),
        status: 'COMPLETED',
        metadata
      });

      return backupId;
    } catch (error) {
      console.error('❌ Erreur création backup:', error);
      return '';
    }
  }

  private async logCommissionChange(
    actionType: string,
    configType: string,
    entrepriseId: string | null,
    oldValues: any,
    newValues: any,
    impactLevel: string,
    businessImpact: number
  ): Promise<void> {
    try {
      // En production, utiliser AuditService
      console.log('📋 Commission change logged:', {
        actionType,
        configType,
        entrepriseId,
        oldValues,
        newValues,
        impactLevel,
        businessImpact
      });
    } catch (error) {
      console.error('❌ Erreur log commission:', error);
    }
  }

  // ============================================================================
  // MÉTHODES POUR L'INTERFACE DE GESTION DES COMMISSIONS
  // ============================================================================

  /**
   * Récupère les statistiques globales des commissions
   */
  async getGlobalCommissionStats(): Promise<GlobalCommissionStats> {
    try {
      // 1. Récupérer le taux global actuel
      const tauxGlobal = await this.getCurrentGlobalRate();

      // 2. Récupérer toutes les entreprises et leurs commissions
      const { data: entreprises, error: entreprisesError } = await this.supabaseService.client
        .from('entreprises')
        .select('id, nom')
        .eq('statut', 'active');

      if (entreprisesError) throw entreprisesError;

      // 3. Récupérer les configurations spécifiques
      const { data: configsSpecifiques, error: configsError } = await this.supabaseService.client
        .from('commission_config')
        .select('entreprise_id, taux_commission')
        .eq('type_config', 'enterprise_specific')
        .eq('actif', true);

      if (configsError) throw configsError;

      // 4. Calculer les réservations du mois en cours
      const debutMois = new Date();
      debutMois.setDate(1);
      debutMois.setHours(0, 0, 0, 0);

      const { data: reservations, error: reservationsError } = await this.supabaseService.client
        .from('reservations')
        .select('prix_total, conducteur_id, conducteurs!inner(entreprise_id)')
        .gte('created_at', debutMois.toISOString())
        .not('date_code_validation', 'is', null);

      if (reservationsError) throw reservationsError;

      // 5. Calculer les statistiques
      let caTotal = 0;
      let commissionTotale = 0;
      const tauxUtilises: number[] = [];
      const entreprisesAvecSpecifique = new Set(configsSpecifiques?.map(c => c.entreprise_id) || []);

      for (const reservation of reservations || []) {
        const prixTotal = reservation.prix_total || 0;
        caTotal += prixTotal;

        // Déterminer le taux appliqué
        const entrepriseId = (reservation as any).conducteurs?.entreprise_id;
        let tauxApplique = tauxGlobal;

        if (entrepriseId && entreprisesAvecSpecifique.has(entrepriseId)) {
          const configSpecifique = configsSpecifiques?.find(c => c.entreprise_id === entrepriseId);
          if (configSpecifique) {
            tauxApplique = configSpecifique.taux_commission;
          }
        }

        tauxUtilises.push(tauxApplique);
        commissionTotale += prixTotal * (tauxApplique / 100);
      }

      // 6. Calculer taux moyen pondéré
      const tauxMoyen = tauxUtilises.length > 0 
        ? tauxUtilises.reduce((sum, taux) => sum + taux, 0) / tauxUtilises.length
        : tauxGlobal;

      // 7. Compter entreprises par type
      const totalEntreprises = entreprises?.length || 0;
      const entreprisesAvecTauxSpecifique = entreprisesAvecSpecifique.size;
      const entreprisesAvecTauxGlobal = totalEntreprises - entreprisesAvecTauxSpecifique;

      return {
        taux_moyen: tauxMoyen,
        commission_totale: commissionTotale,
        entreprises_avec_taux_global: entreprisesAvecTauxGlobal,
        entreprises_avec_taux_specifique: entreprisesAvecTauxSpecifique,
        ca_total: caTotal
      };

    } catch (error) {
      console.error('❌ Erreur calcul stats globales:', error);
      return {
        taux_moyen: 15,
        commission_totale: 0,
        entreprises_avec_taux_global: 0,
        entreprises_avec_taux_specifique: 0,
        ca_total: 0
      };
    }
  }

  /**
   * Récupère la liste des entreprises avec leurs informations de commission
   */
  async getEntreprisesWithCommissionInfo(): Promise<EntrepriseCommissionInfo[]> {
    try {
      // 1. Récupérer toutes les entreprises
      const { data: entreprises, error: entreprisesError } = await this.supabaseService.client
        .from('entreprises')
        .select('id, nom, email')
        .eq('statut', 'active')
        .order('nom');

      if (entreprisesError) throw entreprisesError;

      // 2. Récupérer le taux global
      const tauxGlobal = await this.getCurrentGlobalRate();

      // 3. Récupérer les configurations spécifiques
      const { data: configsSpecifiques, error: configsError } = await this.supabaseService.client
        .from('commission_config')
        .select('entreprise_id, taux_commission, updated_at')
        .eq('type_config', 'enterprise_specific')
        .eq('actif', true);

      if (configsError) throw configsError;

      // 4. Récupérer les données de performance du mois
      const debutMois = new Date();
      debutMois.setDate(1);
      debutMois.setHours(0, 0, 0, 0);

      const { data: reservations, error: reservationsError } = await this.supabaseService.client
        .from('reservations')
        .select('prix_total, conducteur_id, conducteurs!inner(entreprise_id)')
        .gte('created_at', debutMois.toISOString())
        .not('date_code_validation', 'is', null);

      if (reservationsError) throw reservationsError;

      // 5. Construire la liste des entreprises avec infos
      const result: EntrepriseCommissionInfo[] = [];

      for (const entreprise of entreprises || []) {
        // Déterminer le taux et le type
        const configSpecifique = configsSpecifiques?.find(c => c.entreprise_id === entreprise.id);
        const tauxActuel = configSpecifique ? configSpecifique.taux_commission : tauxGlobal;
        const tauxGlobal_ = !configSpecifique;
        const derniereModification = configSpecifique 
          ? configSpecifique.updated_at 
          : new Date().toISOString();

        // Calculer les métriques du mois
        const reservationsEntreprise = reservations?.filter(r => 
          (r as any).conducteurs?.entreprise_id === entreprise.id
        ) || [];

        const caMensuel = reservationsEntreprise.reduce((sum, r) => sum + (r.prix_total || 0), 0);
        const commissionMensuelle = caMensuel * (tauxActuel / 100);

        result.push({
          id: entreprise.id,
          nom: entreprise.nom,
          email: entreprise.email,
          taux_actuel: tauxActuel,
          taux_global: tauxGlobal_,
          derniere_modification: derniereModification,
          ca_mensuel: caMensuel,
          commission_mensuelle: commissionMensuelle,
          nb_reservations: reservationsEntreprise.length
        });
      }

      // Trier par nom
      return result.sort((a, b) => a.nom.localeCompare(b.nom));

    } catch (error) {
      console.error('❌ Erreur récupération entreprises:', error);
      return [];
    }
  }

  /**
   * Met à jour le taux de commission global
   */
  async updateGlobalCommissionRate(nouveauTaux: number, description?: string): Promise<void> {
    try {
      // 1. Valider le taux
      if (nouveauTaux < 0 || nouveauTaux > 50) {
        throw new Error('Le taux de commission doit être entre 0% et 50%');
      }

      // 2. Récupérer le taux actuel pour audit
      const ancienTaux = await this.getCurrentGlobalRate();

      // 3. Créer backup avant modification
      await this.createCommissionBackup('global_rate_update', {
        ancien_taux: ancienTaux,
        nouveau_taux: nouveauTaux,
        description
      });

      // 4. Désactiver l'ancienne configuration globale
      await this.supabaseService.client
        .from('commission_config')
        .update({ actif: false, updated_at: new Date().toISOString() })
        .eq('type_config', 'global_default')
        .eq('actif', true);

      // 5. Créer nouvelle configuration globale
      const nouvelleConfig = {
        type_config: 'global_default',
        entreprise_id: null,
        taux_commission: nouveauTaux,
        actif: true,
        description: description || `Mise à jour taux global : ${ancienTaux}% → ${nouveauTaux}%`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error: insertError } = await this.supabaseService.client
        .from('commission_config')
        .insert(nouvelleConfig);

      if (insertError) throw insertError;

      // 6. Invalider le cache
      this.commissionCache.clear();

      // 7. Log de l'audit
      await this.logCommissionChange(
        'UPDATE_GLOBAL_RATE',
        'global_default',
        null,
        { taux: ancienTaux },
        { taux: nouveauTaux },
        'HIGH',
        0
      );

      console.log(`✅ Taux global mis à jour: ${ancienTaux}% → ${nouveauTaux}%`);

    } catch (error) {
      console.error('❌ Erreur mise à jour taux global:', error);
      throw error;
    }
  }

  /**
   * Définit un taux de commission spécifique pour une entreprise
   */
  async setSpecificCommissionRate(
    entrepriseId: string, 
    nouveauTaux: number, 
    description?: string
  ): Promise<void> {
    try {
      // 1. Valider les paramètres
      if (!entrepriseId) throw new Error('ID entreprise requis');
      if (nouveauTaux < 0 || nouveauTaux > 50) {
        throw new Error('Le taux de commission doit être entre 0% et 50%');
      }

      // 2. Vérifier que l'entreprise existe
      const { data: entreprise, error: entrepriseError } = await this.supabaseService.client
        .from('entreprises')
        .select('nom')
        .eq('id', entrepriseId)
        .single();

      if (entrepriseError || !entreprise) {
        throw new Error('Entreprise non trouvée');
      }

      // 3. Récupérer le taux actuel
      const ancienTaux = await this.getCommissionRateIsolated(entrepriseId);

      // 4. Créer backup
      await this.createCommissionBackup('specific_rate_update', {
        entreprise_id: entrepriseId,
        entreprise_nom: entreprise.nom,
        ancien_taux: ancienTaux,
        nouveau_taux: nouveauTaux,
        description
      });

      // 5. Désactiver l'ancienne configuration spécifique s'il y en a une
      await this.supabaseService.client
        .from('commission_config')
        .update({ actif: false, updated_at: new Date().toISOString() })
        .eq('type_config', 'enterprise_specific')
        .eq('entreprise_id', entrepriseId)
        .eq('actif', true);

      // 6. Créer nouvelle configuration spécifique
      const nouvelleConfig = {
        type_config: 'enterprise_specific',
        entreprise_id: entrepriseId,
        taux_commission: nouveauTaux,
        actif: true,
        description: description || `Taux spécifique ${entreprise.nom}: ${ancienTaux}% → ${nouveauTaux}%`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error: insertError } = await this.supabaseService.client
        .from('commission_config')
        .insert(nouvelleConfig);

      if (insertError) throw insertError;

      // 7. Invalider le cache pour cette entreprise
      this.commissionCache.delete(entrepriseId);

      // 8. Log de l'audit
      await this.logCommissionChange(
        'SET_SPECIFIC_RATE',
        'enterprise_specific',
        entrepriseId,
        { taux: ancienTaux },
        { taux: nouveauTaux },
        'MEDIUM',
        0
      );

      console.log(`✅ Taux spécifique défini pour ${entreprise.nom}: ${nouveauTaux}%`);

    } catch (error) {
      console.error('❌ Erreur définition taux spécifique:', error);
      throw error;
    }
  }

  /**
   * Supprime un taux de commission spécifique (retour au taux global)
   */
  async removeSpecificCommissionRate(entrepriseId: string): Promise<void> {
    try {
      // 1. Valider l'ID entreprise
      if (!entrepriseId) throw new Error('ID entreprise requis');

      // 2. Vérifier que l'entreprise a un taux spécifique
      const { data: configActuelle, error: configError } = await this.supabaseService.client
        .from('commission_config')
        .select('taux_commission')
        .eq('type_config', 'enterprise_specific')
        .eq('entreprise_id', entrepriseId)
        .eq('actif', true)
        .maybeSingle();

      if (configError) throw configError;
      if (!configActuelle) {
        throw new Error('Cette entreprise n\'a pas de taux spécifique configuré');
      }

      // 3. Récupérer info entreprise
      const { data: entreprise, error: entrepriseError } = await this.supabaseService.client
        .from('entreprises')
        .select('nom')
        .eq('id', entrepriseId)
        .single();

      if (entrepriseError || !entreprise) {
        throw new Error('Entreprise non trouvée');
      }

      // 4. Créer backup
      const tauxGlobal = await this.getCurrentGlobalRate();
      await this.createCommissionBackup('specific_rate_removal', {
        entreprise_id: entrepriseId,
        entreprise_nom: entreprise.nom,
        ancien_taux: configActuelle.taux_commission,
        nouveau_taux: tauxGlobal
      });

      // 5. Désactiver la configuration spécifique
      const { error: updateError } = await this.supabaseService.client
        .from('commission_config')
        .update({ actif: false, updated_at: new Date().toISOString() })
        .eq('type_config', 'enterprise_specific')
        .eq('entreprise_id', entrepriseId)
        .eq('actif', true);

      if (updateError) throw updateError;

      // 6. Invalider le cache
      this.commissionCache.delete(entrepriseId);

      // 7. Log de l'audit
      await this.logCommissionChange(
        'REMOVE_SPECIFIC_RATE',
        'enterprise_specific',
        entrepriseId,
        { taux: configActuelle.taux_commission },
        { taux: tauxGlobal },
        'LOW',
        0
      );

      console.log(`✅ Taux spécifique supprimé pour ${entreprise.nom}, retour au taux global (${tauxGlobal}%)`);

    } catch (error) {
      console.error('❌ Erreur suppression taux spécifique:', error);
      throw error;
    }
  }
}