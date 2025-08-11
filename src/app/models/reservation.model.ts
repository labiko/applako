export interface Reservation {
  id: string;
  client_phone: string;
  vehicle_type: string;
  position_depart: string;  // WKB format coordinates
  position_arrivee: string; // WKB format coordinates
  depart_nom?: string; // Nom textuel du lieu de départ
  destination_nom: string;
  distance_km: number;
  prix_total: number;
  statut: 'pending' | 'accepted' | 'refused' | 'completed' | 'scheduled';
  created_at: string;
  updated_at?: string;
  conducteur_id?: string | null;
  destination_id?: string | null;
  prix_par_km?: number | null;
  tarif_applique?: string | null;
  code_validation?: string | null;
  date_code_validation?: string | null;
  date_reservation?: string; // Date de réservation planifiée
  heure_reservation?: number | null; // Heure de réservation planifiée (0-23)
  minute_reservation?: number | null; // Minutes de réservation planifiée (0-59)
  duration?: string; // Durée calculée entre conducteur et réservation
  calculatedDistance?: string; // Distance calculée entre conducteur et position de départ
}