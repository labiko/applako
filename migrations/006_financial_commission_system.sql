-- ================================================
-- MIGRATION 006: SYSTÈME FINANCIER DE GESTION DES COMMISSIONS
-- ================================================
-- Création des tables pour le suivi des paiements de commissions
-- Basé sur le plan détaillé dans PLAN-FINANCIAL-COMMISSION-SYSTEM.md

-- Table 1: Périodes de facturation
CREATE TABLE IF NOT EXISTS facturation_periodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    periode_debut DATE NOT NULL,
    periode_fin DATE NOT NULL,
    statut VARCHAR(20) NOT NULL DEFAULT 'en_cours' CHECK (statut IN ('en_cours', 'cloturee', 'facturee', 'payee')),
    total_commissions DECIMAL(15,2) DEFAULT 0,
    total_facture DECIMAL(15,2) DEFAULT 0,
    nombre_entreprises INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Contraintes
    CONSTRAINT unique_periode UNIQUE (periode_debut, periode_fin),
    CONSTRAINT valid_periode CHECK (periode_fin > periode_debut)
);

-- Table 2: Détail des commissions par entreprise et période
CREATE TABLE IF NOT EXISTS commissions_detail (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    periode_id UUID NOT NULL REFERENCES facturation_periodes(id) ON DELETE CASCADE,
    entreprise_id UUID NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
    
    -- Métriques de la période
    nombre_reservations INTEGER DEFAULT 0,
    chiffre_affaire_brut DECIMAL(15,2) DEFAULT 0,
    taux_commission_moyen DECIMAL(5,2) DEFAULT 0,
    montant_commission DECIMAL(15,2) DEFAULT 0,
    
    -- Détails des taux utilisés
    taux_global_utilise DECIMAL(5,2),
    taux_specifique_utilise DECIMAL(5,2),
    jours_taux_global INTEGER DEFAULT 0,
    jours_taux_specifique INTEGER DEFAULT 0,
    
    -- Statut et tracking
    statut VARCHAR(20) NOT NULL DEFAULT 'calcule' CHECK (statut IN ('calcule', 'facture', 'paye', 'conteste')),
    date_calcul TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    date_facturation TIMESTAMP WITH TIME ZONE,
    date_paiement TIMESTAMP WITH TIME ZONE,
    
    -- Métadonnées
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Contraintes
    CONSTRAINT unique_periode_entreprise UNIQUE (periode_id, entreprise_id),
    CONSTRAINT valid_amounts CHECK (
        chiffre_affaire_brut >= 0 AND 
        montant_commission >= 0 AND 
        montant_commission <= chiffre_affaire_brut
    )
);

-- Table 3: Historique des paiements
CREATE TABLE IF NOT EXISTS paiements_commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    commission_detail_id UUID NOT NULL REFERENCES commissions_detail(id) ON DELETE CASCADE,
    periode_id UUID NOT NULL REFERENCES facturation_periodes(id) ON DELETE CASCADE,
    entreprise_id UUID NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
    
    -- Informations du paiement
    montant_paye DECIMAL(15,2) NOT NULL,
    mode_paiement VARCHAR(50) NOT NULL DEFAULT 'virement' CHECK (mode_paiement IN ('virement', 'cheque', 'especes', 'mobile_money', 'compensation')),
    reference_paiement VARCHAR(100),
    
    -- Dates importantes
    date_paiement DATE NOT NULL,
    date_echeance DATE,
    date_enregistrement TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Statut et validation
    statut VARCHAR(20) NOT NULL DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'valide', 'rejete', 'rembourse')),
    valide_par VARCHAR(100),
    date_validation TIMESTAMP WITH TIME ZONE,
    
    -- Informations complémentaires
    notes TEXT,
    justificatifs JSONB DEFAULT '[]',
    created_by VARCHAR(100) NOT NULL DEFAULT 'system',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Contraintes
    CONSTRAINT valid_montant CHECK (montant_paye > 0)
);

-- Table 4: Relances automatiques
CREATE TABLE IF NOT EXISTS relances_paiement (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    commission_detail_id UUID NOT NULL REFERENCES commissions_detail(id) ON DELETE CASCADE,
    entreprise_id UUID NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
    
    -- Type et niveau de relance
    type_relance VARCHAR(30) NOT NULL CHECK (type_relance IN ('rappel_gentil', 'mise_en_demeure', 'suspension_service')),
    niveau_relance INTEGER NOT NULL DEFAULT 1,
    montant_du DECIMAL(15,2) NOT NULL,
    
    -- Dates
    date_echeance_originale DATE NOT NULL,
    jours_retard INTEGER NOT NULL,
    date_relance DATE NOT NULL DEFAULT CURRENT_DATE,
    prochaine_relance DATE,
    
    -- Statut et contenu
    statut VARCHAR(20) NOT NULL DEFAULT 'envoyee' CHECK (statut IN ('programmee', 'envoyee', 'lue', 'ignoree', 'resolue')),
    canal VARCHAR(20) NOT NULL DEFAULT 'email' CHECK (canal IN ('email', 'sms', 'notification', 'courrier')),
    message_envoye TEXT,
    
    -- Suivi des actions
    action_entreprise TEXT,
    date_reponse TIMESTAMP WITH TIME ZONE,
    resolu_par VARCHAR(100),
    date_resolution TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table 5: Audit financier
CREATE TABLE IF NOT EXISTS audit_financier (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Référence de l'objet audité
    objet_type VARCHAR(30) NOT NULL CHECK (objet_type IN ('periode', 'commission', 'paiement', 'relance')),
    objet_id UUID NOT NULL,
    
    -- Action effectuée
    action VARCHAR(50) NOT NULL,
    ancien_statut VARCHAR(50),
    nouveau_statut VARCHAR(50),
    
    -- Détails financiers
    ancien_montant DECIMAL(15,2),
    nouveau_montant DECIMAL(15,2),
    impact_financier DECIMAL(15,2),
    
    -- Contexte
    utilisateur VARCHAR(100) NOT NULL,
    motif TEXT,
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    timestamp_action TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- INDEX POUR OPTIMISER LES PERFORMANCES
-- ================================================

-- Index sur les périodes
CREATE INDEX IF NOT EXISTS idx_facturation_periodes_dates ON facturation_periodes(periode_debut, periode_fin);
CREATE INDEX IF NOT EXISTS idx_facturation_periodes_statut ON facturation_periodes(statut);

-- Index sur les commissions détail
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

-- CONTRAINTES DE DONNÉES
-- ================================================

-- Assurer la cohérence des montants dans commissions_detail
ALTER TABLE commissions_detail 
ADD CONSTRAINT check_taux_commission 
CHECK (taux_commission_moyen >= 0 AND taux_commission_moyen <= 100);

-- Assurer que les paiements ne dépassent pas le montant dû
-- (sera vérifié par trigger)

-- TRIGGERS POUR LES TIMESTAMPS
-- ================================================

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

-- DONNÉES D'INITIALISATION
-- ================================================

-- Créer la première période (mois courant)
INSERT INTO facturation_periodes (periode_debut, periode_fin, statut)
VALUES (
    DATE_TRUNC('month', CURRENT_DATE),
    DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day',
    'en_cours'
) ON CONFLICT (periode_debut, periode_fin) DO NOTHING;

-- MESSAGE DE CONFIRMATION
DO $$
BEGIN
    RAISE NOTICE 'Migration 006: Système financier de gestion des commissions créé avec succès';
    RAISE NOTICE '- 5 tables principales créées';
    RAISE NOTICE '- Index de performance ajoutés';
    RAISE NOTICE '- Triggers de mise à jour automatique activés';
    RAISE NOTICE '- Première période de facturation initialisée';
END $$;