-- INSERT RÉSERVATION TEST - GARE DE MELUN
-- Script corrigé avec la vraie structure de la table reservations
-- Test notification OneSignal avec son claxon personnalisé

-- ===============================================
-- STRUCTURE CORRECTE DE LA TABLE reservations
-- ===============================================
-- client_phone (pas customer_phone)
-- depart_nom (pas pickup_location) 
-- destination_nom (pas destination)
-- position_depart (format: 'POINT(longitude latitude)')
-- statut (pas status)
-- prix_total (pas price)
-- date_reservation (pas pickup_date)
-- heure_reservation + minute_reservation (pas pickup_time)
-- ===============================================

-- Coordonnées GPS Gare de Melun
-- Latitude: 48.5269
-- Longitude: 2.6554

-- INSERTION 1: Gare de Melun → Aéroport CDG
INSERT INTO reservations (
    id,
    client_phone,                                                 -- BON: client_phone
    depart_nom,                                                   -- BON: depart_nom  
    destination_nom,                                              -- BON: destination_nom
    vehicle_type,
    position_depart,                                              -- Format PostGIS avec SRID
    prix_total,                                                   -- BON: prix_total
    statut,                                                       -- BON: statut
    date_reservation,                                             -- BON: date_reservation
    heure_reservation,                                            -- BON: heure_reservation
    minute_reservation,                                           -- BON: minute_reservation
    created_at,
    updated_at
) VALUES (
    uuid_generate_v4(),
    '+33612345678',                                              -- Téléphone client
    'Gare de Melun',                                             -- Départ
    'Aéroport Charles de Gaulle',                                -- Destination  
    'voiture',                                                    -- Type véhicule
    ST_GeomFromText('POINT(2.6554 48.5269)', 4326)::text,       -- Position GPS avec SRID 4326
    75000,                                                        -- Prix: 750 GNF (75€ équivalent)
    'pending',                                                    -- Statut en attente
    CURRENT_DATE,                                                 -- Date aujourd'hui
    14,                                                           -- Heure: 14h
    30,                                                           -- Minutes: 30
    NOW(),                                                        -- Created at
    NOW()                                                         -- Updated at
);

-- INSERTION 2: Gare de Melun → Tour Eiffel Paris
INSERT INTO reservations (
    id,
    client_phone,
    depart_nom,
    destination_nom,
    vehicle_type,
    position_depart,
    prix_total,
    statut,
    date_reservation,
    heure_reservation,
    minute_reservation,
    commentaire,                                                  -- BON: commentaire (pas notes)
    created_at,
    updated_at
) VALUES (
    uuid_generate_v4(),
    '+33687654321',
    'Gare de Melun - Entrée Principale',
    'Paris - Tour Eiffel',
    'voiture',
    ST_GeomFromText('POINT(2.65545 48.52694)', 4326)::text,     -- Position exacte entrée gare avec SRID
    50000,                                                        -- Prix: 500 GNF
    'pending',
    CURRENT_DATE,
    10,                                                           -- 10h
    0,                                                            -- 00 minutes
    'RDV devant l''entrée principale de la gare',                -- Commentaire
    NOW(),
    NOW()
);

-- INSERTION 3: Test avec type MOTO
INSERT INTO reservations (
    id,
    client_phone,
    depart_nom,
    destination_nom,
    vehicle_type,
    position_depart,
    prix_total,
    statut,
    date_reservation,
    heure_reservation,
    minute_reservation,
    created_at,
    updated_at
) VALUES (
    uuid_generate_v4(),
    '+33698765432',
    'Gare de Melun',
    'Fontainebleau - Château',
    'moto',                                                       -- Type moto
    ST_GeomFromText('POINT(2.6554 48.5269)', 4326)::text,
    25000,                                                        -- Prix moto moins cher
    'pending',
    CURRENT_DATE,
    16,                                                           -- 16h
    0,                                                            -- 00 minutes
    NOW(),
    NOW()
);

-- INSERTION 4: Test Disneyland
INSERT INTO reservations (
    id,
    client_phone,
    depart_nom,
    destination_nom,
    vehicle_type,
    position_depart,
    prix_total,
    statut,
    date_reservation,
    heure_reservation,
    minute_reservation,
    distance_km,                                                  -- Ajout distance optionnelle
    created_at,
    updated_at
) VALUES (
    uuid_generate_v4(),
    '+33654321987',
    'Gare de Melun',
    'Disneyland Paris - Entrée Principale',
    'voiture',
    ST_GeomFromText('POINT(2.6554 48.5269)', 4326)::text,
    45000,
    'pending',
    CURRENT_DATE,
    9,                                                            -- 09h
    30,                                                           -- 30 minutes
    32.5,                                                         -- Distance en km
    NOW(),
    NOW()
);

-- ===============================================
-- VÉRIFICATION DES INSERTIONS
-- ===============================================
SELECT 
    id,
    depart_nom,
    destination_nom,
    vehicle_type,
    client_phone,
    prix_total,
    statut,
    date_reservation,
    heure_reservation || ':' || LPAD(minute_reservation::text, 2, '0') as heure_complete,
    position_depart,
    created_at
FROM reservations 
WHERE depart_nom LIKE '%Melun%'
  AND statut = 'pending'
ORDER BY created_at DESC
LIMIT 10;

-- ===============================================
-- POUR DÉCLENCHER LES NOTIFICATIONS OneSignal
-- ===============================================
-- Exécuter l'URL suivante après insertion:
-- https://www.labico.net/Taxi/ProcessPendingReservationNotifications

-- ===============================================
-- NOTES IMPORTANTES
-- ===============================================
-- 1. Les conducteurs dans un rayon de 5km recevront la notification
-- 2. Son claxon personnalisé configuré dans OneSignal
-- 3. Message format: "📍 Gare de Melun → [Destination]"
-- 4. LED verte clignotante + vibration pattern

-- ===============================================
-- COLONNES À NE PAS UTILISER (n'existent pas)
-- ===============================================
-- ❌ customer_name → utiliser client_phone
-- ❌ pickup_location → utiliser depart_nom
-- ❌ destination → utiliser destination_nom  
-- ❌ pickup_date → utiliser date_reservation
-- ❌ pickup_time → utiliser heure_reservation + minute_reservation
-- ❌ notes → utiliser commentaire
-- ❌ status → utiliser statut
-- ❌ price → utiliser prix_total