-- Script SQL pour ajouter la colonne accuracy à la table conducteurs
-- Exécuter dans Supabase SQL Editor

-- Ajouter la colonne accuracy (précision GPS en mètres)
ALTER TABLE conducteurs 
ADD COLUMN IF NOT EXISTS accuracy NUMERIC(8,2);

-- Créer un index sur la colonne accuracy pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_conducteurs_accuracy ON conducteurs(accuracy);

-- Commentaire pour documenter la nouvelle colonne
COMMENT ON COLUMN conducteurs.accuracy IS 'Précision de la position GPS en mètres (plus la valeur est petite, plus c''est précis)';