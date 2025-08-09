-- ========================================
-- TEST SYSTÈME NOUVELLES RÉSERVATIONS - CRÉATION RÉSERVATION PENDING
-- Date: 2025-01-08
-- Conducteur Test: 69e0cde9-14a0-4dde-86c1-1fe9a306f2fa (balde)
-- Position conducteur: POINT(2.5891222 48.6277095) - Lieusaint
-- ========================================

-- 1. VÉRIFIER POSITION ET STATUS DU CONDUCTEUR DE TEST
SELECT 
    id,
    nom,
    telephone,
    vehicle_type,
    hors_ligne,
    ST_AsText(position_actuelle::geometry) as position_readable,
    ST_X(position_actuelle::geometry) as longitude,
    ST_Y(position_actuelle::geometry) as latitude
FROM conducteurs 
WHERE id = '69e0cde9-14a0-4dde-86c1-1fe9a306f2fa';

-- 2. CRÉER UNE RÉSERVATION PENDING PROCHE DU CONDUCTEUR (< 5KM)
INSERT INTO reservations (
    client_phone, 
    depart_nom, 
    destination_nom,
    position_depart, 
    vehicle_type,
    statut,
    prix_total,
    created_at,
    updated_at
) VALUES (
    '+33622111111', 
    'TEST PENDING - Lieusaint Gare RER', 
    'TEST PENDING - Paris République',
    ST_GeomFromText('POINT(2.5850000 48.6250000)', 4326),  -- Proche de Lieusaint (< 5km)
    'moto',  -- Correspond au vehicle_type du conducteur
    'pending',  -- STATUT PENDING pour notifications
    40.00,
    NOW(),
    NOW()
);

-- 3. VÉRIFIER LA RÉSERVATION CRÉÉE
SELECT 
    id,
    depart_nom,
    destination_nom,
    vehicle_type,
    statut,
    notified_at,  -- Doit être NULL avant notification
    ST_AsText(position_depart::geometry) as position_depart_readable,
    created_at
FROM reservations 
WHERE depart_nom LIKE 'TEST PENDING%' 
ORDER BY created_at DESC 
LIMIT 1;

-- 4. TEST DISTANCE - Vérifier que le conducteur est dans les 5km
SELECT 
    c.id as conducteur_id,
    c.nom,
    c.vehicle_type,
    c.hors_ligne,
    r.id as reservation_id,
    r.depart_nom,
    r.vehicle_type as reservation_vehicle_type,
    ROUND(
        (ST_Distance(c.position_actuelle::geometry, r.position_depart::geometry) / 1000)::numeric, 
        2
    ) as distance_km,
    CASE 
        WHEN ST_DWithin(c.position_actuelle::geometry, r.position_depart::geometry, 5000) 
        THEN '✅ DANS RAYON 5KM' 
        ELSE '❌ HORS RAYON 5KM' 
    END as dans_rayon
FROM conducteurs c
CROSS JOIN reservations r
WHERE c.id = '69e0cde9-14a0-4dde-86c1-1fe9a306f2fa'
  AND r.depart_nom LIKE 'TEST PENDING%'
  AND r.statut = 'pending'
ORDER BY r.created_at DESC
LIMIT 1;

-- 5. SIMULATION DE LA REQUÊTE DU POLLING
-- Cette requête simule exactement ce que fait ProcessPendingReservationNotifications()
SELECT 
    r.id,
    r.depart_nom,
    r.destination_nom,
    r.vehicle_type,
    r.position_depart,
    r.prix_total,
    r.created_at
FROM reservations r
WHERE r.statut = 'pending'
  AND r.notified_at IS NULL
  AND r.depart_nom LIKE 'TEST PENDING%'
ORDER BY r.created_at DESC;

-- 6. TEST FONCTION find_nearby_conducteurs_by_vehicle DIRECTEMENT
-- Remplacez POINT_WKB par la position de départ de votre réservation
-- SELECT * FROM find_nearby_conducteurs_by_vehicle(
--     'POINT(2.5850000 48.6250000)',  -- Position de départ
--     'moto',                          -- Type véhicule
--     5                                -- Distance max 5km
-- );