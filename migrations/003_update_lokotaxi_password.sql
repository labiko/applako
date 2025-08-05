-- ============================================================================
-- MIGRATION 003: MISE À JOUR MOT DE PASSE LOKOTAXI SUPER-ADMIN
-- ============================================================================
-- Description: Mettre à jour le mot de passe de l'entreprise LokoTaxi
-- Author: Claude Code
-- Date: 2025-01-08
-- Version: 1.0
-- ============================================================================

BEGIN;

-- ============================================================================
-- MISE À JOUR MOT DE PASSE LOKOTAXI
-- ============================================================================

-- Mettre à jour le mot de passe pour l'entreprise LokoTaxi
UPDATE entreprises 
SET 
  password_hash = 'LokoTaxi2025!SuperAdmin#',
  updated_at = NOW()
WHERE 
  email = 'admin@lokotaxi.com' 
  AND is_admin = TRUE;

-- Vérifier que la mise à jour a été effectuée
DO $$
DECLARE
  updated_count INTEGER;
  lokotaxi_password TEXT;
BEGIN
  -- Compter les enregistrements mis à jour
  SELECT COUNT(*) INTO updated_count
  FROM entreprises 
  WHERE email = 'admin@lokotaxi.com' 
    AND is_admin = TRUE
    AND password_hash = 'LokoTaxi2025!SuperAdmin#';

  -- Récupérer le mot de passe pour vérification
  SELECT password_hash INTO lokotaxi_password
  FROM entreprises 
  WHERE email = 'admin@lokotaxi.com' 
    AND is_admin = TRUE;

  -- Vérifications
  IF updated_count = 0 THEN
    RAISE EXCEPTION 'ERREUR: Aucune entreprise LokoTaxi trouvée ou mot de passe non mis à jour';
  END IF;

  IF updated_count > 1 THEN
    RAISE EXCEPTION 'ERREUR: Plusieurs entreprises LokoTaxi trouvées (problème de données)';
  END IF;

  IF lokotaxi_password != 'LokoTaxi2025!SuperAdmin#' THEN
    RAISE EXCEPTION 'ERREUR: Mot de passe non mis à jour correctement';
  END IF;

  RAISE NOTICE 'SUCCESS: Mot de passe LokoTaxi mis à jour avec succès';
  RAISE NOTICE 'INFO: Nouveau mot de passe: %', lokotaxi_password;
  RAISE NOTICE 'INFO: Email: admin@lokotaxi.com';
  RAISE NOTICE 'INFO: Nombre d''enregistrements mis à jour: %', updated_count;
END $$;

-- ============================================================================
-- LOG AUDIT DE MODIFICATION
-- ============================================================================

-- Enregistrer la modification dans les logs d'audit
INSERT INTO audit_logs (
  user_id,
  session_id,
  action_type,
  entity_type,
  entity_id,
  old_values,
  new_values,
  ip_address,
  user_agent,
  impact_level,
  business_impact_gnf
) SELECT 
  e.id,
  'SYSTEM_MIGRATION_003',
  'ENTERPRISE_MODIFY',
  'ENTERPRISE',
  e.id,
  jsonb_build_object('action', 'PASSWORD_UPDATE_OLD'),
  jsonb_build_object(
    'nom', e.nom,
    'email', e.email,
    'is_admin', e.is_admin,
    'action', 'PASSWORD_UPDATE_NEW',
    'password_updated', true,
    'migration', '003'
  ),
  '127.0.0.1',
  'PostgreSQL Migration Script 003',
  'HIGH',
  0
FROM entreprises e 
WHERE e.email = 'admin@lokotaxi.com' AND e.is_admin = TRUE;

COMMIT;

-- ============================================================================
-- INSTRUCTIONS POST-MIGRATION
-- ============================================================================
/*
VÉRIFICATIONS À EFFECTUER:

1. Vérifier mise à jour mot de passe:
   SELECT nom, email, password_hash, is_admin, updated_at 
   FROM entreprises 
   WHERE email = 'admin@lokotaxi.com';

2. Tester connexion super-admin:
   - Aller sur http://localhost:8100/super-admin/login
   - Utiliser: admin@lokotaxi.com / LokoTaxi2025!SuperAdmin#

3. Vérifier audit log:
   SELECT * FROM audit_logs 
   WHERE action_type = 'ENTERPRISE_MODIFY' 
   ORDER BY created_at DESC LIMIT 1;

SÉCURITÉ:
✅ Mot de passe mis à jour: 'LokoTaxi2025!SuperAdmin#'
🔐 Accès super-admin confirmé
📋 Audit trail enregistré
⚠️  Garder ce mot de passe confidentiel
*/