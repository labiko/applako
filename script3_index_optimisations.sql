-- SCRIPT 3: INDEX POUR LES PERFORMANCES
-- Executer apres les scripts 1 et 2

-- Index sur les periodes
CREATE INDEX IF NOT EXISTS idx_facturation_periodes_dates ON facturation_periodes(periode_debut, periode_fin);
CREATE INDEX IF NOT EXISTS idx_facturation_periodes_statut ON facturation_periodes(statut);

-- Index sur les commissions detail
CREATE INDEX IF NOT EXISTS idx_commissions_detail_periode ON commissions_detail(periode_id);
CREATE INDEX IF NOT EXISTS idx_commissions_detail_entreprise ON commissions_detail(entreprise_id);
CREATE INDEX IF NOT EXISTS idx_commissions_detail_statut ON commissions_detail(statut);
CREATE INDEX IF NOT EXISTS idx_commissions_detail_dates ON commissions_detail(date_calcul, date_facturation, date_paiement);

-- Index sur les paiements
CREATE INDEX IF NOT EXISTS idx_paiements_commission ON paiements_commissions(commission_detail_id);
CREATE INDEX IF NOT EXISTS idx_paiements_entreprise ON paiements_commissions(entreprise_id);
CREATE INDEX IF NOT EXISTS idx_paiements_date ON paiements_commissions(date_paiement);
CREATE INDEX IF NOT EXISTS idx_paiements_statut ON paiements_commissions(statut);

-- Index sur les relances
CREATE INDEX IF NOT EXISTS idx_relances_entreprise ON relances_paiement(entreprise_id);
CREATE INDEX IF NOT EXISTS idx_relances_statut ON relances_paiement(statut);
CREATE INDEX IF NOT EXISTS idx_relances_echeance ON relances_paiement(date_echeance_originale);
CREATE INDEX IF NOT EXISTS idx_relances_retard ON relances_paiement(jours_retard);

-- Index sur l'audit
CREATE INDEX IF NOT EXISTS idx_audit_financier_objet ON audit_financier(objet_type, objet_id);
CREATE INDEX IF NOT EXISTS idx_audit_financier_timestamp ON audit_financier(timestamp_action);
CREATE INDEX IF NOT EXISTS idx_audit_financier_utilisateur ON audit_financier(utilisateur);