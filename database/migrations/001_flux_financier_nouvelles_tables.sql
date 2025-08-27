-- =====================================================
-- MIGRATION 001 : FLUX FINANCIER - NOUVELLES TABLES
-- Date : 2025-08-27
-- Description : Ajout des tables pour gérer le flux financier Mobile Money vs Cash
-- SANS RÉGRESSION : Ces tables sont nouvelles, aucun impact sur l'existant
-- =====================================================

-- 1. Table pour gérer les reversements Mobile Money aux entreprises
CREATE TABLE IF NOT EXISTS reversements_entreprises (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  periode_id UUID NOT NULL REFERENCES facturation_periodes(id) ON DELETE CASCADE,
  entreprise_id UUID NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
  commission_detail_id UUID REFERENCES commissions_detail(id) ON DELETE CASCADE,
  
  -- Montants financiers
  montant_mobile_money_encaisse NUMERIC(15,2) NOT NULL DEFAULT 0,
  taux_commission_applique NUMERIC(5,2) NOT NULL, -- Taux utilisé pour cette période
  montant_commission_retenue NUMERIC(15,2) NOT NULL DEFAULT 0,
  montant_a_reverser NUMERIC(15,2) NOT NULL DEFAULT 0,
  montant_verse NUMERIC(15,2) DEFAULT 0,
  
  -- Statut et suivi
  statut VARCHAR(50) DEFAULT 'en_attente' 
    CHECK (statut IN ('en_attente', 'programme', 'verse', 'confirme', 'annule')),
  date_programmation TIMESTAMP,
  date_versement TIMESTAMP,
  reference_versement VARCHAR(255),
  
  -- Métadonnées
  mode_versement VARCHAR(50), -- virement, mobile_money, etc.
  notes TEXT,
  created_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Contraintes
  CONSTRAINT uk_reversement_periode_entreprise UNIQUE (periode_id, entreprise_id)
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_reversements_entreprise ON reversements_entreprises(entreprise_id);
CREATE INDEX IF NOT EXISTS idx_reversements_periode ON reversements_entreprises(periode_id);
CREATE INDEX IF NOT EXISTS idx_reversements_statut ON reversements_entreprises(statut);


-- 2. Table pour tracker les commissions cash à collecter
CREATE TABLE IF NOT EXISTS collectes_commissions_cash (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  periode_id UUID NOT NULL REFERENCES facturation_periodes(id) ON DELETE CASCADE,
  entreprise_id UUID NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
  commission_detail_id UUID REFERENCES commissions_detail(id) ON DELETE CASCADE,
  
  -- Montants
  ca_cash_total NUMERIC(15,2) NOT NULL DEFAULT 0, -- CA total en espèces
  taux_commission_applique NUMERIC(5,2) NOT NULL, -- Taux utilisé
  montant_du NUMERIC(15,2) NOT NULL DEFAULT 0, -- Commission totale sur cash
  montant_collecte NUMERIC(15,2) DEFAULT 0, -- Ce qui a été payé
  solde_restant NUMERIC(15,2) GENERATED ALWAYS AS (montant_du - montant_collecte) STORED,
  
  -- Statut et dates
  statut VARCHAR(50) DEFAULT 'en_attente' 
    CHECK (statut IN ('en_attente', 'partiel', 'collecte', 'compense', 'annule')),
  date_echeance DATE,
  date_derniere_collecte TIMESTAMP,
  nombre_relances INTEGER DEFAULT 0,
  
  -- Traçabilité paiements
  historique_paiements JSONB DEFAULT '[]'::jsonb,
  mode_paiement VARCHAR(50),
  reference_paiement VARCHAR(255),
  
  -- Métadonnées
  notes TEXT,
  created_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Contraintes
  CONSTRAINT uk_collecte_periode_entreprise UNIQUE (periode_id, entreprise_id)
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_collectes_entreprise ON collectes_commissions_cash(entreprise_id);
CREATE INDEX IF NOT EXISTS idx_collectes_periode ON collectes_commissions_cash(periode_id);
CREATE INDEX IF NOT EXISTS idx_collectes_statut ON collectes_commissions_cash(statut);


-- 3. Table pour la balance temps réel par entreprise
CREATE TABLE IF NOT EXISTS balance_entreprises (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  entreprise_id UUID NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE UNIQUE,
  
  -- Cumuls financiers
  total_a_reverser NUMERIC(15,2) DEFAULT 0, -- Total dû par admin
  total_a_collecter NUMERIC(15,2) DEFAULT 0, -- Total dû par entreprise
  balance_courante NUMERIC(15,2) DEFAULT 0, -- Négatif = entreprise doit, Positif = admin doit
  
  -- Détail par type
  total_mobile_money_encaisse NUMERIC(15,2) DEFAULT 0,
  total_commissions_mobile_money NUMERIC(15,2) DEFAULT 0,
  total_ca_cash NUMERIC(15,2) DEFAULT 0,
  total_commissions_cash NUMERIC(15,2) DEFAULT 0,
  
  -- Statistiques
  nombre_periodes_traitees INTEGER DEFAULT 0,
  derniere_periode_id UUID REFERENCES facturation_periodes(id),
  date_derniere_mise_a_jour TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Alertes
  alerte_solde_eleve BOOLEAN DEFAULT FALSE,
  montant_alerte NUMERIC(15,2) DEFAULT 1000000, -- Seuil d'alerte
  
  -- Métadonnées
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_balance_entreprise ON balance_entreprises(entreprise_id);
CREATE INDEX IF NOT EXISTS idx_balance_alerte ON balance_entreprises(alerte_solde_eleve) WHERE alerte_solde_eleve = TRUE;


-- 4. Table d'historique des mouvements financiers (audit trail)
CREATE TABLE IF NOT EXISTS mouvements_financiers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  entreprise_id UUID NOT NULL REFERENCES entreprises(id),
  periode_id UUID REFERENCES facturation_periodes(id),
  
  -- Type et montant
  type_mouvement VARCHAR(50) NOT NULL 
    CHECK (type_mouvement IN ('reversement_mm', 'collecte_cash', 'compensation', 'ajustement')),
  montant NUMERIC(15,2) NOT NULL,
  sens VARCHAR(10) NOT NULL CHECK (sens IN ('debit', 'credit')),
  
  -- Balance
  balance_avant NUMERIC(15,2),
  balance_apres NUMERIC(15,2),
  
  -- Référence
  reference_operation VARCHAR(255),
  document_reference UUID, -- Lien vers reversement ou collecte
  
  -- Métadonnées
  description TEXT,
  created_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_mouvements_entreprise ON mouvements_financiers(entreprise_id);
CREATE INDEX IF NOT EXISTS idx_mouvements_date ON mouvements_financiers(created_at DESC);


-- =====================================================
-- TRIGGERS POUR MISE À JOUR AUTOMATIQUE
-- =====================================================

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Appliquer le trigger à toutes les nouvelles tables
CREATE TRIGGER update_reversements_updated_at 
  BEFORE UPDATE ON reversements_entreprises 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_collectes_updated_at 
  BEFORE UPDATE ON collectes_commissions_cash 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_balance_updated_at 
  BEFORE UPDATE ON balance_entreprises 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- =====================================================
-- COMMENTAIRES POUR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE reversements_entreprises IS 'Gestion des reversements Mobile Money aux entreprises après déduction commission';
COMMENT ON TABLE collectes_commissions_cash IS 'Suivi des commissions dues par les entreprises sur paiements cash';
COMMENT ON TABLE balance_entreprises IS 'Balance financière temps réel entre admin et entreprises';
COMMENT ON TABLE mouvements_financiers IS 'Historique détaillé de tous les mouvements financiers pour audit';

-- =====================================================
-- FIN DE LA MIGRATION 001
-- =====================================================