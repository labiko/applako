-- ========================================
-- FIX - CORRIGER LA FONCTION POUR UTILISER GEOGRAPHY
-- Le problème: geometry utilise des degrés, pas des mètres!
-- ========================================

-- FONCTION CORRIGÉE AVEC GEOGRAPHY (calcul en mètres)
CREATE OR REPLACE FUNCTION find_nearby_conducteurs_by_vehicle(
    p_position_depart TEXT,
    p_vehicle_type TEXT DEFAULT 'voiture',
    p_max_distance_km INTEGER DEFAULT 5
)
RETURNS TABLE(
    id UUID,
    nom CHARACTER VARYING(100),
    telephone CHARACTER VARYING(20),
    distance_km NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.nom,
        c.telephone,
        ROUND((ST_Distance(
            c.position_actuelle::geography,  -- IMPORTANT: geography pour calcul en mètres
            p_position_depart::geography      -- IMPORTANT: geography pour calcul en mètres
        ) / 1000)::numeric, 2) as distance_km
    FROM conducteurs c
    WHERE c.hors_ligne = false 
      AND c.vehicle_type = p_vehicle_type
      AND ST_DWithin(
          c.position_actuelle::geography,    -- IMPORTANT: geography
          p_position_depart::geography,      -- IMPORTANT: geography
          p_max_distance_km * 1000           -- Convertir km en mètres
      )
    ORDER BY ST_Distance(c.position_actuelle::geography, p_position_depart::geography)
    LIMIT 20;
END;
$$ LANGUAGE plpgsql;

-- TEST AVEC LA FONCTION CORRIGÉE
-- Test 1: Lieusaint (proche) - devrait trouver le conducteur
SELECT 'Test Lieusaint (< 5km)' as test, * 
FROM find_nearby_conducteurs_by_vehicle(
    'POINT(2.5850000 48.6250000)',  -- Proche de Lieusaint
    'moto',
    5
);

-- Test 2: Gare de Lyon (loin) - NE devrait PAS trouver le conducteur
SELECT 'Test Gare Lyon (> 5km)' as test, *
FROM find_nearby_conducteurs_by_vehicle(
    'POINT(2.3734 48.8443)',  -- Gare de Lyon Paris
    'moto',
    5
);

-- VÉRIFICATION DISTANCES
SELECT 
    'Lieusaint -> Proche' as trajet,
    ROUND((ST_Distance(
        ST_GeomFromText('POINT(2.5891222 48.6277095)', 4326)::geography,
        ST_GeomFromText('POINT(2.5850000 48.6250000)', 4326)::geography
    ) / 1000)::numeric, 2) as distance_km,
    'Devrait être < 5km' as expected
UNION ALL
SELECT 
    'Lieusaint -> Gare Lyon' as trajet,
    ROUND((ST_Distance(
        ST_GeomFromText('POINT(2.5891222 48.6277095)', 4326)::geography,
        ST_GeomFromText('POINT(2.3734 48.8443)', 4326)::geography
    ) / 1000)::numeric, 2) as distance_km,
    'Devrait être > 30km' as expected;