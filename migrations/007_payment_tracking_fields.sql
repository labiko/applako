/**
 * Migration 007: Ajout des champs de suivi de paiement
 * Ajoute date_versement_commission et statut_paiement à la table commissions_detail
 */

-- Ajouter les colonnes de suivi de paiement
ALTER TABLE commissions_detail 
ADD COLUMN IF NOT EXISTS date_versement_commission TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS statut_paiement VARCHAR(20) DEFAULT 'non_paye' CHECK (statut_paiement IN ('non_paye', 'paye', 'en_attente'));

-- Créer index pour optimiser les requêtes par statut de paiement
CREATE INDEX IF NOT EXISTS idx_commissions_detail_statut_paiement 
ON commissions_detail(statut_paiement);

-- Créer index pour optimiser les requêtes par date de versement
CREATE INDEX IF NOT EXISTS idx_commissions_detail_date_versement 
ON commissions_detail(date_versement_commission);

-- Mettre à jour toutes les commissions existantes avec statut 'non_paye'
UPDATE commissions_detail 
SET statut_paiement = 'non_paye' 
WHERE statut_paiement IS NULL;

-- Commentaires pour documentation
COMMENT ON COLUMN commissions_detail.date_versement_commission IS 'Date à laquelle la commission a été versée par l''entreprise';
COMMENT ON COLUMN commissions_detail.statut_paiement IS 'Statut du paiement de la commission: non_paye, paye, en_attente';