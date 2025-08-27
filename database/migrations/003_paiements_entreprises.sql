/**
 * MIGRATION 003 - SYSTÈME DE PAIEMENT DES ENTREPRISES
 * Création des tables pour gérer les paiements aux entreprises
 */

-- Table des paiements effectués aux entreprises
CREATE TABLE IF NOT EXISTS paiements_entreprises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entreprise_id UUID REFERENCES entreprises(id) ON DELETE CASCADE,
    periode_id UUID REFERENCES facturation_periodes(id) ON DELETE SET NULL,
    
    -- Détails du paiement
    montant_paye DECIMAL(12,2) NOT NULL CHECK (montant_paye > 0),
    methode_paiement TEXT NOT NULL CHECK (methode_paiement IN ('mobile_money', 'virement', 'especes')),
    reference_paiement TEXT, -- Référence transaction externe
    numero_beneficiaire TEXT, -- Numéro MM ou compte bancaire
    
    -- Détail de ce qui est payé (pour traçabilité)
    montant_reversement DECIMAL(12,2) DEFAULT 0, -- Paiement des reversements MM
    montant_compensation DECIMAL(12,2) DEFAULT 0, -- Compensation commissions cash
    
    -- Métadonnées
    statut TEXT DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'confirme', 'echec', 'annule')),
    date_paiement TIMESTAMP DEFAULT NOW(),
    date_confirmation TIMESTAMP,
    notes TEXT,
    raison_echec TEXT, -- En cas d'échec
    
    -- Balance avant/après pour audit
    balance_avant DECIMAL(12,2),
    balance_apres DECIMAL(12,2),
    
    -- Audit
    cree_par UUID, -- Référence vers auth.users si disponible
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_paiements_entreprises_entreprise ON paiements_entreprises(entreprise_id);
CREATE INDEX IF NOT EXISTS idx_paiements_entreprises_periode ON paiements_entreprises(periode_id);
CREATE INDEX IF NOT EXISTS idx_paiements_entreprises_statut ON paiements_entreprises(statut);
CREATE INDEX IF NOT EXISTS idx_paiements_entreprises_date ON paiements_entreprises(date_paiement);

-- Table historique des mouvements sur balance
CREATE TABLE IF NOT EXISTS mouvements_balance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entreprise_id UUID REFERENCES entreprises(id) ON DELETE CASCADE,
    paiement_id UUID REFERENCES paiements_entreprises(id) ON DELETE SET NULL,
    
    -- Détails mouvement
    type_mouvement TEXT NOT NULL CHECK (type_mouvement IN ('paiement', 'ajustement', 'annulation', 'correction')),
    montant DECIMAL(12,2) NOT NULL,
    balance_avant DECIMAL(12,2),
    balance_apres DECIMAL(12,2),
    
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index pour historique
CREATE INDEX IF NOT EXISTS idx_mouvements_balance_entreprise ON mouvements_balance(entreprise_id);
CREATE INDEX IF NOT EXISTS idx_mouvements_balance_paiement ON mouvements_balance(paiement_id);
CREATE INDEX IF NOT EXISTS idx_mouvements_balance_date ON mouvements_balance(created_at);

-- Trigger pour updated_at sur paiements_entreprises
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_paiements_entreprises_updated_at 
    BEFORE UPDATE ON paiements_entreprises 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Fonction pour récupérer les entreprises avec balance positive (qui ont droit à un paiement)
CREATE OR REPLACE FUNCTION get_entreprises_paiements_dus()
RETURNS TABLE (
    entreprise_id UUID,
    entreprise_nom TEXT,
    balance_courante DECIMAL(12,2),
    total_a_reverser DECIMAL(12,2),
    total_a_collecter DECIMAL(12,2),
    dernier_paiement_date TIMESTAMP,
    peut_payer BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.entreprise_id,
        e.nom as entreprise_nom,
        b.balance_courante,
        b.total_a_reverser,
        b.total_a_collecter,
        p.derniere_date,
        (b.balance_courante > 0) as peut_payer
    FROM balance_entreprises b
    INNER JOIN entreprises e ON e.id = b.entreprise_id
    LEFT JOIN (
        SELECT 
            entreprise_id,
            MAX(date_paiement) as derniere_date
        FROM paiements_entreprises 
        WHERE statut = 'confirme'
        GROUP BY entreprise_id
    ) p ON p.entreprise_id = b.entreprise_id
    WHERE b.balance_courante IS NOT NULL
    ORDER BY b.balance_courante DESC;
END;
$$ LANGUAGE plpgsql;

-- Vue pour les statistiques de paiement
CREATE OR REPLACE VIEW v_statistiques_paiements AS
SELECT 
    e.id as entreprise_id,
    e.nom as entreprise_nom,
    COUNT(p.id) as nombre_paiements,
    COALESCE(SUM(CASE WHEN p.statut = 'confirme' THEN p.montant_paye END), 0) as total_paye,
    COALESCE(SUM(CASE WHEN p.statut = 'en_attente' THEN p.montant_paye END), 0) as total_en_attente,
    MAX(CASE WHEN p.statut = 'confirme' THEN p.date_confirmation END) as dernier_paiement_confirme
FROM entreprises e
LEFT JOIN paiements_entreprises p ON p.entreprise_id = e.id
GROUP BY e.id, e.nom;

COMMENT ON TABLE paiements_entreprises IS 'Enregistre tous les paiements effectués aux entreprises';
COMMENT ON TABLE mouvements_balance IS 'Historique des mouvements sur les balances des entreprises';
COMMENT ON FUNCTION get_entreprises_paiements_dus() IS 'Retourne la liste des entreprises éligibles pour un paiement';
COMMENT ON VIEW v_statistiques_paiements IS 'Vue des statistiques de paiements par entreprise';