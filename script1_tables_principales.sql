-- SCRIPT 1: CREATION DES TABLES FINANCIERES
-- Executer dans l'interface Supabase SQL Editor

-- Table 1: Periodes de facturation
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
    
    CONSTRAINT unique_periode UNIQUE (periode_debut, periode_fin),
    CONSTRAINT valid_periode CHECK (periode_fin > periode_debut)
);

-- Table 2: Detail des commissions par entreprise
CREATE TABLE IF NOT EXISTS commissions_detail (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    periode_id UUID NOT NULL REFERENCES facturation_periodes(id) ON DELETE CASCADE,
    entreprise_id UUID NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
    
    nombre_reservations INTEGER DEFAULT 0,
    chiffre_affaire_brut DECIMAL(15,2) DEFAULT 0,
    taux_commission_moyen DECIMAL(5,2) DEFAULT 0,
    montant_commission DECIMAL(15,2) DEFAULT 0,
    
    taux_global_utilise DECIMAL(5,2),
    taux_specifique_utilise DECIMAL(5,2),
    jours_taux_global INTEGER DEFAULT 0,
    jours_taux_specifique INTEGER DEFAULT 0,
    
    statut VARCHAR(20) NOT NULL DEFAULT 'calcule' CHECK (statut IN ('calcule', 'facture', 'paye', 'conteste')),
    date_calcul TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    date_facturation TIMESTAMP WITH TIME ZONE,
    date_paiement TIMESTAMP WITH TIME ZONE,
    
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_periode_entreprise UNIQUE (periode_id, entreprise_id),
    CONSTRAINT valid_amounts CHECK (
        chiffre_affaire_brut >= 0 AND 
        montant_commission >= 0 AND 
        montant_commission <= chiffre_affaire_brut
    ),
    CONSTRAINT check_taux_commission CHECK (taux_commission_moyen >= 0 AND taux_commission_moyen <= 100)
);

-- Table 3: Historique des paiements
CREATE TABLE IF NOT EXISTS paiements_commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    commission_detail_id UUID NOT NULL REFERENCES commissions_detail(id) ON DELETE CASCADE,
    periode_id UUID NOT NULL REFERENCES facturation_periodes(id) ON DELETE CASCADE,
    entreprise_id UUID NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
    
    montant_paye DECIMAL(15,2) NOT NULL,
    mode_paiement VARCHAR(50) NOT NULL DEFAULT 'virement' CHECK (mode_paiement IN ('virement', 'cheque', 'especes', 'mobile_money', 'compensation')),
    reference_paiement VARCHAR(100),
    
    date_paiement DATE NOT NULL,
    date_echeance DATE,
    date_enregistrement TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    statut VARCHAR(20) NOT NULL DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'valide', 'rejete', 'rembourse')),
    valide_par VARCHAR(100),
    date_validation TIMESTAMP WITH TIME ZONE,
    
    notes TEXT,
    justificatifs JSONB DEFAULT '[]',
    created_by VARCHAR(100) NOT NULL DEFAULT 'system',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_montant CHECK (montant_paye > 0)
);