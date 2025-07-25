import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { Conducteur } from './auth.service';

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
}