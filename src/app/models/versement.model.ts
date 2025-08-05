import { ConducteurStats } from '../services/entreprise.service';

export interface ConducteurVersement {
  conducteur: ConducteurStats;
  montantTotal: number;
  reservations: ReservationVersement[];
  nombreCourses: number;
  priorite: 'vip' | 'normal' | 'retard';
  tempsAttente?: number;
  positionFile?: number;
  anomalies?: Anomalie[];
}

export interface ReservationVersement {
  id: string;
  destination_nom: string;
  depart_nom?: string;
  position_depart: string;
  position_arrivee?: string;
  client_phone: string;
  prix_total: number;
  distance_km: number;
  date_code_validation: string;
  created_at: string;
  commentaire?: string;
}

export interface Versement {
  id: string;
  conducteur: ConducteurStats;
  montant: number;
  date_versement: string;
  reservation_ids: string[];
  statut: 'en_attente' | 'verse' | 'otp_envoye' | 'bloque' | 'annule';
  otp_code?: string;
  otp_attempts: number;
  localisation_versement?: {lat: number, lng: number};
  adresse_versement?: string;
  commentaire?: string;
}

export interface VersementOptions {
  montant: number;
  reservationIds: string[];
  commentaire?: string;
  position?: GeolocationPosition;
}

export interface ValidationOptions {
  // Options de validation simplifiées
}

export interface Anomalie {
  type: 'montant_eleve' | 'trop_courses' | 'frequence_anormale' | 'localisation_suspecte';
  severity: 'low' | 'medium' | 'high';
  details: string;
  valeur: number | string;
  seuil: number | string;
}

export interface VersementDashboard {
  montantTotalJour: number;
  nombreConducteursPresents: number;
  nombreVersementsEnCours: number;
  tempsAttenteMoyen: number;
  tauxSuccesOTP: number;
  nombreAnomaliesDetectees: number;
  montantMoyenParVersement: number;
  tendanceHoraire: {heure: number, montant: number}[];
}

export interface FileAttenteEntry {
  conducteur: ConducteurStats;
  position: number;
  tempsArrivee: Date;
  tempsAttenteEstime: number;
  priorite: 'vip' | 'normal' | 'retard';
  statut: 'en_attente' | 'en_cours' | 'termine';
}

export interface ValidationResult {
  valid: boolean;
  anomalies: Anomalie[];
}

export interface VersementReport {
  date: string;
  totalVersements: number;
  montantTotal: number;
  nombreConducteurs: number;
  tauxSucces: number;
  anomaliesDetectees: number;
}