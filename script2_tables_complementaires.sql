-- SCRIPT 2: TABLES COMPLEMENTAIRES
-- Executer apres le script 1

-- Table 4: Relances automatiques
CREATE TABLE IF NOT EXISTS relances_paiement (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    commission_detail_id UUID NOT NULL REFERENCES commissions_detail(id) ON DELETE CASCADE,
    entreprise_id UUID NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
    
    type_relance VARCHAR(30) NOT NULL CHECK (type_relance IN ('rappel_gentil', 'mise_en_demeure', 'suspension_service')),
    niveau_relance INTEGER NOT NULL DEFAULT 1,
    montant_du DECIMAL(15,2) NOT NULL,
    
    date_echeance_originale DATE NOT NULL,
    jours_retard INTEGER NOT NULL,
    date_relance DATE NOT NULL DEFAULT CURRENT_DATE,
    prochaine_relance DATE,
    
    statut VARCHAR(20) NOT NULL DEFAULT 'envoyee' CHECK (statut IN ('programmee', 'envoyee', 'lue', 'ignoree', 'resolue')),
    canal VARCHAR(20) NOT NULL DEFAULT 'email' CHECK (canal IN ('email', 'sms', 'notification', 'courrier')),
    message_envoye TEXT,
    
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
    
    objet_type VARCHAR(30) NOT NULL CHECK (objet_type IN ('periode', 'commission', 'paiement', 'relance')),
    objet_id UUID NOT NULL,
    
    action VARCHAR(50) NOT NULL,
    ancien_statut VARCHAR(50),
    nouveau_statut VARCHAR(50),
    
    ancien_montant DECIMAL(15,2),
    nouveau_montant DECIMAL(15,2),
    impact_financier DECIMAL(15,2),
    
    utilisateur VARCHAR(100) NOT NULL,
    motif TEXT,
    metadata JSONB DEFAULT '{}',
    
    timestamp_action TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);