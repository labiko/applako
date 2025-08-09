-- ========================================
-- TEST RÉSERVATION HORS ZONE - GARE DE LYON PARIS
-- Date: 2025-01-08
-- Conducteur Test: 69e0cde9-14a0-4dde-86c1-1fe9a306f2fa (balde) à Lieusaint
-- Gare de Lyon: POINT(2.3734 48.8443) - Paris (environ 35km de Lieusaint)
-- ========================================

-- 1. CRÉER UNE RÉSERVATION À GARE DE LYON PARIS (HORS ZONE 5KM)
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
    'TEST PARIS - Gare de Lyon', 
    'TEST PARIS - Aéroport CDG',
    ST_GeomFromText('POINT(2.3734 48.8443)', 4326),  -- Gare de Lyon Paris (~35km de Lieusaint)
    'moto',  -- Même type véhicule pour tester uniquement la distance
    'pending',  -- STATUT PENDING 
    85.00,
    NOW(),
    NOW()
);

-- 2. VÉRIFIER LA RÉSERVATION CRÉÉE
SELECT 
    id,
    depart_nom,
    destination_nom,
    vehicle_type,
    statut,
    notified_at,  -- Doit rester NULL car hors zone
    ST_AsText(position_depart::geometry) as position_depart_readable,
    created_at
FROM reservations 
WHERE depart_nom LIKE 'TEST PARIS%' 
ORDER BY created_at DESC 
LIMIT 1;

-- 3. TEST DISTANCE - VÉRIFIER QUE LE CONDUCTEUR EST HORS ZONE
SELECT 
    c.id as conducteur_id,
    c.nom,
    c.vehicle_type,
    ST_AsText(c.position_actuelle::geometry) as conducteur_position,
    r.id as reservation_id,
    r.depart_nom,
    ROUND(
        (ST_Distance(c.position_actuelle::geometry, r.position_depart::geometry) / 1000)::numeric, 
        2
    ) as distance_km,
    CASE 
        WHEN ST_DWithin(c.position_actuelle::geometry, r.position_depart::geometry, 5000) 
        THEN '✅ DANS RAYON 5KM' 
        ELSE '❌ HORS RAYON 5KM - NE DOIT PAS RECEVOIR DE NOTIFICATION' 
    END as dans_rayon
FROM conducteurs c
CROSS JOIN reservations r
WHERE c.id = '69e0cde9-14a0-4dde-86c1-1fe9a306f2fa'
  AND r.depart_nom LIKE 'TEST PARIS%'
  AND r.statut = 'pending'
ORDER BY r.created_at DESC
LIMIT 1;

-- 4. SIMULATION - AUCUN CONDUCTEUR NE DEVRAIT ÊTRE TROUVÉ DANS 5KM
SELECT 
    c.id,
    c.nom,
    c.telephone,
    ROUND((ST_Distance(
        c.position_actuelle::geometry,
        ST_GeomFromText('POINT(2.3734 48.8443)', 4326)::geometry
    ) / 1000)::numeric, 2) as distance_km
FROM conducteurs c
WHERE c.hors_ligne = false 
  AND c.vehicle_type = 'moto'
  AND ST_DWithin(
      c.position_actuelle::geometry,
      ST_GeomFromText('POINT(2.3734 48.8443)', 4326)::geometry,
      5000  -- 5km
  );
-- RÉSULTAT ATTENDU: Aucune ligne (0 conducteurs trouvés)

-- 5. VÉRIFIER TOUTES LES RÉSERVATIONS PENDING NON NOTIFIÉES
SELECT 
    id,
    depart_nom,
    destination_nom,
    vehicle_type,
    statut,
    notified_at,
    CASE 
        WHEN depart_nom LIKE 'TEST PENDING - Lieusaint%' THEN '✅ PROCHE - Doit être notifiée'
        WHEN depart_nom LIKE 'TEST PARIS%' THEN '❌ LOIN - Ne doit PAS être notifiée'
        ELSE '❓ Autre'
    END as expected_result
FROM reservations 
WHERE statut = 'pending'
  AND notified_at IS NULL
  AND (depart_nom LIKE 'TEST PENDING%' OR depart_nom LIKE 'TEST PARIS%')
ORDER BY created_at DESC;

-- ========================================
-- RÉSULTAT ATTENDU APRÈS POLLING:
-- - Réservation Lieusaint: ✅ Notifiée (notified_at != NULL)
-- - Réservation Paris: ❌ NON notifiée (notified_at = NULL)
-- ========================================