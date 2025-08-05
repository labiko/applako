-- ============================================================================
-- MIGRATION 001: SUPER-ADMIN INFRASTRUCTURE (VERSION SIMPLIFIÉE)
-- ============================================================================
-- Description: Infrastructure super-admin sans RLS pour éviter erreurs syntaxe
-- Author: Claude Code
-- Date: 2025-01-08
-- Version: 1.1 (Simplifiée)
-- 
-- CRITICAL: Cette migration est NON-INVASIVE
-- ============================================================================

BEGIN;

-- ============================================================================
-- ÉTAPE 1: COLONNE is_admin
-- ============================================================================
ALTER TABLE entreprises 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN entreprises.is_admin IS 'Droits super-administrateur';

CREATE INDEX IF NOT EXISTS idx_entreprises_admin 
ON entreprises (is_admin) 
WHERE is_admin = TRUE;

-- ============================================================================
-- ÉTAPE 2: TABLE COMMISSION_CONFIG
-- ============================================================================
CREATE TABLE IF NOT EXISTS commission_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type_config VARCHAR NOT NULL CHECK (type_config IN ('global_default', 'enterprise_specific')),
  entreprise_id UUID REFERENCES entreprises(id) ON DELETE CASCADE,
  taux_commission NUMERIC NOT NULL CHECK (taux_commission >= 0 AND taux_commission <= 100),
  date_debut DATE NOT NULL DEFAULT CURRENT_DATE,
  date_fin DATE,
  actif BOOLEAN DEFAULT TRUE,
  created_by VARCHAR NOT NULL,
  motif TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT commission_config_dates_check 
    CHECK (date_fin IS NULL OR date_fin >= date_debut),
  CONSTRAINT commission_config_global_check 
    CHECK ((type_config = 'global_default' AND entreprise_id IS NULL) OR 
           (type_config = 'enterprise_specific' AND entreprise_id IS NOT NULL))
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_commission_active 
ON commission_config (entreprise_id, actif, date_debut, date_fin);

CREATE INDEX IF NOT EXISTS idx_commission_entreprise 
ON commission_config (entreprise_id, date_debut DESC);

CREATE INDEX IF NOT EXISTS idx_commission_global 
ON commission_config (type_config, actif, date_debut) 
WHERE type_config = 'global_default';

COMMENT ON TABLE commission_config IS 'Configuration dynamique des taux de commission';

-- ============================================================================
-- ÉTAPE 3: TABLE AUDIT_LOGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
  session_id VARCHAR NOT NULL,
  action_type VARCHAR NOT NULL CHECK (action_type IN (
    'COMMISSION_CHANGE', 'ENTERPRISE_MODIFY', 'ENTERPRISE_SUSPEND', 
    'GLOBAL_SETTING_CHANGE', 'LOGIN', 'LOGOUT', 'VIEW_SENSITIVE_DATA',
    'EXPORT_DATA', 'SIMULATION_RUN', 'BACKUP_RESTORE', 'SECURITY_VIOLATION',
    'SYSTEM_MAINTENANCE_START', 'SYSTEM_MAINTENANCE_END'
  )),
  entity_type VARCHAR NOT NULL CHECK (entity_type IN (
    'COMMISSION', 'ENTERPRISE', 'USER', 'SYSTEM', 'EXPORT', 'SESSION'
  )),
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  request_method VARCHAR,
  request_url TEXT,
  impact_level VARCHAR CHECK (impact_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  business_impact_gnf NUMERIC DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_audit_user_date 
ON audit_logs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_action_type 
ON audit_logs (action_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_impact 
ON audit_logs (impact_level, created_at DESC);

COMMENT ON TABLE audit_logs IS 'Journal audit complet actions super-admin';

-- ============================================================================
-- ÉTAPE 4: TABLE SYSTEM_BACKUPS
-- ============================================================================
CREATE TABLE IF NOT EXISTS system_backups (
  id VARCHAR PRIMARY KEY,
  type VARCHAR NOT NULL CHECK (type IN ('SCHEDULED', 'PRE_CRITICAL_CHANGE')),
  commission_data JSONB,
  enterprise_data JSONB,
  audit_data JSONB,
  size_bytes BIGINT,
  checksum VARCHAR,
  compression_ratio NUMERIC,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  metadata JSONB DEFAULT '{}'::JSONB,
  status VARCHAR DEFAULT 'COMPLETED' CHECK (status IN ('IN_PROGRESS', 'COMPLETED', 'FAILED', 'EXPIRED'))
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_backup_type_date 
ON system_backups (type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_backup_status 
ON system_backups (status, created_at DESC);

COMMENT ON TABLE system_backups IS 'Système backup automatique pour recovery';

-- ============================================================================
-- ÉTAPE 5: CONFIGURATION PAR DÉFAUT
-- ============================================================================
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
) ON CONFLICT DO NOTHING;

-- ============================================================================
-- ÉTAPE 6: FONCTION UTILITAIRE
-- ============================================================================
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

COMMENT ON FUNCTION get_commission_rate(UUID, DATE) IS 'Récupère le taux de commission applicable';

-- ============================================================================
-- ÉTAPE 7: BACKUP INITIAL
-- ============================================================================
INSERT INTO system_backups (
  id,
  type,
  enterprise_data,
  created_at,
  status,
  metadata
) SELECT
  'backup_initial_' || to_char(now(), 'YYYYMMDD_HH24MISS'),
  'PRE_CRITICAL_CHANGE',
  jsonb_agg(to_jsonb(e)),
  NOW(),
  'COMPLETED',
  jsonb_build_object(
    'description', 'Backup initial avant activation système super-admin',
    'migration_version', '001',
    'enterprise_count', count(*)
  )
FROM entreprises e 
WHERE actif = TRUE;

-- ============================================================================
-- VALIDATION
-- ============================================================================
DO $$
BEGIN
  -- Vérifier tables créées
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'commission_config') THEN
    RAISE EXCEPTION 'ERREUR: Table commission_config non créée';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
    RAISE EXCEPTION 'ERREUR: Table audit_logs non créée';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_backups') THEN
    RAISE EXCEPTION 'ERREUR: Table system_backups non créée';
  END IF;
  
  -- Vérifier colonne is_admin
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'entreprises' AND column_name = 'is_admin'
  ) THEN
    RAISE EXCEPTION 'ERREUR: Colonne is_admin non ajoutée';
  END IF;
  
  -- Vérifier configuration par défaut
  IF NOT EXISTS (SELECT 1 FROM commission_config WHERE type_config = 'global_default') THEN
    RAISE EXCEPTION 'ERREUR: Configuration par défaut non initialisée';
  END IF;
  
  RAISE NOTICE 'SUCCESS: Migration 001 appliquée avec succès !';
  RAISE NOTICE 'INFO: Taux global: %', (SELECT taux_commission FROM commission_config WHERE type_config = 'global_default' LIMIT 1);
  RAISE NOTICE 'INFO: Entreprises: %', (SELECT count(*) FROM entreprises WHERE actif = TRUE);
END $$;

COMMIT;

-- ============================================================================
-- INSTRUCTIONS POST-MIGRATION
-- ============================================================================
/*
ÉTAPES SUIVANTES:

1. ACTIVATION SUPER-ADMIN:
   UPDATE entreprises SET is_admin = TRUE WHERE email = 'admin@example.com';

2. VÉRIFICATION:
   SELECT * FROM commission_config WHERE type_config = 'global_default';
   SELECT get_commission_rate('uuid-entreprise-test');

3. TESTS:
   -- Tester fonction
   SELECT get_commission_rate(null); -- Doit retourner 15.0
   
4. ROLLBACK SI NÉCESSAIRE:
   DROP TABLE IF EXISTS system_backups;
   DROP TABLE IF EXISTS audit_logs;
   DROP TABLE IF EXISTS commission_config;
   DROP FUNCTION IF EXISTS get_commission_rate(UUID, DATE);
   ALTER TABLE entreprises DROP COLUMN IF EXISTS is_admin;
*/