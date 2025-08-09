-- ========================================
-- TEST COMPLET DU SYSTÈME - NOUVELLES + ANNULATIONS
-- Date: 2025-01-08
-- Conducteur Test: 69e0cde9-14a0-4dde-86c1-1fe9a306f2fa (balde)
-- ========================================

-- =======================
-- PARTIE 1: TEST NOUVELLE RÉSERVATION PROCHE
-- =======================

-- 1.1 CRÉER RÉSERVATION PROCHE DE BALDE (< 5KM)
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
    '+33612345678', 
    'TEST BALDE - Lieusaint Mairie', 
    'TEST BALDE - Melun Centre',
    ST_GeomFromText('POINT(2.5820000 48.6280000)', 4326),  -- Très proche de balde
    'moto',
    'pending',
    25.00,
    NOW(),
    NOW()
);

-- 1.2 VÉRIFIER DISTANCE
SELECT 
    'Test distance balde' as test,
    ROUND((ST_Distance(
        (SELECT position_actuelle FROM conducteurs WHERE id = '69e0cde9-14a0-4dde-86c1-1fe9a306f2fa'),
        ST_GeomFromText('POINT(2.5820000 48.6280000)', 4326)::geography
    ) / 1000)::numeric, 2) as distance_km,
    '✅ Devrait être < 1km' as expected;

-- 1.3 APRÈS POLLING, VÉRIFIER NOTIFICATION
-- Appelez: /Taxi/ProcessPendingReservationNotifications
-- Balde DOIT recevoir la notification

SELECT 
    id,
    depart_nom,
    notified_at,
    CASE 
        WHEN notified_at IS NOT NULL THEN '✅ Notification envoyée'
        ELSE '⏳ En attente'
    END as statut
FROM reservations 
WHERE depart_nom LIKE 'TEST BALDE%'
ORDER BY created_at DESC;

-- =======================
-- PARTIE 2: TEST ANNULATION
-- =======================

-- 2.1 SIMULER ACCEPTATION PAR BALDE
UPDATE reservations 
SET statut = 'accepted',
    conducteur_id = '69e0cde9-14a0-4dde-86c1-1fe9a306f2fa',
    updated_at = NOW()
WHERE depart_nom = 'TEST BALDE - Lieusaint Mairie'
  AND statut = 'pending';

-- 2.2 VÉRIFIER ASSIGNATION
SELECT 
    id,
    depart_nom,
    statut,
    conducteur_id,
    '✅ Réservation assignée à balde' as info
FROM reservations 
WHERE depart_nom = 'TEST BALDE - Lieusaint Mairie';

-- 2.3 SIMULER ANNULATION CLIENT
UPDATE reservations 
SET statut = 'canceled',
    updated_at = NOW()
WHERE depart_nom = 'TEST BALDE - Lieusaint Mairie'
  AND conducteur_id = '69e0cde9-14a0-4dde-86c1-1fe9a306f2fa';

-- 2.4 VÉRIFIER RÉSERVATION ANNULÉE
SELECT 
    id,
    depart_nom,
    statut,
    conducteur_id,
    cancellation_notified_at,
    CASE 
        WHEN cancellation_notified_at IS NULL THEN '⏳ En attente notification annulation'
        ELSE '✅ Notification annulation envoyée'
    END as statut_notif
FROM reservations 
WHERE depart_nom = 'TEST BALDE - Lieusaint Mairie';

-- 2.5 APRÈS POLLING ANNULATION
-- Appelez: /Taxi/ProcessCancelledReservationNotifications
-- Balde DOIT recevoir notification d'annulation (rouge)

-- =======================
-- PARTIE 3: VÉRIFICATION FINALE
-- =======================

-- 3.1 RÉSUMÉ DES TESTS
SELECT 
    'NOUVELLES RÉSERVATIONS' as type_test,
    COUNT(CASE WHEN notified_at IS NOT NULL THEN 1 END) as notifiees,
    COUNT(*) as total
FROM reservations 
WHERE statut = 'pending'
  AND depart_nom LIKE 'TEST%'
UNION ALL
SELECT 
    'ANNULATIONS' as type_test,
    COUNT(CASE WHEN cancellation_notified_at IS NOT NULL THEN 1 END) as notifiees,
    COUNT(*) as total
FROM reservations 
WHERE statut = 'canceled'
  AND conducteur_id IS NOT NULL
  AND depart_nom LIKE 'TEST%';

-- 3.2 NETTOYER LES TESTS (OPTIONNEL)
-- DELETE FROM reservations WHERE depart_nom LIKE 'TEST%';