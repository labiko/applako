-- ========================================
-- RÉSERVATION TEST - SAVIGNY-LE-TEMPLE
-- Distance de Lieusaint: ~8-10 km (HORS zone 5km)
-- ========================================

-- SAVIGNY-LE-TEMPLE - Position approximative
-- Latitude: 48.5967, Longitude: 2.5833
INSERT INTO reservations (
    client_phone, 
    depart_nom, 
    destination_nom,
    position_depart, 
    vehicle_type,
    statut,
    prix_total,
    created_at,
    updated_at
) VALUES (
    '+33678901234', 
    'TEST SAVIGNY - Gare RER Savigny-le-Temple', 
    'TEST SAVIGNY - Centre Commercial Carré Sénart',
    ST_GeomFromText('POINT(2.5833 48.5967)', 4326),  -- Savigny-le-Temple
    'moto',  -- Type véhicule balde
    'pending',
    35.00,
    NOW(),
    NOW()
);

-- VÉRIFIER LA RÉSERVATION CRÉÉE
SELECT 
    id,
    depart_nom,
    destination_nom,
    vehicle_type,
    statut,
    ST_AsText(position_depart::geometry) as position_readable,
    created_at
FROM reservations 
WHERE depart_nom LIKE 'TEST SAVIGNY%' 
ORDER BY created_at DESC 
LIMIT 1;

-- CALCULER DISTANCE DE BALDE VERS SAVIGNY
SELECT 
    'Distance Lieusaint → Savigny-le-Temple' as trajet,
    ROUND((ST_Distance(
        c.position_actuelle,  -- Position balde Lieusaint
        'POINT(2.5833 48.5967)'::geography  -- Savigny-le-Temple
    ) / 1000)::numeric, 2) as distance_km,
    CASE 
        WHEN ST_Distance(c.position_actuelle, 'POINT(2.5833 48.5967)'::geography) <= 5000 
        THEN '✅ Dans 5km - SERA visible dans app'
        ELSE '❌ Hors 5km - NE sera PAS visible'
    END as prediction_affichage
FROM conducteurs c
WHERE c.id = '69e0cde9-14a0-4dde-86c1-1fe9a306f2fa';

-- TESTER SI FONCTION RETOURNE CETTE RÉSERVATION
SELECT 
    'Test fonction avec Savigny' as test,
    COUNT(*) as nb_resultats,
    CASE 
        WHEN COUNT(*) > 0 THEN 'SERA visible dans app'
        ELSE 'NE sera PAS visible dans app'
    END as resultat_attendu
FROM get_reservations_nearby_conducteur(
    '69e0cde9-14a0-4dde-86c1-1fe9a306f2fa',
    5
) 
WHERE depart_nom LIKE 'TEST SAVIGNY%';

-- ========================================
-- RÉSULTATS ATTENDUS:
-- - Distance: ~8-10 km de Lieusaint
-- - Fonction: 0 résultat (hors 5km)
-- - App: Réservation NE doit PAS apparaître
-- ========================================