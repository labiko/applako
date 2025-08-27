-- =====================================================
-- MIGRATION 002 : ENRICHISSEMENT TABLE COMMISSIONS_DETAIL
-- Date : 2025-08-27
-- Description : Ajout de colonnes pour gérer Mobile Money vs Cash
-- SANS RÉGRESSION : Utilisation de DEFAULT pour éviter les NULL
-- =====================================================

-- Ajout des nouvelles colonnes avec valeurs par défaut pour éviter les régressions
ALTER TABLE commissions_detail 
  -- Séparation CA Mobile Money vs Cash
  ADD COLUMN IF NOT EXISTS ca_mobile_money NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ca_cash NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS nombre_reservations_mobile INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS nombre_reservations_cash INTEGER DEFAULT 0,
  
  -- Détail des réservations par type (IDs pour traçabilité)
  ADD COLUMN IF NOT EXISTS reservations_mobile_ids UUID[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS reservations_cash_ids UUID[] DEFAULT '{}',
  
  -- Montants financiers calculés
  ADD COLUMN IF NOT EXISTS montant_encaisse NUMERIC(15,2) DEFAULT 0, -- Ce qu'on a reçu via MM
  ADD COLUMN IF NOT EXISTS montant_a_reverser NUMERIC(15,2) DEFAULT 0, -- Ce qu'on doit à l'entreprise
  ADD COLUMN IF NOT EXISTS montant_commission_cash NUMERIC(15,2) DEFAULT 0, -- Ce que l'entreprise nous doit
  
  -- Balance
  ADD COLUMN IF NOT EXISTS balance_nette NUMERIC(15,2) DEFAULT 0, -- Positif = on doit, Négatif = on nous doit
  ADD COLUMN IF NOT EXISTS statut_balance VARCHAR(50) DEFAULT 'equilibre' 
    CHECK (statut_balance IN ('crediteur', 'debiteur', 'equilibre', 'compense')),
  
  -- Flag pour savoir si le nouveau calcul a été effectué
  ADD COLUMN IF NOT EXISTS flux_financier_calcule BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS date_calcul_flux TIMESTAMP WITH TIME ZONE;

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_commissions_flux_calcule 
  ON commissions_detail(flux_financier_calcule) 
  WHERE flux_financier_calcule = FALSE;

CREATE INDEX IF NOT EXISTS idx_commissions_statut_balance 
  ON commissions_detail(statut_balance);

-- =====================================================
-- MIGRATION DES DONNÉES HISTORIQUES
-- Pour les périodes déjà clôturées, on considère tout en cash
-- =====================================================

-- Marquer les anciennes commissions comme "tout cash" par défaut
UPDATE commissions_detail 
SET 
  ca_cash = chiffre_affaire_brut,
  ca_mobile_money = 0,
  nombre_reservations_cash = nombre_reservations,
  nombre_reservations_mobile = 0,
  montant_encaisse = 0,
  montant_a_reverser = 0,
  montant_commission_cash = montant_commission,
  balance_nette = -montant_commission, -- Négatif car entreprise doit
  statut_balance = CASE 
    WHEN montant_commission > 0 THEN 'debiteur'
    ELSE 'equilibre'
  END,
  flux_financier_calcule = FALSE -- Marqué comme non recalculé
WHERE flux_financier_calcule IS NULL;

-- =====================================================
-- FONCTION HELPER POUR CALCULER LA BALANCE
-- =====================================================

CREATE OR REPLACE FUNCTION calculer_balance_commission(
  p_montant_a_reverser NUMERIC,
  p_montant_commission_cash NUMERIC
) RETURNS TABLE(
  balance_nette NUMERIC,
  statut_balance VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p_montant_a_reverser - p_montant_commission_cash AS balance_nette,
    CASE
      WHEN p_montant_a_reverser > p_montant_commission_cash THEN 'crediteur'::VARCHAR
      WHEN p_montant_a_reverser < p_montant_commission_cash THEN 'debiteur'::VARCHAR
      ELSE 'equilibre'::VARCHAR
    END AS statut_balance;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- VUE POUR FACILITER LA LECTURE DES COMMISSIONS ENRICHIES
-- =====================================================

CREATE OR REPLACE VIEW v_commissions_detail_enrichies AS
SELECT 
  cd.*,
  e.nom AS entreprise_nom,
  fp.periode_debut,
  fp.periode_fin,
  -- Calculs additionnels
  CASE 
    WHEN cd.ca_mobile_money > 0 THEN 
      ROUND((cd.ca_mobile_money::NUMERIC / NULLIF(cd.chiffre_affaire_brut, 0)) * 100, 2)
    ELSE 0 
  END AS pourcentage_mobile_money,
  CASE 
    WHEN cd.ca_cash > 0 THEN 
      ROUND((cd.ca_cash::NUMERIC / NULLIF(cd.chiffre_affaire_brut, 0)) * 100, 2)
    ELSE 0 
  END AS pourcentage_cash,
  -- Statut de traitement
  CASE
    WHEN cd.flux_financier_calcule = TRUE THEN 'Calculé'
    WHEN cd.chiffre_affaire_brut > 0 THEN 'À recalculer'
    ELSE 'Pas de données'
  END AS statut_calcul_flux
FROM commissions_detail cd
LEFT JOIN entreprises e ON cd.entreprise_id = e.id
LEFT JOIN facturation_periodes fp ON cd.periode_id = fp.id;

-- =====================================================
-- COMMENTAIRES POUR DOCUMENTATION
-- =====================================================

COMMENT ON COLUMN commissions_detail.ca_mobile_money IS 'Chiffre affaires via paiements Mobile Money SUCCESS';
COMMENT ON COLUMN commissions_detail.ca_cash IS 'Chiffre affaires via paiements cash (non Mobile Money)';
COMMENT ON COLUMN commissions_detail.montant_encaisse IS 'Montant total reçu sur compte admin via Mobile Money';
COMMENT ON COLUMN commissions_detail.montant_a_reverser IS 'Montant à reverser à entreprise (MM - commission)';
COMMENT ON COLUMN commissions_detail.montant_commission_cash IS 'Commission due par entreprise sur paiements cash';
COMMENT ON COLUMN commissions_detail.balance_nette IS 'Balance: positif=admin doit, négatif=entreprise doit';
COMMENT ON COLUMN commissions_detail.flux_financier_calcule IS 'Flag indiquant si le nouveau calcul MM vs Cash a été effectué';

-- =====================================================
-- FIN DE LA MIGRATION 002
-- =====================================================