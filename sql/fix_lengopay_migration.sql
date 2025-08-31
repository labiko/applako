-- ===============================================
-- CORRECTION MIGRATION LENGOPAY_CONFIG
-- Si reservation_id pointait vers reservations.id
-- ===============================================

-- ÉTAPE 1: Vérifier le problème
-- Voir si les entreprise_id actuels correspondent à des réservations
SELECT 
    lc.id as config_id,
    lc.entreprise_id as current_entreprise_id,
    r.id as reservation_id,
    r.conducteur_id,
    'PROBLÈME: entreprise_id pointe vers une réservation' as diagnostic
FROM lengopay_config lc
JOIN reservations r ON r.id = lc.entreprise_id::uuid;

-- ÉTAPE 2: Si le diagnostic confirme le problème, corriger les données
-- Mettre à jour entreprise_id avec le bon ID d'entreprise via conducteur

-- D'abord, sauvegarder l'ancienne valeur
ALTER TABLE lengopay_config ADD COLUMN old_reservation_id UUID;
UPDATE lengopay_config SET old_reservation_id = entreprise_id;

-- Ensuite, corriger en récupérant l'entreprise via conducteur
UPDATE lengopay_config lc
SET entreprise_id = c.entreprise_id
FROM reservations r
JOIN conducteurs c ON c.id = r.conducteur_id
WHERE r.id = lc.old_reservation_id::uuid;

-- ÉTAPE 3: Vérifier la correction
SELECT 
    lc.id,
    lc.old_reservation_id,
    lc.entreprise_id as new_entreprise_id,
    e.nom as entreprise_nom,
    lc.website_id
FROM lengopay_config lc
JOIN entreprises e ON e.id = lc.entreprise_id
ORDER BY e.nom;

-- ÉTAPE 4: Si tout est OK, supprimer la colonne temporaire
-- ALTER TABLE lengopay_config DROP COLUMN old_reservation_id;

-- ===============================================
-- ALTERNATIVE: Recréation complète si nécessaire
-- ===============================================

-- Si la correction automatique échoue, recréer manuellement
-- en associant les configs existantes aux bonnes entreprises

-- Voir les configurations orphelines à réassigner
SELECT 
    lc.*,
    'À réassigner manuellement' as action
FROM lengopay_config lc
LEFT JOIN entreprises e ON e.id = lc.entreprise_id
WHERE e.id IS NULL;