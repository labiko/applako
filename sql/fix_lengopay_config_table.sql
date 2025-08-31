-- ===============================================
-- CORRECTION TABLE LENGOPAY_CONFIG
-- Remplacer reservation_id par entreprise_id
-- ===============================================

-- 1. Ajouter la nouvelle colonne entreprise_id avec référence vers entreprises
ALTER TABLE lengopay_config 
ADD COLUMN entreprise_id UUID;

-- 2. Ajouter la contrainte de clé étrangère vers la table entreprises
ALTER TABLE lengopay_config
ADD CONSTRAINT fk_lengopay_config_entreprise 
FOREIGN KEY (entreprise_id) REFERENCES entreprises(id) ON DELETE CASCADE;

-- 3. Migrer les données existantes (si reservation_id contenait en fait des entreprise_id)
UPDATE lengopay_config 
SET entreprise_id = reservation_id
WHERE reservation_id IS NOT NULL;

-- 4. Supprimer l'ancienne colonne reservation_id
ALTER TABLE lengopay_config 
DROP COLUMN reservation_id;

-- 5. Ajouter un index sur entreprise_id pour les performances
CREATE INDEX idx_lengopay_config_entreprise_id ON lengopay_config(entreprise_id);

-- 6. Ajouter contrainte unique pour éviter plusieurs configs par entreprise
ALTER TABLE lengopay_config
ADD CONSTRAINT unique_entreprise_provider 
UNIQUE (entreprise_id, provider_name, is_active);

-- ===============================================
-- VÉRIFICATION DE LA STRUCTURE
-- ===============================================

-- Vérifier la nouvelle structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'lengopay_config' 
ORDER BY ordinal_position;

-- Vérifier les contraintes
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'lengopay_config';

-- Afficher les données migrées
SELECT 
    lc.id,
    lc.entreprise_id,
    e.nom as entreprise_nom,
    lc.provider_name,
    lc.is_active,
    lc.website_id,
    lc.telephone_marchand
FROM lengopay_config lc
LEFT JOIN entreprises e ON e.id = lc.entreprise_id
ORDER BY e.nom;