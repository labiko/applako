-- DEBUG POURQUOI BALDE N'A PAS REÇU LA NOTIFICATION

-- 1. VÉRIFIER BALDE DANS LA BASE
SELECT 
    id,
    nom,
    prenom,
    telephone,
    vehicle_type,
    actif,
    hors_ligne,
    ST_AsText(position_actuelle) as position,
    derniere_activite
FROM conducteurs
WHERE LOWER(nom) LIKE '%balde%' OR LOWER(prenom) LIKE '%balde%';

-- 2. DISTANCE DE BALDE PAR RAPPORT À COMBS-LA-VILLE
SELECT 
    c.nom,
    c.prenom,
    c.vehicle_type,
    c.actif,
    c.hors_ligne,
    ST_Distance(
        c.position_actuelle::geography,
        ST_GeomFromText('POINT(2.5655 48.6642)', 4326)::geography
    ) / 1000 as distance_km
FROM conducteurs c
WHERE LOWER(c.nom) LIKE '%balde%' OR LOWER(c.prenom) LIKE '%balde%';

-- 3. TOUS LES CONDUCTEURS QUI ONT REÇU LA NOTIFICATION
SELECT 
    c.id,
    c.nom,
    c.prenom,
    c.vehicle_type,
    ST_Distance(
        c.position_actuelle::geography,
        ST_GeomFromText('POINT(2.5655 48.6642)', 4326)::geography
    ) / 1000 as distance_km
FROM conducteurs c
WHERE c.actif = true
  AND c.hors_ligne = false
  AND c.vehicle_type = 'voiture'
  AND ST_DWithin(
      c.position_actuelle::geography,
      ST_GeomFromText('POINT(2.5655 48.6642)', 4326)::geography,
      5000
  )
ORDER BY distance_km ASC;