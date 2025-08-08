-- Script de test d'insertion de réservation pour déclencher notifications OneSignal
-- Utilise des coordonnées GPS de Lieusaint, France

-- ========== COORDONNÉES LIEUSAINT ==========
-- Centre ville de Lieusaint : 48.6273519, 2.5847236
-- Gare RER D Lieusaint-Moissy : 48.6306, 2.5589
-- Centre commercial Carré Sénart : 48.6392, 2.5753
-- Mairie de Lieusaint : 48.6273, 2.5838

-- ========== TEST 1 - Réservation depuis Centre-ville vers Gare RER ==========
INSERT INTO reservations (
    client_phone,
    depart_nom,
    destination_nom,
    position_depart,
    position_arrivee,
    prix_total,
    vehicle_type,
    statut,
    created_at
) VALUES (
    '+33123456789',
    'Centre-ville Lieusaint',
    'Gare RER D Lieusaint-Moissy',
    ST_GeomFromText('POINT(2.5847236 48.6273519)', 4326), -- Centre-ville
    ST_GeomFromText('POINT(2.5589 48.6306)', 4326),       -- Gare RER
    15.50,
    'voiture',
    'pending',
    NOW()
);

-- ========== TEST 2 - Réservation depuis Carré Sénart vers Mairie ==========
INSERT INTO reservations (
    client_phone,
    depart_nom,
    destination_nom,
    position_depart,
    position_arrivee,
    prix_total,
    vehicle_type,
    statut,
    created_at
) VALUES (
    '+33987654321',
    'Centre Commercial Carré Sénart',
    'Mairie de Lieusaint',
    ST_GeomFromText('POINT(2.5753 48.6392)', 4326), -- Carré Sénart
    ST_GeomFromText('POINT(2.5838 48.6273)', 4326), -- Mairie
    12.00,
    'moto',
    'pending',
    NOW()
);

-- ========== TEST 3 - Réservation longue distance (pour test 5km) ==========
INSERT INTO reservations (
    client_phone,
    depart_nom,
    destination_nom,
    position_depart,
    position_arrivee,
    prix_total,
    vehicle_type,
    statut,
    created_at
) VALUES (
    '+33555111222',
    'Lieusaint Centre',
    'Melun Gare SNCF (test distance)',
    ST_GeomFromText('POINT(2.5847236 48.6273519)', 4326), -- Lieusaint centre
    ST_GeomFromText('POINT(2.6561 48.5384)', 4326),       -- Melun (~10km)
    25.00,
    'voiture',
    'pending',
    NOW()
);

-- ========== VÉRIFICATIONS ==========

-- Vérifier les réservations créées
SELECT 
    id,
    client_phone,
    depart_nom,
    destination_nom,
    ST_AsText(position_depart) as depart_coords,
    ST_AsText(position_arrivee) as arrivee_coords,
    prix_total,
    vehicle_type,
    statut,
    created_at
FROM reservations 
WHERE created_at > NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC;

-- Vérifier quels conducteurs sont dans un rayon de 5km (si ils existent)
SELECT 
    c.id,
    c.nom,
    c.telephone,
    c.player_id,
    c.hors_ligne,
    ST_AsText(c.position_actuelle) as position_conducteur,
    ROUND(
        ST_Distance(
            c.position_actuelle::geometry, 
            ST_GeomFromText('POINT(2.5847236 48.6273519)', 4326)
        ) / 1000, 2
    ) as distance_km
FROM conducteurs c
WHERE ST_DWithin(
    c.position_actuelle::geometry,
    ST_GeomFromText('POINT(2.5847236 48.6273519)', 4326),
    5000 -- 5km en mètres
)
AND c.hors_ligne = false
AND c.player_id IS NOT NULL
ORDER BY distance_km;

-- ========== FONCTION TEST DÉDIÉE ==========
-- Fonction pour faciliter les tests répétés

CREATE OR REPLACE FUNCTION test_insert_reservation_lieusaint(
    test_client_phone TEXT DEFAULT '+33123TEST123'
) RETURNS UUID AS $$
DECLARE
    new_reservation_id UUID;
BEGIN
    INSERT INTO reservations (
        client_phone,
        depart_nom,
        destination_nom,
        position_depart,
        position_arrivee,
        prix_total,
        vehicle_type,
        statut,
        created_at
    ) VALUES (
        test_client_phone,
        'Test Lieusaint Centre',
        'Test Destination',
        ST_GeomFromText('POINT(2.5847236 48.6273519)', 4326),
        ST_GeomFromText('POINT(2.5589 48.6306)', 4326),
        18.50,
        'voiture',
        'pending',
        NOW()
    ) RETURNING id INTO new_reservation_id;
    
    RAISE NOTICE 'Réservation de test créée avec ID: %', new_reservation_id;
    RAISE NOTICE 'Vérifiez les logs du trigger pour les notifications envoyées';
    
    RETURN new_reservation_id;
END;
$$ LANGUAGE plpgsql;

-- ========== UTILISATION FONCTION TEST ==========
-- SELECT test_insert_reservation_lieusaint();
-- SELECT test_insert_reservation_lieusaint('+33666777888');

-- ========== NETTOYAGE (si besoin) ==========
-- DELETE FROM reservations WHERE client_phone LIKE '+33123%' OR client_phone LIKE '+33987%' OR client_phone LIKE '+33555%' OR client_phone LIKE '%TEST%';