-- Corriger le numéro de téléphone de BALDE DIEYNABA pour le format guinéen
-- EXÉCUTER DANS SUPABASE SQL EDITOR

UPDATE conducteurs 
SET telephone = '+224667326357'
WHERE id = '62f2b042-b05f-4456-9834-d3b6c5562750';

-- Vérification
SELECT nom, prenom, telephone 
FROM conducteurs 
WHERE id = '62f2b042-b05f-4456-9834-d3b6c5562750';