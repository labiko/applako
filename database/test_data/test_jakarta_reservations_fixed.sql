-- =====================================================
-- SCRIPT DE TEST : RÉSERVATIONS JAKARTA TAXI EXPRESS (CORRIGÉ)
-- Date : 2025-08-27
-- Description : Création de réservations test pour valider le flux financier MM vs Cash
-- =====================================================

-- 1. Récupérer les IDs nécessaires
DO $$
DECLARE
  v_entreprise_id UUID;
  v_conducteur_id UUID;
BEGIN
  -- Récupérer l'ID de Jakarta taxi express
  SELECT id INTO v_entreprise_id 
  FROM entreprises 
  WHERE nom = 'jakarta taxi express' 
  LIMIT 1;
  
  -- Récupérer un conducteur de Jakarta (ou en créer un si nécessaire)
  SELECT id INTO v_conducteur_id 
  FROM conducteurs 
  WHERE entreprise_id = v_entreprise_id 
  LIMIT 1;
  
  -- Si pas de conducteur, en créer un
  IF v_conducteur_id IS NULL THEN
    INSERT INTO conducteurs (
      nom, prenom, telephone, vehicle_type, entreprise_id, password, actif
    ) VALUES (
      'Test', 'Conducteur', '+224620000001', 'moto', v_entreprise_id, 'test123', true
    ) RETURNING id INTO v_conducteur_id;
  END IF;
  
  RAISE NOTICE 'Entreprise ID: %, Conducteur ID: %', v_entreprise_id, v_conducteur_id;
END $$;

-- NETTOYAGE : Supprimer les réservations test existantes
DELETE FROM lengopay_payments WHERE reservation_id IN (
  'a1111111-1111-1111-1111-111111111111',
  'a2222222-2222-2222-2222-222222222222',
  'a3333333-3333-3333-3333-333333333333',
  'a4444444-4444-4444-4444-444444444444',
  'a5555555-5555-5555-5555-555555555555',
  'a6666666-6666-6666-6666-666666666666',
  'a7777777-7777-7777-7777-777777777777',
  'a8888888-8888-8888-8888-888888888888',
  'a9999999-9999-9999-9999-999999999999',
  'b0000000-0000-0000-0000-000000000000'
);

DELETE FROM reservations WHERE id IN (
  'a1111111-1111-1111-1111-111111111111',
  'a2222222-2222-2222-2222-222222222222',
  'a3333333-3333-3333-3333-333333333333',
  'a4444444-4444-4444-4444-444444444444',
  'a5555555-5555-5555-5555-555555555555',
  'a6666666-6666-6666-6666-666666666666',
  'a7777777-7777-7777-7777-777777777777',
  'a8888888-8888-8888-8888-888888888888',
  'a9999999-9999-9999-9999-999999999999',
  'b0000000-0000-0000-0000-000000000000'
);

-- =====================================================
-- INSERTION DES RÉSERVATIONS
-- =====================================================

-- GROUPE 1 : 4 réservations avec Mobile Money SUCCESS
INSERT INTO reservations (
  id, client_phone, vehicle_type, statut, conducteur_id,
  depart_nom, destination_nom, distance_km, prix_total,
  position_depart, position_arrivee,
  created_at, date_reservation, code_validation, date_code_validation
) 
SELECT 
  vals.id,
  vals.client_phone,
  vals.vehicle_type,
  vals.statut,
  (SELECT id FROM conducteurs WHERE entreprise_id = (SELECT id FROM entreprises WHERE nom = 'jakarta taxi express') LIMIT 1),
  vals.depart_nom,
  vals.destination_nom,
  vals.distance_km,
  vals.prix_total,
  ST_SetSRID(ST_MakePoint(vals.lon_dep, vals.lat_dep), 4326),
  ST_SetSRID(ST_MakePoint(vals.lon_arr, vals.lat_arr), 4326),
  vals.created_at::timestamp,
  vals.date_reservation::date,
  vals.code_validation,
  vals.date_code_validation::timestamp
FROM (VALUES 
  ('a1111111-1111-1111-1111-111111111111', '+224620100001', 'moto', 'completed', 'Kaloum Centre', 'Ratoma Bambeto', 15.5, 5000000, -13.6785, 9.5092, -13.6512, 9.5456, '2025-09-05 10:30:00', '2025-09-05', '1001', '2025-09-05 11:00:00'),
  ('a2222222-2222-2222-2222-222222222222', '+224620100002', 'moto', 'completed', 'Matoto Marché', 'Dixinn Port', 12.3, 3500000, -13.6234, 9.5678, -13.7012, 9.5234, '2025-09-10 14:15:00', '2025-09-10', '1002', '2025-09-10 14:45:00'),
  ('a3333333-3333-3333-3333-333333333333', '+224620100003', 'voiture', 'completed', 'Aéroport Gbessia', 'Hôtel Camayenne', 25.8, 4200000, -13.6123, 9.5789, -13.6845, 9.5321, '2025-09-15 08:00:00', '2025-09-15', '1003', '2025-09-15 08:30:00'),
  ('a4444444-4444-4444-4444-444444444444', '+224620100004', 'moto', 'completed', 'Kipé Centre', 'Cosa Plateau', 8.7, 2800000, -13.6567, 9.5432, -13.6789, 9.5678, '2025-09-20 16:45:00', '2025-09-20', '1004', '2025-09-20 17:15:00')
) AS vals(id, client_phone, vehicle_type, statut, depart_nom, destination_nom, distance_km, prix_total, lon_dep, lat_dep, lon_arr, lat_arr, created_at, date_reservation, code_validation, date_code_validation);

-- GROUPE 2 : 3 réservations avec Mobile Money PENDING/FAILED
INSERT INTO reservations (
  id, client_phone, vehicle_type, statut, conducteur_id,
  depart_nom, destination_nom, distance_km, prix_total,
  position_depart, position_arrivee,
  created_at, date_reservation, code_validation, date_code_validation
) 
SELECT 
  vals.id,
  vals.client_phone,
  vals.vehicle_type,
  vals.statut,
  (SELECT id FROM conducteurs WHERE entreprise_id = (SELECT id FROM entreprises WHERE nom = 'jakarta taxi express') LIMIT 1),
  vals.depart_nom,
  vals.destination_nom,
  vals.distance_km,
  vals.prix_total,
  ST_SetSRID(ST_MakePoint(vals.lon_dep, vals.lat_dep), 4326),
  ST_SetSRID(ST_MakePoint(vals.lon_arr, vals.lat_arr), 4326),
  vals.created_at::timestamp,
  vals.date_reservation::date,
  vals.code_validation,
  vals.date_code_validation::timestamp
FROM (VALUES 
  ('a5555555-5555-5555-5555-555555555555', '+224620100005', 'moto', 'completed', 'Madina Marché', 'Matam Port', 10.2, 3000000, -13.6345, 9.5567, -13.6678, 9.5234, '2025-09-08 09:30:00', '2025-09-08', '1005', '2025-09-08 10:00:00'),
  ('a6666666-6666-6666-6666-666666666666', '+224620100006', 'moto', 'completed', 'Sonfonia Gare', 'Koloma Soloprimo', 7.5, 2500000, -13.6012, 9.5890, -13.6234, 9.5678, '2025-09-12 13:00:00', '2025-09-12', '1006', '2025-09-12 13:30:00'),
  ('a7777777-7777-7777-7777-777777777777', '+224620100007', 'voiture', 'completed', 'Taouyah Rond-point', 'Minière Cité', 11.8, 3200000, -13.6456, 9.5345, -13.6123, 9.5678, '2025-09-18 11:15:00', '2025-09-18', '1007', '2025-09-18 11:45:00')
) AS vals(id, client_phone, vehicle_type, statut, depart_nom, destination_nom, distance_km, prix_total, lon_dep, lat_dep, lon_arr, lat_arr, created_at, date_reservation, code_validation, date_code_validation);

-- GROUPE 3 : 3 réservations sans Mobile Money (cash direct)
INSERT INTO reservations (
  id, client_phone, vehicle_type, statut, conducteur_id,
  depart_nom, destination_nom, distance_km, prix_total,
  position_depart, position_arrivee,
  created_at, date_reservation, code_validation, date_code_validation
) 
SELECT 
  vals.id,
  vals.client_phone,
  vals.vehicle_type,
  vals.statut,
  (SELECT id FROM conducteurs WHERE entreprise_id = (SELECT id FROM entreprises WHERE nom = 'jakarta taxi express') LIMIT 1),
  vals.depart_nom,
  vals.destination_nom,
  vals.distance_km,
  vals.prix_total,
  ST_SetSRID(ST_MakePoint(vals.lon_dep, vals.lat_dep), 4326),
  ST_SetSRID(ST_MakePoint(vals.lon_arr, vals.lat_arr), 4326),
  vals.created_at::timestamp,
  vals.date_reservation::date,
  vals.code_validation,
  vals.date_code_validation::timestamp
FROM (VALUES 
  ('a8888888-8888-8888-8888-888888888888', '+224620100008', 'moto', 'completed', 'Nongo Conteyah', 'Lambanyi Carrefour', 6.3, 2000000, -13.6890, 9.5123, -13.6567, 9.5456, '2025-09-06 07:45:00', '2025-09-06', '1008', '2025-09-06 08:15:00'),
  ('a9999999-9999-9999-9999-999999999999', '+224620100009', 'moto', 'completed', 'Hamdallaye Mosquée', 'Bambeto Permanence', 7.1, 2300000, -13.6234, 9.5890, -13.6456, 9.5567, '2025-09-14 15:30:00', '2025-09-14', '1009', '2025-09-14 16:00:00'),
  ('b0000000-0000-0000-0000-000000000000', '+224620100010', 'voiture', 'completed', 'Yimbaya École', 'Kaporo Rails', 9.4, 2700000, -13.5901, 9.6012, -13.6345, 9.5789, '2025-09-25 12:00:00', '2025-09-25', '1010', '2025-09-25 12:30:00')
) AS vals(id, client_phone, vehicle_type, statut, depart_nom, destination_nom, distance_km, prix_total, lon_dep, lat_dep, lon_arr, lat_arr, created_at, date_reservation, code_validation, date_code_validation);

-- =====================================================
-- INSERTION DES PAIEMENTS MOBILE MONEY
-- =====================================================

-- 4 paiements SUCCESS (réservations 1-4)
INSERT INTO lengopay_payments (
  payment_id, status, amount, currency, client_phone, 
  message, reservation_id, processed_at, created_at
) VALUES 
('PAY_SUCCESS_001_TEST_JAKARTA', 'SUCCESS', 5000000, 'GNF', '+224620100001', 'Paiement course confirmé', 'a1111111-1111-1111-1111-111111111111', '2025-09-05 11:05:00', '2025-09-05 10:35:00'),
('PAY_SUCCESS_002_TEST_JAKARTA', 'SUCCESS', 3500000, 'GNF', '+224620100002', 'Paiement course confirmé', 'a2222222-2222-2222-2222-222222222222', '2025-09-10 14:50:00', '2025-09-10 14:20:00'),
('PAY_SUCCESS_003_TEST_JAKARTA', 'SUCCESS', 4200000, 'GNF', '+224620100003', 'Paiement course confirmé', 'a3333333-3333-3333-3333-333333333333', '2025-09-15 08:35:00', '2025-09-15 08:05:00'),
('PAY_SUCCESS_004_TEST_JAKARTA', 'SUCCESS', 2800000, 'GNF', '+224620100004', 'Paiement course confirmé', 'a4444444-4444-4444-4444-444444444444', '2025-09-20 17:20:00', '2025-09-20 16:50:00');

-- 2 paiements PENDING et 1 FAILED (réservations 5-7)  
INSERT INTO lengopay_payments (
  payment_id, status, amount, currency, client_phone, 
  message, reservation_id, created_at
) VALUES 
('PAY_PENDING_005_TEST_JAKARTA', 'PENDING', 3000000, 'GNF', '+224620100005', 'Paiement en attente', 'a5555555-5555-5555-5555-555555555555', '2025-09-08 09:35:00'),
('PAY_FAILED_006_TEST_JAKARTA', 'FAILED', 2500000, 'GNF', '+224620100006', 'Échec du paiement - Solde insuffisant', 'a6666666-6666-6666-6666-666666666666', '2025-09-12 13:05:00'),
('PAY_PENDING_007_TEST_JAKARTA', 'PENDING', 3200000, 'GNF', '+224620100007', 'Paiement initié', 'a7777777-7777-7777-7777-777777777777', '2025-09-18 11:20:00');

-- Les réservations 8-10 n'ont pas de paiement Mobile Money (cash direct)

-- =====================================================
-- RÉSUMÉ DES DONNÉES CRÉÉES
-- =====================================================
SELECT 
  'RÉSUMÉ TEST JAKARTA - SEPTEMBRE 2025' as info,
  COUNT(*) as total_reservations,
  SUM(prix_total) as ca_total,
  SUM(CASE WHEN lp.status = 'SUCCESS' THEN prix_total ELSE 0 END) as ca_mobile_money,
  SUM(CASE WHEN lp.status != 'SUCCESS' OR lp.id IS NULL THEN prix_total ELSE 0 END) as ca_cash,
  -- Commission 11%
  ROUND(SUM(prix_total) * 0.11) as commission_totale,
  ROUND(SUM(CASE WHEN lp.status = 'SUCCESS' THEN prix_total ELSE 0 END) * 0.11) as commission_mm_prelevee,
  ROUND(SUM(CASE WHEN lp.status != 'SUCCESS' OR lp.id IS NULL THEN prix_total ELSE 0 END) * 0.11) as commission_cash_a_collecter,
  -- Balance
  ROUND(SUM(CASE WHEN lp.status = 'SUCCESS' THEN prix_total * 0.89 ELSE 0 END)) as a_reverser_entreprise,
  ROUND(SUM(CASE WHEN lp.status != 'SUCCESS' OR lp.id IS NULL THEN prix_total * 0.11 ELSE 0 END)) as a_collecter_entreprise,
  ROUND(
    SUM(CASE WHEN lp.status = 'SUCCESS' THEN prix_total * 0.89 ELSE 0 END) - 
    SUM(CASE WHEN lp.status != 'SUCCESS' OR lp.id IS NULL THEN prix_total * 0.11 ELSE 0 END)
  ) as balance_nette
FROM reservations r
LEFT JOIN lengopay_payments lp ON r.id = lp.reservation_id
WHERE r.conducteur_id IN (
  SELECT id FROM conducteurs 
  WHERE entreprise_id = (SELECT id FROM entreprises WHERE nom = 'jakarta taxi express')
)
AND r.created_at >= '2025-09-01'
AND r.created_at < '2025-10-01';

-- Détail par type de paiement
SELECT 
  CASE 
    WHEN lp.status = 'SUCCESS' THEN 'Mobile Money SUCCESS'
    WHEN lp.status IN ('PENDING', 'FAILED') THEN 'Mobile Money échoué (cash présumé)'
    ELSE 'Cash direct'
  END as type_paiement,
  COUNT(*) as nombre,
  SUM(r.prix_total) as montant_total
FROM reservations r
LEFT JOIN lengopay_payments lp ON r.id = lp.reservation_id
WHERE r.conducteur_id IN (
  SELECT id FROM conducteurs 
  WHERE entreprise_id = (SELECT id FROM entreprises WHERE nom = 'jakarta taxi express')
)
AND r.created_at >= '2025-09-01'
AND r.created_at < '2025-10-01'
GROUP BY 
  CASE 
    WHEN lp.status = 'SUCCESS' THEN 'Mobile Money SUCCESS'
    WHEN lp.status IN ('PENDING', 'FAILED') THEN 'Mobile Money échoué (cash présumé)'
    ELSE 'Cash direct'
  END;

COMMIT;