-- ========================================
-- TEST - DUPLIQUER LA MÊME RÉSERVATION POUR BALDE
-- ========================================

-- Insérer exactement la même réservation avec un nouvel ID
INSERT INTO reservations (
    id,
    client_phone, 
    vehicle_type, 
    position_depart,
    statut,
    created_at,
    conducteur_id,
    destination_nom,
    destination_id,
    position_arrivee,
    distance_km,
    prix_total,
    prix_par_km,
    tarif_applique,
    code_validation,
    updated_at,
    date_reservation,
    heure_reservation,
    minute_reservation,
    date_code_validation,
    commentaire,
    note_conducteur,
    date_add_commentaire,
    versement_id,
    destination_position,
    depart_nom,
    notified_at,
    cancellation_notified_at
) VALUES (
    gen_random_uuid(),                                          -- Nouvel ID unique
    '+33620951645',                                            -- Même client_phone
    'moto',                                                    -- Même vehicle_type
    '0101000020E6100000E5E1F3797BB6044056B6B4BF58504840',     -- Même position_depart (Lieusaint)
    'pending',                                                 -- Statut pending pour déclencher notification
    NOW(),                                                     -- Créé maintenant
    null,                                                      -- Pas encore de conducteur assigné
    'Ahmed Sékou Touré International Airport',                -- Même destination
    null,                                                      -- Même destination_id
    '0101000020E610000004B39D4A613D2BC00B8C063AA4262340',     -- Même position_arrivee
    4598.13,                                                   -- Même distance
    13795000.00,                                              -- Même prix
    null,                                                      -- Même prix_par_km
    null,                                                      -- Même tarif_applique
    9898,                                                      -- Même code_validation
    NOW(),                                                     -- Mis à jour maintenant
    null,                                                      -- Même date_reservation
    null,                                                      -- Même heure_reservation
    null,                                                      -- Même minute_reservation
    null,                                                      -- Même date_code_validation
    null,                                                      -- Même commentaire
    null,                                                      -- Même note_conducteur
    null,                                                      -- Même date_add_commentaire
    null,                                                      -- Même versement_id
    null,                                                      -- Même destination_position
    null,                                                      -- Même depart_nom
    null,                                                      -- ⚠️ IMPORTANT: notified_at = NULL pour déclencher notification
    null                                                       -- Même cancellation_notified_at
);

-- Vérifier l'insertion
SELECT 
    'Nouvelle réservation insérée' as info,
    id,
    client_phone,
    vehicle_type,
    depart_nom,
    destination_nom,
    statut,
    notified_at,
    created_at
FROM reservations 
WHERE client_phone = '+33620951645'
ORDER BY created_at DESC
LIMIT 1;

-- Vérifier que Balde est trouvé pour cette réservation
SELECT 
    'Conducteurs trouvés pour cette réservation' as test,
    f.id,
    c.nom,
    f.distance_km
FROM find_nearby_conducteurs_by_vehicle(
    '0101000020E6100000E5E1F3797BB6044056B6B4BF58504840',  -- Position départ
    'moto',
    5
) f
JOIN conducteurs c ON c.id = f.id
ORDER BY f.distance_km;