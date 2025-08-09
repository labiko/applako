-- ========================================
-- DEBUG - QUELS CONDUCTEURS SONT TROUVÉS ?
-- ========================================

-- 1. VOIR LES 3 CONDUCTEURS TROUVÉS AVEC LEURS DISTANCES
SELECT 
    'Conducteurs trouvés pour Gare Lyon' as debug,
    c.id,
    c.nom,
    c.vehicle_type,
    ST_AsText(c.position_actuelle::geometry) as position_conducteur,
    ROUND((ST_Distance(
        c.position_actuelle,
        'POINT(2.3734 48.8443)'::geography
    ) / 1000)::numeric, 2) as distance_reelle_km
FROM find_nearby_conducteurs_by_vehicle(
    'POINT(2.3734 48.8443)',  -- Gare de Lyon
    'moto',
    5
) f
JOIN conducteurs c ON c.id = f.id;

-- 2. VÉRIFIER TOUS LES CONDUCTEURS MOTO ET LEURS DISTANCES
SELECT 
    c.id,
    c.nom,
    c.vehicle_type,
    c.hors_ligne,
    ST_AsText(c.position_actuelle::geometry) as position_text,
    ROUND((ST_Distance(
        c.position_actuelle,
        'POINT(2.3734 48.8443)'::geography
    ) / 1000)::numeric, 2) as distance_gare_lyon_km,
    ST_DWithin(
        c.position_actuelle,
        'POINT(2.3734 48.8443)'::geography,
        5000  -- 5km en mètres
    ) as dans_5km_geography,
    ST_DWithin(
        c.position_actuelle::geometry,
        'POINT(2.3734 48.8443)'::geometry,
        5000  -- PROBLÈME: en geometry c'est des degrés!
    ) as dans_5km_geometry_bug
FROM conducteurs c
WHERE c.vehicle_type = 'moto'
  AND c.hors_ligne = false
ORDER BY distance_gare_lyon_km;

-- 3. TEST DIRECT ST_DWithin 
SELECT 
    'Test position balde' as test,
    ST_DWithin(
        (SELECT position_actuelle FROM conducteurs WHERE id = '69e0cde9-14a0-4dde-86c1-1fe9a306f2fa'),
        'POINT(2.3734 48.8443)'::geography,
        5000
    ) as devrait_etre_false;

-- 4. VÉRIFIER LE CODE SOURCE DE LA FONCTION ACTUELLE
SELECT 
    proname as function_name,
    prosrc as source_code
FROM pg_proc
WHERE proname = 'find_nearby_conducteurs_by_vehicle';

-- 5. TEST SIMPLE - DISTANCE ENTRE 2 POINTS
SELECT 
    'Distance Lieusaint -> Gare Lyon' as calcul,
    ST_Distance(
        'POINT(2.5891222 48.6277095)'::geography,
        'POINT(2.3734 48.8443)'::geography
    ) as distance_metres,
    ST_Distance(
        'POINT(2.5891222 48.6277095)'::geography,
        'POINT(2.3734 48.8443)'::geography
    ) / 1000 as distance_km,
    ST_DWithin(
        'POINT(2.5891222 48.6277095)'::geography,
        'POINT(2.3734 48.8443)'::geography,
        5000
    ) as dans_5km_devrait_etre_false;