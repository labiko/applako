-- =====================================
-- REQUÊTES DE TEST POUR RESET PASSWORD
-- =====================================

-- 1. Vérifier l'état du conducteur après reset
SELECT 
    id,
    nom,
    prenom,
    telephone,
    password,
    first_login,
    derniere_activite,
    actif
FROM conducteurs 
WHERE id = '69e0cde9-14a0-4dde-86c1-1fe9a306f2fa';

-- 2. Vérifier l'historique de réinitialisation
SELECT 
    id,
    entity_type,
    entity_id,
    reset_by,
    reset_at,
    reset_reason
FROM password_reset_history 
WHERE entity_id = '69e0cde9-14a0-4dde-86c1-1fe9a306f2fa'
ORDER BY reset_at DESC;

-- 3. Vérifier via la vue enrichie
SELECT * FROM v_password_reset_history 
WHERE entity_id = '69e0cde9-14a0-4dde-86c1-1fe9a306f2fa'
ORDER BY reset_at DESC;

-- 4. Vérifier tous les conducteurs en first_login
SELECT 
    id,
    nom,
    prenom,
    telephone,
    first_login,
    password IS NULL as mot_de_passe_null
FROM conducteurs 
WHERE first_login = TRUE;