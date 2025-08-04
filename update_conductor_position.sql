-- Script pour mettre à jour la position du conducteur
-- Conducteur ID: 69e0cde9-14a0-4dde-86c1-1fe9a306f2fa
-- Position: 9.535774373554672, -13.682587791486686 (Latitude, Longitude)

UPDATE public.conducteurs 
SET 
    position_actuelle = ST_SetSRID(ST_MakePoint(-13.682587791486686, 9.535774373554672), 4326),
    date_update_position = NOW(),
    derniere_activite = NOW()
WHERE id = '69e0cde9-14a0-4dde-86c1-1fe9a306f2fa';

-- Vérifier la mise à jour
SELECT 
    id,
    nom,
    prenom,
    ST_X(position_actuelle) as longitude,
    ST_Y(position_actuelle) as latitude,
    date_update_position,
    derniere_activite
FROM public.conducteurs 
WHERE id = '69e0cde9-14a0-4dde-86c1-1fe9a306f2fa';