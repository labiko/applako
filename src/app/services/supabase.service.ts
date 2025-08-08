import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { Conducteur } from './auth.service';
import { Entreprise } from './entreprise-auth.service';
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

  // Authenticate conducteur
  async authenticateConducteur(telephone: string, password: string): Promise<Conducteur | null> {
    const { data, error } = await this.supabase
      .from('conducteurs')
      .select('*')
      .eq('telephone', telephone)
      .eq('password', password)
      .single();

    if (error) {
      console.error('Authentication error:', error);
      return null;
    }

    return data as Conducteur;
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

  // Get pending reservations for a specific conducteur
  async getPendingReservations(conducteurId?: string) {
    let query = this.supabase
      .from('reservations')
      .select('*')
      .eq('statut', 'pending');

    if (conducteurId) {
      query = query.eq('conducteur_id', conducteurId);
    } else {
      query = query.is('conducteur_id', null);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching reservations:', error);
      return [];
    }

    return data || [];
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
    const updateData: any = { statut: status };
    
    if (status === 'accepted' && conducteurId) {
      updateData.conducteur_id = conducteurId;
    }

    const { data, error } = await this.supabase
      .from('reservations')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) {
      console.error('Error updating reservation:', error);
      throw error;
    }

    return data;
  }

  // Get reservation history for a specific conducteur
  async getReservationHistory(conducteurId?: string) {
    let query = this.supabase
      .from('reservations')
      .select('*')
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
      // Convertir les coordonnées en format WKB PostGIS
      // Format: SRID=4326;POINT(longitude latitude)
      const wkbHex = this.createWKBPoint(longitude, latitude);
      
      const updateData: any = {
        position_actuelle: wkbHex,
        date_update_position: new Date().toISOString()
      };

      // Ajouter l'accuracy si fournie
      if (accuracy !== undefined) {
        updateData.accuracy = accuracy;
      }
      
      const { error } = await this.supabase
        .from('conducteurs')
        .update(updateData)
        .eq('id', conducteurId);

      if (error) {
        console.error('Error updating conductor position:', error);
        return false;
      }

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