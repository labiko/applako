-- ========================================
-- FIX DÉFINITIF - FONCTION AVEC GEOGRAPHY
-- position_actuelle est GEOGRAPHY
-- position_depart est TEXT (WKB) qui doit être converti en GEOGRAPHY
-- ========================================

-- SUPPRIMER L'ANCIENNE FONCTION
DROP FUNCTION IF EXISTS find_nearby_conducteurs_by_vehicle(TEXT, TEXT, INTEGER);

-- CRÉER LA FONCTION CORRIGÉE
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
            c.position_actuelle,  -- Déjà en geography
            p_position_depart::geography  -- Convertir TEXT en geography
        ) / 1000)::numeric, 2) as distance_km
    FROM conducteurs c
    WHERE c.hors_ligne = false 
      AND c.vehicle_type = p_vehicle_type
      AND ST_DWithin(
          c.position_actuelle,  -- Déjà en geography
          p_position_depart::geography,  -- Convertir TEXT en geography
          p_max_distance_km * 1000  -- km vers mètres
      )
    ORDER BY ST_Distance(c.position_actuelle, p_position_depart::geography)
    LIMIT 20;
END;
$$ LANGUAGE plpgsql;

-- TEST 1: RESERVATION PROCHE (Lieusaint) - DOIT trouver le conducteur
SELECT 
    'Lieusaint (< 5km)' as test_case,
    COUNT(*) as conducteurs_trouves,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ OK - Conducteur trouvé'
        ELSE '❌ ERREUR - Aucun conducteur'
    END as resultat
FROM find_nearby_conducteurs_by_vehicle(
    'POINT(2.5850000 48.6250000)',  -- Proche de Lieusaint
    'moto',
    5
);

-- TEST 2: RESERVATION LOIN (Gare de Lyon) - NE DOIT PAS trouver
SELECT 
    'Gare Lyon (35km)' as test_case,
    COUNT(*) as conducteurs_trouves,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ OK - Aucun conducteur (trop loin)'
        ELSE '❌ ERREUR - Conducteur trouvé alors que trop loin!'
    END as resultat
FROM find_nearby_conducteurs_by_vehicle(
    'POINT(2.3734 48.8443)',  -- Gare de Lyon Paris
    'moto',
    5
);

-- TEST 3: VÉRIFIER DISTANCES CALCULÉES
WITH test_positions AS (
    SELECT 
        'Proche Lieusaint' as lieu,
        'POINT(2.5850000 48.6250000)'::geography as position
    UNION ALL
    SELECT 
        'Gare de Lyon Paris' as lieu,
        'POINT(2.3734 48.8443)'::geography as position
)
SELECT 
    tp.lieu,
    ROUND((ST_Distance(
        c.position_actuelle,
        tp.position
    ) / 1000)::numeric, 2) as distance_km,
    CASE 
        WHEN ST_DWithin(c.position_actuelle, tp.position, 5000) 
        THEN '✅ Dans 5km'
        ELSE '❌ Hors 5km'
    END as dans_rayon
FROM conducteurs c
CROSS JOIN test_positions tp
WHERE c.id = '69e0cde9-14a0-4dde-86c1-1fe9a306f2fa'
ORDER BY distance_km;

-- TEST 4: SIMULATION COMPLÈTE AVEC VOS RÉSERVATIONS
SELECT 
    r.id,
    r.depart_nom,
    ROUND((ST_Distance(
        c.position_actuelle,
        r.position_depart::geography
    ) / 1000)::numeric, 2) as distance_km,
    CASE 
        WHEN ST_DWithin(c.position_actuelle, r.position_depart::geography, 5000)
        THEN '✅ DEVRAIT recevoir notification'
        ELSE '❌ NE devrait PAS recevoir'
    END as notification_attendue
FROM reservations r
CROSS JOIN conducteurs c
WHERE c.id = '69e0cde9-14a0-4dde-86c1-1fe9a306f2fa'
  AND r.statut = 'pending'
  AND (r.depart_nom LIKE 'TEST%')
ORDER BY distance_km;