-- ============================================================================
-- MIGRATION 001: SUPER-ADMIN INFRASTRUCTURE
-- ============================================================================
-- Description: Création de l'infrastructure complète pour le système super-admin
-- Author: Claude Code
-- Date: 2025-01-08
-- Version: 1.0
-- 
-- CRITICAL: Cette migration est conçue pour être NON-INVASIVE
-- - Pas de modification des données existantes
-- - Pas d'impact sur les modules conducteur/entreprise
-- - Rollback possible si nécessaire
-- ============================================================================

BEGIN;

-- ============================================================================
-- ÉTAPE 1: AJOUTER COLONNE is_admin À LA TABLE ENTREPRISES
-- ============================================================================
-- Ajouter la colonne is_admin avec valeur par défaut FALSE
-- Cela n'impacte aucune donnée existante
ALTER TABLE entreprises 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Ajouter un commentaire explicatif
COMMENT ON COLUMN entreprises.is_admin IS 'Indique si cette entreprise a les droits super-administrateur (accès global à toutes les données)';

-- Créer un index partiel pour optimiser les requêtes super-admin
-- Index partiel : plus efficace car peu d'entreprises seront super-admin
CREATE INDEX IF NOT EXISTS idx_entreprises_admin 
ON entreprises (is_admin) 
WHERE is_admin = TRUE;

-- ============================================================================
-- ÉTAPE 2: CRÉER TABLE COMMISSION_CONFIG (GESTION DYNAMIQUE)
-- ============================================================================
-- Cette table remplace le système de commission hardcodé (15%)
-- Permet la gestion dynamique par entreprise et dans le temps
CREATE TABLE IF NOT EXISTS commission_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Type de configuration
  type_config VARCHAR NOT NULL CHECK (type_config IN ('global_default', 'enterprise_specific')),
  
  -- Référence entreprise (NULL pour configuration globale)
  entreprise_id UUID REFERENCES entreprises(id) ON DELETE CASCADE,
  
  -- Taux de commission (0-100%)
  taux_commission NUMERIC NOT NULL CHECK (taux_commission >= 0 AND taux_commission <= 100),
  
  -- Période de validité
  date_debut DATE NOT NULL DEFAULT CURRENT_DATE,
  date_fin DATE, -- NULL = actif indéfiniment
  
  -- État et traçabilité
  actif BOOLEAN DEFAULT TRUE,
  created_by VARCHAR NOT NULL,
  motif TEXT, -- Raison du changement
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Contraintes métier
  CONSTRAINT commission_config_dates_check 
    CHECK (date_fin IS NULL OR date_fin >= date_debut),
  CONSTRAINT commission_config_global_check 
    CHECK ((type_config = 'global_default' AND entreprise_id IS NULL) OR 
           (type_config = 'enterprise_specific' AND entreprise_id IS NOT NULL))
);

-- Index pour performance des requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_commission_active 
ON commission_config (entreprise_id, actif, date_debut, date_fin);

CREATE INDEX IF NOT EXISTS idx_commission_entreprise 
ON commission_config (entreprise_id, date_debut DESC);

CREATE INDEX IF NOT EXISTS idx_commission_global 
ON commission_config (type_config, actif, date_debut) 
WHERE type_config = 'global_default';

-- Commentaires pour documentation
COMMENT ON TABLE commission_config IS 'Configuration dynamique des taux de commission - remplace le système hardcodé 15%';
COMMENT ON COLUMN commission_config.type_config IS 'Type: global_default (pour toutes) ou enterprise_specific (pour une entreprise)';
COMMENT ON COLUMN commission_config.taux_commission IS 'Taux de commission en pourcentage (0-100)';
COMMENT ON COLUMN commission_config.motif IS 'Justification business du changement de taux';

-- ============================================================================
-- ÉTAPE 3: CRÉER TABLE AUDIT_LOGS (TRAÇABILITÉ COMPLÈTE)
-- ============================================================================
-- Audit trail complet de toutes les actions super-admin
-- Conformité, sécurité et traçabilité enterprise-grade
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Identification utilisateur et session
  user_id UUID NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
  session_id VARCHAR NOT NULL,
  
  -- Type d'action effectuée
  action_type VARCHAR NOT NULL CHECK (action_type IN (
    'COMMISSION_CHANGE', 'ENTERPRISE_MODIFY', 'ENTERPRISE_SUSPEND', 
    'GLOBAL_SETTING_CHANGE', 'LOGIN', 'LOGOUT', 'VIEW_SENSITIVE_DATA',
    'EXPORT_DATA', 'SIMULATION_RUN', 'BACKUP_RESTORE', 'SECURITY_VIOLATION',
    'SYSTEM_MAINTENANCE_START', 'SYSTEM_MAINTENANCE_END'
  )),
  
  -- Entité concernée par l'action
  entity_type VARCHAR NOT NULL CHECK (entity_type IN (
    'COMMISSION', 'ENTERPRISE', 'USER', 'SYSTEM', 'EXPORT', 'SESSION'
  )),
  entity_id UUID,
  
  -- Données avant/après modification (format JSON)
  old_values JSONB,
  new_values JSONB,
  
  -- Informations techniques et sécurité
  ip_address INET,
  user_agent TEXT,
  request_method VARCHAR,
  request_url TEXT,
  
  -- Impact business et niveau de criticité
  impact_level VARCHAR CHECK (impact_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  business_impact_gnf NUMERIC DEFAULT 0,
  
  -- Timestamp
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index pour performance et recherche
CREATE INDEX IF NOT EXISTS idx_audit_user_date 
ON audit_logs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_action_type 
ON audit_logs (action_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_impact 
ON audit_logs (impact_level, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_entity 
ON audit_logs (entity_type, entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_session 
ON audit_logs (session_id, created_at DESC);

-- Commentaires pour documentation
COMMENT ON TABLE audit_logs IS 'Journal d''audit complet de toutes les actions super-admin pour conformité et sécurité';
COMMENT ON COLUMN audit_logs.impact_level IS 'Niveau d''impact: LOW, MEDIUM, HIGH, CRITICAL';
COMMENT ON COLUMN audit_logs.business_impact_gnf IS 'Impact financier estimé en Francs Guinéens';

-- ============================================================================
-- ÉTAPE 4: CRÉER TABLE SYSTEM_BACKUPS (BACKUP AUTOMATIQUE)
-- ============================================================================
-- Système de backup automatique avant actions critiques
-- Recovery et rollback en cas de problème
CREATE TABLE IF NOT EXISTS system_backups (
  id VARCHAR PRIMARY KEY, -- Format: backup_YYYYMMDD_HHMMSS_randomhash
  
  -- Type de backup
  type VARCHAR NOT NULL CHECK (type IN ('SCHEDULED', 'PRE_CRITICAL_CHANGE')),
  
  -- Données sauvegardées (format JSON)
  commission_data JSONB,
  enterprise_data JSONB,
  audit_data JSONB,
  
  -- Métadonnées backup
  size_bytes BIGINT,
  checksum VARCHAR, -- Pour vérifier intégrité
  compression_ratio NUMERIC,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP, -- Date d'expiration automatique
  
  -- Métadonnées additionnelles
  metadata JSONB DEFAULT '{}'::JSONB,
  
  -- Statut du backup
  status VARCHAR DEFAULT 'COMPLETED' CHECK (status IN ('IN_PROGRESS', 'COMPLETED', 'FAILED', 'EXPIRED'))
);

-- Index pour gestion et performance
CREATE INDEX IF NOT EXISTS idx_backup_type_date 
ON system_backups (type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_backup_status 
ON system_backups (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_backup_expires 
ON system_backups (expires_at) 
WHERE expires_at IS NOT NULL;

-- Commentaires pour documentation
COMMENT ON TABLE system_backups IS 'Système de backup automatique pour recovery et rollback';
COMMENT ON COLUMN system_backups.checksum IS 'Hash MD5/SHA256 pour vérification intégrité des données';

-- ============================================================================
-- ÉTAPE 5: INITIALISER CONFIGURATION PAR DÉFAUT
-- ============================================================================
-- Insérer le taux de commission global par défaut (15%)
-- Cela remplace le hardcodé actuel dans le code
INSERT INTO commission_config (
  type_config, 
  entreprise_id, 
  taux_commission, 
  actif, 
  created_by, 
  motif,
  date_debut
) VALUES (
  'global_default', 
  NULL, 
  15.0, 
  TRUE, 
  'SYSTEM_MIGRATION', 
  'Migration initiale - taux global par défaut remplaçant le système hardcodé',
  CURRENT_DATE
) ON CONFLICT DO NOTHING; -- Éviter doublon si déjà existant

-- ============================================================================
-- ÉTAPE 6: CRÉER FONCTIONS UTILITAIRES
-- ============================================================================

-- Fonction pour récupérer le taux de commission applicable
CREATE OR REPLACE FUNCTION get_commission_rate(p_entreprise_id UUID, p_date_calcul DATE DEFAULT CURRENT_DATE)
RETURNS NUMERIC AS $$
DECLARE
  v_taux NUMERIC;
BEGIN
  -- 1. Chercher taux spécifique entreprise
  SELECT taux_commission INTO v_taux
  FROM commission_config
  WHERE entreprise_id = p_entreprise_id
    AND type_config = 'enterprise_specific'
    AND actif = TRUE
    AND date_debut <= p_date_calcul
    AND (date_fin IS NULL OR date_fin >= p_date_calcul)
  ORDER BY date_debut DESC
  LIMIT 1;
  
  -- 2. Si pas trouvé, utiliser taux global
  IF v_taux IS NULL THEN
    SELECT taux_commission INTO v_taux
    FROM commission_config
    WHERE entreprise_id IS NULL
      AND type_config = 'global_default'
      AND actif = TRUE
      AND date_debut <= p_date_calcul
      AND (date_fin IS NULL OR date_fin >= p_date_calcul)
    ORDER BY date_debut DESC
    LIMIT 1;
  END IF;
  
  -- 3. Fallback ultime
  RETURN COALESCE(v_taux, 15.0);
END;
$$ LANGUAGE plpgsql STABLE;

-- Commentaire pour documentation
COMMENT ON FUNCTION get_commission_rate(UUID, DATE) IS 'Récupère le taux de commission applicable pour une entreprise à une date donnée';

-- ============================================================================
-- ÉTAPE 7: SÉCURITÉ ET PERMISSIONS
-- ============================================================================
-- NOTE: RLS (Row Level Security) sera configuré via l'interface Supabase
-- Les politiques de sécurité seront gérées au niveau application pour plus de flexibilité

-- Créer des vues sécurisées pour l'accès aux données sensibles (optionnel)
-- Ces vues peuvent être utilisées par l'application pour un accès contrôlé

-- Vue pour les configurations de commission (lecture seule)
CREATE OR REPLACE VIEW v_commission_config_readonly AS
SELECT 
  id,
  type_config,
  entreprise_id,
  taux_commission,
  date_debut,
  date_fin,
  actif,
  motif,
  created_at
FROM commission_config
WHERE actif = TRUE;

-- Commentaire pour documentation
COMMENT ON VIEW v_commission_config_readonly IS 'Vue en lecture seule des configurations de commission actives';

-- ============================================================================
-- ÉTAPE 8: BACKUP INITIAL
-- ============================================================================
-- Créer un backup initial de l'état actuel avant activation
INSERT INTO system_backups (
  id,
  type,
  enterprise_data,
  created_at,
  status,
  metadata
) VALUES (
  'backup_initial_' || to_char(now(), 'YYYYMMDD_HH24MISS'),
  'PRE_CRITICAL_CHANGE',
  (SELECT jsonb_agg(to_jsonb(e)) FROM entreprises e WHERE actif = TRUE),
  NOW(),
  'COMPLETED',
  jsonb_build_object(
    'description', 'Backup initial avant activation système super-admin',
    'migration_version', '001',
    'enterprise_count', (SELECT count(*) FROM entreprises WHERE actif = TRUE)
  )
);

-- ============================================================================
-- VALIDATION ET TESTS
-- ============================================================================

-- Vérifier que les tables ont été créées
DO $$
BEGIN
  -- Vérifier commission_config
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'commission_config') THEN
    RAISE EXCEPTION 'ERREUR: Table commission_config non créée';
  END IF;
  
  -- Vérifier audit_logs
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
    RAISE EXCEPTION 'ERREUR: Table audit_logs non créée';
  END IF;
  
  -- Vérifier system_backups
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_backups') THEN
    RAISE EXCEPTION 'ERREUR: Table system_backups non créée';
  END IF;
  
  -- Vérifier colonne is_admin
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'entreprises' AND column_name = 'is_admin'
  ) THEN
    RAISE EXCEPTION 'ERREUR: Colonne is_admin non ajoutée à entreprises';
  END IF;
  
  -- Vérifier configuration par défaut
  IF NOT EXISTS (SELECT 1 FROM commission_config WHERE type_config = 'global_default') THEN
    RAISE EXCEPTION 'ERREUR: Configuration par défaut non initialisée';
  END IF;
  
  RAISE NOTICE 'SUCCESS: Migration 001 appliquée avec succès !';
  RAISE NOTICE 'INFO: Taux global par défaut: %', (SELECT taux_commission FROM commission_config WHERE type_config = 'global_default' LIMIT 1);
  RAISE NOTICE 'INFO: Entreprises actives: %', (SELECT count(*) FROM entreprises WHERE actif = TRUE);
END $$;

COMMIT;

-- ============================================================================
-- INSTRUCTIONS POST-MIGRATION
-- ============================================================================
/*
ÉTAPES SUIVANTES:

1. VERIFICATION:
   - Vérifier que toutes les tables sont créées
   - Tester la fonction get_commission_rate()
   - Vérifier les index et contraintes

2. ACTIVATION SUPER-ADMIN:
   - Identifier l'entreprise qui sera super-admin
   - Exécuter: UPDATE entreprises SET is_admin = TRUE WHERE id = 'uuid-entreprise';

3. TESTS:
   - Tester les politiques RLS
   - Vérifier les backups automatiques
   - Tester la fonction de récupération des taux

4. DEPLOIEMENT CODE:
   - Implémenter les services Angular correspondants
   - Configurer les guards et interceptors
   - Activer le système dans l'application

ROLLBACK SI NECESSAIRE:
   - DROP TABLE system_backups;
   - DROP TABLE audit_logs;
   - DROP TABLE commission_config;
   - ALTER TABLE entreprises DROP COLUMN is_admin;

CONTACT: En cas de problème, consulter PLAN_SUPER_ADMIN_RG.md
*/