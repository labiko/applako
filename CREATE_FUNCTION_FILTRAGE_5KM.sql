-- ========================================
-- FONCTION FILTRAGE 5KM - RÉSERVATIONS PROCHES
-- ========================================

-- CRÉER FONCTION POUR RÉCUPÉRER RÉSERVATIONS DANS 5KM
CREATE OR REPLACE FUNCTION get_reservations_nearby(
    p_conducteur_position TEXT,
    p_max_distance_km INTEGER DEFAULT 5
)
RETURNS TABLE(
    id UUID,
    customer_name TEXT,
    customer_phone TEXT,
    depart_nom TEXT,
    destination_nom TEXT,
    pickup_date DATE,
    pickup_time TIME,
    statut TEXT,
    prix_total NUMERIC,
    notes TEXT,
    created_at TIMESTAMPTZ,
    distance_km NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id,
        r.customer_name,
        r.customer_phone,
        r.depart_nom,
        r.destination_nom,
        r.pickup_date,
        r.pickup_time,
        r.statut,
        r.prix_total,
        r.notes,
        r.created_at,
        ROUND((ST_Distance(
            p_conducteur_position::geography,
            r.position_depart::geography
        ) / 1000)::numeric, 2) as distance_km
    FROM reservations r
    WHERE r.statut = 'pending'
      AND ST_DWithin(
          p_conducteur_position::geography,
          r.position_depart::geography,
          p_max_distance_km * 1000  -- km vers mètres
      )
    ORDER BY ST_Distance(
        p_conducteur_position::geography,
        r.position_depart::geography
    );
END;
$$ LANGUAGE plpgsql;

-- TEST 1: Avec position du conducteur test
SELECT 
    'Test avec conducteur balde' as test,
    *
FROM get_reservations_nearby(
    '0101000020E61000000E2DB29DEFA70440AAF1D24D62504840',  -- Position conducteur
    5  -- 5km
);

-- TEST 2: Voir toutes les réservations avec distances
SELECT 
    r.id,
    r.depart_nom,
    r.statut,
    ROUND((ST_Distance(
        '0101000020E61000000E2DB29DEFA70440AAF1D24D62504840'::geography,
        r.position_depart::geography
    ) / 1000)::numeric, 2) as distance_km,
    CASE 
        WHEN ST_DWithin(
            '0101000020E61000000E2DB29DEFA70440AAF1D24D62504840'::geography,
            r.position_depart::geography,
            5000
        ) THEN '✅ DANS 5KM - Sera affiché'
        ELSE '❌ HORS 5KM - Masqué'
    END as affichage_app
FROM reservations r
WHERE r.statut = 'pending'
ORDER BY distance_km;

-- TEST 3: Compter réservations par zone
SELECT 
    CASE 
        WHEN ST_DWithin(
            '0101000020E61000000E2DB29DEFA70440AAF1D24D62504840'::geography,
            r.position_depart::geography,
            5000
        ) THEN '< 5km (AFFICHÉES)'
        ELSE '> 5km (MASQUÉES)'
    END as zone,
    COUNT(*) as nb_reservations
FROM reservations r
WHERE r.statut = 'pending'
GROUP BY zone;