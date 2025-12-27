import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { Conducteur } from './auth.service';
import { Entreprise } from './entreprise-auth.service';
import { Reservation } from '../models/reservation.model';
import * as bcrypt from 'bcryptjs';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
  }

  get client() {
    return this.supabase;
  }

  // Récupérer conducteur connecté directement du localStorage (évite dépendance circulaire)
  private getCurrentConducteurFromStorage(): Conducteur | null {
    try {
      // D'abord essayer localStorage currentConducteur
      if (typeof Storage !== 'undefined') {
        const stored = localStorage.getItem('currentConducteur');
        if (stored) {
          return JSON.parse(stored);
        }
        
        // Sinon essayer conducteur (sans current)
        const storedAlt = localStorage.getItem('conducteur');
        if (storedAlt) {
          return JSON.parse(storedAlt);
        }
      }
      
      // Si pas dans localStorage, utiliser AuthService directement
      // Importer depuis auth.service.ts qui a la méthode getCurrentConducteur()
      const authConducteur = (window as any).__currentConducteur;
      if (authConducteur) {
        return authConducteur;
      }
      
      return null;
    } catch (error) {
      console.error('Erreur lecture conducteur localStorage:', error);
      return null;
    }
  }

  // Authenticate conducteur avec bcrypt
  async authenticateConducteur(telephone: string, password: string): Promise<Conducteur | null> {
    // 1. Récupérer le conducteur par téléphone
    const { data, error } = await this.supabase
      .from('conducteurs')
      .select(`
        *,
        entreprises(nom)
      `)
      .eq('telephone', telephone)
      .single();

    if (error || !data) {
      console.error('Authentication error - conducteur non trouvé:', error);
      return null;
    }

    // 2. Vérifier le mot de passe avec bcrypt
    const conducteur = data as any;
    if (!conducteur.password || !bcrypt.compareSync(password, conducteur.password)) {
      console.error('Authentication error - mot de passe incorrect');
      return null;
    }

    // 3. Extraire le nom de l'entreprise de la jointure
    if (conducteur.entreprises && conducteur.entreprises.nom) {
      conducteur.entreprise_nom = conducteur.entreprises.nom;
      delete conducteur.entreprises; // Nettoyer l'objet
    }

    return conducteur as Conducteur;
  }

  // Authenticate entreprise (uniquement par email)
  async authenticateEntreprise(email: string, password?: string): Promise<Entreprise | null> {
    const { data, error } = await this.supabase
      .from('entreprises')
      .select('*')
      .eq('email', email)
      .eq('actif', true)
      .single();

    if (error || !data) {
      console.error('Entreprise not found:', error);
      return null;
    }

    // Si c'est la première connexion (password_hash null), permettre la connexion sans mot de passe
    if (!data.password_hash && data.first_login) {
      return data as Entreprise;
    }

    // Sinon, vérifier le mot de passe avec bcrypt
    if (password && data.password_hash && bcrypt.compareSync(password, data.password_hash)) {
      return data as Entreprise;
    }

    console.error('Invalid password');
    return null;
  }

  // Créer le mot de passe lors de la première connexion
  async createEntreprisePassword(entrepriseId: string, newPassword: string): Promise<boolean> {
    try {
      // Hasher le mot de passe avec bcrypt
      const saltRounds = 10;
      const hashedPassword = bcrypt.hashSync(newPassword, saltRounds);

      const { error } = await this.supabase
        .from('entreprises')
        .update({ 
          password_hash: hashedPassword,
          first_login: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', entrepriseId);

      if (error) {
        console.error('Error creating password:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in createEntreprisePassword:', error);
      return false;
    }
  }

  // Vérifier si l'entreprise doit créer un mot de passe (uniquement par email)
  async checkFirstLogin(email: string): Promise<{ needsPassword: boolean; entreprise?: Entreprise }> {
    try {
      const { data, error } = await this.supabase
        .from('entreprises')
        .select('*')
        .eq('email', email)
        .eq('actif', true)
        .single();

      if (error || !data) {
        return { needsPassword: false };
      }

      console.log('Debug checkFirstLogin:', {
        password_hash: data.password_hash,
        first_login: data.first_login,
        needsPassword: !data.password_hash && data.first_login
      });

      return {
        needsPassword: !data.password_hash && data.first_login,
        entreprise: data as Entreprise
      };
    } catch (error) {
      console.error('Error checking first login:', error);
      return { needsPassword: false };
    }
  }

  // Get pending reservations within custom radius of current conducteur
  async getPendingReservations(conducteurId?: string, testMode: boolean = false) {
    try {
      // Si conducteurId fourni, utiliser l'ancienne méthode (pour historique assigné)
      if (conducteurId) {
        let query = this.supabase
          .from('reservations')
          .select('*')
          .eq('statut', 'pending')
          .eq('conducteur_id', conducteurId);

        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
      }

      // NOUVEAU: Filtrage par rayon personnalisé pour conducteur connecté
      const currentConducteur = this.getCurrentConducteurFromStorage();
      if (!currentConducteur?.id) {
        console.warn('Aucun conducteur connecté pour filtrage par rayon');
        return [];
      }

      // Récupérer les données complètes du conducteur avec rayon_km_reservation
      const { data: conducteurData, error: conducteurError } = await this.supabase
        .from('conducteurs')
        .select('rayon_km_reservation, position_actuelle, hors_ligne')
        .eq('id', currentConducteur.id)
        .single();

      if (conducteurError) {
        console.error('Erreur récupération données conducteur:', conducteurError);
        return this.getPendingAndScheduledReservationsLegacy();
      }

      // Définir le rayon : si NULL, utiliser 5km par défaut
      const rayonKm = conducteurData.rayon_km_reservation || 5;
      const rayonMetres = rayonKm * 1000;
      
      console.log(`📍 Filtrage réservations avec rayon: ${rayonKm}km`);
      console.log('🔍 DEBUG RPC Paramètres:', {
        conducteur_position: conducteurData.position_actuelle,
        radius_meters: rayonMetres,
        vehicle_type_filter: currentConducteur.vehicle_type,
        statut_filter: 'pending'
      });

      // ✅ NOUVEAU : Mode test - ignorer position et statut hors ligne
      if (testMode) {
        console.warn('🐛 MODE TEST ACTIVÉ - Affichage de TOUTES les réservations sans filtre géographique');
        
        // Récupérer TOUTES les réservations pending et scheduled sans filtre de distance
        const { data: allPendingData, error: allPendingError } = await this.supabase
          .from('reservations')
          .select('*')
          .eq('statut', 'pending')
          .order('created_at', { ascending: false });

        const { data: allScheduledData, error: allScheduledError } = await this.supabase
          .from('reservations')
          .select('*')
          .eq('statut', 'scheduled')
          .order('created_at', { ascending: false });

        if (allPendingError || allScheduledError) {
          console.error('Erreur récupération réservations mode test:', allPendingError || allScheduledError);
          return [];
        }

        const allReservations = [...(allPendingData || []), ...(allScheduledData || [])];
        console.log(`🐛 MODE TEST: ${allReservations.length} réservations récupérées`);
        return allReservations;
      }

      // Si pas de position conducteur OU conducteur hors ligne, pas de réservations
      if (!conducteurData.position_actuelle || conducteurData.hors_ligne) {
        console.warn('Position conducteur manquante OU conducteur hors ligne - aucune réservation affichée');
        return [];
      }

      // Filtrage PENDING avec distance PostGIS
      const { data: pendingData, error: pendingError } = await this.supabase
        .rpc('get_reservations_within_radius', {
          conducteur_position: conducteurData.position_actuelle,
          radius_meters: rayonMetres,
          vehicle_type_filter: currentConducteur.vehicle_type,
          statut_filter: 'pending'
        });

      // Filtrage SCHEDULED avec distance PostGIS
      const { data: scheduledData, error: scheduledError } = await this.supabase
        .rpc('get_reservations_within_radius', {
          conducteur_position: conducteurData.position_actuelle,
          radius_meters: rayonMetres,
          vehicle_type_filter: currentConducteur.vehicle_type,
          statut_filter: 'scheduled'
        });

      // Si les RPC échouent, fallback vers méthode legacy
      if (pendingError || scheduledError) {
        console.error('Erreur RPC filtrage distance:', { pendingError, scheduledError });
        return this.getPendingAndScheduledReservationsLegacy();
      }

      // Combiner pending + scheduled
      const allReservations = [
        ...(pendingData || []),
        ...(scheduledData || [])
      ];
      
      console.log(`✅ Réservations trouvées dans rayon ${rayonKm}km: ${allReservations.length}`);


      // La fonction RPC retourne déjà les résultats triés par distance
      // Combinaison simple : pending d'abord (déjà triés par distance), puis scheduled (déjà triés par distance)
      return allReservations.sort((a, b) => {
        // Priorité aux pending (plus urgent)
        if (a.statut === 'pending' && b.statut === 'scheduled') return -1;
        if (a.statut === 'scheduled' && b.statut === 'pending') return 1;
        
        // Pour le même statut, garder l'ordre retourné par RPC (déjà trié par distance)
        return 0;
      });

    } catch (error) {
      console.error('Erreur getPendingReservations:', error);
      return [];
    }
  }

  // Nouvelle méthode pour mettre à jour le rayon de réservation
  async updateConducteurRayon(conducteurId: string, rayonKm: number | null): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('conducteurs')
        .update({ rayon_km_reservation: rayonKm })
        .eq('id', conducteurId);

      if (error) {
        console.error('Erreur mise à jour rayon conducteur:', error);
        return false;
      }

      console.log(`✅ Rayon mis à jour: ${rayonKm}km pour conducteur ${conducteurId}`);
      return true;
    } catch (error) {
      console.error('Erreur updateConducteurRayon:', error);
      return false;
    }
  }

  // Méthode fallback (ancienne logique)
  private async getPendingAndScheduledReservationsLegacy() {
    const { data, error } = await this.supabase
      .from('reservations')
      .select('*, position_depart, position_arrivee')
      .in('statut', ['pending', 'scheduled'])
      .is('conducteur_id', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching reservations (legacy):', error);
      return [];
    }

    return data || [];
  }

  private async getPendingReservationsLegacy() {
    const { data, error } = await this.supabase
      .from('reservations')
      .select('*, position_depart, position_arrivee')
      .eq('statut', 'pending')
      .is('conducteur_id', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching reservations (legacy):', error);
      return [];
    }

    return data || [];
  }

  // Récupérer les réservations planifiées assignées à un conducteur spécifique
  async getScheduledReservationsForConducteur(conducteurId: string): Promise<Reservation[]> {
    try {
      console.log('🔍 SQL Query - Recherche réservations planifiées pour conducteur:', conducteurId);
      
      const { data, error } = await this.supabase
        .from('reservations')
        .select('*, position_depart, position_arrivee')
        .eq('conducteur_id', conducteurId)
        .not('date_reservation', 'is', null) // date_reservation != null
        .is('date_code_validation', null)    // date_code_validation = null
        .in('statut', ['accepted', 'scheduled']) // Réservations acceptées ou planifiées
        .order('date_reservation', { ascending: true })
        .order('heure_reservation', { ascending: true });

      console.log('📊 Résultat requête SQL:', { data, error });

      if (error) {
        console.error('Error fetching scheduled reservations for conducteur:', error);
        return [];
      }

      console.log('✅ Données retournées:', data?.length || 0, 'réservations');
      
      return data || [];
    } catch (error) {
      console.error('Error in getScheduledReservationsForConducteur:', error);
      return [];
    }
  }

  // Récupérer une réservation par son ID
  async getReservationById(reservationId: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('reservations')
      .select('*')
      .eq('id', reservationId)
      .single();
      
    if (error) {
      console.error('Error fetching reservation by ID:', error);
      throw error;
    }
    
    return data;
  }

  // Update reservation status and assign conducteur
  // Mettre à jour le Player ID OneSignal d'un conducteur
  async updateConducteurPlayerId(conducteurId: string, playerId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('conducteurs')
        .update({ player_id: playerId })
        .eq('id', conducteurId);

      if (error) {
        console.error('Erreur mise à jour player_id:', error);
        return false;
      }

      console.log(`✅ Player ID mis à jour pour conducteur ${conducteurId}`);
      return true;
    } catch (error) {
      console.error('Erreur updateConducteurPlayerId:', error);
      return false;
    }
  }

  async updateReservationStatus(id: string, status: 'accepted' | 'refused', conducteurId?: string) {
    // DOUBLE VÉRIFICATION AVANT UPDATE
    if (status === 'accepted' && conducteurId) {
      // 1. Vérifier que conducteur_id est toujours null
      const { data: checkData, error: checkError } = await this.supabase
        .from('reservations')
        .select('conducteur_id')
        .eq('id', id)
        .single();
        
      if (checkError) {
        console.error('Error checking reservation status:', checkError);
        throw checkError;
      }
        
      if (checkData?.conducteur_id !== null) {
        console.warn('Reservation already taken by another driver:', checkData.conducteur_id);
        throw new Error('RESERVATION_ALREADY_TAKEN');
      }
    }
    
    const updateData: any = { statut: status };
    
    if (status === 'accepted' && conducteurId) {
      updateData.conducteur_id = conducteurId;
    }

    // UPDATE avec condition WHERE pour garantir l'atomicité
    let query = this.supabase
      .from('reservations')
      .update(updateData)
      .eq('id', id);
    
    // Ajouter condition atomique si acceptation
    if (status === 'accepted') {
      query = query.is('conducteur_id', null); // ⚠️ CONDITION CRITIQUE
    }
    
    const { data, error } = await query.select();

    if (error) {
      console.error('Error updating reservation:', error);
      throw error;
    }
    
    // Vérifier que l'update a bien eu lieu
    if (!data || data.length === 0) {
      console.warn('No reservation updated - probably already taken');
      throw new Error('RESERVATION_ALREADY_TAKEN');
    }

    return data;
  }

  // Get reservation history for a specific conducteur
  async getReservationHistory(conducteurId?: string) {
    let query = this.supabase
      .from('reservations')
      .select('*, position_depart, position_arrivee')
      .neq('statut', 'pending');

    if (conducteurId) {
      query = query.eq('conducteur_id', conducteurId);
    }

    const { data, error } = await query.order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching history:', error);
      return [];
    }

    return data || [];
  }

  // Mettre à jour la position du conducteur
  async updateConducteurPosition(conducteurId: string, longitude: number, latitude: number, accuracy?: number): Promise<boolean> {
    try {
      console.log('🔄 DEBUG updateConducteurPosition - Input:', { conducteurId, longitude, latitude, accuracy });
      
      // Convertir les coordonnées en format WKB PostGIS
      // Format: SRID=4326;POINT(longitude latitude)
      const wkbHex = this.createWKBPoint(longitude, latitude);
      console.log('📍 DEBUG WKB généré:', wkbHex);
      
      const updateData: any = {
        position_actuelle: wkbHex,
        date_update_position: new Date().toISOString(),
        derniere_activite: new Date().toISOString()
      };
      
      console.log('💾 DEBUG updateData:', updateData);

      // Ajouter l'accuracy si fournie
      if (accuracy !== undefined) {
        updateData.accuracy = accuracy;
      }
      
      const { data, error } = await this.supabase
        .from('conducteurs')
        .update(updateData)
        .eq('id', conducteurId)
        .select('id, position_actuelle, date_update_position');

      console.log('🔄 DEBUG Update result:', { data, error });

      if (error) {
        console.error('❌ Error updating conductor position:', error);
        return false;
      }

      console.log('✅ Position updated successfully:', data);
      return true;
    } catch (error) {
      console.error('Error in updateConducteurPosition:', error);
      return false;
    }
  }

  // Créer un point WKB au format PostGIS
  private createWKBPoint(longitude: number, latitude: number): string {
    // WKB format pour POINT avec SRID 4326 (WGS84)
    // Structure: [byte order][wkb type][SRID][X][Y]
    // Total: 1 + 4 + 4 + 8 + 8 = 25 bytes
    const buffer = new ArrayBuffer(25);
    const view = new DataView(buffer);
    
    let offset = 0;
    
    // Byte order (1 = little-endian)
    view.setUint8(offset, 1);
    offset += 1;
    
    // WKB type (0x20000001 = Point with SRID)
    view.setUint32(offset, 0x20000001, true);
    offset += 4;
    
    // SRID (4326 = WGS84)
    view.setUint32(offset, 4326, true);
    offset += 4;
    
    // X coordinate (longitude)
    view.setFloat64(offset, longitude, true);
    offset += 8;
    
    // Y coordinate (latitude)
    view.setFloat64(offset, latitude, true);
    
    // Convertir en hex string
    let hex = '0101000020E6100000';  // Préfixe standard pour POINT SRID=4326
    const bytes = new Uint8Array(buffer);
    
    // Commencer après le préfixe déjà ajouté (9 bytes)
    for (let i = 9; i < bytes.length; i++) {
      hex += bytes[i].toString(16).padStart(2, '0').toUpperCase();
    }
    
    return hex;
  }

  // Valider le code OTP et mettre à jour date_code_validation
  async validateOTP(reservationId: string, otpCode: string): Promise<boolean> {
    try {
      // Vérifier si le code OTP est correct
      const { data: reservation, error: fetchError } = await this.supabase
        .from('reservations')
        .select('code_validation')
        .eq('id', reservationId)
        .single();

      if (fetchError || !reservation) {
        console.error('Error fetching reservation:', fetchError);
        return false;
      }

      // Vérifier si le code correspond
      if (reservation.code_validation === otpCode) {
        // Mettre à jour date_code_validation avec la date/heure actuelle
        const { error: updateError } = await this.supabase
          .from('reservations')
          .update({ 
            date_code_validation: new Date().toISOString(),
            statut: 'completed' // Marquer comme terminé
          })
          .eq('id', reservationId);

        if (updateError) {
          console.error('Error updating validation date:', updateError);
          return false;
        }

        return true;
      }

      return false;
    } catch (error) {
      console.error('Error validating OTP:', error);
      return false;
    }
  }

  // Mettre à jour le statut en ligne/hors ligne du conducteur
  async updateConducteurStatus(conducteurId: string, hors_ligne: boolean): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('conducteurs')
        .update({ 
          hors_ligne: hors_ligne,
          derniere_activite: new Date().toISOString()
        })
        .eq('id', conducteurId)
        .select();

      if (error) {
        console.error('Error updating conductor status:', error);
        return false;
      }

      console.log('Conductor status updated:', { conducteurId, hors_ligne, updated: data?.length });
      return true;
    } catch (error) {
      console.error('Error in updateConducteurStatus:', error);
      return false;
    }
  }


  // Récupérer l'état actuel du conducteur depuis la base
  async getConducteurStatus(conducteurId: string): Promise<{hors_ligne: boolean, derniere_activite: string} | null> {
    try {
      const { data, error } = await this.supabase
        .from('conducteurs')
        .select('hors_ligne, derniere_activite')
        .eq('id', conducteurId)
        .single();

      if (error) {
        console.error('Error getting conductor status:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getConducteurStatus:', error);
      return null;
    }
  }

  // Compter le nombre total de courses terminées d'un conducteur
  async getConducteurTotalRides(conducteurId: string): Promise<number> {
    try {
      const { data, error, count } = await this.supabase
        .from('reservations')
        .select('*', { count: 'exact', head: true })
        .eq('conducteur_id', conducteurId)
        .eq('statut', 'completed');

      if (error) {
        console.error('Error counting conductor rides:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error in getConducteurTotalRides:', error);
      return 0;
    }
  }
}