-- ===============================================
-- DEBUG LENGOPAY_CONFIG - VÉRIFICATIONS
-- ===============================================

-- 1. Vérifier si la table a été modifiée
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'lengopay_config' 
ORDER BY ordinal_position;

-- 2. Vérifier le contenu actuel de la table
SELECT 
    id,
    entreprise_id,
    provider_name,
    is_active,
    website_id,
    telephone_marchand,
    created_at
FROM lengopay_config
ORDER BY created_at DESC;

-- 3. Vérifier si l'entreprise "jakarta taxi express" existe
SELECT id, nom, proprietaire, is_active
FROM entreprises 
WHERE nom ILIKE '%jakarta%' OR nom ILIKE '%express%'
ORDER BY nom;

-- 4. Vérifier si cette entreprise a une configuration
SELECT 
    lc.*,
    e.nom as entreprise_nom
FROM lengopay_config lc
JOIN entreprises e ON e.id = lc.entreprise_id
WHERE e.id = '20100373-6776-4075-9f8e-a77da892cf67';

-- 5. Voir toutes les configurations avec noms d'entreprises
SELECT 
    lc.id,
    lc.entreprise_id,
    e.nom as entreprise_nom,
    lc.provider_name,
    lc.is_active,
    lc.website_id
FROM lengopay_config lc
LEFT JOIN entreprises e ON e.id = lc.entreprise_id
ORDER BY e.nom NULLS LAST;

-- 6. Vérifier s'il y a des orphelins (entreprise_id qui n'existent pas)
SELECT 
    lc.id,
    lc.entreprise_id,
    'ORPHELIN - Entreprise inexistante' as statut
FROM lengopay_config lc
LEFT JOIN entreprises e ON e.id = lc.entreprise_id
WHERE e.id IS NULL;