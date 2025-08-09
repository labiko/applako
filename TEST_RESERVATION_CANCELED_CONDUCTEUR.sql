-- ========================================
-- TEST SYSTÈME ANNULATION - CRÉATION RÉSERVATION ANNULÉE
-- Date: 2025-01-08
-- Conducteur Test: 69e0cde9-14a0-4dde-86c1-1fe9a306f2fa (balde)
-- ========================================

-- 1. CRÉER UNE RÉSERVATION ASSIGNÉE AU CONDUCTEUR DE TEST
INSERT INTO reservations (
    client_phone, 
    depart_nom, 
    destination_nom,
    position_depart, 
    vehicle_type,
    statut,
    conducteur_id,  -- IMPORTANT: Assignée à notre conducteur test
    prix_total,
    created_at,
    updated_at
) VALUES (
    '+33622111111', 
    'TEST ANNULATION - Lieusaint Centre', 
    'TEST ANNULATION - Paris Bastille',
    ST_GeomFromText('POINT(2.5891222 48.6277095)', 4326), 
    'moto',  -- Correspond au vehicle_type du conducteur
    'canceled',  -- STATUT ANNULÉ pour test
    '69e0cde9-14a0-4dde-86c1-1fe9a306f2fa',  -- ID conducteur test
    35.00,
    NOW(),
    NOW()
);

-- 2. VÉRIFIER LA RÉSERVATION CRÉÉE
SELECT 
    id,
    conducteur_id,
    depart_nom,
    destination_nom,
    vehicle_type,
    statut,
    cancellation_notified_at,  -- Doit être NULL
    created_at,
    updated_at
FROM reservations 
WHERE depart_nom LIKE 'TEST ANNULATION%' 
ORDER BY created_at DESC 
LIMIT 1;

-- 3. VÉRIFIER LES CRITÈRES DE SÉLECTION DU POLLING
-- Cette requête simule ce que fait ProcessCancelledReservationNotifications()
SELECT 
    id,
    conducteur_id,
    depart_nom,
    destination_nom,
    vehicle_type,
    prix_total,
    updated_at
FROM reservations 
WHERE statut = 'canceled'
  AND conducteur_id IS NOT NULL
  AND conducteur_id = '69e0cde9-14a0-4dde-86c1-1fe9a306f2fa'
  AND cancellation_notified_at IS NULL  -- Pas encore notifiée
ORDER BY updated_at DESC;

-- 4. OPTIONNEL: VOIR TOUTES LES RÉSERVATIONS DU CONDUCTEUR
SELECT 
    id,
    depart_nom,
    statut,
    conducteur_id,
    cancellation_notified_at,
    notified_at,
    updated_at
FROM reservations 
WHERE conducteur_id = '69e0cde9-14a0-4dde-86c1-1fe9a306f2fa'
ORDER BY updated_at DESC
LIMIT 5;