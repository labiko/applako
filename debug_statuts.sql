-- REQUÊTES DE DEBUG POUR LES STATUTS DES RÉSERVATIONS

-- 1. Compter les réservations par statut
SELECT 
    statut,
    COUNT(*) as nombre_reservations,
    ROUND((COUNT(*) * 100.0 / SUM(COUNT(*)) OVER()), 2) as pourcentage
FROM reservations 
GROUP BY statut 
ORDER BY COUNT(*) DESC;

-- 2. Voir les dernières réservations créées avec leurs statuts
SELECT 
    id,
    client_phone,
    depart_nom,
    destination_nom,
    statut,
    created_at,
    updated_at,
    date_code_validation
FROM reservations 
ORDER BY created_at DESC 
LIMIT 20;

-- 3. Statistiques générales des réservations
SELECT 
    COUNT(*) as total_reservations,
    COUNT(CASE WHEN statut = 'pending' THEN 1 END) as pending,
    COUNT(CASE WHEN statut = 'accepted' THEN 1 END) as accepted,
    COUNT(CASE WHEN statut = 'completed' THEN 1 END) as completed,
    COUNT(CASE WHEN statut = 'refused' THEN 1 END) as refused,
    COUNT(CASE WHEN statut = 'canceled' THEN 1 END) as canceled,
    COUNT(CASE WHEN statut = 'auto_canceled' THEN 1 END) as auto_canceled
FROM reservations;

-- 4. Vérifier s'il y a des réservations récentes avec différents statuts
SELECT 
    DATE(created_at) as date_creation,
    statut,
    COUNT(*) as nombre
FROM reservations 
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(created_at), statut
ORDER BY date_creation DESC, statut;

-- 5. Voir les réservations qui ont changé de statut récemment
SELECT 
    id,
    client_phone,
    statut,
    created_at,
    updated_at,
    (updated_at - created_at) as duree_avant_changement
FROM reservations 
WHERE updated_at > created_at
ORDER BY updated_at DESC 
LIMIT 15;

-- 6. Vérifier les valeurs possibles de statut dans la table
SELECT DISTINCT statut 
FROM reservations 
ORDER BY statut;

-- 7. Analyser les réservations par entreprise et statut
SELECT 
    e.nom as entreprise,
    r.statut,
    COUNT(*) as nombre
FROM reservations r
JOIN conducteurs c ON r.conducteur_id = c.id
JOIN entreprises e ON c.entreprise_id = e.id
GROUP BY e.nom, r.statut
ORDER BY e.nom, r.statut;

-- 8. Réservations des 48 dernières heures par statut
SELECT 
    statut,
    COUNT(*) as nombre,
    MIN(created_at) as plus_ancienne,
    MAX(created_at) as plus_recente
FROM reservations 
WHERE created_at >= NOW() - INTERVAL '48 hours'
GROUP BY statut
ORDER BY COUNT(*) DESC;