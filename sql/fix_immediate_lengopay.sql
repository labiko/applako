-- ===============================================
-- CORRECTION IMMÉDIATE LENGOPAY_CONFIG
-- Corriger l'entreprise_id pour pointer vers la bonne entreprise
-- ===============================================

-- 1. Identifier le problème actuel
SELECT 
    lc.id,
    lc.entreprise_id as current_wrong_id,
    lc.website_id,
    'Cette config doit être associée à quelle entreprise ?' as question
FROM lengopay_config lc
WHERE lc.id = '18d1b7b1-d04c-4ca6-b88c-e60a6226d2b6';

-- 2. Voir toutes les entreprises pour identifier la bonne
SELECT 
    id,
    nom,
    proprietaire,
    is_active
FROM entreprises
ORDER BY nom;

-- 3. CORRECTION MANUELLE
-- Associer cette config à l'entreprise "jakarta taxi express"
UPDATE lengopay_config 
SET entreprise_id = '20100373-6776-4075-9f8e-a77da892cf67'
WHERE id = '18d1b7b1-d04c-4ca6-b88c-e60a6226d2b6';

-- 4. Vérifier la correction
SELECT 
    lc.id,
    lc.entreprise_id,
    e.nom as entreprise_nom,
    lc.provider_name,
    lc.website_id,
    lc.telephone_marchand
FROM lengopay_config lc
JOIN entreprises e ON e.id = lc.entreprise_id
WHERE lc.id = '18d1b7b1-d04c-4ca6-b88c-e60a6226d2b6';

-- 5. Alternative: Si vous ne savez pas quelle entreprise utilise cette config
-- Supprimer et laisser l'utilisateur la recréer
-- DELETE FROM lengopay_config WHERE id = '18d1b7b1-d04c-4ca6-b88c-e60a6226d2b6';