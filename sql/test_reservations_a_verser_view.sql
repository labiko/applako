-- Script de test pour la vue reservations_a_verser
-- EXÉCUTER APRÈS AVOIR CRÉÉ LA VUE

-- 1. Test basique - Compter les réservations à verser
SELECT COUNT(*) as total_reservations_a_verser
FROM reservations_a_verser;

-- 2. Test par mode de paiement - Vérifier la répartition Mobile Money vs Cash
SELECT 
    mode_paiement,
    COUNT(*) as nombre_reservations,
    SUM(prix_total) as montant_total
FROM reservations_a_verser
GROUP BY mode_paiement
ORDER BY mode_paiement;

-- 3. Test par entreprise - Vérifier les données par entreprise
SELECT 
    entreprise_id,
    COUNT(*) as nombre_reservations,
    COUNT(DISTINCT conducteur_id) as nombre_conducteurs,
    SUM(prix_total) as montant_total,
    AVG(prix_total) as prix_moyen
FROM reservations_a_verser
GROUP BY entreprise_id
ORDER BY montant_total DESC;

-- 4. Test détaillé - Aperçu des premières réservations
SELECT 
    SUBSTR(id, 1, 8) as reservation_id,
    conducteur_nom,
    conducteur_prenom,
    prix_total,
    mode_paiement,
    date_code_validation
FROM reservations_a_verser
ORDER BY date_code_validation DESC
LIMIT 10;

-- 5. Vérification de cohérence - Comparer avec l'ancienne méthode
-- (Réservations completed avec date_code_validation, sans versement_id)
SELECT 
    'Ancienne méthode' as methode,
    COUNT(*) as total
FROM reservations r
WHERE r.statut = 'completed'
    AND r.date_code_validation IS NOT NULL
    AND r.versement_id IS NULL

UNION ALL

SELECT 
    'Nouvelle vue' as methode,
    COUNT(*) as total
FROM reservations_a_verser;

-- 6. Test de performance - Mesurer le temps d'exécution
EXPLAIN ANALYZE
SELECT 
    conducteur_id,
    COUNT(*) as nombre_courses,
    SUM(prix_total) as montant_total,
    mode_paiement
FROM reservations_a_verser
GROUP BY conducteur_id, mode_paiement;

-- RÉSULTATS ATTENDUS:
-- ✅ La vue doit retourner les mêmes nombres que l'ancienne méthode
-- ✅ Le champ mode_paiement doit être 'mobile_money' ou 'cash'  
-- ✅ Les informations conducteur doivent être présentes
-- ✅ Performance acceptable (< 1 seconde pour quelques milliers de réservations)