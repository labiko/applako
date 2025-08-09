-- ========================================
-- DEBUG - POURQUOI BALDE REÇOIT NOTIFICATION DE PARIS ?
-- ========================================

-- 1. VÉRIFIER LA POSITION EXACTE DE BALDE
SELECT 
    id,
    nom,
    telephone,
    vehicle_type,
    hors_ligne,
    position_actuelle,
    ST_AsText(position_actuelle::geometry) as position_text,
    ROUND((ST_Distance(
        position_actuelle,
        'POINT(2.3734 48.8443)'::geography  -- Gare de Lyon
    ) / 1000)::numeric, 2) as distance_gare_lyon_km,
    CASE 
        WHEN ST_DWithin(position_actuelle, 'POINT(2.3734 48.8443)'::geography, 5000)
        THEN '❌ PROBLÈME - Dans 5km (ne devrait pas)'
        ELSE '✅ OK - Hors 5km'
    END as statut_5km
FROM conducteurs 
WHERE id = '69e0cde9-14a0-4dde-86c1-1fe9a306f2fa';

-- 2. VÉRIFIER LA RÉSERVATION GARE DE LYON
SELECT 
    id,
    depart_nom,
    position_depart,
    vehicle_type,
    statut,
    notified_at,
    CASE 
        WHEN notified_at IS NOT NULL THEN '⚠️ Marquée comme notifiée'
        ELSE 'Non notifiée'
    END as statut_notification
FROM reservations 
WHERE depart_nom LIKE '%Gare de Lyon%'
ORDER BY created_at DESC
LIMIT 1;

-- 3. TEST DIRECT DE LA FONCTION AVEC GARE DE LYON
SELECT 
    'Test fonction find_nearby_conducteurs_by_vehicle' as test,
    *
FROM find_nearby_conducteurs_by_vehicle(
    'POINT(2.3734 48.8443)',  -- Gare de Lyon
    'moto',
    5
)
WHERE id = '69e0cde9-14a0-4dde-86c1-1fe9a306f2fa';  -- Filtre sur balde

-- 4. VÉRIFIER SI BALDE EST DANS LES RÉSULTATS DE LA FONCTION
WITH fonction_result AS (
    SELECT * FROM find_nearby_conducteurs_by_vehicle(
        'POINT(2.3734 48.8443)',  -- Gare de Lyon
        'moto',
        5
    )
)
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM fonction_result WHERE id = '69e0cde9-14a0-4dde-86c1-1fe9a306f2fa')
        THEN '❌ PROBLÈME: Balde est dans les résultats de la fonction'
        ELSE '✅ OK: Balde n''est PAS dans les résultats'
    END as diagnostic;

-- 5. VOIR TOUS LES CONDUCTEURS QUE LA FONCTION RETOURNE
SELECT 
    'Conducteurs retournés par la fonction' as info,
    f.*,
    c.nom
FROM find_nearby_conducteurs_by_vehicle(
    'POINT(2.3734 48.8443)',  -- Gare de Lyon
    'moto',
    5
) f
JOIN conducteurs c ON c.id = f.id
ORDER BY f.distance_km;

-- 6. VÉRIFIER LES LOGS DE NOTIFICATION (si vous avez une table de logs)
-- Voir si balde a vraiment été inclus dans le processus

-- 7. HYPOTHÈSE: Y a-t-il eu confusion avec un autre conducteur ?
SELECT 
    'Tous les conducteurs moto actifs' as liste,
    id,
    nom,
    ST_AsText(position_actuelle::geometry) as position,
    ROUND((ST_Distance(
        position_actuelle,
        'POINT(2.3734 48.8443)'::geography
    ) / 1000)::numeric, 2) as distance_km
FROM conducteurs
WHERE vehicle_type = 'moto'
  AND hors_ligne = false
ORDER BY distance_km;