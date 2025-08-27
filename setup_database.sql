-- VÉRIFICATION COMPLÈTE DES RÉSERVATIONS JAKARTA TAXI EXPRESS
-- Analyser toutes les réservations (validées et non validées)

-- 1. ANALYSE COMPLÈTE: Toutes les réservations Jakarta en août 2025
SELECT 
    r.id,
    r.statut,
    r.prix_total,
    r.created_at,
    r.date_code_validation,
    r.client_phone,
    c.nom || ' ' || c.prenom as conducteur,
    CASE 
        WHEN r.date_code_validation IS NOT NULL THEN 'VALIDÉE (Commission due)'
        ELSE 'NON VALIDÉE (Pas de commission)'
    END as status_commission,
    CASE 
        WHEN r.date_code_validation IS NOT NULL THEN ROUND(r.prix_total * 0.11, 0)
        ELSE 0
    END as commission_calculee
FROM reservations r
JOIN conducteurs c ON r.conducteur_id = c.id  
JOIN entreprises e ON c.entreprise_id = e.id
WHERE e.nom = 'jakarta taxi express'
    AND r.created_at >= '2025-08-01 00:00:00'
    AND r.created_at < '2025-09-01 00:00:00'
ORDER BY r.created_at DESC;

-- 2. RÉSUMÉ PAR STATUS DE VALIDATION
SELECT 
    CASE 
        WHEN r.date_code_validation IS NOT NULL THEN 'VALIDÉES'
        ELSE 'NON VALIDÉES'
    END as type_reservation,
    COUNT(*) as nombre,
    COALESCE(SUM(r.prix_total), 0) as ca_total,
    CASE 
        WHEN r.date_code_validation IS NOT NULL THEN ROUND(COALESCE(SUM(r.prix_total * 0.11), 0), 0)
        ELSE 0
    END as commission_totale
FROM reservations r
JOIN conducteurs c ON r.conducteur_id = c.id  
JOIN entreprises e ON c.entreprise_id = e.id
WHERE e.nom = 'jakarta taxi express'
    AND r.created_at >= '2025-08-01 00:00:00'
    AND r.created_at < '2025-09-01 00:00:00'
GROUP BY CASE WHEN r.date_code_validation IS NOT NULL THEN 'VALIDÉES' ELSE 'NON VALIDÉES' END
ORDER BY type_reservation DESC;

-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

-- DIAGNOSTIC APPROFONDI: Reproduire exactement la logique du calcul des commissions
-- Comprendre pourquoi 4 réservations au lieu de 6 validées

-- ÉTAPE 1: Vérifier les dates exactes de la période en base
SELECT 
    id,
    periode_debut,
    periode_fin,
    statut,
    'PÉRIODE_EN_BASE' as info
FROM facturation_periodes 
WHERE periode_debut >= '2025-08-01' 
    AND periode_fin <= '2025-08-31'
ORDER BY periode_debut;

-- ÉTAPE 2: Détail des 6 réservations validées avec test de filtrage période
SELECT 
    r.id,
    r.statut,
    r.prix_total,
    r.created_at,
    r.date_code_validation,
    fp.periode_debut,
    fp.periode_fin,
    CASE 
        WHEN r.created_at >= fp.periode_debut 
             AND r.created_at <= fp.periode_fin
             AND r.statut IN ('completed', 'accepted')
             AND r.date_code_validation IS NOT NULL 
        THEN 'INCLUSE_CALCUL' 
        ELSE 'EXCLUE_CALCUL' 
    END as inclusion_status,
    CASE 
        WHEN r.created_at < fp.periode_debut THEN 'AVANT_PERIODE'
        WHEN r.created_at > fp.periode_fin THEN 'APRÈS_PERIODE'
        WHEN r.statut NOT IN ('completed', 'accepted') THEN 'STATUT_INVALIDE'
        WHEN r.date_code_validation IS NULL THEN 'NON_VALIDÉE'
        ELSE 'CONDITIONS_OK'
    END as raison_exclusion
FROM reservations r
JOIN conducteurs c ON r.conducteur_id = c.id  
JOIN entreprises e ON c.entreprise_id = e.id
CROSS JOIN facturation_periodes fp  -- Test avec toutes les périodes août
WHERE e.nom = 'jakarta taxi express'
    AND r.created_at >= '2025-08-01 00:00:00'
    AND r.created_at <= '2025-08-31 23:59:59'
    AND r.date_code_validation IS NOT NULL
    AND fp.periode_debut >= '2025-08-01'
    AND fp.periode_fin <= '2025-08-31'
ORDER BY r.created_at DESC, fp.periode_debut;

-- ÉTAPE 3: ANALYSE DÉTAILLÉE - Toutes les réservations (même non validées)
SELECT 
    r.id,
    r.statut,
    r.prix_total,
    r.created_at,
    r.date_code_validation,
    r.client_phone,
    c.nom || ' ' || c.prenom as conducteur,
    e.nom as entreprise,
    CASE 
        WHEN r.date_code_validation IS NOT NULL THEN 'OUI'
        ELSE 'NON'
    END as validee
FROM reservations r
JOIN conducteurs c ON r.conducteur_id = c.id  
JOIN entreprises e ON c.entreprise_id = e.id
WHERE e.nom = 'jakarta taxi express'
    AND r.created_at >= '2025-08-01 00:00:00'
    AND r.created_at <= '2025-08-31 23:59:59'
ORDER BY r.created_at DESC;

-- 1. RÉSUMÉ PAR STATUT: Compter les réservations par statut
SELECT 
    r.statut,
    COUNT(*) as nombre,
    SUM(r.prix_total) as total_ca,
    SUM(r.prix_total * 0.11) as total_commission
FROM reservations r
JOIN conducteurs c ON r.conducteur_id = c.id  
JOIN entreprises e ON c.entreprise_id = e.id
WHERE e.nom = 'jakarta taxi express'
    AND r.created_at >= '2025-08-01 00:00:00'
    AND r.created_at <= '2025-08-31 23:59:59'
GROUP BY r.statut
ORDER BY nombre DESC;

-- 2. REPRODUIRE LA LOGIQUE EXACTE DU CALCUL DES COMMISSIONS
-- Simuler exactement ce que fait calculerCommissionsPeriode()
SELECT 
    'logique_calcul_commissions' as source,
    COUNT(*) as nombre_reservations,
    SUM(r.prix_total) as chiffre_affaire_brut,
    SUM(r.prix_total * 0.11) as montant_commission,
    fp.periode_debut,
    fp.periode_fin
FROM reservations r
JOIN conducteurs c ON r.conducteur_id = c.id  
JOIN entreprises e ON c.entreprise_id = e.id
JOIN facturation_periodes fp ON fp.periode_debut = '2025-08-01' AND fp.periode_fin = '2025-08-31'
WHERE e.nom = 'jakarta taxi express'
    AND r.created_at >= fp.periode_debut 
    AND r.created_at <= fp.periode_fin
    AND r.statut IN ('completed', 'accepted')
    AND r.date_code_validation IS NOT NULL  -- Condition clé !
GROUP BY fp.periode_debut, fp.periode_fin

UNION ALL

-- 3. COMPARAISON: Toutes les réservations validées sans filtre de période
SELECT 
    'toutes_validees_aout' as source,
    COUNT(*) as nombre_reservations,
    SUM(r.prix_total) as chiffre_affaire_brut,
    SUM(r.prix_total * 0.11) as montant_commission,
    '2025-08-01'::date as periode_debut,
    '2025-08-31'::date as periode_fin
FROM reservations r
JOIN conducteurs c ON r.conducteur_id = c.id  
JOIN entreprises e ON c.entreprise_id = e.id
WHERE e.nom = 'jakarta taxi express'
    AND r.created_at >= '2025-08-01 00:00:00'
    AND r.created_at <= '2025-08-31 23:59:59'
    AND r.statut IN ('completed', 'accepted')
    AND r.date_code_validation IS NOT NULL

UNION ALL

-- 4. DIAGNOSTIC: Voir la différence entre commissions_detail et calcul temps réel
SELECT 
    'commissions_detail' as source,
    cd.chiffre_affaire_brut,
    cd.montant_commission,
    cd.nombre_reservations
FROM commissions_detail cd
JOIN entreprises e ON cd.entreprise_id = e.id  
WHERE e.nom ILIKE '%jakarta%'

UNION ALL

SELECT 
    'calcul_temps_reel' as source,
    SUM(r.prix_total) as chiffre_affaire_brut,
    SUM(r.prix_total * 0.11) as montant_commission,
    COUNT(*) as nombre_reservations
FROM reservations r
JOIN conducteurs c ON r.conducteur_id = c.id  
JOIN entreprises e ON c.entreprise_id = e.id
WHERE e.nom = 'jakarta taxi express'
    AND r.statut = 'completed'
    AND r.created_at >= '2025-08-01 00:00:00'
    AND r.created_at <= '2025-08-31 23:59:59';

-- 2. CORRECTION: Mettre à jour commissions_detail avec les vraies données
-- IMPORTANT: Utiliser les dates exactes de la période (début à fin août)
UPDATE commissions_detail cd
SET 
    nombre_reservations = subquery.real_count,
    chiffre_affaire_brut = subquery.real_ca,
    montant_commission = subquery.real_commission,
    updated_at = now()
FROM (
    SELECT 
        cd_inner.periode_id,
        e.id as entreprise_id,
        COUNT(*) as real_count,
        SUM(r.prix_total) as real_ca,
        SUM(r.prix_total * 0.11) as real_commission
    FROM reservations r
    JOIN conducteurs c ON r.conducteur_id = c.id  
    JOIN entreprises e ON c.entreprise_id = e.id
    JOIN commissions_detail cd_inner ON cd_inner.entreprise_id = e.id
    JOIN facturation_periodes fp ON cd_inner.periode_id = fp.id
    WHERE e.nom = 'jakarta taxi express'
        AND r.statut = 'completed'
        AND r.created_at >= fp.periode_debut 
        AND r.created_at <= (fp.periode_fin + INTERVAL '1 day - 1 second')
        AND fp.periode_debut = '2025-08-01'
        AND fp.periode_fin = '2025-08-31'
    GROUP BY cd_inner.periode_id, e.id
) AS subquery
WHERE cd.entreprise_id = subquery.entreprise_id 
    AND cd.periode_id = subquery.periode_id;

CREATE TABLE public.adresses (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  nom character varying NOT NULL,
  nom_normalise character varying NOT NULL,
  adresse_complete text,
  ville character varying,
  code_postal character varying,
  pays character varying DEFAULT 'France'::character varying,
  position USER-DEFINED NOT NULL,
  type_lieu character varying,
  actif boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  search_frequency integer DEFAULT 0,
  ai_confidence double precision DEFAULT 1.0,
  variants ARRAY DEFAULT '{}'::text[],
  last_searched timestamp without time zone,
  osm_id bigint,
  osm_type text,
  popularite integer DEFAULT 0,
  telephone text,
  site_web text,
  horaires text,
  email text,
  rue text,
  numero text,
  operateur text,
  marque text,
  description_fr text,
  accessibilite text,
  cuisine text,
  verifie boolean DEFAULT false,
  derniere_maj timestamp without time zone DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  note_moyenne numeric CHECK (note_moyenne >= 0::numeric AND note_moyenne <= 5::numeric),
  source_donnees character varying DEFAULT 'manuel'::character varying,
  CONSTRAINT adresses_pkey PRIMARY KEY (id)
);
CREATE TABLE public.audit_financier (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  objet_type character varying NOT NULL CHECK (objet_type::text = ANY (ARRAY['periode'::character varying, 'commission'::character varying, 'paiement'::character varying, 'relance'::character varying]::text[])),
  objet_id uuid NOT NULL,
  action character varying NOT NULL,
  ancien_statut character varying,
  nouveau_statut character varying,
  ancien_montant numeric,
  nouveau_montant numeric,
  impact_financier numeric,
  utilisateur character varying NOT NULL,
  motif text,
  metadata jsonb DEFAULT '{}'::jsonb,
  timestamp_action timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT audit_financier_pkey PRIMARY KEY (id)
);
CREATE TABLE public.audit_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  session_id character varying NOT NULL,
  action_type character varying NOT NULL CHECK (action_type::text = ANY (ARRAY['COMMISSION_CHANGE'::character varying, 'ENTERPRISE_MODIFY'::character varying, 'ENTERPRISE_SUSPEND'::character varying, 'GLOBAL_SETTING_CHANGE'::character varying, 'LOGIN'::character varying, 'LOGOUT'::character varying, 'VIEW_SENSITIVE_DATA'::character varying, 'EXPORT_DATA'::character varying, 'SIMULATION_RUN'::character varying, 'BACKUP_RESTORE'::character varying, 'SECURITY_VIOLATION'::character varying, 'SYSTEM_MAINTENANCE_START'::character varying, 'SYSTEM_MAINTENANCE_END'::character varying]::text[])),
  entity_type character varying NOT NULL CHECK (entity_type::text = ANY (ARRAY['COMMISSION'::character varying, 'ENTERPRISE'::character varying, 'USER'::character varying, 'SYSTEM'::character varying, 'EXPORT'::character varying, 'SESSION'::character varying]::text[])),
  entity_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address inet,
  user_agent text,
  request_method character varying,
  request_url text,
  impact_level character varying CHECK (impact_level::text = ANY (ARRAY['LOW'::character varying, 'MEDIUM'::character varying, 'HIGH'::character varying, 'CRITICAL'::character varying]::text[])),
  business_impact_gnf numeric DEFAULT 0,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT audit_logs_pkey PRIMARY KEY (id),
  CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.entreprises(id)
);
CREATE TABLE public.client_addresses (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  client_phone character varying NOT NULL,
  address_type character varying NOT NULL,
  address_name character varying,
  position_depart text,
  address_complete text,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT client_addresses_pkey PRIMARY KEY (id)
);
CREATE TABLE public.commission_config (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  type_config character varying NOT NULL CHECK (type_config::text = ANY (ARRAY['global_default'::character varying, 'enterprise_specific'::character varying]::text[])),
  entreprise_id uuid,
  taux_commission numeric NOT NULL CHECK (taux_commission >= 0::numeric AND taux_commission <= 100::numeric),
  date_debut date NOT NULL DEFAULT CURRENT_DATE,
  date_fin date,
  actif boolean DEFAULT true,
  created_by character varying NOT NULL,
  motif text,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT commission_config_pkey PRIMARY KEY (id),
  CONSTRAINT commission_config_entreprise_id_fkey FOREIGN KEY (entreprise_id) REFERENCES public.entreprises(id)
);
CREATE TABLE public.commission_history (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  entreprise_id uuid NOT NULL,
  taux_commission numeric NOT NULL CHECK (taux_commission >= 0::numeric AND taux_commission <= 100::numeric),
  date_debut date NOT NULL,
  date_fin date,
  actif boolean DEFAULT true,
  motif text,
  created_by character varying,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT commission_history_pkey PRIMARY KEY (id),
  CONSTRAINT fk_commission_entreprise FOREIGN KEY (entreprise_id) REFERENCES public.entreprises(id)
);
CREATE TABLE public.commissions_detail (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  periode_id uuid NOT NULL,
  entreprise_id uuid NOT NULL,
  nombre_reservations integer DEFAULT 0,
  chiffre_affaire_brut numeric DEFAULT 0,
  taux_commission_moyen numeric DEFAULT 0 CHECK (taux_commission_moyen >= 0::numeric AND taux_commission_moyen <= 100::numeric),
  montant_commission numeric DEFAULT 0,
  taux_global_utilise numeric,
  taux_specifique_utilise numeric,
  jours_taux_global integer DEFAULT 0,
  jours_taux_specifique integer DEFAULT 0,
  statut character varying NOT NULL DEFAULT 'calcule'::character varying CHECK (statut::text = ANY (ARRAY['calcule'::character varying, 'facture'::character varying, 'paye'::character varying, 'conteste'::character varying]::text[])),
  date_calcul timestamp with time zone DEFAULT now(),
  date_facturation timestamp with time zone,
  date_paiement timestamp with time zone,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  date_versement_commission timestamp with time zone,
  statut_paiement character varying DEFAULT 'non_paye'::character varying CHECK (statut_paiement::text = ANY (ARRAY['non_paye'::character varying, 'paye'::character varying, 'en_attente'::character varying]::text[])),
  CONSTRAINT commissions_detail_pkey PRIMARY KEY (id),
  CONSTRAINT commissions_detail_periode_id_fkey FOREIGN KEY (periode_id) REFERENCES public.facturation_periodes(id),
  CONSTRAINT commissions_detail_entreprise_id_fkey FOREIGN KEY (entreprise_id) REFERENCES public.entreprises(id)
);
CREATE TABLE public.conducteurs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  nom character varying NOT NULL,
  prenom character varying NOT NULL,
  telephone character varying NOT NULL UNIQUE,
  vehicle_type character varying NOT NULL CHECK (vehicle_type::text = ANY (ARRAY['moto'::character varying, 'voiture'::character varying]::text[])),
  vehicle_marque character varying,
  vehicle_modele character varying,
  vehicle_couleur character varying,
  vehicle_plaque character varying,
  position_actuelle USER-DEFINED,
  statut character varying DEFAULT 'disponible'::character varying CHECK (statut::text = ANY (ARRAY['disponible'::character varying, 'occupe'::character varying, 'hors_service'::character varying, 'inactif'::character varying]::text[])),
  note_moyenne numeric DEFAULT 5.00,
  nombre_courses integer DEFAULT 0,
  date_inscription timestamp without time zone DEFAULT now(),
  derniere_activite timestamp without time zone DEFAULT now(),
  actif boolean DEFAULT true,
  password text,
  hors_ligne boolean DEFAULT false,
  entreprise_id uuid,
  date_update_position timestamp with time zone,
  accuracy numeric,
  motif_blocage text,
  date_blocage timestamp with time zone,
  bloque_par text CHECK (bloque_par = ANY (ARRAY['entreprise'::text, 'super-admin'::text, 'super-admin-entreprise'::text])),
  player_id character varying,
  rayon_km_reservation integer,
  first_login boolean DEFAULT false,
  CONSTRAINT conducteurs_pkey PRIMARY KEY (id),
  CONSTRAINT fk_conducteurs_entreprise FOREIGN KEY (entreprise_id) REFERENCES public.entreprises(id)
);
CREATE TABLE public.entreprises (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  nom character varying NOT NULL,
  siret character varying UNIQUE,
  adresse text,
  telephone character varying UNIQUE,
  email character varying,
  responsable character varying,
  password_hash character varying,
  actif boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  first_login boolean DEFAULT false,
  is_admin boolean DEFAULT false,
  motif_desactivation text,
  date_desactivation timestamp with time zone,
  desactive_par text,
  CONSTRAINT entreprises_pkey PRIMARY KEY (id)
);
CREATE TABLE public.facturation_periodes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  periode_debut date NOT NULL,
  periode_fin date NOT NULL,
  statut character varying NOT NULL DEFAULT 'en_cours'::character varying CHECK (statut::text = ANY (ARRAY['en_cours'::character varying, 'cloturee'::character varying, 'facturee'::character varying, 'payee'::character varying]::text[])),
  total_commissions numeric DEFAULT 0,
  total_facture numeric DEFAULT 0,
  nombre_entreprises integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT facturation_periodes_pkey PRIMARY KEY (id)
);
CREATE TABLE public.file_attente_versements (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  conducteur_id uuid NOT NULL,
  priorite text DEFAULT 'normal'::text CHECK (priorite = ANY (ARRAY['vip'::text, 'normal'::text, 'retard'::text])),
  temps_arrivee timestamp with time zone DEFAULT now(),
  temps_attente_estime integer DEFAULT 0 CHECK (temps_attente_estime >= 0),
  statut text DEFAULT 'en_attente'::text CHECK (statut = ANY (ARRAY['en_attente'::text, 'en_cours'::text, 'termine'::text])),
  position_file integer DEFAULT 1 CHECK (position_file > 0),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT file_attente_versements_pkey PRIMARY KEY (id),
  CONSTRAINT file_attente_versements_conducteur_id_fkey FOREIGN KEY (conducteur_id) REFERENCES public.conducteurs(id)
);
CREATE TABLE public.historique_blocages (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  type character varying CHECK (type::text = ANY (ARRAY['entreprise'::character varying, 'conducteur'::character varying]::text[])),
  entite_id uuid NOT NULL,
  action character varying CHECK (action::text = ANY (ARRAY['bloquer'::character varying, 'debloquer'::character varying]::text[])),
  motif text,
  par text,
  date timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT historique_blocages_pkey PRIMARY KEY (id)
);
CREATE TABLE public.lengopay_payments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  payment_id character varying NOT NULL UNIQUE,
  status character varying NOT NULL,
  amount numeric NOT NULL,
  currency character varying DEFAULT 'GNF'::character varying,
  client_phone character varying,
  message text,
  raw_json jsonb,
  processed_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  reservation_id uuid,
  processed_client_notified_at timestamp with time zone,
  CONSTRAINT lengopay_payments_pkey PRIMARY KEY (id),
  CONSTRAINT fk_reservation FOREIGN KEY (reservation_id) REFERENCES public.reservations(id)
);
CREATE TABLE public.litiges_versement (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  versement_id uuid NOT NULL,
  type_litige text NOT NULL CHECK (type_litige = ANY (ARRAY['montant_incorrect'::text, 'otp_non_recu'::text, 'conducteur_absent'::text, 'fraude_suspectee'::text, 'signature_manquante'::text, 'photo_manquante'::text])),
  description text NOT NULL,
  statut text DEFAULT 'ouvert'::text CHECK (statut = ANY (ARRAY['ouvert'::text, 'en_cours'::text, 'resolu'::text, 'ferme'::text])),
  resolution text,
  created_at timestamp with time zone DEFAULT now(),
  resolved_at timestamp with time zone,
  CONSTRAINT litiges_versement_pkey PRIMARY KEY (id),
  CONSTRAINT litiges_versement_versement_id_fkey FOREIGN KEY (versement_id) REFERENCES public.versements(id)
);
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  entreprise_id uuid,
  user_type character varying NOT NULL DEFAULT 'enterprise'::character varying,
  titre character varying NOT NULL,
  message text NOT NULL,
  type_notification character varying NOT NULL CHECK (type_notification::text = ANY (ARRAY['commission_change'::character varying, 'commission_specific_set'::character varying, 'commission_specific_removed'::character varying, 'system_info'::character varying, 'alert'::character varying]::text[])),
  metadata jsonb DEFAULT '{}'::jsonb,
  priority character varying DEFAULT 'normal'::character varying CHECK (priority::text = ANY (ARRAY['low'::character varying, 'normal'::character varying, 'high'::character varying, 'urgent'::character varying]::text[])),
  lu boolean DEFAULT false,
  date_lecture timestamp without time zone,
  archived boolean DEFAULT false,
  action_required boolean DEFAULT false,
  action_url character varying,
  action_label character varying,
  created_at timestamp without time zone DEFAULT now(),
  expires_at timestamp without time zone,
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_entreprise_id_fkey FOREIGN KEY (entreprise_id) REFERENCES public.entreprises(id)
);
CREATE TABLE public.notifications_pending (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  reservation_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'reservation_accepted'::text,
  created_at timestamp without time zone DEFAULT now(),
  processed_at timestamp without time zone,
  CONSTRAINT notifications_pending_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_pending_reservation_id_fkey FOREIGN KEY (reservation_id) REFERENCES public.reservations(id)
);
CREATE TABLE public.paiements_commissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  commission_detail_id uuid NOT NULL,
  periode_id uuid NOT NULL,
  entreprise_id uuid NOT NULL,
  montant_paye numeric NOT NULL CHECK (montant_paye > 0::numeric),
  mode_paiement character varying NOT NULL DEFAULT 'virement'::character varying CHECK (mode_paiement::text = ANY (ARRAY['virement'::character varying, 'cheque'::character varying, 'especes'::character varying, 'mobile_money'::character varying, 'compensation'::character varying]::text[])),
  reference_paiement character varying,
  date_paiement date NOT NULL,
  date_echeance date,
  date_enregistrement timestamp with time zone DEFAULT now(),
  statut character varying NOT NULL DEFAULT 'en_attente'::character varying CHECK (statut::text = ANY (ARRAY['en_attente'::character varying, 'valide'::character varying, 'rejete'::character varying, 'rembourse'::character varying]::text[])),
  valide_par character varying,
  date_validation timestamp with time zone,
  notes text,
  justificatifs jsonb DEFAULT '[]'::jsonb,
  created_by character varying NOT NULL DEFAULT 'system'::character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT paiements_commissions_pkey PRIMARY KEY (id),
  CONSTRAINT paiements_commissions_entreprise_id_fkey FOREIGN KEY (entreprise_id) REFERENCES public.entreprises(id),
  CONSTRAINT paiements_commissions_commission_detail_id_fkey FOREIGN KEY (commission_detail_id) REFERENCES public.commissions_detail(id),
  CONSTRAINT paiements_commissions_periode_id_fkey FOREIGN KEY (periode_id) REFERENCES public.facturation_periodes(id)
);
CREATE TABLE public.parametres (
  cle character varying NOT NULL,
  valeur text NOT NULL,
  description text,
  type character varying CHECK (type::text = ANY (ARRAY['nombre'::character varying, 'texte'::character varying, 'boolean'::character varying]::text[])),
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT parametres_pkey PRIMARY KEY (cle)
);
CREATE TABLE public.password_reset_history (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  entity_type character varying NOT NULL CHECK (entity_type::text = ANY (ARRAY['conducteur'::character varying, 'entreprise'::character varying]::text[])),
  entity_id uuid NOT NULL,
  entreprise_id uuid,
  reset_by character varying NOT NULL,
  reset_at timestamp with time zone DEFAULT now(),
  ip_address inet,
  user_agent text,
  reset_reason text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT password_reset_history_pkey PRIMARY KEY (id),
  CONSTRAINT fk_password_reset_entreprise_link FOREIGN KEY (entreprise_id) REFERENCES public.entreprises(id),
  CONSTRAINT fk_password_reset_conducteur FOREIGN KEY (entity_id) REFERENCES public.conducteurs(id)
);
CREATE TABLE public.relances_paiement (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  commission_detail_id uuid NOT NULL,
  entreprise_id uuid NOT NULL,
  type_relance character varying NOT NULL CHECK (type_relance::text = ANY (ARRAY['rappel_gentil'::character varying, 'mise_en_demeure'::character varying, 'suspension_service'::character varying]::text[])),
  niveau_relance integer NOT NULL DEFAULT 1,
  montant_du numeric NOT NULL,
  date_echeance_originale date NOT NULL,
  jours_retard integer NOT NULL,
  date_relance date NOT NULL DEFAULT CURRENT_DATE,
  prochaine_relance date,
  statut character varying NOT NULL DEFAULT 'envoyee'::character varying CHECK (statut::text = ANY (ARRAY['programmee'::character varying, 'envoyee'::character varying, 'lue'::character varying, 'ignoree'::character varying, 'resolue'::character varying]::text[])),
  canal character varying NOT NULL DEFAULT 'email'::character varying CHECK (canal::text = ANY (ARRAY['email'::character varying, 'sms'::character varying, 'notification'::character varying, 'courrier'::character varying]::text[])),
  message_envoye text,
  action_entreprise text,
  date_reponse timestamp with time zone,
  resolu_par character varying,
  date_resolution timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT relances_paiement_pkey PRIMARY KEY (id),
  CONSTRAINT relances_paiement_commission_detail_id_fkey FOREIGN KEY (commission_detail_id) REFERENCES public.commissions_detail(id),
  CONSTRAINT relances_paiement_entreprise_id_fkey FOREIGN KEY (entreprise_id) REFERENCES public.entreprises(id)
);
CREATE TABLE public.reservation_refus (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  reservation_id uuid,
  conducteur_id uuid,
  raison_refus text,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT reservation_refus_pkey PRIMARY KEY (id),
  CONSTRAINT reservation_refus_conducteur_id_fkey FOREIGN KEY (conducteur_id) REFERENCES public.conducteurs(id),
  CONSTRAINT reservation_refus_reservation_id_fkey FOREIGN KEY (reservation_id) REFERENCES public.reservations(id)
);
CREATE TABLE public.reservations (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  client_phone text NOT NULL,
  vehicle_type text CHECK (vehicle_type = ANY (ARRAY['moto'::text, 'voiture'::text])),
  position_depart text,
  statut text DEFAULT 'pending'::text CHECK (statut = ANY (ARRAY['pending'::text, 'confirmee'::text, 'accepted'::text, 'refused'::text, 'completed'::text, 'canceled'::text, 'auto_canceled'::text, 'scheduled'::text])),
  created_at timestamp without time zone DEFAULT now(),
  conducteur_id uuid,
  destination_nom character varying,
  destination_id uuid,
  position_arrivee USER-DEFINED,
  distance_km numeric,
  prix_total numeric,
  prix_par_km numeric,
  tarif_applique character varying,
  code_validation character varying,
  updated_at timestamp without time zone DEFAULT now(),
  date_reservation date,
  heure_reservation integer CHECK (heure_reservation >= 0 AND heure_reservation <= 23),
  minute_reservation integer CHECK (minute_reservation >= 0 AND minute_reservation <= 59),
  date_code_validation timestamp with time zone,
  commentaire text,
  note_conducteur integer CHECK (note_conducteur >= 1 AND note_conducteur <= 5),
  date_add_commentaire timestamp with time zone,
  versement_id uuid,
  destination_position USER-DEFINED,
  depart_nom text,
  notified_at timestamp with time zone,
  cancellation_notified_at timestamp with time zone,
  reminder_4h_sent_at timestamp with time zone,
  reminder_3h_sent_at timestamp with time zone,
  CONSTRAINT reservations_pkey PRIMARY KEY (id),
  CONSTRAINT reservations_destination_id_fkey FOREIGN KEY (destination_id) REFERENCES public.adresses(id),
  CONSTRAINT reservations_versement_id_fkey FOREIGN KEY (versement_id) REFERENCES public.versements(id),
  CONSTRAINT fk_reservations_conducteur FOREIGN KEY (conducteur_id) REFERENCES public.conducteurs(id)
);
CREATE TABLE public.sessions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  client_phone text NOT NULL,
  vehicle_type text CHECK (vehicle_type = ANY (ARRAY['moto'::text, 'voiture'::text])),
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  expires_at timestamp without time zone DEFAULT (now() + '01:00:00'::interval),
  position_client USER-DEFINED,
  destination_nom character varying,
  destination_id uuid,
  destination_position USER-DEFINED,
  distance_km numeric,
  prix_estime numeric,
  prix_confirme boolean DEFAULT false,
  etat character varying DEFAULT 'initial'::character varying,
  suggestions_destination text,
  planned_date date,
  planned_hour integer CHECK (planned_hour >= 0 AND planned_hour <= 23),
  planned_minute integer CHECK (planned_minute >= 0 AND planned_minute <= 59),
  temporal_planning boolean DEFAULT false,
  suggestions_depart text,
  depart_nom text,
  depart_position text,
  depart_id uuid,
  choix_depart_multiple boolean DEFAULT false,
  choix_destination_multiple boolean DEFAULT false,
  waiting_for_note boolean DEFAULT false,
  waiting_for_comment boolean DEFAULT false,
  reservation_to_rate uuid,
  current_rating integer,
  CONSTRAINT sessions_pkey PRIMARY KEY (id)
);
CREATE TABLE public.sms_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  telephone character varying NOT NULL,
  message text NOT NULL,
  statut text DEFAULT 'envoye'::text CHECK (statut = ANY (ARRAY['envoye'::text, 'echec'::text, 'simule'::text])),
  type_sms text DEFAULT 'versement_otp'::text CHECK (type_sms = ANY (ARRAY['versement_otp'::text, 'reservation_otp'::text, 'notification'::text, 'confirmation_versement'::text, 'notification_arrivee'::text, 'notification_tour'::text, 'alerte_anomalie'::text])),
  reference_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT sms_logs_pkey PRIMARY KEY (id)
);
CREATE TABLE public.spatial_ref_sys (
  srid integer NOT NULL CHECK (srid > 0 AND srid <= 998999),
  auth_name character varying,
  auth_srid integer,
  srtext character varying,
  proj4text character varying,
  CONSTRAINT spatial_ref_sys_pkey PRIMARY KEY (srid)
);
CREATE TABLE public.system_backups (
  id character varying NOT NULL,
  type character varying NOT NULL CHECK (type::text = ANY (ARRAY['SCHEDULED'::character varying, 'PRE_CRITICAL_CHANGE'::character varying]::text[])),
  commission_data jsonb,
  enterprise_data jsonb,
  audit_data jsonb,
  size_bytes bigint,
  checksum character varying,
  compression_ratio numeric,
  created_at timestamp without time zone DEFAULT now(),
  expires_at timestamp without time zone,
  metadata jsonb DEFAULT '{}'::jsonb,
  status character varying DEFAULT 'COMPLETED'::character varying CHECK (status::text = ANY (ARRAY['IN_PROGRESS'::character varying, 'COMPLETED'::character varying, 'FAILED'::character varying, 'EXPIRED'::character varying]::text[])),
  CONSTRAINT system_backups_pkey PRIMARY KEY (id)
);
CREATE TABLE public.tarifs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  nom character varying NOT NULL,
  vehicle_type character varying NOT NULL CHECK (vehicle_type::text = ANY (ARRAY['moto'::character varying, 'voiture'::character varying]::text[])),
  prix_par_km numeric NOT NULL DEFAULT 3000,
  prix_minimum numeric DEFAULT 5000,
  prix_base numeric DEFAULT 0,
  heure_debut time without time zone,
  heure_fin time without time zone,
  jours_semaine ARRAY,
  supplement_nuit numeric DEFAULT 0,
  actif boolean DEFAULT true,
  priorite integer DEFAULT 0,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT tarifs_pkey PRIMARY KEY (id)
);
CREATE TABLE public.user_sessions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  client_phone text NOT NULL UNIQUE,
  vehicle_type text,
  step text NOT NULL DEFAULT 'init'::text,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT user_sessions_pkey PRIMARY KEY (id)
);
CREATE TABLE public.versements (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  conducteur_id uuid NOT NULL,
  montant numeric NOT NULL CHECK (montant > 0::numeric),
  date_versement timestamp with time zone DEFAULT now(),
  entreprise_id uuid NOT NULL,
  reservation_ids ARRAY NOT NULL DEFAULT '{}'::uuid[],
  statut text DEFAULT 'en_attente'::text CHECK (statut = ANY (ARRAY['en_attente'::text, 'verse'::text, 'otp_envoye'::text, 'bloque'::text, 'annule'::text])),
  otp_code character varying,
  otp_generated_at timestamp with time zone,
  otp_attempts integer DEFAULT 0 CHECK (otp_attempts >= 0),
  localisation_versement point,
  adresse_versement text,
  photo_versement text,
  signature_conducteur text,
  commentaire text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT versements_pkey PRIMARY KEY (id),
  CONSTRAINT versements_conducteur_id_fkey FOREIGN KEY (conducteur_id) REFERENCES public.conducteurs(id),
  CONSTRAINT versements_entreprise_id_fkey FOREIGN KEY (entreprise_id) REFERENCES public.entreprises(id)
);