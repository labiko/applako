/**
 * FIX: Recalcul automatique des balances après suppression de période
 */

-- Trigger pour recalculer les balances après suppression d'une période
CREATE OR REPLACE FUNCTION after_periode_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- Recalculer toutes les balances après suppression
    PERFORM recalculer_balances_entreprises();
    RAISE NOTICE 'Balances recalculées après suppression de la période %', OLD.id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger sur la table facturation_periodes
DROP TRIGGER IF EXISTS trigger_after_periode_delete ON facturation_periodes;
CREATE TRIGGER trigger_after_periode_delete
    AFTER DELETE ON facturation_periodes
    FOR EACH ROW
    EXECUTE FUNCTION after_periode_delete();

-- Trigger pour recalculer après suppression dans commissions_detail
CREATE OR REPLACE FUNCTION after_commission_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- Recalculer les balances après suppression
    PERFORM recalculer_balances_entreprises();
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_after_commission_delete ON commissions_detail;
CREATE TRIGGER trigger_after_commission_delete
    AFTER DELETE ON commissions_detail
    FOR EACH STATEMENT
    EXECUTE FUNCTION after_commission_delete();

-- Fonction améliorée pour supprimer une période proprement
CREATE OR REPLACE FUNCTION supprimer_periode_proprement(p_periode_id UUID)
RETURNS void AS $$
BEGIN
    -- 1. Supprimer les données de commission de cette période
    DELETE FROM commissions_detail WHERE periode_id = p_periode_id;
    
    -- 2. Supprimer les reversements/collectes liés
    DELETE FROM reversements_entreprises WHERE periode_id = p_periode_id;
    DELETE FROM collectes_commissions_cash WHERE periode_id = p_periode_id;
    
    -- 3. Supprimer la période
    DELETE FROM facturation_periodes WHERE id = p_periode_id;
    
    -- 4. Recalculer toutes les balances
    PERFORM recalculer_balances_entreprises();
    
    RAISE NOTICE 'Période % supprimée et balances recalculées', p_periode_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION after_periode_delete() IS 
'Trigger pour recalculer les balances après suppression d''une période';

COMMENT ON FUNCTION supprimer_periode_proprement(UUID) IS 
'Supprime une période et recalcule automatiquement les balances';