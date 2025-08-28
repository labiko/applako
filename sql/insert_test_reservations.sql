-- Script pour ajouter des réservations de test à verser (CASH uniquement)
-- Ces réservations seront visibles dans l'onglet "À verser"
-- EXÉCUTER DANS SUPABASE SQL EDITOR

-- Réservation 1: Conakry Centre → Kipé (15,000 GNF)
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
    '+224655123456',
    'moto',
    ST_SetSRID(ST_MakePoint(-13.712, 9.509), 4326), -- Conakry Centre
    ST_SetSRID(ST_MakePoint(-13.680, 9.515), 4326), -- Kipé
    'Conakry Centre',
    'Kipé',
    8.5,
    15000,
    'completed',
    '75f2bd16-d906-4ea5-8f30-5ff66612ea5c', -- diné salifou
    CURRENT_DATE,
    14,
    30,
    '1234',
    NOW() - INTERVAL '2 hours',
    NOW() - INTERVAL '3 hours',
    NOW() - INTERVAL '2 hours'
);

-- Réservation 2: Madina → Ratoma (12,000 GNF)
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
    '+224655789012',
    'moto',
    ST_SetSRID(ST_MakePoint(-13.685, 9.535), 4326), -- Madina
    ST_SetSRID(ST_MakePoint(-13.650, 9.540), 4326), -- Ratoma
    'Madina Market',
    'Ratoma Carrefour',
    6.2,
    12000,
    'completed',
    '75f2bd16-d906-4ea5-8f30-5ff66612ea5c', -- diné salifou
    CURRENT_DATE,
    16,
    45,
    '5678',
    NOW() - INTERVAL '1 hour',
    NOW() - INTERVAL '2 hours',
    NOW() - INTERVAL '1 hour'
);

-- Réservation 3: Hamdallaye → Bambeto (18,000 GNF)
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
    '+224655345678',
    'moto',
    ST_SetSRID(ST_MakePoint(-13.670, 9.525), 4326), -- Hamdallaye
    ST_SetSRID(ST_MakePoint(-13.620, 9.520), 4326), -- Bambeto
    'Hamdallaye ACI',
    'Bambeto Université',
    12.3,
    18000,
    'completed',
    '75f2bd16-d906-4ea5-8f30-5ff66612ea5c', -- diné salifou
    CURRENT_DATE,
    18,
    15,
    '9012',
    NOW() - INTERVAL '30 minutes',
    NOW() - INTERVAL '90 minutes',
    NOW() - INTERVAL '30 minutes'
);

-- Réservation 4: Kaloum → Matam (10,000 GNF)
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
    '+224655901234',
    'moto',
    ST_SetSRID(ST_MakePoint(-13.717, 9.515), 4326), -- Kaloum
    ST_SetSRID(ST_MakePoint(-13.690, 9.545), 4326), -- Matam
    'Port de Conakry',
    'Matam Centre',
    7.8,
    10000,
    'completed',
    '75f2bd16-d906-4ea5-8f30-5ff66612ea5c', -- diné salifou
    CURRENT_DATE,
    19,
    30,
    '3456',
    NOW() - INTERVAL '45 minutes',
    NOW() - INTERVAL '75 minutes',
    NOW() - INTERVAL '45 minutes'
);

-- Réservation 5: Dixinn → Coleah (25,000 GNF) - Plus longue distance
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
    '+224655567890',
    'moto',
    ST_SetSRID(ST_MakePoint(-13.680, 9.500), 4326), -- Dixinn
    ST_SetSRID(ST_MakePoint(-13.580, 9.480), 4326), -- Coleah
    'Dixinn Port 2',
    'Coleah Marché',
    18.5,
    25000,
    'completed',
    '75f2bd16-d906-4ea5-8f30-5ff66612ea5c', -- diné salifou
    CURRENT_DATE,
    20,
    0,
    '7890',
    NOW() - INTERVAL '15 minutes',
    NOW() - INTERVAL '60 minutes',
    NOW() - INTERVAL '15 minutes'
);

-- TOTAL À VERSER POUR DINÉ SALIFOU: 80,000 GNF (15k + 12k + 18k + 10k + 25k)

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
WHERE r.conducteur_id = '75f2bd16-d906-4ea5-8f30-5ff66612ea5c'
    AND r.statut = 'completed'
    AND r.date_code_validation IS NOT NULL
    AND r.versement_id IS NULL
ORDER BY r.created_at DESC;