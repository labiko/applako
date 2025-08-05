/**
 * MODÈLES TYPESCRIPT SUPER-ADMIN
 * Architecture isolée - Pas de dépendance vers modules conducteur/entreprise
 */

// ============================================================================
// UTILISATEUR SUPER-ADMIN
// ============================================================================
export interface SuperAdminUser {
  id: string;
  nom: string;
  email: string;
  responsable?: string;
  telephone?: string;
  is_admin: boolean;
  actif: boolean;
  created_at: string;
  login_time?: string;
  last_activity?: string;
}

export interface SuperAdminSession {
  user_id: string;
  nom: string;
  email: string;
  session_id: string;
  login_time: string;
  last_activity: string;
  ip_address?: string;
  user_agent?: string;
}

// ============================================================================
// CONFIGURATION COMMISSIONS
// ============================================================================
export interface CommissionConfig {
  id: string;
  type_config: 'global_default' | 'enterprise_specific';
  entreprise_id?: string;
  taux_commission: number;
  date_debut: string;
  date_fin?: string;
  actif: boolean;
  created_by: string;
  motif?: string;
  created_at: string;
  updated_at: string;
  
  // Relations calculées
  entreprise_nom?: string;
  is_current?: boolean;
  days_remaining?: number;
}

export interface CommissionChangeRequest {
  entreprise_id?: string;
  nouveau_taux: number;
  date_debut: string;
  date_fin?: string;
  motif: string;
  type_config: 'global_default' | 'enterprise_specific';
}

export interface CommissionSimulation {
  taux_actuel: number;
  taux_nouveau: number;
  periode: 'month' | 'year';
  revenus_actuels: number;
  revenus_nouveau: number;
  variation: number;
  variation_pourcentage: number;
  entreprises_impactees: number;
  ca_total_periode: number;
}

// ============================================================================
// AUDIT & LOGS
// ============================================================================
export type AuditActionType = 
  | 'COMMISSION_CHANGE' 
  | 'ENTERPRISE_MODIFY' 
  | 'ENTERPRISE_SUSPEND'
  | 'GLOBAL_SETTING_CHANGE' 
  | 'LOGIN' 
  | 'LOGOUT' 
  | 'VIEW_SENSITIVE_DATA'
  | 'EXPORT_DATA' 
  | 'SIMULATION_RUN' 
  | 'BACKUP_RESTORE' 
  | 'SECURITY_VIOLATION'
  | 'SYSTEM_MAINTENANCE_START' 
  | 'SYSTEM_MAINTENANCE_END';

export type AuditEntityType = 
  | 'COMMISSION' 
  | 'ENTERPRISE' 
  | 'USER' 
  | 'SYSTEM' 
  | 'EXPORT' 
  | 'SESSION';

export type AuditImpactLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface AuditLog {
  id: string;
  user_id: string;
  session_id: string;
  action_type: AuditActionType;
  entity_type: AuditEntityType;
  entity_id?: string;
  old_values?: any;
  new_values?: any;
  ip_address?: string;
  user_agent?: string;
  request_method?: string;
  request_url?: string;
  impact_level: AuditImpactLevel;
  business_impact_gnf: number;
  created_at: string;
  
  // Relations calculées
  user_nom?: string;
  user_email?: string;
  entity_description?: string;
}

export interface AuditFilters {
  startDate?: string;
  endDate?: string;
  actionType?: AuditActionType;
  impactLevel?: AuditImpactLevel;
  userId?: string;
  entityType?: AuditEntityType;
  limit?: number;
}

// ============================================================================
// SYSTÈME DE BACKUP
// ============================================================================
export interface SystemBackup {
  id: string;
  type: 'SCHEDULED' | 'PRE_CRITICAL_CHANGE';
  commission_data?: any;
  enterprise_data?: any;
  audit_data?: any;
  size_bytes: number;
  checksum: string;
  compression_ratio?: number;
  created_at: string;
  expires_at?: string;
  metadata?: any;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'EXPIRED';
}

export interface BackupFilters {
  type?: 'SCHEDULED' | 'PRE_CRITICAL_CHANGE';
  status?: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'EXPIRED';
  startDate?: string;
  endDate?: string;
  limit?: number;
}

// ============================================================================
// DASHBOARD GLOBAL
// ============================================================================
export interface GlobalDashboardMetrics {
  // Métriques principales
  entreprises_actives: number;
  entreprises_total: number;
  conducteurs_actifs: number;
  conducteurs_total: number;
  
  // Chiffre d'affaires
  ca_global_mensuel: number;
  ca_global_annuel: number;
  ca_evolution_mensuelle: number; // %
  
  // Commissions
  commissions_totales_mensuel: number;
  commissions_totales_annuel: number;
  taux_commission_moyen: number;
  
  // Activité
  courses_totales_mensuel: number;
  courses_totales_annuel: number;
  courses_evolution_mensuelle: number; // %
  
  // Performance
  taux_completion_global: number; // %
  note_moyenne_globale: number;
  temps_reponse_moyen: number; // minutes
  
  // Top performers
  top_entreprises: TopEnterprise[];
  top_conducteurs: TopConducteur[];
  
  // Alertes et santé système
  alertes_actives: number;
  system_health_score: number; // 0-100
  
  // Tendances
  tendance_horaire: TendanceHoraire[];
  tendance_mensuelle: TendanceMensuelle[];
}

export interface TopEnterprise {
  id: string;
  nom: string;
  ca_mensuel: number;
  nb_courses: number;
  commission_generee: number;
  taux_commission_actuel: number;
  nb_conducteurs: number;
  note_moyenne: number;
  evolution_ca: number; // %
}

export interface TopConducteur {
  id: string;
  nom: string;
  prenom: string;
  entreprise_nom: string;
  nb_courses: number;
  ca_genere: number;
  note_moyenne: number;
  taux_completion: number;
}

export interface TendanceHoraire {
  heure: number;
  courses: number;
  ca: number;
  commission: number;
}

export interface TendanceMensuelle {
  mois: string;
  courses: number;
  ca: number;
  commission: number;
  entreprises_actives: number;
}

// ============================================================================
// GESTION ENTREPRISES GLOBALE
// ============================================================================
export interface EnterpriseGlobalView {
  id: string;
  nom: string;
  responsable: string;
  telephone: string;
  email: string;
  siret?: string;
  adresse?: string;
  date_creation: string;
  actif: boolean;
  is_admin: boolean;
  
  // Métriques calculées temps réel
  ca_mensuel: number;
  ca_annuel: number;
  ca_evolution: number; // %
  nb_conducteurs: number;
  nb_conducteurs_actifs: number;
  nb_courses_mois: number;
  nb_courses_annuel: number;
  
  // Commission
  taux_commission_actuel: number;
  commission_mensuelle: number;
  commission_annuelle: number;
  
  // Performance
  note_moyenne: number;
  taux_completion: number; // %
  derniere_activite: string;
  temps_reponse_moyen: number; // minutes
  
  // Santé business
  statut_sante: 'excellent' | 'bon' | 'moyen' | 'critique';
  alertes_actives: string[];
  tendance_ca: 'hausse' | 'stable' | 'baisse';
}

export interface EnterpriseFilters {
  statut?: 'actif' | 'inactif';
  sante?: 'excellent' | 'bon' | 'moyen' | 'critique';
  commission_type?: 'global' | 'specifique';
  search?: string;
  orderBy?: 'nom' | 'ca_mensuel' | 'nb_courses' | 'date_creation';
  orderDirection?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

// ============================================================================
// RÉSERVATIONS GLOBALES
// ============================================================================
export interface GlobalReservationView {
  id: string;
  
  // Entreprise et conducteur
  entreprise_id: string;
  entreprise_nom: string;
  conducteur_id: string;
  conducteur_nom: string;
  conducteur_prenom: string;
  
  // Client
  client_phone: string;
  
  // Trajet
  depart_nom: string;
  destination_nom: string;
  position_depart: string;
  position_arrivee: string;
  distance_km: number;
  
  // Financier
  prix_total: number;
  prix_par_km: number;
  tarif_applique: string;
  
  // Commission calculée
  taux_commission: number;
  commission_appliquee: number;
  ca_net_entreprise: number;
  
  // Dates et statut
  date_creation: string;
  date_reservation: string;
  date_validation: string;
  statut: string;
  code_validation?: string;
  
  // Performance
  note_conducteur?: number;
  commentaire?: string;
  
  // Métadonnées
  vehicle_type: string;
  created_at: string;
  updated_at: string;
}

export interface GlobalReservationFilters {
  entreprise_ids?: string[];
  conducteur_ids?: string[];
  date_debut?: string;
  date_fin?: string;
  statut?: string[];
  prix_min?: number;
  prix_max?: number;
  vehicle_type?: string[];
  search?: string; // client_phone, depart_nom, destination_nom
  orderBy?: 'date_creation' | 'date_validation' | 'prix_total' | 'distance_km';
  orderDirection?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

// ============================================================================
// ALERTES INTELLIGENTES
// ============================================================================
export interface IntelligentAlert {
  id: string;
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  message: string;
  entity_type: string;
  entity_id: string;
  entity_name: string;
  data: any;
  created_at: string;
  acknowledged_at?: string;
  acknowledged_by?: string;
  resolved_at?: string;
  actions_taken?: string[];
}

export interface AlertRule {
  commission: {
    maxChangePercent: number;
    maxImpactGnf: number;
    frequencyLimit: number;
  };
  enterprise: {
    caDropPercent: number;
    inactivityDays: number;
    lowPerformanceThreshold: number;
  };
  security: {
    maxFailedAttempts: number;
    suspiciousIpThreshold: number;
    sessionTimeoutMinutes: number;
  };
}

// ============================================================================
// SÉCURITÉ & RATE LIMITING
// ============================================================================
export interface RateLimit {
  count: number;
  resetTime: number;
}

export interface SuspiciousActivity {
  count: number;
  actions: { action: string; timestamp: number }[];
  firstSeen: number;
}

export interface SecurityEvent {
  type: 'RATE_LIMIT_EXCEEDED' | 'SUSPICIOUS_ACTIVITY' | 'SESSION_IP_CHANGE' | 'FAILED_LOGIN';
  userId: string;
  ip: string;
  details: any;
  severity: AuditImpactLevel;
  timestamp: number;
}

// ============================================================================
// MAINTENANCE MODE
// ============================================================================
export interface MaintenanceMode {
  active: boolean;
  reason: string;
  estimated_duration: number; // minutes
  start_time: string;
  end_time?: string;
  affected_features: string[];
  created_by: string;
}

// ============================================================================
// EXPORTS & RAPPORTS
// ============================================================================
export interface ExportRequest {
  type: 'enterprises' | 'reservations' | 'commissions' | 'audit' | 'dashboard';
  format: 'csv' | 'excel' | 'pdf';
  filters: any;
  date_range: {
    start: string;
    end: string;
  };
  include_metadata: boolean;
}

export interface ExportResult {
  id: string;
  request: ExportRequest;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  file_url?: string;
  file_size?: number;
  records_count?: number;
  created_at: string;
  completed_at?: string;
  error_message?: string;
}

// ============================================================================
// UTILITAIRES ET HELPERS
// ============================================================================
export interface PaginationMeta {
  current_page: number;
  per_page: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: PaginationMeta;
}

export interface TimeRange {
  start: string;
  end: string;
  label: string;
}

// Interfaces pour formulaires
export interface CommissionEditForm {
  type_config: 'global_default' | 'enterprise_specific';
  entreprise_id?: string;
  taux_commission: number;
  date_debut: string;
  date_fin?: string;
  motif: string;
}

export interface EnterpriseEditForm {
  nom: string;
  responsable: string;
  telephone: string;
  email: string;
  siret?: string;
  adresse?: string;
  actif: boolean;
  is_admin: boolean;
}

// Types utilitaires
export type SortDirection = 'asc' | 'desc';
export type EntityStatus = 'actif' | 'inactif' | 'suspendu';
export type HealthStatus = 'excellent' | 'bon' | 'moyen' | 'critique';
export type TrendDirection = 'hausse' | 'stable' | 'baisse';