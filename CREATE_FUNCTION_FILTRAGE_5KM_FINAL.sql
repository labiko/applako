-- ========================================
-- PHASE 1 - FONCTION FILTRAGE 5KM (Structure DB réelle)
-- Date: 2025-01-08
-- ========================================

-- FONCTION AVEC STRUCTURE RÉELLE DE LA TABLE RESERVATIONS
CREATE OR REPLACE FUNCTION get_reservations_nearby_conducteur(
    p_conducteur_id UUID,
    p_max_distance_km INTEGER DEFAULT 5
)
RETURNS TABLE(
    id UUID,
    client_phone TEXT,
    vehicle_type TEXT,
    depart_nom TEXT,
    destination_nom CHARACTER VARYING,
    prix_total NUMERIC,
    created_at TIMESTAMP,
    commentaire TEXT,
    distance_km NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id,
        r.client_phone,
        r.vehicle_type,
        r.depart_nom,
        r.destination_nom,
        r.prix_total,
        r.created_at,
        r.commentaire,
        ROUND((ST_Distance(
            c.position_actuelle,  -- GEOGRAPHY du conducteur
            r.position_depart::geography  -- TEXT vers GEOGRAPHY
        ) / 1000)::numeric, 2) as distance_km
    FROM reservations r
    CROSS JOIN conducteurs c
    WHERE r.statut = 'pending'
      AND r.conducteur_id IS NULL  -- Réservations non assignées uniquement
      AND c.id = p_conducteur_id
      AND r.vehicle_type = c.vehicle_type  -- Matching type véhicule
      AND ST_DWithin(
          c.position_actuelle,
          r.position_depart::geography,
          p_max_distance_km * 1000  -- km vers mètres
      )
    ORDER BY ST_Distance(c.position_actuelle, r.position_depart::geography);
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- TESTS PHASE 1
-- ========================================

-- TEST 1: Fonction avec conducteur balde
SELECT 
    'TEST 1 - Réservations < 5km pour balde' as test,
    COUNT(*) as nb_reservations_trouvees
FROM get_reservations_nearby_conducteur(
    '69e0cde9-14a0-4dde-86c1-1fe9a306f2fa',  -- ID balde
    5
);

-- TEST 2: Voir détail des réservations retournées
SELECT 
    'Réservations dans 5km' as info,
    r.id,
    r.depart_nom,
    r.vehicle_type,
    r.distance_km,
    '✅ Sera visible dans app' as statut
FROM get_reservations_nearby_conducteur(
    '69e0cde9-14a0-4dde-86c1-1fe9a306f2fa',
    5
) r
ORDER BY r.distance_km;

-- TEST 3: Comparaison AVANT/APRÈS filtrage
WITH stats AS (
    SELECT 
        'AVANT - Toutes réservations pending' as mode,
        COUNT(*) as nb_reservations
    FROM reservations 
    WHERE statut = 'pending' 
      AND conducteur_id IS NULL
    
    UNION ALL
    
    SELECT 
        'APRÈS - Seulement < 5km pour balde' as mode,
        COUNT(*) as nb_reservations
    FROM get_reservations_nearby_conducteur(
        '69e0cde9-14a0-4dde-86c1-1fe9a306f2fa',
        5
    )
)
SELECT * FROM stats;

-- TEST 4: Vérifier le type de véhicule du conducteur balde
SELECT 
    id,
    nom,
    vehicle_type,
    hors_ligne,
    '✅ Conducteur de référence' as statut
FROM conducteurs 
WHERE id = '69e0cde9-14a0-4dde-86c1-1fe9a306f2fa';

-- TEST 5: Voir toutes les réservations avec leur distance
SELECT 
    r.id,
    r.depart_nom,
    r.vehicle_type,
    r.statut,
    ROUND((ST_Distance(
        c.position_actuelle,
        r.position_depart::geography
    ) / 1000)::numeric, 2) as distance_km,
    CASE 
        WHEN r.statut != 'pending' THEN '❌ Statut non-pending'
        WHEN r.conducteur_id IS NOT NULL THEN '❌ Déjà assignée'
        WHEN r.vehicle_type != c.vehicle_type THEN '❌ Type véhicule différent'
        WHEN ST_Distance(c.position_actuelle, r.position_depart::geography) > 5000 
        THEN '❌ > 5km - Masquée'
        ELSE '✅ < 5km - Affichée'
    END as raison_affichage
FROM reservations r
CROSS JOIN conducteurs c
WHERE c.id = '69e0cde9-14a0-4dde-86c1-1fe9a306f2fa'
ORDER BY distance_km;

-- ========================================
-- RÉSULTATS ATTENDUS:
-- - TEST 1: Nombre de réservations < 5km
-- - TEST 2: Détail des réservations qui seront affichées
-- - TEST 3: Réduction significative du nombre
-- - TEST 4: Confirmer vehicle_type de balde
-- - TEST 5: Explication de chaque réservation
-- ========================================