-- INSERT RÉSERVATION TEST - GARE DE COMBS-LA-VILLE
-- Script avec structure correcte et SRID 4326
-- Test notification OneSignal avec son claxon personnalisé

-- ===============================================
-- RAPPEL STRUCTURE CORRECTE (voir CLAUDE.md)
-- ===============================================
-- ✅ client_phone (pas customer_phone)
-- ✅ depart_nom (pas pickup_location) 
-- ✅ destination_nom (pas destination)
-- ✅ position_depart avec ST_GeomFromText(..., 4326)
-- ✅ statut (pas status)
-- ✅ prix_total (pas price)
-- ✅ date_reservation + heure_reservation + minute_reservation
-- ===============================================

-- Coordonnées GPS Gare de Combs-la-Ville - Quincy
-- Latitude: 48.6642
-- Longitude: 2.5655

-- INSERTION 1: Combs-la-Ville → Aéroport Orly
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
    distance_km,
    created_at,
    updated_at
) VALUES (
    uuid_generate_v4(),
    '+33645789123',
    'Gare de Combs-la-Ville - Quincy',
    'Aéroport d''Orly - Terminal 4',
    'voiture',
    ST_GeomFromText('POINT(2.5655 48.6642)', 4326)::text,       -- Position GPS Gare Combs avec SRID
    35000,                                                        -- Prix: 35€
    'pending',
    CURRENT_DATE,
    7,                                                            -- 07h du matin
    45,                                                           -- 45 minutes
    18.5,                                                         -- Distance approximative
    NOW(),
    NOW()
);

-- INSERTION 2: Combs-la-Ville → Paris Gare de Lyon
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
    commentaire,
    created_at,
    updated_at
) VALUES (
    uuid_generate_v4(),
    '+33632147896',
    'Gare de Combs-la-Ville',
    'Paris - Gare de Lyon',
    'voiture',
    ST_GeomFromText('POINT(2.5655 48.6642)', 4326)::text,
    45000,                                                        -- Prix: 45€
    'pending',
    CURRENT_DATE,
    8,                                                            -- 08h
    30,                                                           -- 30 minutes
    'Client avec 2 valises - RDV sortie principale de la gare',
    NOW(),
    NOW()
);

-- INSERTION 3: Combs-la-Ville → Centre Commercial Carré Sénart (MOTO)
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
    '+33678912345',
    'Gare de Combs-la-Ville',
    'Centre Commercial Carré Sénart',
    'moto',                                                       -- Type MOTO
    ST_GeomFromText('POINT(2.5655 48.6642)', 4326)::text,
    15000,                                                        -- Prix moto: 15€
    'pending',
    CURRENT_DATE,
    12,                                                           -- 12h midi
    0,                                                            -- 00 minutes
    NOW(),
    NOW()
);

-- INSERTION 4: Combs-la-Ville → Melun Centre-Ville
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
    distance_km,
    created_at,
    updated_at
) VALUES (
    uuid_generate_v4(),
    '+33698745632',
    'Gare de Combs-la-Ville - Parking',
    'Melun - Place Saint-Jean',
    'voiture',
    ST_GeomFromText('POINT(2.5655 48.6642)', 4326)::text,
    20000,                                                        -- Prix: 20€
    'pending',
    CURRENT_DATE,
    18,                                                           -- 18h
    15,                                                           -- 15 minutes
    9.8,                                                          -- Distance
    NOW(),
    NOW()
);

-- INSERTION 5: Combs-la-Ville → Évry-Courcouronnes
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
    commentaire,
    created_at,
    updated_at
) VALUES (
    uuid_generate_v4(),
    '+33654789321',
    'Gare de Combs-la-Ville',
    'Évry-Courcouronnes - Cathédrale',
    'voiture',
    ST_GeomFromText('POINT(2.5655 48.6642)', 4326)::text,
    30000,                                                        -- Prix: 30€
    'pending',
    CURRENT_DATE,
    19,                                                           -- 19h
    30,                                                           -- 30 minutes
    'Course urgente - Client prioritaire',
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
    distance_km,
    commentaire,
    created_at
FROM reservations 
WHERE depart_nom LIKE '%Combs%'
  AND statut = 'pending'
ORDER BY created_at DESC
LIMIT 10;

-- ===============================================
-- TEST ZONE GÉOGRAPHIQUE 5KM
-- ===============================================
-- Vérifier les conducteurs qui recevront la notification
-- (dans un rayon de 5km de la gare de Combs-la-Ville)

SELECT 
    c.id,
    c.nom,
    c.prenom,
    c.vehicle_type,
    c.telephone,
    ST_Distance(
        c.position_actuelle::geography,
        ST_GeomFromText('POINT(2.5655 48.6642)', 4326)::geography
    ) / 1000 as distance_km
FROM conducteurs c
WHERE c.actif = true
  AND c.hors_ligne = false
  AND ST_DWithin(
      c.position_actuelle::geography,
      ST_GeomFromText('POINT(2.5655 48.6642)', 4326)::geography,
      5000  -- 5km en mètres
  )
ORDER BY distance_km ASC;

-- ===============================================
-- POUR DÉCLENCHER LES NOTIFICATIONS OneSignal
-- ===============================================
-- Après insertion, exécuter:
-- https://www.labico.net/Taxi/ProcessPendingReservationNotifications

-- ===============================================
-- RÉSUMÉ DES RÉSERVATIONS COMBS-LA-VILLE
-- ===============================================
-- 1. Combs → Orly (07h45) - 35€ - Voiture
-- 2. Combs → Gare de Lyon (08h30) - 45€ - Voiture  
-- 3. Combs → Carré Sénart (12h00) - 15€ - MOTO
-- 4. Combs → Melun (18h15) - 20€ - Voiture
-- 5. Combs → Évry (19h30) - 30€ - Voiture

-- ===============================================
-- NOTIFICATIONS ATTENDUES
-- ===============================================
-- 🔊 Son claxon personnalisé
-- 📍 Message: "Gare de Combs-la-Ville → [Destination]"
-- 🟢 LED verte + vibration pattern
-- ✅ Channel ID OneSignal configuré