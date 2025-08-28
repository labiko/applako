-- Vue pour les réservations complétées avec détection automatique Mobile Money/Cash
-- Cette vue remplace les requêtes complexes dans VersementService
-- EXÉCUTER DANS SUPABASE SQL EDITOR

CREATE OR REPLACE VIEW reservations_completed_view AS
SELECT 
    r.id,
    r.client_phone,
    r.vehicle_type,
    r.position_depart,
    r.position_arrivee,
    r.depart_nom,
    r.destination_nom,
    r.statut,
    r.conducteur_id,
    r.distance_km,
    r.prix_total,
    r.date_reservation,
    r.heure_reservation,
    r.minute_reservation,
    r.created_at,
    r.updated_at,
    r.code_validation,
    r.date_code_validation,
    r.commentaire,
    r.note_conducteur,
    r.date_add_commentaire,
    r.versement_id,
    -- Informations conducteur (nécessaires pour le service)
    c.nom as conducteur_nom,
    c.prenom as conducteur_prenom,
    c.telephone as conducteur_telephone,
    c.entreprise_id,
    -- 🆕 NOUVELLE FONCTIONNALITÉ: Détection automatique du mode de paiement
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM lengopay_payments lp 
            WHERE lp.reservation_id = r.id 
            AND lp.status = 'SUCCESS'
        ) 
        THEN 'mobile_money'
        ELSE 'cash'
    END as mode_paiement
FROM reservations r
INNER JOIN conducteurs c ON r.conducteur_id = c.id
WHERE 
    r.statut = 'completed';

-- 🆕 VUE SPÉCIALISÉE POUR TOUS LES ONGLETS VERSEMENTS - CASH UNIQUEMENT
CREATE OR REPLACE VIEW reservations_cash_view AS
SELECT 
    r.id,
    r.client_phone,
    r.vehicle_type,
    r.position_depart,
    r.position_arrivee,
    r.depart_nom,
    r.destination_nom,
    r.statut,
    r.conducteur_id,
    r.distance_km,
    r.prix_total,
    r.date_reservation,
    r.heure_reservation,
    r.minute_reservation,
    r.created_at,
    r.updated_at,
    r.code_validation,
    r.date_code_validation,
    r.commentaire,
    r.note_conducteur,
    r.date_add_commentaire,
    r.versement_id,
    -- Informations conducteur (nécessaires pour le service)
    c.nom as conducteur_nom,
    c.prenom as conducteur_prenom,
    c.telephone as conducteur_telephone,
    c.entreprise_id,
    -- Mode paiement fixé à 'cash' pour cette vue
    'cash' as mode_paiement
FROM reservations r
INNER JOIN conducteurs c ON r.conducteur_id = c.id
WHERE 
    r.statut = 'completed'
    -- 🔑 FILTRE CASH UNIQUEMENT: Exclure les paiements Mobile Money réussis
    AND NOT EXISTS (
        SELECT 1 
        FROM lengopay_payments lp 
        WHERE lp.reservation_id = r.id 
        AND lp.status = 'SUCCESS'
    );

-- 🆕 VUE SPÉCIALISÉE POUR L'ONGLET "À VERSER" - CASH PRÊT À VERSER
CREATE OR REPLACE VIEW reservations_cash_a_verser_view AS
SELECT *
FROM reservations_cash_view
WHERE 
    date_code_validation IS NOT NULL  -- Réservation validée
    AND versement_id IS NULL;         -- Pas encore versée

-- Commentaires pour la documentation
COMMENT ON VIEW reservations_completed_view IS 'Vue optimisée pour toutes les réservations complétées avec détection automatique Mobile Money/Cash via lengopay_payments. Utilisée pour les rapports et analyses globales.';

COMMENT ON VIEW reservations_cash_view IS 'Vue principale pour TOUS les onglets de la page VERSEMENTS - contient uniquement les réservations CASH (exclut automatiquement Mobile Money). Base pour tous les onglets.';

COMMENT ON VIEW reservations_cash_a_verser_view IS 'Vue spécialisée pour l''onglet "À VERSER" - sous-ensemble de reservations_cash_view avec filtres supplémentaires (validées et non versées). Utilisée par getMontantsAVerser().';

-- INSTRUCTIONS D'INSTALLATION:
-- 1. Ouvrir Supabase Dashboard
-- 2. Aller dans "SQL Editor" 
-- 3. Coller et exécuter ce script
-- 4. Vérifier que la vue est créée dans "Database" > "Views"