-- Script SQL pour ajouter la colonne date_inscription à la table conducteurs
-- Exécuter dans Supabase SQL Editor

-- Ajouter la colonne date_inscription (timestamp avec timezone)
ALTER TABLE conducteurs 
ADD COLUMN IF NOT EXISTS date_inscription TIMESTAMPTZ DEFAULT NOW();

-- Mettre à jour tous les conducteurs existants sans date_inscription
UPDATE conducteurs 
SET date_inscription = created_at 
WHERE date_inscription IS NULL AND created_at IS NOT NULL;

-- Si pas de created_at, utiliser une date par défaut (début 2023)
UPDATE conducteurs 
SET date_inscription = '2023-01-01T00:00:00Z'
WHERE date_inscription IS NULL;

-- Créer un index sur la colonne date_inscription pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_conducteurs_date_inscription ON conducteurs(date_inscription);

-- Commentaire pour documenter la nouvelle colonne
COMMENT ON COLUMN conducteurs.date_inscription IS 'Date d''inscription du conducteur (avec timezone)';