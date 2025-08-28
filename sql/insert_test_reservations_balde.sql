-- Script pour ajouter des réservations de test à verser pour BALDE DIEYNABA (CASH uniquement)
-- Ces réservations seront visibles dans l'onglet "À verser"
-- EXÉCUTER DANS SUPABASE SQL EDITOR

-- Réservation 1: Matoto → Nongo (20,000 GNF)
INSERT INTO reservations (
    id,
    client_phone,
    vehicle_type,
    position_depart,
    position_arrivee,
    depart_nom,
    destination_nom,
    distance_km,
    prix_total,
    statut,
    conducteur_id,
    date_reservation,
    heure_reservation,
    minute_reservation,
    code_validation,
    date_code_validation,
    created_at,
    updated_at
) VALUES (
    uuid_generate_v4(),
    '+224667111222',
    'moto',
    ST_SetSRID(ST_MakePoint(-13.640, 9.480), 4326), -- Matoto
    ST_SetSRID(ST_MakePoint(-13.610, 9.470), 4326), -- Nongo
    'Matoto Marché',
    'Nongo Université',
    15.2,
    20000,
    'completed',
    '62f2b042-b05f-4456-9834-d3b6c5562750', -- balde dieynaba
    CURRENT_DATE,
    9,
    15,
    '2468',
    NOW() - INTERVAL '3 hours',
    NOW() - INTERVAL '4 hours',
    NOW() - INTERVAL '3 hours'
);

-- Réservation 2: Sangoyah → Sonfonia (14,000 GNF)
INSERT INTO reservations (
    id,
    client_phone,
    vehicle_type,
    position_depart,
    position_arrivee,
    depart_nom,
    destination_nom,
    distance_km,
    prix_total,
    statut,
    conducteur_id,
    date_reservation,
    heure_reservation,
    minute_reservation,
    code_validation,
    date_code_validation,
    created_at,
    updated_at
) VALUES (
    uuid_generate_v4(),
    '+224667333444',
    'moto',
    ST_SetSRID(ST_MakePoint(-13.695, 9.495), 4326), -- Sangoyah
    ST_SetSRID(ST_MakePoint(-13.665, 9.505), 4326), -- Sonfonia
    'Sangoyah Gare',
    'Sonfonia Carrefour',
    8.7,
    14000,
    'completed',
    '62f2b042-b05f-4456-9834-d3b6c5562750', -- balde dieynaba
    CURRENT_DATE,
    11,
    30,
    '1357',
    NOW() - INTERVAL '2 hours 30 minutes',
    NOW() - INTERVAL '3 hours 15 minutes',
    NOW() - INTERVAL '2 hours 30 minutes'
);

-- Réservation 3: Almamya → Kaporo Rails (16,500 GNF)
INSERT INTO reservations (
    id,
    client_phone,
    vehicle_type,
    position_depart,
    position_arrivee,
    depart_nom,
    destination_nom,
    distance_km,
    prix_total,
    statut,
    conducteur_id,
    date_reservation,
    heure_reservation,
    minute_reservation,
    code_validation,
    date_code_validation,
    created_at,
    updated_at
) VALUES (
    uuid_generate_v4(),
    '+224667555666',
    'moto',
    ST_SetSRID(ST_MakePoint(-13.705, 9.525), 4326), -- Almamya
    ST_SetSRID(ST_MakePoint(-13.675, 9.485), 4326), -- Kaporo Rails
    'Almamya Centre',
    'Kaporo Rails Station',
    11.3,
    16500,
    'completed',
    '62f2b042-b05f-4456-9834-d3b6c5562750', -- balde dieynaba
    CURRENT_DATE,
    13,
    45,
    '9753',
    NOW() - INTERVAL '2 hours',
    NOW() - INTERVAL '2 hours 45 minutes',
    NOW() - INTERVAL '2 hours'
);

-- Réservation 4: Camayenne → Dixinn Hospital (22,000 GNF)
INSERT INTO reservations (
    id,
    client_phone,
    vehicle_type,
    position_depart,
    position_arrivee,
    depart_nom,
    destination_nom,
    distance_km,
    prix_total,
    statut,
    conducteur_id,
    date_reservation,
    heure_reservation,
    minute_reservation,
    code_validation,
    date_code_validation,
    created_at,
    updated_at
) VALUES (
    uuid_generate_v4(),
    '+224667777888',
    'moto',
    ST_SetSRID(ST_MakePoint(-13.655, 9.515), 4326), -- Camayenne
    ST_SetSRID(ST_MakePoint(-13.680, 9.500), 4326), -- Dixinn Hospital
    'Camayenne Mosquée',
    'Hôpital National Dixinn',
    16.8,
    22000,
    'completed',
    '62f2b042-b05f-4456-9834-d3b6c5562750', -- balde dieynaba
    CURRENT_DATE,
    15,
    20,
    '8642',
    NOW() - INTERVAL '1 hour 15 minutes',
    NOW() - INTERVAL '2 hours',
    NOW() - INTERVAL '1 hour 15 minutes'
);

-- Réservation 5: Taouyah → Belle Vue (13,500 GNF)
INSERT INTO reservations (
    id,
    client_phone,
    vehicle_type,
    position_depart,
    position_arrivee,
    depart_nom,
    destination_nom,
    distance_km,
    prix_total,
    statut,
    conducteur_id,
    date_reservation,
    heure_reservation,
    minute_reservation,
    code_validation,
    date_code_validation,
    created_at,
    updated_at
) VALUES (
    uuid_generate_v4(),
    '+224667999000',
    'moto',
    ST_SetSRID(ST_MakePoint(-13.630, 9.490), 4326), -- Taouyah
    ST_SetSRID(ST_MakePoint(-13.700, 9.510), 4326), -- Belle Vue
    'Taouyah Carrefour',
    'Belle Vue Résidentiel',
    9.4,
    13500,
    'completed',
    '62f2b042-b05f-4456-9834-d3b6c5562750', -- balde dieynaba
    CURRENT_DATE,
    17,
    10,
    '5284',
    NOW() - INTERVAL '45 minutes',
    NOW() - INTERVAL '1 hour 30 minutes',
    NOW() - INTERVAL '45 minutes'
);

-- Réservation 6: Cité de l'Air → Minière (19,500 GNF)
INSERT INTO reservations (
    id,
    client_phone,
    vehicle_type,
    position_depart,
    position_arrivee,
    depart_nom,
    destination_nom,
    distance_km,
    prix_total,
    statut,
    conducteur_id,
    date_reservation,
    heure_reservation,
    minute_reservation,
    code_validation,
    date_code_validation,
    created_at,
    updated_at
) VALUES (
    uuid_generate_v4(),
    '+224667111333',
    'moto',
    ST_SetSRID(ST_MakePoint(-13.645, 9.505), 4326), -- Cité de l'Air
    ST_SetSRID(ST_MakePoint(-13.615, 9.465), 4326), -- Minière
    'Cité de l\'Air Base',
    'Minière Carrefour',
    14.7,
    19500,
    'completed',
    '62f2b042-b05f-4456-9834-d3b6c5562750', -- balde dieynaba
    CURRENT_DATE,
    18,
    30,
    '7159',
    NOW() - INTERVAL '25 minutes',
    NOW() - INTERVAL '1 hour 10 minutes',
    NOW() - INTERVAL '25 minutes'
);

-- TOTAL À VERSER POUR BALDE DIEYNABA: 105,500 GNF (20k + 14k + 16.5k + 22k + 13.5k + 19.5k)

-- Vérification: Afficher les réservations créées
SELECT 
    r.id,
    r.client_phone,
    r.depart_nom,
    r.destination_nom,
    r.prix_total,
    r.date_code_validation,
    c.nom,
    c.prenom,
    c.telephone
FROM reservations r
INNER JOIN conducteurs c ON r.conducteur_id = c.id
WHERE r.conducteur_id = '62f2b042-b05f-4456-9834-d3b6c5562750'
    AND r.statut = 'completed'
    AND r.date_code_validation IS NOT NULL
    AND r.versement_id IS NULL
ORDER BY r.created_at DESC;