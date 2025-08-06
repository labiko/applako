-- SCRIPT 4: TRIGGERS POUR MISE A JOUR AUTOMATIQUE
-- Executer apres les scripts precedents

-- Trigger pour updated_at sur facturation_periodes
CREATE OR REPLACE FUNCTION update_facturation_periodes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_facturation_periodes_updated_at
    BEFORE UPDATE ON facturation_periodes
    FOR EACH ROW
    EXECUTE FUNCTION update_facturation_periodes_updated_at();

-- Trigger pour updated_at sur commissions_detail
CREATE OR REPLACE FUNCTION update_commissions_detail_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_commissions_detail_updated_at
    BEFORE UPDATE ON commissions_detail
    FOR EACH ROW
    EXECUTE FUNCTION update_commissions_detail_updated_at();

-- Trigger pour updated_at sur paiements_commissions
CREATE OR REPLACE FUNCTION update_paiements_commissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_paiements_commissions_updated_at
    BEFORE UPDATE ON paiements_commissions
    FOR EACH ROW
    EXECUTE FUNCTION update_paiements_commissions_updated_at();