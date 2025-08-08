-- ========================================
-- SCRIPT TEST - INSERTION RÉSERVATION
-- Test notification External User IDs
-- ========================================

-- 1. VÉRIFIER LES CONDUCTEURS DISPONIBLES
SELECT 
    c.id,
    c.nom,
    c.telephone,
    'conducteur_' || c.id as external_user_id,
    c.hors_ligne,
    c.vehicle_type,
    ST_AsText(c.position_actuelle) as position_gps
FROM conducteurs c
WHERE c.hors_ligne = false
  AND c.id IS NOT NULL
ORDER BY c.nom;

-- 2. INSERTION TEST RÉSERVATION LIEUSAINT
-- Coordonnées GPS Lieusaint Centre: 2.5847236, 48.6273519
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
    'TEST Lieusaint Centre',
    'TEST Destination Paris',
    ST_GeomFromText('POINT(2.5847236 48.6273519)', 4326),  -- Lieusaint
    ST_GeomFromText('POINT(2.3522 48.8566)', 4326),        -- Paris
    25.50,
    'voiture',
    'pending',  -- DÉCLENCHE LE TRIGGER
    NOW()
) RETURNING id, depart_nom, statut;

-- 3. VÉRIFIER QUE LE TRIGGER S'EST EXÉCUTÉ
-- Regardez les logs PostgreSQL pour voir les messages RAISE NOTICE:
-- "TRIGGER EXTERNAL ID: Nouvelle réservation ID ... - TEST Lieusaint Centre"
-- "TRIGGER EXTERNAL ID: Conducteur trouvé ... - External ID: conducteur_..."
-- "TRIGGER EXTERNAL ID: HTTP Request ID ... envoyé - ... conducteurs ciblés"

-- 4. ALTERNATIVE - INSERTION AVEC COORDONNÉES CONAKRY
-- Si vos conducteurs sont à Conakry (Guinée)
/*
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
    '+224123456789',
    'TEST Ratoma Centre',
    'TEST Aéroport Conakry',
    ST_GeomFromText('POINT(-13.7122 9.5092)', 4326),  -- Conakry
    ST_GeomFromText('POINT(-13.6120 9.5770)', 4326),  -- Aéroport
    85000,
    'voiture',
    'pending',
    NOW()
) RETURNING id, depart_nom, statut;
*/

-- 5. NETTOYER APRÈS TEST (OPTIONNEL)
-- Supprimer la réservation de test
-- DELETE FROM reservations WHERE client_phone LIKE '+33123456789';

-- ========================================
-- INSTRUCTIONS :
-- 1. Exécutez d'abord la requête 1 pour voir les conducteurs disponibles
-- 2. Exécutez la requête 2 pour insérer la réservation test
-- 3. Vérifiez les logs PostgreSQL pour les messages du trigger
-- 4. Vérifiez sur votre téléphone mobile si la notification arrive
-- ========================================