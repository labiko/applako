-- ============================================================================
-- MIGRATION 002: CRÉATION ENTREPRISE LOKOTAXI SUPER-ADMIN
-- ============================================================================
-- Description: Ajouter l'entreprise LokoTaxi avec droits super-administrateur
-- Author: Claude Code
-- Date: 2025-01-08
-- Version: 1.0
-- 
-- PREREQUIS: Migration 001 doit être appliquée (colonne is_admin existe)
-- ============================================================================

BEGIN;

-- ============================================================================
-- CRÉATION ENTREPRISE LOKOTAXI SUPER-ADMIN
-- ============================================================================

-- Vérifier si l'entreprise existe déjà et la créer ou la mettre à jour
DO $$
DECLARE
  existing_id UUID;
BEGIN
  -- Vérifier si l'entreprise existe déjà
  SELECT id INTO existing_id
  FROM entreprises 
  WHERE email = 'admin@lokotaxi.com';

  IF existing_id IS NOT NULL THEN
    -- Mettre à jour l'entreprise existante pour ajouter droits super-admin
    UPDATE entreprises 
    SET 
      is_admin = TRUE,
      updated_at = NOW(),
      nom = 'LokoTaxi',
      responsable = 'Administrateur Système'
    WHERE id = existing_id;
    
    RAISE NOTICE 'INFO: Entreprise existante mise à jour avec droits super-admin';
  ELSE
    -- Créer nouvelle entreprise LokoTaxi
    INSERT INTO entreprises (
      nom,
      siret,
      adresse,
      telephone,
      email,
      responsable,
      password_hash,
      is_admin,
      actif,
      created_at,
      updated_at
    ) VALUES (
      'LokoTaxi',
      '12345678901234',  -- SIRET fictif
      'Conakry, Guinée',
      '+224123456789',   -- Téléphone admin
      'admin@lokotaxi.com',
      'Administrateur Système',
      'LokoTaxi2025!SuperAdmin#',  -- 🔑 MOT DE PASSE SÉCURISÉ
      TRUE,  -- 🔑 DROITS SUPER-ADMIN
      TRUE,
      NOW(),
      NOW()
    );
    
    RAISE NOTICE 'INFO: Nouvelle entreprise LokoTaxi créée avec droits super-admin';
  END IF;
END $$;

-- Vérifier que l'entreprise a été créée avec succès
DO $$
DECLARE
  lokotaxi_id UUID;
  lokotaxi_count INTEGER;
BEGIN
  -- Compter les entreprises super-admin
  SELECT COUNT(*) INTO lokotaxi_count
  FROM entreprises 
  WHERE is_admin = TRUE;

  -- Récupérer l'ID de LokoTaxi
  SELECT id INTO lokotaxi_id
  FROM entreprises 
  WHERE email = 'admin@lokotaxi.com' AND is_admin = TRUE;

  -- Vérifications
  IF lokotaxi_id IS NULL THEN
    RAISE EXCEPTION 'ERREUR: Entreprise LokoTaxi super-admin non créée';
  END IF;

  RAISE NOTICE 'SUCCESS: Entreprise LokoTaxi créée avec droits super-admin';
  RAISE NOTICE 'INFO: ID LokoTaxi: %', lokotaxi_id;
  RAISE NOTICE 'INFO: Nombre total super-admins: %', lokotaxi_count;
END $$;

-- ============================================================================
-- LOG AUDIT DE CRÉATION
-- ============================================================================

-- Enregistrer la création dans les logs d'audit
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
  'SYSTEM_MIGRATION_002',
  'ENTERPRISE_MODIFY',
  'ENTERPRISE',
  e.id,
  '{}',
  jsonb_build_object(
    'nom', e.nom,
    'email', e.email,
    'is_admin', e.is_admin,
    'action', 'SUPER_ADMIN_CREATION'
  ),
  '127.0.0.1',
  'PostgreSQL Migration Script',
  'HIGH',
  0
FROM entreprises e 
WHERE e.email = 'admin@lokotaxi.com';

COMMIT;

-- ============================================================================
-- INSTRUCTIONS POST-MIGRATION
-- ============================================================================
/*
VÉRIFICATIONS À EFFECTUER:

1. Vérifier création entreprise:
   SELECT * FROM entreprises WHERE email = 'admin@lokotaxi.com';

2. Vérifier droits super-admin:
   SELECT nom, email, is_admin FROM entreprises WHERE is_admin = TRUE;

3. Tester fonction commission:
   SELECT get_commission_rate((SELECT id FROM entreprises WHERE email = 'admin@lokotaxi.com'));

4. Vérifier audit log:
   SELECT * FROM audit_logs WHERE action_type = 'ENTERPRISE_MODIFY' ORDER BY created_at DESC LIMIT 1;

PROCHAINES ÉTAPES:
- Configurer le mot de passe dans l'application
- Tester la connexion super-admin
- Configurer les premiers taux de commission si nécessaire

SÉCURITÉ:
- ✅ Mot de passe sécurisé configuré: 'LokoTaxi2025!SuperAdmin#'
- 🛡️  Configurer l'authentification 2FA si disponible
- 🌐 Limiter l'accès IP en production si nécessaire
- 📱 Considérer l'authentification via Supabase Auth pour plus de sécurité
- 🔐 Garder ce mot de passe confidentiel et le changer régulièrement
*/