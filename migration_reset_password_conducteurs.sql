-- =====================================================
-- MIGRATION: Système Réinitialisation Mot de Passe Conducteurs
-- Date: 2025-08-14
-- Description: Ajout des fonctionnalités de réinitialisation des mots de passe
--              pour les conducteurs avec audit trail et suivi par entreprise
-- =====================================================

-- 1. Ajouter la colonne first_login à la table conducteurs
-- =====================================================
DO $$ 
BEGIN 
    -- Ajouter la colonne first_login
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='conducteurs' AND column_name='first_login') THEN
        ALTER TABLE conducteurs ADD COLUMN first_login BOOLEAN DEFAULT FALSE;
        COMMENT ON COLUMN conducteurs.first_login IS 'Indicateur de première connexion après réinitialisation';
    END IF;
END $$;

-- 2. Créer la table password_reset_history
-- =====================================================
CREATE TABLE IF NOT EXISTS password_reset_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('conducteur', 'entreprise')),
    entity_id UUID NOT NULL,
    entreprise_id UUID NULL, -- Pour tracer l'entreprise liée au conducteur
    reset_by VARCHAR(255) NOT NULL,
    reset_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET NULL,
    user_agent TEXT NULL,
    reset_reason TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Contraintes
    CONSTRAINT fk_password_reset_conducteur 
        FOREIGN KEY (entity_id) REFERENCES conducteurs(id) ON DELETE CASCADE
        DEFERRABLE INITIALLY DEFERRED,
    CONSTRAINT fk_password_reset_entreprise_link
        FOREIGN KEY (entreprise_id) REFERENCES entreprises(id) ON DELETE SET NULL
        DEFERRABLE INITIALLY DEFERRED
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_password_reset_entity ON password_reset_history(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_date ON password_reset_history(reset_at DESC);
CREATE INDEX IF NOT EXISTS idx_password_reset_entreprise ON password_reset_history(entreprise_id);

-- Commentaires
COMMENT ON TABLE password_reset_history IS 'Historique des réinitialisations de mot de passe';
COMMENT ON COLUMN password_reset_history.entity_type IS 'Type d''entité (conducteur ou entreprise)';
COMMENT ON COLUMN password_reset_history.entity_id IS 'ID de l''entité concernée';
COMMENT ON COLUMN password_reset_history.entreprise_id IS 'ID de l''entreprise liée (pour audit)';
COMMENT ON COLUMN password_reset_history.reset_by IS 'Qui a effectué la réinitialisation';
COMMENT ON COLUMN password_reset_history.reset_reason IS 'Raison de la réinitialisation';

-- 3. Créer une vue pour faciliter les requêtes
-- =====================================================
CREATE OR REPLACE VIEW v_password_reset_history AS
SELECT 
    h.id,
    h.entity_type,
    h.entity_id,
    h.entreprise_id,
    h.reset_by,
    h.reset_at,
    h.ip_address,
    h.user_agent,
    h.reset_reason,
    h.created_at,
    -- Informations sur le conducteur
    CASE 
        WHEN h.entity_type = 'conducteur' THEN 
            CONCAT(c.nom, ' ', c.prenom)
        ELSE NULL 
    END as conducteur_nom_complet,
    c.telephone as conducteur_telephone,
    -- Informations sur l'entreprise liée
    e.nom as entreprise_nom,
    e.email as entreprise_email
FROM password_reset_history h
LEFT JOIN conducteurs c ON (h.entity_type = 'conducteur' AND h.entity_id = c.id)
LEFT JOIN entreprises e ON h.entreprise_id = e.id
ORDER BY h.reset_at DESC;

COMMENT ON VIEW v_password_reset_history IS 'Vue enrichie de l''historique des réinitialisations';

-- 4. Fonction RPC pour les statistiques de réinitialisation
-- =====================================================
CREATE OR REPLACE FUNCTION get_password_reset_stats(
    p_entreprise_id UUID DEFAULT NULL,
    p_days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
    total_resets BIGINT,
    conducteur_resets BIGINT,
    entreprise_resets BIGINT,
    unique_conducteurs BIGINT,
    unique_entreprises BIGINT,
    independent_resets BIGINT,
    entreprise_linked_resets BIGINT
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH stats AS (
        SELECT 
            h.entity_type,
            h.entity_id,
            h.entreprise_id,
            COUNT(*) as reset_count
        FROM password_reset_history h
        WHERE 
            h.reset_at >= NOW() - INTERVAL '1 day' * p_days_back
            AND (p_entreprise_id IS NULL OR h.entreprise_id = p_entreprise_id)
        GROUP BY h.entity_type, h.entity_id, h.entreprise_id
    )
    SELECT 
        -- Total des réinitialisations
        (SELECT COUNT(*) FROM password_reset_history 
         WHERE reset_at >= NOW() - INTERVAL '1 day' * p_days_back
         AND (p_entreprise_id IS NULL OR entreprise_id = p_entreprise_id))::BIGINT,
        
        -- Réinitialisations de conducteurs
        (SELECT COUNT(*) FROM password_reset_history 
         WHERE entity_type = 'conducteur' 
         AND reset_at >= NOW() - INTERVAL '1 day' * p_days_back
         AND (p_entreprise_id IS NULL OR entreprise_id = p_entreprise_id))::BIGINT,
        
        -- Réinitialisations d'entreprises
        (SELECT COUNT(*) FROM password_reset_history 
         WHERE entity_type = 'entreprise' 
         AND reset_at >= NOW() - INTERVAL '1 day' * p_days_back
         AND (p_entreprise_id IS NULL OR entreprise_id = p_entreprise_id))::BIGINT,
        
        -- Conducteurs uniques affectés
        (SELECT COUNT(DISTINCT entity_id) FROM password_reset_history 
         WHERE entity_type = 'conducteur' 
         AND reset_at >= NOW() - INTERVAL '1 day' * p_days_back
         AND (p_entreprise_id IS NULL OR entreprise_id = p_entreprise_id))::BIGINT,
        
        -- Entreprises uniques affectées
        (SELECT COUNT(DISTINCT entity_id) FROM password_reset_history 
         WHERE entity_type = 'entreprise' 
         AND reset_at >= NOW() - INTERVAL '1 day' * p_days_back
         AND (p_entreprise_id IS NULL OR entreprise_id = p_entreprise_id))::BIGINT,
        
        -- Réinitialisations de conducteurs indépendants
        (SELECT COUNT(*) FROM password_reset_history 
         WHERE entity_type = 'conducteur' 
         AND entreprise_id IS NULL 
         AND reset_at >= NOW() - INTERVAL '1 day' * p_days_back
         AND (p_entreprise_id IS NULL))::BIGINT,
        
        -- Réinitialisations de conducteurs liés à une entreprise
        (SELECT COUNT(*) FROM password_reset_history 
         WHERE entity_type = 'conducteur' 
         AND entreprise_id IS NOT NULL 
         AND reset_at >= NOW() - INTERVAL '1 day' * p_days_back
         AND (p_entreprise_id IS NULL OR entreprise_id = p_entreprise_id))::BIGINT;
END;
$$;

COMMENT ON FUNCTION get_password_reset_stats IS 'Statistiques des réinitialisations de mot de passe';

-- 5. Mettre à jour les conducteurs existants sans mot de passe
-- =====================================================
DO $$
DECLARE
    conducteur_count INTEGER;
BEGIN
    -- Compter les conducteurs sans mot de passe
    SELECT COUNT(*) INTO conducteur_count
    FROM conducteurs 
    WHERE (password IS NULL OR password = '');
    
    -- Marquer comme first_login s'ils n'ont pas de mot de passe
    UPDATE conducteurs 
    SET first_login = TRUE 
    WHERE (password IS NULL OR password = '')
    AND first_login IS NOT TRUE;
    
    RAISE NOTICE 'Migration terminée. % conducteurs marqués comme first_login', conducteur_count;
END $$;

-- 6. Permissions et sécurité
-- =====================================================
-- Permettre les opérations sur la table d'historique
-- (Ajustez selon vos rôles de sécurité)

-- GRANT SELECT, INSERT ON password_reset_history TO authenticated;
-- GRANT SELECT ON v_password_reset_history TO authenticated;
-- GRANT EXECUTE ON FUNCTION get_password_reset_stats TO authenticated;

-- 7. Vérification de la migration
-- =====================================================
DO $$
BEGIN
    -- Vérifier que les colonnes ont été ajoutées
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='conducteurs' AND column_name='first_login') THEN
        RAISE EXCEPTION 'ERREUR: Colonne first_login non créée dans conducteurs';
    END IF;
    
    
    -- Vérifier que la table d'historique existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                   WHERE table_name='password_reset_history') THEN
        RAISE EXCEPTION 'ERREUR: Table password_reset_history non créée';
    END IF;
    
    -- Vérifier que la vue existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.views 
                   WHERE table_name='v_password_reset_history') THEN
        RAISE EXCEPTION 'ERREUR: Vue v_password_reset_history non créée';
    END IF;
    
    -- Vérifier que la fonction existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines 
                   WHERE routine_name='get_password_reset_stats') THEN
        RAISE EXCEPTION 'ERREUR: Fonction get_password_reset_stats non créée';
    END IF;
    
    RAISE NOTICE '✅ Migration réussie ! Tous les composants ont été créés correctement.';
    RAISE NOTICE '📊 Tables: conducteurs (colonne first_login ajoutée), password_reset_history (créée)';
    RAISE NOTICE '👁️  Vue: v_password_reset_history';
    RAISE NOTICE '⚡ Fonction: get_password_reset_stats()';
    RAISE NOTICE '🔐 Utilise la colonne password existante (pas de password_hash)';
END $$;

-- =====================================================
-- FIN DE LA MIGRATION
-- =====================================================

/*
INSTRUCTIONS D'EXÉCUTION:

1. Connectez-vous à votre base de données Supabase
2. Allez dans l'éditeur SQL
3. Copiez-collez ce script complet
4. Exécutez le script
5. Vérifiez les messages de confirmation

Le script est idempotent (peut être exécuté plusieurs fois sans problème).

VÉRIFICATIONS POST-MIGRATION:
- SELECT * FROM password_reset_history LIMIT 5;
- SELECT * FROM v_password_reset_history LIMIT 5;
- SELECT * FROM get_password_reset_stats();
- SELECT first_login, COUNT(*) FROM conducteurs GROUP BY first_login;
*/