-- INSERT RÉSERVATION TEST - GARE DE MELUN
-- Test notification OneSignal avec son claxon personnalisé

-- Coordonnées GPS Gare de Melun
-- Latitude: 48.5269
-- Longitude: 2.6554

INSERT INTO reservations (
    id,
    depart_nom,
    destination_nom,
    vehicle_type,
    position_depart,
    position_destination,
    prix_total,
    statut,
    customer_name,
    customer_phone,
    pickup_date,
    pickup_time,
    notes,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'Gare de Melun',                                              -- Départ
    'Aéroport Charles de Gaulle',                                 -- Destination  
    'voiture',                                                     -- Type véhicule
    ST_GeomFromText('POINT(2.6554 48.5269)', 4326),              -- Position GPS Gare de Melun
    ST_GeomFromText('POINT(2.5519 49.0097)', 4326),              -- Position GPS CDG
    75000,                                                         -- Prix: 75€
    'pending',                                                     -- Statut en attente
    'Client Test Melun',                                          -- Nom client
    '+33612345678',                                               -- Téléphone
    CURRENT_DATE,                                                  -- Date aujourd'hui
    '14:30:00',                                                   -- Heure 14h30
    'Départ Gare de Melun - Quai principal',                     -- Notes
    NOW(),                                                         -- Created at
    NOW()                                                          -- Updated at
);

-- Alternative avec position plus précise (entrée principale gare)
INSERT INTO reservations (
    id,
    depart_nom,
    destination_nom,
    vehicle_type,
    position_depart,
    position_destination,
    prix_total,
    statut,
    customer_name,
    customer_phone,
    pickup_date,
    pickup_time,
    notes,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'Gare de Melun - Entrée Principale',
    'Paris - Tour Eiffel',
    'voiture',
    ST_GeomFromText('POINT(2.65545 48.52694)', 4326),            -- Position exacte entrée gare
    ST_GeomFromText('POINT(2.2945 48.8584)', 4326),              -- Tour Eiffel
    50000,                                                         -- Prix: 50€
    'pending',
    'Marie Dupont',
    '+33687654321',
    CURRENT_DATE,
    '10:00:00',
    'RDV devant l''entrée principale de la gare',
    NOW(),
    NOW()
);

-- Test avec différents types de véhicules
INSERT INTO reservations (
    id,
    depart_nom,
    destination_nom,
    vehicle_type,
    position_depart,
    position_destination,
    prix_total,
    statut,
    customer_name,
    customer_phone,
    pickup_date,
    pickup_time,
    created_at,
    updated_at
) VALUES 
(
    gen_random_uuid(),
    'Gare de Melun',
    'Fontainebleau',
    'moto',                                                        -- Type moto
    ST_GeomFromText('POINT(2.6554 48.5269)', 4326),
    ST_GeomFromText('POINT(2.7014 48.4089)', 4326),
    25000,
    'pending',
    'Paul Martin',
    '+33698765432',
    CURRENT_DATE,
    '16:00:00',
    NOW(),
    NOW()
),
(
    gen_random_uuid(),
    'Gare de Melun',
    'Disneyland Paris',
    'voiture',                                                     -- Type voiture
    ST_GeomFromText('POINT(2.6554 48.5269)', 4326),
    ST_GeomFromText('POINT(2.7836 48.8673)', 4326),
    45000,
    'pending',
    'Sophie Bernard',
    '+33654321987',
    CURRENT_DATE,
    '09:30:00',
    NOW(),
    NOW()
);

-- Vérification des insertions
SELECT 
    id,
    depart_nom,
    destination_nom,
    vehicle_type,
    prix_total,
    statut,
    customer_name,
    ST_AsText(position_depart) as position_depart_text,
    created_at
FROM reservations 
WHERE depart_nom LIKE '%Melun%'
  AND statut = 'pending'
ORDER BY created_at DESC;

-- Pour déclencher les notifications OneSignal
-- Exécuter l'URL: https://www.labico.net/Taxi/ProcessPendingReservationNotifications