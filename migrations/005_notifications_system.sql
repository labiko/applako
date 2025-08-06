-- ============================================================================
-- MIGRATION: SYSTÈME DE NOTIFICATIONS POUR CHANGEMENTS DE COMMISSION
-- Date: 2025-08-05
-- Description: Ajoute un système de notifications pour informer les entreprises
--              des changements de taux de commission
-- ============================================================================

-- 1. Créer la table des notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Destinataire
    entreprise_id UUID REFERENCES entreprises(id) ON DELETE CASCADE,
    user_type VARCHAR(50) NOT NULL DEFAULT 'enterprise',
    
    -- Contenu
    titre VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type_notification VARCHAR(50) NOT NULL CHECK (type_notification IN (
        'commission_change',
        'commission_specific_set',
        'commission_specific_removed',
        'system_info',
        'alert'
    )),
    
    -- Métadonnées
    metadata JSONB DEFAULT '{}',
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    
    -- État
    lu BOOLEAN DEFAULT FALSE,
    date_lecture TIMESTAMP,
    archived BOOLEAN DEFAULT FALSE,
    
    -- Actions
    action_required BOOLEAN DEFAULT FALSE,
    action_url VARCHAR(500),
    action_label VARCHAR(100),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP
);

-- 2. Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_notifications_entreprise_id 
    ON notifications(entreprise_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at 
    ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_lu 
    ON notifications(lu);
CREATE INDEX IF NOT EXISTS idx_notifications_type 
    ON notifications(type_notification);

-- 3. Fonction pour créer une notification de changement de commission
CREATE OR REPLACE FUNCTION create_commission_notification(
    p_entreprise_id UUID,
    p_ancien_taux NUMERIC,
    p_nouveau_taux NUMERIC,
    p_type_change VARCHAR,
    p_motif TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_notification_id UUID;
    v_titre VARCHAR(255);
    v_message TEXT;
    v_type_notification VARCHAR(50);
    v_metadata JSONB;
BEGIN
    -- Déterminer le titre et type selon le changement
    IF p_type_change = 'global' THEN
        v_titre := 'Modification du taux de commission global';
        v_type_notification := 'commission_change';
        v_message := format(
            'Le taux de commission global a été modifié de %s%% à %s%%. %s',
            p_ancien_taux,
            p_nouveau_taux,
            COALESCE('Motif: ' || p_motif, '')
        );
    ELSIF p_type_change = 'specific_set' THEN
        v_titre := 'Taux de commission spécifique appliqué';
        v_type_notification := 'commission_specific_set';
        v_message := format(
            'Un taux de commission spécifique de %s%% vous a été attribué (précédemment %s%%). %s',
            p_nouveau_taux,
            p_ancien_taux,
            COALESCE('Motif: ' || p_motif, '')
        );
    ELSIF p_type_change = 'specific_removed' THEN
        v_titre := 'Retour au taux de commission global';
        v_type_notification := 'commission_specific_removed';
        v_message := format(
            'Votre taux spécifique a été supprimé. Vous revenez au taux global de %s%% (précédemment %s%%). %s',
            p_nouveau_taux,
            p_ancien_taux,
            COALESCE('Motif: ' || p_motif, '')
        );
    ELSE
        v_titre := 'Changement de taux de commission';
        v_type_notification := 'commission_change';
        v_message := format(
            'Votre taux de commission a changé de %s%% à %s%%. %s',
            p_ancien_taux,
            p_nouveau_taux,
            COALESCE('Motif: ' || p_motif, '')
        );
    END IF;
    
    -- Créer les métadonnées
    v_metadata := jsonb_build_object(
        'ancien_taux', p_ancien_taux,
        'nouveau_taux', p_nouveau_taux,
        'type_change', p_type_change,
        'motif', p_motif,
        'difference', p_nouveau_taux - p_ancien_taux,
        'timestamp', NOW()
    );
    
    -- Insérer la notification
    INSERT INTO notifications (
        entreprise_id,
        titre,
        message,
        type_notification,
        metadata,
        priority,
        action_required,
        action_url,
        action_label,
        expires_at
    ) VALUES (
        p_entreprise_id,
        v_titre,
        v_message,
        v_type_notification,
        v_metadata,
        CASE 
            WHEN ABS(p_nouveau_taux - p_ancien_taux) > 5 THEN 'high'
            WHEN ABS(p_nouveau_taux - p_ancien_taux) > 2 THEN 'normal'
            ELSE 'low'
        END,
        TRUE,
        '/dashboard',
        'Voir l''impact',
        NOW() + INTERVAL '30 days'
    ) RETURNING id INTO v_notification_id;
    
    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql;

-- 4. Fonction pour notifier toutes les entreprises d'un changement global
CREATE OR REPLACE FUNCTION notify_all_enterprises_commission_change(
    p_ancien_taux NUMERIC,
    p_nouveau_taux NUMERIC,
    p_motif TEXT DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER := 0;
    v_entreprise RECORD;
BEGIN
    -- Pour chaque entreprise active sans taux spécifique
    FOR v_entreprise IN 
        SELECT e.id
        FROM entreprises e
        WHERE e.actif = TRUE
        AND NOT EXISTS (
            SELECT 1 
            FROM commission_config cc
            WHERE cc.entreprise_id = e.id
            AND cc.type_config = 'enterprise_specific'
            AND cc.actif = TRUE
        )
    LOOP
        PERFORM create_commission_notification(
            v_entreprise.id,
            p_ancien_taux,
            p_nouveau_taux,
            'global',
            p_motif
        );
        v_count := v_count + 1;
    END LOOP;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- 5. Trigger pour notifier automatiquement lors des changements
CREATE OR REPLACE FUNCTION trigger_commission_change_notification()
RETURNS TRIGGER AS $$
DECLARE
    v_ancien_taux NUMERIC;
    v_notification_count INTEGER;
BEGIN
    -- Si c'est une nouvelle configuration active
    IF NEW.actif = TRUE THEN
        -- Récupérer l'ancien taux
        IF NEW.type_config = 'global_default' THEN
            -- Pour un changement global, récupérer l'ancien taux global
            SELECT taux_commission INTO v_ancien_taux
            FROM commission_config
            WHERE type_config = 'global_default'
            AND actif = FALSE
            AND id != NEW.id
            ORDER BY updated_at DESC
            LIMIT 1;
            
            -- Si pas d'ancien taux trouvé, utiliser 15% par défaut
            IF v_ancien_taux IS NULL THEN
                v_ancien_taux := 15;
            END IF;
            
            -- Notifier toutes les entreprises sans taux spécifique
            v_notification_count := notify_all_enterprises_commission_change(
                v_ancien_taux,
                NEW.taux_commission,
                NEW.motif
            );
            
            RAISE NOTICE 'Notifications envoyées à % entreprises pour changement global', v_notification_count;
            
        ELSIF NEW.type_config = 'enterprise_specific' AND NEW.entreprise_id IS NOT NULL THEN
            -- Pour un taux spécifique, récupérer l'ancien taux de cette entreprise
            SELECT taux_commission INTO v_ancien_taux
            FROM commission_config
            WHERE entreprise_id = NEW.entreprise_id
            AND actif = FALSE
            AND id != NEW.id
            ORDER BY updated_at DESC
            LIMIT 1;
            
            -- Si pas de taux spécifique précédent, prendre le taux global
            IF v_ancien_taux IS NULL THEN
                SELECT taux_commission INTO v_ancien_taux
                FROM commission_config
                WHERE type_config = 'global_default'
                AND actif = TRUE
                LIMIT 1;
                
                -- Fallback à 15%
                IF v_ancien_taux IS NULL THEN
                    v_ancien_taux := 15;
                END IF;
            END IF;
            
            -- Créer notification pour cette entreprise
            PERFORM create_commission_notification(
                NEW.entreprise_id,
                v_ancien_taux,
                NEW.taux_commission,
                'specific_set',
                NEW.motif
            );
            
            RAISE NOTICE 'Notification envoyée à entreprise % pour taux spécifique', NEW.entreprise_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Attacher le trigger à la table commission_config
DROP TRIGGER IF EXISTS commission_change_notification_trigger ON commission_config;
CREATE TRIGGER commission_change_notification_trigger
AFTER INSERT ON commission_config
FOR EACH ROW
EXECUTE FUNCTION trigger_commission_change_notification();

-- 7. Vue pour faciliter la lecture des notifications par entreprise
CREATE OR REPLACE VIEW v_notifications_entreprise AS
SELECT 
    n.*,
    e.nom as entreprise_nom,
    e.email as entreprise_email,
    CASE 
        WHEN n.lu = FALSE AND n.created_at > NOW() - INTERVAL '24 hours' THEN 'new'
        WHEN n.lu = FALSE THEN 'unread'
        WHEN n.archived = TRUE THEN 'archived'
        ELSE 'read'
    END as status_display,
    EXTRACT(EPOCH FROM (NOW() - n.created_at)) / 3600 as hours_ago
FROM notifications n
LEFT JOIN entreprises e ON n.entreprise_id = e.id
WHERE n.expires_at IS NULL OR n.expires_at > NOW();

-- 8. Fonction pour marquer les notifications comme lues
CREATE OR REPLACE FUNCTION mark_notifications_as_read(
    p_entreprise_id UUID,
    p_notification_ids UUID[] DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    IF p_notification_ids IS NULL THEN
        -- Marquer toutes les notifications non lues de l'entreprise
        UPDATE notifications
        SET lu = TRUE, date_lecture = NOW()
        WHERE entreprise_id = p_entreprise_id
        AND lu = FALSE;
    ELSE
        -- Marquer seulement les notifications spécifiées
        UPDATE notifications
        SET lu = TRUE, date_lecture = NOW()
        WHERE entreprise_id = p_entreprise_id
        AND id = ANY(p_notification_ids)
        AND lu = FALSE;
    END IF;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- 9. Fonction pour obtenir le nombre de notifications non lues
CREATE OR REPLACE FUNCTION get_unread_notifications_count(p_entreprise_id UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM notifications
        WHERE entreprise_id = p_entreprise_id
        AND lu = FALSE
        AND (expires_at IS NULL OR expires_at > NOW())
    );
END;
$$ LANGUAGE plpgsql;

-- 10. Ajouter des notifications de test pour validation
DO $$
DECLARE
    v_entreprise_id UUID;
BEGIN
    -- Récupérer une entreprise de test
    SELECT id INTO v_entreprise_id
    FROM entreprises
    WHERE actif = TRUE
    LIMIT 1;
    
    IF v_entreprise_id IS NOT NULL THEN
        -- Créer une notification de test
        INSERT INTO notifications (
            entreprise_id,
            titre,
            message,
            type_notification,
            metadata,
            priority
        ) VALUES (
            v_entreprise_id,
            'Bienvenue dans le système de notifications',
            'Ce système vous informera automatiquement de tout changement de taux de commission.',
            'system_info',
            '{"type": "welcome", "version": "1.0"}',
            'low'
        );
        
        RAISE NOTICE 'Notification de test créée pour entreprise %', v_entreprise_id;
    END IF;
END $$;

-- Log de la migration
DO $$
BEGIN
    -- Vérifier si la table system_logs existe avant d'insérer
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_logs') THEN
        INSERT INTO system_logs (
            action,
            entity_type,
            details,
            severity
        ) VALUES (
            'MIGRATION_EXECUTED',
            'notifications_system',
            'Système de notifications pour changements de commission créé avec succès',
            'info'
        );
    END IF;
    
    RAISE NOTICE 'Migration 005: Système de notifications créé avec succès';
END $$;