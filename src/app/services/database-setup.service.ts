import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root'
})
export class DatabaseSetupService {

  constructor(private supabase: SupabaseService) { }

  async creerVueReservationsAVerser(): Promise<{ success: boolean, message: string }> {
    try {
      console.log('🏗️ Création de la vue reservations_a_verser...');
      
      const sqlCreateView = `
        CREATE OR REPLACE VIEW reservations_completed_view AS
        SELECT 
            r.id,
            r.client_phone,
            r.vehicle_type,
            r.position_depart,
            r.position_arrivee,
            r.depart_nom,
            r.destination_nom,
            r.statut,
            r.conducteur_id,
            r.distance_km,
            r.prix_total,
            r.date_reservation,
            r.heure_reservation,
            r.minute_reservation,
            r.created_at,
            r.updated_at,
            r.code_validation,
            r.date_code_validation,
            r.commentaire,
            r.note_conducteur,
            r.date_add_commentaire,
            r.versement_id,
            c.nom as conducteur_nom,
            c.prenom as conducteur_prenom,
            c.telephone as conducteur_telephone,
            c.entreprise_id,
            CASE 
                WHEN EXISTS (
                    SELECT 1 
                    FROM lengopay_payments lp 
                    WHERE lp.reservation_id = r.id 
                    AND lp.status = 'SUCCESS'
                ) 
                THEN 'mobile_money'
                ELSE 'cash'
            END as mode_paiement
        FROM reservations r
        INNER JOIN conducteurs c ON r.conducteur_id = c.id
        WHERE 
            r.statut = 'completed';
      `;

      // Exécuter la requête via Supabase SQL
      const { error } = await this.supabase.client
        .rpc('exec_sql', { query: sqlCreateView });

      if (error) {
        console.error('❌ Erreur création vue:', error);
        return { 
          success: false, 
          message: `Erreur: ${error.message}. Créez la vue manuellement dans Supabase SQL Editor.` 
        };
      }

      console.log('✅ Vue reservations_a_verser créée avec succès');
      return { success: true, message: 'Vue créée avec succès' };

    } catch (error) {
      console.error('❌ Erreur création vue:', error);
      return { 
        success: false, 
        message: 'Erreur inattendue. Créez la vue manuellement dans Supabase SQL Editor.' 
      };
    }
  }

  async verifierVueExiste(): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.client
        .from('reservations_completed_view')
        .select('id')
        .limit(1);

      return !error;
    } catch {
      return false;
    }
  }

  async creerVueAutomatiquement(): Promise<void> {
    const vueExiste = await this.verifierVueExiste();
    
    if (!vueExiste) {
      console.log('🔍 Vue reservations_completed_view non trouvée, création automatique...');
      const result = await this.creerVueReservationsAVerser();
      
      if (result.success) {
        console.log('✅ Vue créée automatiquement');
      } else {
        console.warn('⚠️ Impossible de créer la vue automatiquement:', result.message);
        console.log('💡 Copiez le contenu de sql/create_reservations_a_verser_view.sql dans Supabase SQL Editor');
      }
    } else {
      console.log('✅ Vue reservations_completed_view déjà présente');
    }
  }
}