-- ========================================
-- TRIGGER ONESIGNAL AVEC EXTERNAL USER IDs
-- URL Production: https://www.labico.net/Taxi/send
-- Format: include_external_user_ids = ["conducteur_ID1", "conducteur_ID2"]
-- ========================================

-- ========== FONCTION TRIGGER notify_nearby_conducteurs_external ==========
CREATE OR REPLACE FUNCTION notify_nearby_conducteurs_external()
RETURNS TRIGGER AS $$
DECLARE
    conducteur_record RECORD;
    notification_payload TEXT;
    http_request_id BIGINT;
    conducteurs_list TEXT[];
    external_user_id TEXT;
BEGIN
    -- Vérifier si nouvelle réservation avec statut 'pending'
    IF TG_OP = 'INSERT' AND NEW.statut = 'pending' THEN
        
        RAISE NOTICE 'TRIGGER EXTERNAL ID: Nouvelle réservation ID % - %', NEW.id, NEW.depart_nom;
        
        -- Initialiser le tableau des External User IDs
        conducteurs_list := ARRAY[]::TEXT[];
        
        -- Parcourir tous les conducteurs dans un rayon de 5km
        FOR conducteur_record IN 
            SELECT 
                c.id,
                c.nom,
                c.telephone,
                c.vehicle_type,
                ROUND(
                    (ST_Distance(
                        c.position_actuelle::geometry, 
                        NEW.position_depart::geometry
                    ) / 1000)::numeric, 2
                ) as distance_km
            FROM conducteurs c
            WHERE c.hors_ligne = false 
              AND c.id IS NOT NULL  -- Plus besoin de player_id
              AND ST_DWithin(
                  c.position_actuelle::geometry,
                  NEW.position_depart::geometry,
                  5000  -- 5km en mètres
              )
            ORDER BY 
                ST_Distance(c.position_actuelle::geometry, NEW.position_depart::geometry)
        LOOP
            
            -- Construire External User ID: conducteur_ID
            external_user_id := 'conducteur_' || conducteur_record.id;
            
            -- Ajouter au tableau des conducteurs
            conducteurs_list := conducteurs_list || external_user_id;
            
            RAISE NOTICE 'TRIGGER EXTERNAL ID: Conducteur trouvé % (%) - Distance: %km - External ID: %', 
                conducteur_record.nom, 
                conducteur_record.telephone,
                conducteur_record.distance_km,
                external_user_id;
            
        END LOOP;
        
        -- Envoyer notification seulement s'il y a des conducteurs
        IF array_length(conducteurs_list, 1) > 0 THEN
            
            RAISE NOTICE 'TRIGGER EXTERNAL ID: % conducteurs trouvés dans rayon 5km', array_length(conducteurs_list, 1);
            
            -- Construire le payload JSON pour l'API ASP.NET
            -- IMPORTANT: Utilise include_external_user_ids au lieu de playerId
            notification_payload := json_build_object(
                'reservationId', NEW.id,
                'include_external_user_ids', conducteurs_list,  -- NOUVEAU FORMAT
                'departNom', NEW.depart_nom,
                'destinationNom', NEW.destination_nom,
                'prixTotal', COALESCE(NEW.prix_total, 0),
                'vehicleType', 'voiture',
                'message', 'Nouvelle course disponible: ' || NEW.depart_nom || ' → ' || NEW.destination_nom,
                'createdAt', NEW.created_at::text
            )::text;

            RAISE NOTICE 'TRIGGER EXTERNAL ID: Payload JSON: %', notification_payload;

            -- Appel HTTP vers API ASP.NET Production - Méthode SendNewReservationNotificationToConducteurs
            BEGIN
                SELECT http_post INTO http_request_id FROM http_post(
                    'https://www.labico.net/Taxi/SendNewReservationNotificationToConducteurs',  -- ENDPOINT FINAL
                    notification_payload,
                    'application/json'
                );
                
                RAISE NOTICE 'TRIGGER EXTERNAL ID: HTTP Request ID % envoyé - % conducteurs ciblés', 
                    http_request_id, array_length(conducteurs_list, 1);
                    
            EXCEPTION WHEN OTHERS THEN
                RAISE WARNING 'TRIGGER EXTERNAL ID: Erreur HTTP - %: %', 
                    SQLSTATE, SQLERRM;
            END;
            
        ELSE
            RAISE NOTICE 'TRIGGER EXTERNAL ID: Aucun conducteur trouvé dans rayon 5km';
        END IF;
        
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ========== REMPLACER LE TRIGGER EXISTANT ==========
-- Supprimer tous les anciens triggers
DROP TRIGGER IF EXISTS trigger_notify_conducteurs ON reservations;
DROP TRIGGER IF EXISTS trigger_notify_conducteurs_external ON reservations;

-- Créer le nouveau trigger avec External User IDs
CREATE TRIGGER trigger_notify_conducteurs_external
    AFTER INSERT ON reservations
    FOR EACH ROW
    EXECUTE FUNCTION notify_nearby_conducteurs_external();


-- ========================================
-- TRIGGER EXTERNAL USER IDs CONFIGURÉ - VERSION FINALE
-- URL API: https://www.labico.net/Taxi/SendNewReservationNotificationToConducteurs
-- Méthode C#: SendNewReservationNotificationToConducteurs()
-- Format: include_external_user_ids = ["conducteur_ID1", "conducteur_ID2"]
-- ========================================