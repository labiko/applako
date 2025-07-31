export interface Reservation {
  id: string;
  client_phone: string;
  vehicle_type: string;
  position_depart: string;  // WKB format coordinates
  position_arrivee: string; // WKB format coordinates
  destination_nom: string;
  distance_km: number;
  prix_total: number;
  statut: 'pending' | 'accepted' | 'refused' | 'completed';
  created_at: string;
  updated_at?: string;
  conducteur_id?: string | null;
  destination_id?: string | null;
  prix_par_km?: number | null;
  tarif_applique?: string | null;
  code_validation?: string | null;
  date_code_validation?: string | null;
  duration?: string; // Durée calculée entre conducteur et réservation
  calculatedDistance?: string; // Distance calculée entre conducteur et position de départ
}