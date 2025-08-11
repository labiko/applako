-- ========================================
-- FONCTION - RÉCUPÉRER RÉSERVATIONS PENDING + SCHEDULED DANS 5KM
-- ========================================

-- Supprimer la fonction si elle existe
DROP FUNCTION IF EXISTS get_reservations_nearby_conducteur_all(text, integer);

-- Créer la fonction pour récupérer pending ET scheduled dans le rayon
CREATE OR REPLACE FUNCTION get_reservations_nearby_conducteur_all(
    p_conducteur_id TEXT,
    p_max_distance_km INTEGER DEFAULT 5
)
RETURNS TABLE (
    id UUID,
    client_phone TEXT,
    vehicle_type TEXT,
    position_depart GEOGRAPHY,
    statut TEXT,
    created_at TIMESTAMPTZ,
    conducteur_id UUID,
    destination_nom TEXT,
    destination_id UUID,
    position_arrivee GEOGRAPHY,
    distance_km NUMERIC,
    prix_total NUMERIC,
    prix_par_km NUMERIC,
    tarif_applique TEXT,
    code_validation INTEGER,
    updated_at TIMESTAMPTZ,
    date_reservation DATE,
    heure_reservation INTEGER,
    minute_reservation INTEGER,
    date_code_validation TIMESTAMPTZ,
    commentaire TEXT,
    note_conducteur INTEGER,
    date_add_commentaire TIMESTAMPTZ,
    versement_id UUID,
    destination_position GEOGRAPHY,
    depart_nom TEXT,
    notified_at TIMESTAMPTZ,
    cancellation_notified_at TIMESTAMPTZ
)
LANGUAGE SQL
AS $$
    -- Récupérer les réservations pending ET scheduled
    -- dans le rayon de X km du conducteur connecté
    SELECT 
        r.id,
        r.client_phone,
        r.vehicle_type,
        r.position_depart,
        r.statut,
        r.created_at,
        r.conducteur_id,
        r.destination_nom,
        r.destination_id,
        r.position_arrivee,
        r.distance_km,
        r.prix_total,
        r.prix_par_km,
        r.tarif_applique,
        r.code_validation,
        r.updated_at,
        r.date_reservation,
        r.heure_reservation,
        r.minute_reservation,
        r.date_code_validation,
        r.commentaire,
        r.note_conducteur,
        r.date_add_commentaire,
        r.versement_id,
        r.destination_position,
        r.depart_nom,
        r.notified_at,
        r.cancellation_notified_at
    FROM reservations r
    JOIN conducteurs c ON c.id = p_conducteur_id::UUID
    WHERE 
        -- Réservations pending ET scheduled non assignées
        r.statut IN ('pending', 'scheduled')
        AND r.conducteur_id IS NULL
        
        -- Type de véhicule compatible
        AND r.vehicle_type = c.vehicle_type
        
        -- Dans le rayon de X km
        AND ST_DWithin(
            c.position_actuelle,
            r.position_depart,
            p_max_distance_km * 1000  -- Conversion km vers mètres
        )
        
        -- Conducteur en ligne (pas hors_ligne)
        AND c.hors_ligne = false
    
    ORDER BY 
        -- Priorité : pending avant scheduled
        CASE WHEN r.statut = 'pending' THEN 1 ELSE 2 END,
        -- Puis par date de réservation pour les scheduled
        CASE WHEN r.statut = 'scheduled' THEN r.date_reservation END NULLS LAST,
        -- Puis par heure pour les scheduled
        CASE WHEN r.statut = 'scheduled' THEN r.heure_reservation END NULLS LAST,
        -- Enfin par date de création
        r.created_at ASC;
$$;

-- Test de la fonction
SELECT 
    'Test fonction get_reservations_nearby_conducteur_all' as test,
    statut,
    date_reservation,
    heure_reservation,
    minute_reservation,
    depart_nom,
    destination_nom
FROM get_reservations_nearby_conducteur_all('69e0cde9-14a0-4dde-86c1-1fe9a306f2fa', 5)
ORDER BY 
    CASE WHEN statut = 'pending' THEN 1 ELSE 2 END,
    date_reservation,
    heure_reservation;