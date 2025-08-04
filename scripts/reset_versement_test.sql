-- Script pour réinitialiser un versement spécifique pour retester
-- ID du versement : f6fe5e8c-aa33-41ec-af9e-4e4cbb979c84

-- 1. Supprimer le versement spécifique
DELETE FROM versements 
WHERE id = 'f6fe5e8c-aa33-41ec-af9e-4e4cbb979c84';

-- 2. Remettre les réservations liées à ce versement en état "non versées"
-- (enlever le versement_id pour qu'elles redeviennent disponibles)
UPDATE reservations 
SET versement_id = NULL 
WHERE versement_id = 'f6fe5e8c-aa33-41ec-af9e-4e4cbb979c84';

-- 3. Vérification : Afficher les réservations qui sont maintenant disponibles pour versement
SELECT 
    r.id,
    r.destination_nom,
    r.prix_total,
    c.prenom,
    c.nom,
    r.created_at,
    r.date_code_validation
FROM reservations r
JOIN conducteurs c ON r.conducteur_id = c.id
WHERE r.statut = 'completed' 
    AND r.date_code_validation IS NOT NULL 
    AND r.versement_id IS NULL
ORDER BY c.nom, r.created_at;

-- 4. Optionnel : Nettoyer les logs SMS liés à ce versement
DELETE FROM sms_logs 
WHERE reference LIKE '%f6fe5e8c%' 
    OR message LIKE '%f6fe5e8c%';

-- 5. Optionnel : Supprimer les litiges liés à ce versement
DELETE FROM litiges_versement 
WHERE versement_id = 'f6fe5e8c-aa33-41ec-af9e-4e4cbb979c84';

COMMIT;