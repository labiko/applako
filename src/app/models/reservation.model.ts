export interface Reservation {
  id: string;
  client_phone: string;
  vehicle_type: string;
  position_depart: string;
  statut: 'pending' | 'accepted' | 'refused' | 'completed';
  created_at: string;
  conducteur_id?: string | null;
  destination_nom: string;
  destination_id?: string | null;
  position_arrivee?: string | null;
  distance_km: string;
  prix_total: string;
  prix_par_km?: string | null;
  tarif_applique?: string | null;
  code_validation?: string | null;
  updated_at: string;
}