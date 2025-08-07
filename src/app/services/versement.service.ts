import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { EntrepriseAuthService } from './entreprise-auth.service';
import { SMSService } from './sms.service';
import { 
  ConducteurVersement, 
  Versement, 
  VersementOptions, 
  ValidationOptions,
  VersementDashboard,
  FileAttenteEntry,
  ValidationResult,
  Anomalie,
  ReservationVersement,
  VersementReport
} from '../models/versement.model';
import { ConducteurStats } from './entreprise.service';

@Injectable({
  providedIn: 'root'
})
export class VersementService {
  private readonly MAX_ATTEMPTS = 3;
  private readonly SEUIL_DOUBLE_VALIDATION = 100000; // 100,000 GNF
  private readonly SEUIL_ANOMALIE_MONTANT = 200000; // 200,000 GNF
  private readonly SEUIL_COURSES_MAX = 20; // Plus de 20 courses = suspect

  constructor(
    private supabaseService: SupabaseService,
    private entrepriseAuthService: EntrepriseAuthService,
    private smsService: SMSService
  ) { }

  // ==================== GESTION FILE D'ATTENTE ====================

  async ajouterFileAttente(conducteurId: string, position?: GeolocationPosition): Promise<void> {
    try {
      const entrepriseId = this.entrepriseAuthService.getCurrentEntrepriseId();
      if (!entrepriseId) throw new Error('Entreprise non connectée');

      // Calculer la position dans la file
      const { count } = await this.supabaseService.client
        .from('file_attente_versements')
        .select('*', { count: 'exact', head: true })
        .eq('statut', 'en_attente');

      const position_file = (count || 0) + 1;
      const temps_attente_estime = position_file * 5; // 5 minutes par personne

      const { error } = await this.supabaseService.client
        .from('file_attente_versements')
        .insert({
          conducteur_id: conducteurId,
          position_file,
          temps_attente_estime,
          priorite: 'normal'
        });

      if (error) throw error;

      // Notifier le conducteur de son arrivée
      const conducteur = await this.getConducteur(conducteurId);
      if (conducteur) {
        await this.smsService.envoyerNotificationArrivee(
          conducteur.telephone, 
          position_file, 
          temps_attente_estime
        );
      }

    } catch (error) {
      console.error('Erreur ajout file attente:', error);
    }
  }

  async calculerTempsAttente(): Promise<number> {
    try {
      const { count } = await this.supabaseService.client
        .from('file_attente_versements')
        .select('*', { count: 'exact', head: true })
        .eq('statut', 'en_attente');

      return (count || 0) * 5; // 5 minutes par personne
    } catch (error) {
      console.error('Erreur calcul temps attente:', error);
      return 0;
    }
  }

  async notifierTourConducteur(conducteurId: string): Promise<void> {
    try {
      const conducteur = await this.getConducteur(conducteurId);
      if (conducteur) {
        await this.smsService.envoyerNotificationTour(conducteur.telephone);
      }
    } catch (error) {
      console.error('Erreur notification tour:', error);
    }
  }

  // ==================== PRÉ-VALIDATION ET ANOMALIES ====================

  async preValiderMontants(conducteurId: string): Promise<ValidationResult> {
    try {
      const reservations = await this.getReservationsAVerser(conducteurId);
      const montantTotal = reservations.reduce((sum, r) => sum + r.prix_total, 0);
      const anomalies: Anomalie[] = [];

      // Montant anormalement élevé
      if (montantTotal > this.SEUIL_ANOMALIE_MONTANT) {
        anomalies.push({
          type: 'montant_eleve',
          severity: 'high',
          details: `Montant de ${montantTotal.toLocaleString()} GNF dépasse le seuil`,
          valeur: montantTotal,
          seuil: this.SEUIL_ANOMALIE_MONTANT
        });
      }

      // Nombre de courses suspect
      if (reservations.length > this.SEUIL_COURSES_MAX) {
        anomalies.push({
          type: 'trop_courses',
          severity: 'medium',
          details: `${reservations.length} courses en une journée`,
          valeur: reservations.length,
          seuil: this.SEUIL_COURSES_MAX
        });
      }

      return { valid: anomalies.length === 0, anomalies };
    } catch (error) {
      console.error('Erreur pré-validation:', error);
      return { valid: false, anomalies: [] };
    }
  }

  async detecterAnomalies(conducteurId: string): Promise<Anomalie[]> {
    const validation = await this.preValiderMontants(conducteurId);
    return validation.anomalies;
  }

  async detecterTentativeFraude(versementId: string): Promise<void> {
    try {
      const versement = await this.getVersement(versementId);
      if (!versement) return;

      if (versement.otp_attempts >= 2) {
        console.warn(`🚨 Tentative de fraude détectée - Versement ${versementId}`);
        
        // Créer un litige automatique
        await this.creerLitige(
          versementId, 
          'fraude_suspectee', 
          `Multiples tentatives OTP incorrectes (${versement.otp_attempts})`
        );
      }
    } catch (error) {
      console.error('Erreur détection fraude:', error);
    }
  }

  // ==================== WORKFLOW VERSEMENT ====================

  async getMontantsAVerser(): Promise<ConducteurVersement[]> {
    try {
      const entrepriseId = this.entrepriseAuthService.getCurrentEntrepriseId();
      if (!entrepriseId) {
        console.log('⚠️ Aucune entreprise connectée');
        return [];
      }

      console.log(`🔍 Recherche des montants à verser pour l'entreprise: ${entrepriseId}`);

      // D'abord, récupérer les conducteurs de l'entreprise
      const { data: conducteurs, error: conducteursError } = await this.supabaseService.client
        .from('conducteurs')
        .select('id')
        .eq('entreprise_id', entrepriseId);

      if (conducteursError) {
        console.error('❌ Erreur récupération conducteurs:', conducteursError);
        throw conducteursError;
      }

      if (!conducteurs || conducteurs.length === 0) {
        console.log(`📊 Aucun conducteur trouvé pour l'entreprise ${entrepriseId}`);
        return [];
      }

      const conducteurIds = conducteurs.map(c => c.id);
      console.log(`👥 ${conducteurIds.length} conducteur(s) de l'entreprise`);

      // Récupérer les réservations à verser uniquement pour les conducteurs de l'entreprise
      const { data: reservations, error } = await this.supabaseService.client
        .from('reservations')
        .select(`
          id,
          client_phone,
          vehicle_type,
          position_depart,
          statut,
          created_at,
          conducteur_id,
          destination_nom,
          destination_id,
          position_arrivee,
          distance_km,
          prix_total,
          prix_par_km,
          tarif_applique,
          code_validation,
          updated_at,
          date_code_validation,
          commentaire,
          note_conducteur,
          date_add_commentaire,
          versement_id,
          depart_nom,
          conducteurs!inner (
            id,
            nom,
            prenom,
            telephone,
            entreprise_id,
            created_at
          )
        `)
        .in('conducteur_id', conducteurIds)
        .eq('conducteurs.entreprise_id', entrepriseId)
        .eq('statut', 'completed')
        .not('date_code_validation', 'is', null)
        .is('versement_id', null); // Pas encore versées

      if (error) {
        console.error('❌ Erreur récupération réservations:', error);
        throw error;
      }


      console.log(`📊 ${reservations?.length || 0} réservation(s) à verser trouvée(s)`);

      // Grouper par conducteur
      const groupedByConducteur = this.groupReservationsByConducteur(reservations || []);
      
      const result: ConducteurVersement[] = [];

      for (const [conducteurId, reservationsList] of groupedByConducteur.entries()) {
        const conducteur = reservationsList[0].conducteurs;
        // Pas besoin de vérifier entreprise_id car déjà filtré dans la requête
        if (!conducteur) continue;

        const montantTotal = reservationsList.reduce((sum, r) => sum + (r.prix_total || 0), 0);
        const anomalies = await this.detecterAnomalies(conducteurId);

        result.push({
          conducteur,
          montantTotal,
          reservations: reservationsList.map(r => ({
            id: r.id,
            destination_nom: r.destination_nom,
            position_depart: r.position_depart,
            client_phone: r.client_phone,
            prix_total: r.prix_total,
            distance_km: r.distance_km,
            date_code_validation: r.date_code_validation,
            created_at: r.created_at,
            commentaire: r.commentaire
          })),
          nombreCourses: reservationsList.length,
          priorite: 'normal',
          anomalies
        });
      }

      return result.sort((a, b) => b.montantTotal - a.montantTotal);

    } catch (error) {
      console.error('Erreur getMontantsAVerser:', error);
      return [];
    }
  }

  async initierVersement(conducteurId: string, reservationIds: string[], options: VersementOptions): Promise<{success: boolean, versementId?: string, message: string}> {
    try {
      const entrepriseId = this.entrepriseAuthService.getCurrentEntrepriseId();
      if (!entrepriseId) return { success: false, message: 'Entreprise non connectée' };

      // 1. Pré-validation
      const validation = await this.preValiderMontants(conducteurId);
      
      // 2. Double validation si gros montant
      if (options.montant > this.SEUIL_DOUBLE_VALIDATION) {
        console.warn(`⚠️ Montant élevé détecté: ${options.montant.toLocaleString()} GNF`);
        // Pour l'instant on continue, mais on pourrait ajouter une validation admin
      }

      // 3. Générer OTP
      const otpCode = this.genererOTP();

      // 4. Créer versement en attente
      const { data: versement, error } = await this.supabaseService.client
        .from('versements')
        .insert({
          conducteur_id: conducteurId,
          montant: options.montant,
          entreprise_id: entrepriseId,
          reservation_ids: reservationIds,
          statut: 'otp_envoye',
          otp_code: otpCode,
          otp_generated_at: new Date().toISOString(),
          commentaire: options.commentaire
        })
        .select()
        .single();

      if (error) throw error;

      // 5. Envoyer SMS OTP
      const conducteur = await this.getConducteur(conducteurId);
      if (!conducteur) return { success: false, message: 'Conducteur non trouvé' };

      const smsResult = await this.smsService.envoyerOTPVersement(
        conducteur.telephone, 
        otpCode, 
        options.montant
      );

      if (!smsResult.success) {
        // Annuler le versement si SMS échoue
        await this.supabaseService.client
          .from('versements')
          .update({ statut: 'annule' })
          .eq('id', versement.id);
        
        return { success: false, message: 'Échec envoi SMS' };
      }

      return { 
        success: true, 
        versementId: versement.id, 
        message: 'OTP envoyé avec succès' 
      };

    } catch (error) {
      console.error('Erreur initiation versement:', error);
      return { success: false, message: 'Erreur lors de l\'initiation du versement' };
    }
  }

  async validerVersementAvecOTP(versementId: string, otpCode: string, options: ValidationOptions): Promise<{success: boolean, message: string}> {
    try {
      const versement = await this.getVersement(versementId);
      
      // Vérifications de sécurité
      if (!versement || versement.statut !== 'otp_envoye') {
        return { success: false, message: 'Versement non trouvé ou déjà traité' };
      }

      if (versement.otp_attempts >= this.MAX_ATTEMPTS) {
        await this.bloquerVersement(versementId, 'trop_tentatives');
        return { success: false, message: 'Nombre maximum de tentatives atteint' };
      }

      if (versement.otp_code !== otpCode) {
        await this.incrementerTentativesOTP(versementId);
        await this.detecterTentativeFraude(versementId);
        return { success: false, message: 'Code OTP incorrect' };
      }

      // Validation réussie - Finaliser le versement
      const updateData: any = {
        statut: 'verse',
        date_versement: new Date().toISOString()
      };

      const { error } = await this.supabaseService.client
        .from('versements')
        .update(updateData)
        .eq('id', versementId);

      if (error) throw error;

      // Marquer les réservations comme versées
      await this.marquerReservationsVersees(versement.reservation_ids, versementId);

      // Envoyer SMS de confirmation
      const conducteur = await this.getConducteur(versement.conducteur_id);
      if (conducteur) {
        const reference = `VER-${versement.id.substring(0, 8)}`;
        await this.smsService.envoyerConfirmationVersement(
          conducteur.telephone, 
          versement.montant, 
          reference
        );
      }

      return { success: true, message: 'Versement effectué avec succès' };

    } catch (error) {
      console.error('Erreur validation OTP:', error);
      return { success: false, message: 'Erreur lors de la validation' };
    }
  }

  // ==================== GESTION OTP ====================

  genererOTP(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  async renvoyerOTP(versementId: string): Promise<boolean> {
    try {
      const versement = await this.getVersement(versementId);
      if (!versement) return false;

      const nouvelOTP = this.genererOTP();

      const { error } = await this.supabaseService.client
        .from('versements')
        .update({
          otp_code: nouvelOTP,
          otp_generated_at: new Date().toISOString(),
          otp_attempts: 0 // Reset les tentatives
        })
        .eq('id', versementId);

      if (error) throw error;

      // Renvoyer SMS
      const smsResult = await this.smsService.envoyerOTPVersement(
        versement.conducteur.telephone,
        nouvelOTP,
        versement.montant
      );

      return smsResult.success;

    } catch (error) {
      console.error('Erreur renvoi OTP:', error);
      return false;
    }
  }

  async incrementerTentativesOTP(versementId: string): Promise<void> {
    try {
      const { error } = await this.supabaseService.client
        .rpc('increment_otp_attempts', { versement_id: versementId });

      if (error) {
        // Fallback si la fonction n'existe pas
        const versement = await this.getVersement(versementId);
        if (versement) {
          await this.supabaseService.client
            .from('versements')
            .update({ otp_attempts: versement.otp_attempts + 1 })
            .eq('id', versementId);
        }
      }
    } catch (error) {
      console.error('Erreur incrémentation tentatives:', error);
    }
  }

  // ==================== HISTORIQUE ET RAPPORTS ====================

  async getHistoriqueVersements(): Promise<Versement[]> {
    try {
     
      const entrepriseId = this.entrepriseAuthService.getCurrentEntrepriseId();
      if (!entrepriseId) return [];

      const { data, error } = await this.supabaseService.client
        .from('versements')
        .select(`
          *,
          conducteurs (*)
        `)
        .eq('entreprise_id', entrepriseId)
        .eq('statut', 'verse')
        .order('date_versement', { ascending: false })
        .limit(100);

      if (error) throw error;

      return data?.map(v => ({
        id: v.id,
        conducteur: v.conducteurs,
        montant: v.montant,
        date_versement: v.date_versement,
        reservation_ids: v.reservation_ids,
        statut: v.statut,
        otp_attempts: v.otp_attempts,
        commentaire: v.commentaire
      })) || [];

    } catch (error) {
      console.error('Erreur historique versements:', error);
      return [];
    }
  }

  async getDashboardMetrics(): Promise<VersementDashboard> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const entrepriseId = this.entrepriseAuthService.getCurrentEntrepriseId();
      
      // Versements du jour
      const { data: versementsJour } = await this.supabaseService.client
        .from('versements')
        .select('montant, date_versement')
        .eq('entreprise_id', entrepriseId)
        .gte('date_versement', `${today}T00:00:00`)
        .eq('statut', 'verse');

      const montantTotalJour = versementsJour?.reduce((sum, v) => sum + v.montant, 0) || 0;

      // Conducteurs présents (file d'attente)
      const { count: nombreConducteursPresents } = await this.supabaseService.client
        .from('file_attente_versements')
        .select('*', { count: 'exact', head: true })
        .eq('statut', 'en_attente');

      // Versements en cours
      const { count: nombreVersementsEnCours } = await this.supabaseService.client
        .from('versements')
        .select('*', { count: 'exact', head: true })
        .eq('entreprise_id', entrepriseId)
        .eq('statut', 'otp_envoye');

      return {
        montantTotalJour,
        nombreConducteursPresents: nombreConducteursPresents || 0,
        nombreVersementsEnCours: nombreVersementsEnCours || 0,
        tempsAttenteMoyen: await this.calculerTempsAttente(),
        tauxSuccesOTP: 95, // TODO: Calculer réellement
        nombreAnomaliesDetectees: 0, // TODO: Calculer réellement
        montantMoyenParVersement: versementsJour?.length ? montantTotalJour / versementsJour.length : 0,
        tendanceHoraire: [] // TODO: Implémenter
      };

    } catch (error) {
      console.error('Erreur dashboard metrics:', error);
      return {
        montantTotalJour: 0,
        nombreConducteursPresents: 0,
        nombreVersementsEnCours: 0,
        tempsAttenteMoyen: 0,
        tauxSuccesOTP: 0,
        nombreAnomaliesDetectees: 0,
        montantMoyenParVersement: 0,
        tendanceHoraire: []
      };
    }
  }

  async getReservationsEnAttente(): Promise<any[]> {
    try {
      const entrepriseId = this.entrepriseAuthService.getCurrentEntrepriseId();
      if (!entrepriseId) {
        console.log('⚠️ Aucune entreprise connectée');
        return [];
      }

      console.log(`🔍 Recherche des réservations en attente pour l'entreprise: ${entrepriseId}`);

      // D'abord, récupérer les conducteurs de l'entreprise connectée
      const { data: conducteurs, error: conducteursError } = await this.supabaseService.client
        .from('conducteurs')
        .select('id')
        .eq('entreprise_id', entrepriseId);

      if (conducteursError) {
        console.error('❌ Erreur récupération conducteurs:', conducteursError);
        throw conducteursError;
      }

      if (!conducteurs || conducteurs.length === 0) {
        console.log(`📊 Aucun conducteur trouvé pour l'entreprise ${entrepriseId}`);
        return [];
      }

      console.log(`👥 ${conducteurs.length} conducteur(s) trouvé(s) pour l'entreprise`);

      // Récupérer les IDs des conducteurs
      const conducteurIds = conducteurs.map(c => c.id);

      // Puis récupérer les réservations de ces conducteurs uniquement
      const { data, error } = await this.supabaseService.client
        .from('reservations')
        .select(`
          id,
          client_phone,
          vehicle_type,
          position_depart,
          statut,
          created_at,
          conducteur_id,
          destination_nom,
          destination_id,
          position_arrivee,
          distance_km,
          prix_total,
          prix_par_km,
          tarif_applique,
          code_validation,
          updated_at,
          date_code_validation,
          commentaire,
          note_conducteur,
          date_add_commentaire,
          versement_id,
          depart_nom,
          conducteurs!inner (
            id,
            nom,
            prenom,
            telephone,
            entreprise_id
          )
        `)
        .in('conducteur_id', conducteurIds)
        .eq('conducteurs.entreprise_id', entrepriseId)
        .eq('statut', 'completed')
        .is('date_code_validation', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Erreur récupération réservations:', error);
        throw error;
      }
      
      console.log(`✅ ${data?.length || 0} réservation(s) en attente trouvée(s) pour l'entreprise ${entrepriseId}`);
      return data || [];

    } catch (error) {
      console.error('❌ Erreur globale getReservationsEnAttente:', error);
      return [];
    }
  }

  async getReservationsByVersementId(versementId: string): Promise<ReservationVersement[]> {
    try {
      const { data, error } = await this.supabaseService.client
        .from('reservations')
        .select(`
          id,
          client_phone,
          vehicle_type,
          position_depart,
          statut,
          created_at,
          conducteur_id,
          destination_nom,
          destination_id,
          position_arrivee,
          distance_km,
          prix_total,
          prix_par_km,
          tarif_applique,
          code_validation,
          updated_at,
          date_code_validation,
          commentaire,
          note_conducteur,
          date_add_commentaire,
          versement_id,
          depart_nom
        `)
        .eq('versement_id', versementId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data?.map(r => ({
        id: r.id,
        destination_nom: r.destination_nom,
        depart_nom: r.depart_nom,
        position_depart: r.position_depart,
        position_arrivee: r.position_arrivee,
        client_phone: r.client_phone,
        prix_total: r.prix_total,
        distance_km: r.distance_km,
        date_code_validation: r.date_code_validation,
        created_at: r.created_at,
        commentaire: r.commentaire
      })) || [];

    } catch (error) {
      console.error('Erreur récupération réservations versement:', error);
      return [];
    }
  }

  // ==================== LITIGES ====================

  async creerLitige(versementId: string, type: string, description: string): Promise<string> {
    try {
      const { data, error } = await this.supabaseService.client
        .from('litiges_versement')
        .insert({
          versement_id: versementId,
          type_litige: type,
          description,
          statut: 'ouvert'
        })
        .select()
        .single();

      if (error) throw error;
      return data.id;

    } catch (error) {
      console.error('Erreur création litige:', error);
      return '';
    }
  }

  async resoudreLitige(litigeId: string, resolution: string): Promise<void> {
    try {
      const { error } = await this.supabaseService.client
        .from('litiges_versement')
        .update({
          statut: 'resolu',
          resolution,
          resolved_at: new Date().toISOString()
        })
        .eq('id', litigeId);

      if (error) throw error;

    } catch (error) {
      console.error('Erreur résolution litige:', error);
    }
  }

  // ==================== MÉTHODES UTILITAIRES ====================

  private async getConducteur(conducteurId: string): Promise<ConducteurStats | null> {
    try {
      const { data, error } = await this.supabaseService.client
        .from('conducteurs')
        .select('*')
        .eq('id', conducteurId)
        .single();

      if (error) throw error;
      return data;

    } catch (error) {
      console.error('Erreur getConducteur:', error);
      return null;
    }
  }

  private async getVersement(versementId: string): Promise<any> {
    try {
      const { data, error } = await this.supabaseService.client
        .from('versements')
        .select(`
          *,
          conducteurs (*)
        `)
        .eq('id', versementId)
        .single();

      if (error) throw error;
      return data;

    } catch (error) {
      console.error('Erreur getVersement:', error);
      return null;
    }
  }

  private async getReservationsAVerser(conducteurId: string): Promise<ReservationVersement[]> {
    try {
      const { data, error } = await this.supabaseService.client
        .from('reservations')
        .select('*')
        .eq('conducteur_id', conducteurId)
        .eq('statut', 'completed')
        .not('date_code_validation', 'is', null)
        .is('versement_id', null);

      if (error) throw error;

      return data?.map(r => ({
        id: r.id,
        destination_nom: r.destination_nom,
        position_depart: r.position_depart,
        client_phone: r.client_phone,
        prix_total: r.prix_total,
        distance_km: r.distance_km,
        date_code_validation: r.date_code_validation,
        created_at: r.created_at,
        commentaire: r.commentaire
      })) || [];

    } catch (error) {
      console.error('Erreur getReservationsAVerser:', error);
      return [];
    }
  }

  private groupReservationsByConducteur(reservations: any[]): Map<string, any[]> {
    const grouped = new Map<string, any[]>();
    
    reservations.forEach(reservation => {
      const conducteurId = reservation.conducteur_id;
      if (!grouped.has(conducteurId)) {
        grouped.set(conducteurId, []);
      }
      grouped.get(conducteurId)!.push(reservation);
    });
    
    return grouped;
  }

  private async bloquerVersement(versementId: string, motif: string): Promise<void> {
    try {
      const { error } = await this.supabaseService.client
        .from('versements')
        .update({ 
          statut: 'bloque',
          commentaire: `Bloqué: ${motif}`
        })
        .eq('id', versementId);

      if (error) throw error;

    } catch (error) {
      console.error('Erreur blocage versement:', error);
    }
  }

  private async marquerReservationsVersees(reservationIds: string[], versementId: string): Promise<void> {
    try {
      const { error } = await this.supabaseService.client
        .from('reservations')
        .update({ versement_id: versementId })
        .in('id', reservationIds);

      if (error) throw error;

    } catch (error) {
      console.error('Erreur marquage réservations versées:', error);
    }
  }
}