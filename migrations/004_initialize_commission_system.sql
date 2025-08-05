/**
 * INITIALISATION SYSTÈME DE COMMISSION DYNAMIQUE
 * Création configuration par défaut et migration des données existantes
 */

-- ============================================================================
-- ÉTAPE 1: INSÉRER CONFIGURATION GLOBALE PAR DÉFAUT (15%)
-- ============================================================================

-- Supprimer toute config globale existante
DELETE FROM commission_config WHERE type_config = 'global_default';

-- Insérer nouvelle configuration globale par défaut
INSERT INTO commission_config (
  type_config,
  entreprise_id,
  taux_commission,
  date_debut,
  actif,
  created_by,
  motif,
  created_at,
  updated_at
) VALUES (
  'global_default',
  NULL,
  15.0,
  CURRENT_DATE,
  TRUE,
  'system',
  'Configuration initiale du système - Taux global par défaut',
  NOW(),
  NOW()
);

-- ============================================================================
-- ÉTAPE 2: VÉRIFICATION ET LOG
-- ============================================================================

-- Vérifier la configuration
DO $$
DECLARE
  config_count INTEGER;
  taux_global NUMERIC;
BEGIN
  -- Compter les configurations actives
  SELECT COUNT(*) INTO config_count 
  FROM commission_config 
  WHERE type_config = 'global_default' AND actif = TRUE;
  
  -- Récupérer le taux
  SELECT taux_commission INTO taux_global
  FROM commission_config 
  WHERE type_config = 'global_default' AND actif = TRUE
  LIMIT 1;
  
  -- Log du résultat
  RAISE NOTICE 'Configuration commission initialisée: % config(s) active(s), taux global: %', config_count, taux_global;
  
  -- Vérification de sécurité
  IF config_count != 1 THEN
    RAISE EXCEPTION 'ERREUR: Il doit y avoir exactement 1 configuration globale active (trouvé: %)', config_count;
  END IF;
  
  IF taux_global != 15.0 THEN
    RAISE EXCEPTION 'ERREUR: Le taux global doit être 15.0 (trouvé: %)', taux_global;
  END IF;
  
  RAISE NOTICE '✅ Système de commission dynamique initialisé avec succès';
END $$;

-- ============================================================================
-- ÉTAPE 3: INDEX ET OPTIMISATIONS COMPLÉMENTAIRES
-- ============================================================================

-- S'assurer que les index sont créés
CREATE INDEX IF NOT EXISTS idx_commission_global_active 
ON commission_config (type_config, actif, date_debut DESC) 
WHERE type_config = 'global_default' AND actif = TRUE;

-- Index pour recherche rapide par entreprise
CREATE INDEX IF NOT EXISTS idx_commission_entreprise_active 
ON commission_config (entreprise_id, actif, date_debut DESC) 
WHERE type_config = 'enterprise_specific' AND actif = TRUE;

-- ============================================================================
-- ÉTAPE 4: STATISTIQUES INITIALES
-- ============================================================================

-- Compter les entreprises pour les statistiques
DO $$
DECLARE
  total_entreprises INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_entreprises 
  FROM entreprises 
  WHERE actif = TRUE;
  
  RAISE NOTICE 'Nombre d\'entreprises actives: %', total_entreprises;
  RAISE NOTICE 'Toutes utilisent le taux global par défaut (15.0%)';
  RAISE NOTICE 'Le système est prêt pour la configuration de taux spécifiques';
END $$;