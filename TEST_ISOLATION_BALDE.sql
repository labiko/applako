-- ========================================
-- TEST ISOLATION - DÉSACTIVER AUTRES CONDUCTEURS
-- ========================================

-- 1. VOIR TOUS LES CONDUCTEURS MOTO ACTIFS
SELECT 
    id,
    nom,
    hors_ligne,
    ST_AsText(position_actuelle::geometry) as position
FROM conducteurs 
WHERE vehicle_type = 'moto'
ORDER BY nom;

-- 2. METTRE TOUS LES CONDUCTEURS MOTO HORS LIGNE SAUF BALDE
UPDATE conducteurs 
SET hors_ligne = true 
WHERE vehicle_type = 'moto' 
  AND id != '69e0cde9-14a0-4dde-86c1-1fe9a306f2fa';

-- 3. VÉRIFIER QUE SEUL BALDE EST EN LIGNE
SELECT 
    id,
    nom,
    hors_ligne,
    'Seul conducteur moto actif' as statut
FROM conducteurs 
WHERE vehicle_type = 'moto'
  AND hors_ligne = false;

-- 4. RÉINITIALISER LA RÉSERVATION GARE DE LYON
UPDATE reservations 
SET notified_at = NULL 
WHERE depart_nom LIKE '%Gare de Lyon%';

-- 5. TEST AVEC SEULEMENT BALDE ACTIF
SELECT 
    'Test avec seulement balde actif' as test,
    COUNT(*) as nb_conducteurs,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ CORRECT - Aucun conducteur (balde trop loin)'
        ELSE '❌ PROBLÈME - Conducteurs trouvés'
    END as resultat
FROM find_nearby_conducteurs_by_vehicle(
    'POINT(2.3734 48.8443)',  -- Gare de Lyon
    'moto',
    5
);

-- MAINTENANT, RELANCEZ LE POLLING:
-- /Taxi/ProcessPendingReservationNotifications
-- 
-- RÉSULTAT ATTENDU:
-- - La réservation Gare de Lyon ne devrait notifier PERSONNE
-- - Balde ne devrait PAS recevoir de notification