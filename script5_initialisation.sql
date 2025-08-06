-- SCRIPT 5: INITIALISATION DES DONNEES
-- Executer en dernier

-- Creer la premiere periode (mois courant)
INSERT INTO facturation_periodes (periode_debut, periode_fin, statut)
VALUES (
    DATE_TRUNC('month', CURRENT_DATE),
    DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day',
    'en_cours'
) ON CONFLICT (periode_debut, periode_fin) DO NOTHING;

-- Verifier que tout fonctionne
SELECT 
    'Tables creees avec succes' as status,
    COUNT(*) as nb_periodes
FROM facturation_periodes;