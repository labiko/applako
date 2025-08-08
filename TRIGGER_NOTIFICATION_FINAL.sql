-- ========================================
-- TRIGGER ONESIGNAL POUR NOTIFICATIONS PUSH
-- URL Production: https://www.labico.net/Taxi/send
-- ========================================

-- ========== FONCTION TRIGGER notify_nearby_conducteurs ==========
CREATE OR REPLACE FUNCTION notify_nearby_conducteurs()
RETURNS TRIGGER AS $$
DECLARE
    conducteur_record RECORD;
    notification_payload TEXT;
    http_request_id BIGINT;
BEGIN
    -- Vérifier si nouvelle réservation avec statut 'pending'
    IF TG_OP = 'INSERT' AND NEW.statut = 'pending' THEN
        
        RAISE NOTICE 'TRIGGER: Nouvelle réservation ID % - %', NEW.id, NEW.depart_nom;
        
        -- Parcourir tous les conducteurs dans un rayon de 5km
        FOR conducteur_record IN 
            SELECT 
                c.id,
                c.nom,
                c.telephone,
                c.player_id,
                c.vehicle_type,
                ROUND(
                    (ST_Distance(
                        c.position_actuelle::geometry, 
                        NEW.position_depart::geometry
                    ) / 1000)::numeric, 2
                ) as distance_km
            FROM conducteurs c
            WHERE c.hors_ligne = false 
              AND c.player_id IS NOT NULL 
              AND c.player_id != ''
              AND ST_DWithin(
                  c.position_actuelle::geometry,
                  NEW.position_depart::geometry,
                  5000  -- 5km en mètres
              )
            ORDER BY 
                ST_Distance(c.position_actuelle::geometry, NEW.position_depart::geometry)
        LOOP
            
            RAISE NOTICE 'TRIGGER: Notification vers conducteur % (%) - Distance: %km - Player ID: %', 
                conducteur_record.nom, 
                conducteur_record.telephone,
                conducteur_record.distance_km,
                conducteur_record.player_id;

            -- Construire le payload JSON pour l'API ASP.NET
            notification_payload := json_build_object(
                'reservationId', NEW.id,
                'playerId', conducteur_record.player_id,
                'departNom', NEW.depart_nom,
                'destinationNom', NEW.destination_nom,
                'prixTotal', COALESCE(NEW.prix_total, 0),
                'distanceKm', conducteur_record.distance_km,
                'conducteurId', conducteur_record.id,
                'vehicleType', COALESCE(conducteur_record.vehicle_type, 'voiture'),
                'createdAt', NEW.created_at::text
            )::text;

            RAISE NOTICE 'TRIGGER: Payload JSON: %', notification_payload;

            -- Appel HTTP vers API ASP.NET Production
            BEGIN
                SELECT http_post INTO http_request_id FROM http_post(
                    'https://www.labico.net/Taxi/send',  -- URL PRODUCTION
                    notification_payload,
                    'application/json'
                );
                
                RAISE NOTICE 'TRIGGER: HTTP Request ID % envoyé vers API ASP.NET pour conducteur %', 
                    http_request_id, conducteur_record.nom;
                    
            EXCEPTION WHEN OTHERS THEN
                RAISE WARNING 'TRIGGER: Erreur HTTP pour conducteur % - %: %', 
                    conducteur_record.nom, 
                    conducteur_record.player_id, 
                    SQLERRM;
            END;
            
        END LOOP;
        
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ========== TRIGGER SUR TABLE RESERVATIONS ==========
-- Supprimer trigger existant s'il existe
DROP TRIGGER IF EXISTS trigger_notify_conducteurs ON reservations;

-- Créer le nouveau trigger
CREATE TRIGGER trigger_notify_conducteurs
    AFTER INSERT ON reservations
    FOR EACH ROW
    EXECUTE FUNCTION notify_nearby_conducteurs();

-- ========== VÉRIFICATIONS ET TESTS ==========

-- Vérifier que le trigger est créé
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    trigger_schema
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_notify_conducteurs';

-- Afficher les conducteurs disponibles pour notification
SELECT 
    c.id,
    c.nom,
    c.telephone,
    c.player_id,
    c.hors_ligne,
    c.vehicle_type,
    ST_AsText(c.position_actuelle) as position_gps
FROM conducteurs c
WHERE c.player_id IS NOT NULL 
  AND c.player_id != ''
ORDER BY c.nom;

-- ========== FONCTION TEST DÉDIÉE ==========
CREATE OR REPLACE FUNCTION test_insert_reservation_lieusaint(
    test_client_phone TEXT DEFAULT '+33123TEST123'
) RETURNS UUID AS $$
DECLARE
    new_reservation_id UUID;
BEGIN
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
        test_client_phone,
        'Test Lieusaint Centre',
        'Test Destination',
        ST_GeomFromText('POINT(2.5847236 48.6273519)', 4326),
        ST_GeomFromText('POINT(2.5589 48.6306)', 4326),
        18.50,
        'voiture',
        'pending',
        NOW()
    ) RETURNING id INTO new_reservation_id;
    
    RAISE NOTICE 'Réservation de test créée avec ID: %', new_reservation_id;
    RAISE NOTICE 'Vérifiez les logs du trigger pour les notifications envoyées';
    
    RETURN new_reservation_id;
END;
$$ LANGUAGE plpgsql;

-- Test fonction avec réservation Lieusaint
-- Exécuter seulement après avoir vérifié les conducteurs ci-dessus
-- SELECT test_insert_reservation_lieusaint();

-- Messages de confirmation (remplace RAISE NOTICE par des commentaires)
-- ========================================
-- TRIGGER ONESIGNAL CONFIGURÉ AVEC SUCCÈS
-- URL API: https://www.labico.net/Taxi/send  
-- ========================================