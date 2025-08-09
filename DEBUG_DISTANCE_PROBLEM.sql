-- ========================================
-- DEBUG - PROBLÈME NOTIFICATION HORS ZONE
-- Le conducteur reçoit notification de Paris alors qu'il est à Lieusaint
-- ========================================

-- 1. VÉRIFIER LA POSITION EXACTE DU CONDUCTEUR
SELECT 
    id,
    nom,
    vehicle_type,
    hors_ligne,
    position_actuelle,
    ST_AsText(position_actuelle::geometry) as position_text,
    ST_X(position_actuelle::geometry) as longitude,
    ST_Y(position_actuelle::geometry) as latitude
FROM conducteurs 
WHERE id = '69e0cde9-14a0-4dde-86c1-1fe9a306f2fa';

-- 2. VÉRIFIER LES RÉSERVATIONS PARIS
SELECT 
    id,
    depart_nom,
    position_depart,
    ST_AsText(position_depart::geometry) as position_text,
    notified_at,
    created_at
FROM reservations 
WHERE depart_nom LIKE '%Gare de Lyon%'
ORDER BY created_at DESC;

-- 3. TESTER LA FONCTION find_nearby_conducteurs_by_vehicle DIRECTEMENT
-- Avec position Gare de Lyon
SELECT * FROM find_nearby_conducteurs_by_vehicle(
    'POINT(2.3734 48.8443)',  -- Gare de Lyon
    'moto',
    5  -- 5km
);

-- 4. CALCULER LA DISTANCE RÉELLE
SELECT 
    '69e0cde9-14a0-4dde-86c1-1fe9a306f2fa' as conducteur_id,
    'Lieusaint -> Gare Lyon' as trajet,
    ROUND(
        (ST_Distance(
            ST_GeomFromText('POINT(2.5891222 48.6277095)', 4326)::geography,  -- Lieusaint
            ST_GeomFromText('POINT(2.3734 48.8443)', 4326)::geography  -- Gare Lyon
        ) / 1000)::numeric, 
        2
    ) as distance_km_geography,
    ROUND(
        (ST_Distance(
            ST_GeomFromText('POINT(2.5891222 48.6277095)', 4326)::geometry,  -- Lieusaint
            ST_GeomFromText('POINT(2.3734 48.8443)', 4326)::geometry  -- Gare Lyon
        ) / 1000)::numeric, 
        2
    ) as distance_km_geometry;

-- 5. TEST ST_DWithin AVEC DIFFÉRENTS TYPES
SELECT 
    'Test Geography' as test_type,
    ST_DWithin(
        ST_GeomFromText('POINT(2.5891222 48.6277095)', 4326)::geography,  -- Lieusaint
        ST_GeomFromText('POINT(2.3734 48.8443)', 4326)::geography,  -- Gare Lyon
        5000  -- 5km en mètres
    ) as dans_5km
UNION ALL
SELECT 
    'Test Geometry' as test_type,
    ST_DWithin(
        ST_GeomFromText('POINT(2.5891222 48.6277095)', 4326)::geometry,
        ST_GeomFromText('POINT(2.3734 48.8443)', 4326)::geometry,
        5000  -- Attention: en geometry c'est en unités de projection!
    ) as dans_5km;

-- 6. VÉRIFIER TOUS LES CONDUCTEURS QUI ONT REÇU LA NOTIFICATION
SELECT 
    r.id as reservation_id,
    r.depart_nom,
    r.notified_at,
    c.id as conducteur_id,
    c.nom,
    ROUND(
        (ST_Distance(
            c.position_actuelle::geography,
            r.position_depart::geography
        ) / 1000)::numeric, 
        2
    ) as distance_reelle_km
FROM reservations r
CROSS JOIN conducteurs c
WHERE r.depart_nom LIKE '%Gare de Lyon%'
  AND c.id = '69e0cde9-14a0-4dde-86c1-1fe9a306f2fa'
  AND r.notified_at IS NOT NULL
ORDER BY r.created_at DESC;

-- 7. VOIR QUELLE FONCTION EST UTILISÉE
-- Vérifier le type de colonne
SELECT 
    column_name,
    data_type,
    udt_name
FROM information_schema.columns
WHERE table_name = 'conducteurs' 
  AND column_name = 'position_actuelle'
UNION ALL
SELECT 
    column_name,
    data_type,
    udt_name
FROM information_schema.columns
WHERE table_name = 'reservations' 
  AND column_name = 'position_depart';