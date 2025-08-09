-- ========================================
-- DEBUG - POURQUOI RÉSERVATION PARIS VISIBLE POUR BALDE ?
-- ========================================

-- 1. VÉRIFIER POSITION EXACTE DE BALDE
SELECT 
    'Position balde' as info,
    id,
    nom,
    vehicle_type,
    ST_AsText(position_actuelle::geometry) as position_text,
    position_actuelle
FROM conducteurs 
WHERE id = '69e0cde9-14a0-4dde-86c1-1fe9a306f2fa';

-- 2. VÉRIFIER LA RÉSERVATION GARE DE LYON
SELECT 
    'Réservation Gare Lyon' as info,
    id,
    depart_nom,
    vehicle_type,
    position_depart,
    ST_AsText(position_depart::geometry) as position_text
FROM reservations 
WHERE depart_nom LIKE '%Gare de Lyon%'
  AND statut = 'pending'
ORDER BY created_at DESC
LIMIT 1;

-- 3. CALCULER DISTANCE RÉELLE
SELECT 
    'Distance réelle' as calcul,
    ROUND((ST_Distance(
        c.position_actuelle,
        r.position_depart::geography
    ) / 1000)::numeric, 2) as distance_km,
    CASE 
        WHEN ST_Distance(c.position_actuelle, r.position_depart::geography) <= 5000 
        THEN '❌ ERREUR - Dans 5km selon fonction'
        ELSE '✅ OK - Hors 5km'
    END as diagnostic
FROM conducteurs c
CROSS JOIN reservations r
WHERE c.id = '69e0cde9-14a0-4dde-86c1-1fe9a306f2fa'
  AND r.depart_nom LIKE '%Gare de Lyon%'
  AND r.statut = 'pending'
ORDER BY r.created_at DESC
LIMIT 1;

-- 4. TESTER FONCTION DIRECTEMENT AVEC GARE DE LYON
SELECT 
    'Test fonction avec Gare Lyon' as test,
    COUNT(*) as nb_resultats,
    CASE 
        WHEN COUNT(*) > 0 THEN '❌ ERREUR - Fonction retourne des résultats'
        ELSE '✅ OK - Fonction ne retourne rien'
    END as diagnostic
FROM get_reservations_nearby_conducteur(
    '69e0cde9-14a0-4dde-86c1-1fe9a306f2fa',
    5
) 
WHERE depart_nom LIKE '%Gare de Lyon%';

-- 5. DÉTAIL DE CE QUE RETOURNE LA FONCTION
SELECT 
    'Détail fonction' as info,
    f.*,
    CASE 
        WHEN f.distance_km <= 5 THEN '❌ ERREUR - Distance <= 5km'
        ELSE '✅ OK - Distance > 5km'
    END as analyse_distance
FROM get_reservations_nearby_conducteur(
    '69e0cde9-14a0-4dde-86c1-1fe9a306f2fa',
    5
) f
ORDER BY f.distance_km;

-- 6. VÉRIFIER SI FALLBACK EST UTILISÉ
-- Regardez les logs de l'app pour voir si "Error fetching reservations (legacy)" apparaît