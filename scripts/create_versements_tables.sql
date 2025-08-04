-- Script de création des tables pour le système de versements
-- À exécuter dans votre base de données Supabase

-- 1. Table des versements
CREATE TABLE IF NOT EXISTS versements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conducteur_id UUID NOT NULL REFERENCES conducteurs(id) ON DELETE CASCADE,
  montant NUMERIC NOT NULL CHECK (montant > 0),
  date_versement TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  entreprise_id UUID NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
  reservation_ids UUID[] NOT NULL DEFAULT '{}', -- Array des IDs de réservations
  statut TEXT DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'verse', 'otp_envoye', 'bloque', 'annule')),
  otp_code VARCHAR(4), -- Code OTP à 4 chiffres
  otp_generated_at TIMESTAMP WITH TIME ZONE, -- Timestamp de génération de l'OTP
  otp_attempts INTEGER DEFAULT 0 CHECK (otp_attempts >= 0), -- Nombre de tentatives
  localisation_versement POINT, -- Coordonnées GPS
  adresse_versement TEXT, -- Adresse textuelle
  photo_versement TEXT, -- URL de la photo du versement
  signature_conducteur TEXT, -- Signature électronique (base64)
  commentaire TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_versements_conducteur_id ON versements(conducteur_id);
CREATE INDEX IF NOT EXISTS idx_versements_entreprise_id ON versements(entreprise_id);
CREATE INDEX IF NOT EXISTS idx_versements_statut ON versements(statut);
CREATE INDEX IF NOT EXISTS idx_versements_date_versement ON versements(date_versement);

-- 2. Table des logs SMS
CREATE TABLE IF NOT EXISTS sms_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  telephone VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  statut TEXT DEFAULT 'envoye' CHECK (statut IN ('envoye', 'echec', 'simule')),
  type_sms TEXT DEFAULT 'versement_otp' CHECK (type_sms IN ('versement_otp', 'reservation_otp', 'notification', 'confirmation_versement', 'notification_arrivee', 'notification_tour', 'alerte_anomalie')),
  reference_id UUID, -- ID du versement ou réservation
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour les logs SMS
CREATE INDEX IF NOT EXISTS idx_sms_logs_telephone ON sms_logs(telephone);
CREATE INDEX IF NOT EXISTS idx_sms_logs_type_sms ON sms_logs(type_sms);
CREATE INDEX IF NOT EXISTS idx_sms_logs_created_at ON sms_logs(created_at);

-- 3. Table des litiges de versement
CREATE TABLE IF NOT EXISTS litiges_versement (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  versement_id UUID NOT NULL REFERENCES versements(id) ON DELETE CASCADE,
  type_litige TEXT NOT NULL CHECK (type_litige IN ('montant_incorrect', 'otp_non_recu', 'conducteur_absent', 'fraude_suspectee', 'signature_manquante', 'photo_manquante')),
  description TEXT NOT NULL,
  statut TEXT DEFAULT 'ouvert' CHECK (statut IN ('ouvert', 'en_cours', 'resolu', 'ferme')),
  resolution TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  
  -- Contrainte : resolved_at doit être défini si statut = 'resolu'
  CONSTRAINT check_resolved_at CHECK (
    (statut IN ('ouvert', 'en_cours') AND resolved_at IS NULL) OR
    (statut IN ('resolu', 'ferme') AND resolved_at IS NOT NULL)
  )
);

-- Index pour les litiges
CREATE INDEX IF NOT EXISTS idx_litiges_versement_id ON litiges_versement(versement_id);
CREATE INDEX IF NOT EXISTS idx_litiges_statut ON litiges_versement(statut);
CREATE INDEX IF NOT EXISTS idx_litiges_type ON litiges_versement(type_litige);

-- 4. Table de la file d'attente des versements
CREATE TABLE IF NOT EXISTS file_attente_versements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conducteur_id UUID NOT NULL REFERENCES conducteurs(id) ON DELETE CASCADE,
  priorite TEXT DEFAULT 'normal' CHECK (priorite IN ('vip', 'normal', 'retard')),
  temps_arrivee TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  temps_attente_estime INTEGER DEFAULT 0 CHECK (temps_attente_estime >= 0), -- en minutes
  statut TEXT DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'en_cours', 'termine')),
  position_file INTEGER DEFAULT 1 CHECK (position_file > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour la file d'attente
CREATE INDEX IF NOT EXISTS idx_file_attente_conducteur_id ON file_attente_versements(conducteur_id);
CREATE INDEX IF NOT EXISTS idx_file_attente_statut ON file_attente_versements(statut);
CREATE INDEX IF NOT EXISTS idx_file_attente_position ON file_attente_versements(position_file);

-- 5. Ajout de la colonne versement_id dans la table reservations (si elle n'existe pas déjà)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'reservations' AND column_name = 'versement_id') THEN
        ALTER TABLE reservations ADD COLUMN versement_id UUID REFERENCES versements(id) ON DELETE SET NULL;
        CREATE INDEX idx_reservations_versement_id ON reservations(versement_id);
    END IF;
END $$;

-- 6. Fonction pour incrémenter les tentatives OTP (utilisée par le service)
CREATE OR REPLACE FUNCTION increment_otp_attempts(versement_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE versements 
    SET otp_attempts = otp_attempts + 1,
        updated_at = NOW()
    WHERE id = versement_id;
END;
$$ LANGUAGE plpgsql;

-- 7. Fonction pour calculer les statistiques de versement
CREATE OR REPLACE FUNCTION get_versement_stats(entreprise_uuid UUID, date_debut DATE DEFAULT CURRENT_DATE)
RETURNS TABLE(
    total_versements BIGINT,
    montant_total NUMERIC,
    nombre_conducteurs BIGINT,
    taux_succes NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(v.id) as total_versements,
        COALESCE(SUM(v.montant), 0) as montant_total,
        COUNT(DISTINCT v.conducteur_id) as nombre_conducteurs,
        ROUND(
            CASE 
                WHEN COUNT(v.id) > 0 THEN 
                    (COUNT(CASE WHEN v.statut = 'verse' THEN 1 END)::NUMERIC / COUNT(v.id)::NUMERIC) * 100
                ELSE 0 
            END, 2
        ) as taux_succes
    FROM versements v
    WHERE v.entreprise_id = entreprise_uuid
    AND DATE(v.created_at) = date_debut;
END;
$$ LANGUAGE plpgsql;

-- 8. Triggers pour mise à jour automatique des timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Appliquer le trigger aux tables concernées
DROP TRIGGER IF EXISTS update_versements_updated_at ON versements;
CREATE TRIGGER update_versements_updated_at
    BEFORE UPDATE ON versements
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_file_attente_updated_at ON file_attente_versements;
CREATE TRIGGER update_file_attente_updated_at
    BEFORE UPDATE ON file_attente_versements
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 9. RLS (Row Level Security) - À adapter selon vos besoins de sécurité
-- Activar RLS sur les tables
ALTER TABLE versements ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE litiges_versement ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_attente_versements ENABLE ROW LEVEL SECURITY;

-- Politique RLS basique (à adapter selon votre architecture d'authentification)
-- Cette politique permet l'accès complet aux utilisateurs authentifiés
-- Vous devrez probablement la modifier selon vos règles métier

CREATE POLICY "Versements accessible par entreprise" ON versements
    FOR ALL USING (true); -- À remplacer par votre logique d'entreprise

CREATE POLICY "SMS logs accessible par tous" ON sms_logs
    FOR ALL USING (true); -- À adapter selon vos besoins

CREATE POLICY "Litiges accessible par entreprise" ON litiges_versement
    FOR ALL USING (true); -- À adapter selon vos besoins

CREATE POLICY "File attente accessible par entreprise" ON file_attente_versements
    FOR ALL USING (true); -- À adapter selon vos besoins

-- 10. Insertion de données de test (optionnel)
-- Décommentez si vous voulez des données de test

/*
-- Données de test pour versements
INSERT INTO versements (conducteur_id, montant, entreprise_id, statut, commentaire) 
SELECT 
    c.id,
    50000 + (RANDOM() * 100000)::INTEGER,
    c.entreprise_id,
    'verse',
    'Versement de test'
FROM conducteurs c 
LIMIT 5;

-- Données de test SMS logs
INSERT INTO sms_logs (telephone, message, type_sms, statut)
VALUES 
    ('+33620951999', 'Code versement: 1234. Montant: 75000 GNF. LokoTaxi', 'versement_otp', 'simule'),
    ('+33123456789', 'Versement confirmé: 50000 GNF. Réf: VER-12345678. Merci! LokoTaxi', 'confirmation_versement', 'simule');
*/

-- Message de confirmation
DO $$
BEGIN
    RAISE NOTICE 'Tables de versements créées avec succès !';
    RAISE NOTICE 'Tables créées: versements, sms_logs, litiges_versement, file_attente_versements';
    RAISE NOTICE 'Colonne versement_id ajoutée à la table reservations';
    RAISE NOTICE 'Fonctions et triggers créés';
    RAISE NOTICE 'RLS activé - pensez à adapter les politiques selon vos besoins';
END $$;