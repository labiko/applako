-- ========================================
-- VÉRIFICATION COMPLÈTE DES RÉSULTATS
-- ========================================

-- REQUÊTE 4 - DIAGNOSTIC
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

-- REQUÊTE 5 - QUI EST RETOURNÉ PAR LA FONCTION ?
SELECT 
    'Conducteurs retournés pour Gare de Lyon' as info,
    f.id,
    c.nom,
    f.distance_km,
    '✅ Ces conducteurs DEVRAIENT recevoir la notification' as expected
FROM find_nearby_conducteurs_by_vehicle(
    'POINT(2.3734 48.8443)',  -- Gare de Lyon
    'moto',
    5
) f
JOIN conducteurs c ON c.id = f.id
ORDER BY f.distance_km;

-- IMPORTANT: VÉRIFIER LES LOGS DU BACKEND
-- Appelez: /Taxi/ProcessPendingReservationNotifications
-- Et regardez dans la réponse JSON:
-- 1. "👥 X conducteur(s) moto trouvé(s) dans 5km" - Combien?
-- 2. "📱 Notification envoyée à XXX" - À qui?
-- 
-- Si les logs montrent:
-- "👥 3 conducteur(s)" mais balde reçoit quand même
-- = Problème OneSignal ou External User ID