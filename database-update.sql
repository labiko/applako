-- Script SQL pour ajouter la colonne hors_ligne à la table conducteurs
-- Exécuter dans Supabase SQL Editor

-- Ajouter la colonne hors_ligne (boolean, par défaut false = en ligne)
ALTER TABLE conducteurs 
ADD COLUMN IF NOT EXISTS hors_ligne BOOLEAN DEFAULT FALSE;

-- Mettre à jour tous les conducteurs existants pour être en ligne par défaut
UPDATE conducteurs 
SET hors_ligne = FALSE 
WHERE hors_ligne IS NULL;

-- Créer un index sur la colonne hors_ligne pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_conducteurs_hors_ligne ON conducteurs(hors_ligne);

-- Commentaire pour documenter la nouvelle colonne
COMMENT ON COLUMN conducteurs.hors_ligne IS 'Statut du conducteur: false = en ligne, true = hors ligne';