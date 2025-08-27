/**
 * FONCTION DE RECALCUL DES BALANCES ENTREPRISES
 * À utiliser après suppression d'une période pour recalculer les balances
 */

-- Fonction pour recalculer toutes les balances entreprises
CREATE OR REPLACE FUNCTION recalculer_balances_entreprises()
RETURNS void AS $$
DECLARE
    entreprise_rec RECORD;
    v_total_a_reverser DECIMAL(12,2);
    v_total_a_collecter DECIMAL(12,2);
    v_total_mm_encaisse DECIMAL(12,2);
    v_total_ca_cash DECIMAL(12,2);
    v_nombre_periodes INTEGER;
BEGIN
    -- Pour chaque entreprise
    FOR entreprise_rec IN SELECT id FROM entreprises LOOP
        -- Calculer les totaux depuis commissions_detail
        SELECT 
            COALESCE(SUM(montant_a_reverser), 0),
            COALESCE(SUM(montant_commission_cash), 0),
            COALESCE(SUM(ca_mobile_money), 0),
            COALESCE(SUM(ca_cash), 0),
            COUNT(DISTINCT periode_id)
        INTO 
            v_total_a_reverser,
            v_total_a_collecter,
            v_total_mm_encaisse,
            v_total_ca_cash,
            v_nombre_periodes
        FROM commissions_detail
        WHERE entreprise_id = entreprise_rec.id
        AND flux_financier_calcule = true;
        
        -- Si l'entreprise a des données, créer ou mettre à jour sa balance
        IF v_nombre_periodes > 0 THEN
            INSERT INTO balance_entreprises (
                entreprise_id,
                total_a_reverser,
                total_a_collecter,
                balance_courante,
                total_mobile_money_encaisse,
                total_ca_cash,
                nombre_periodes_traitees,
                date_derniere_mise_a_jour
            ) VALUES (
                entreprise_rec.id,
                v_total_a_reverser,
                v_total_a_collecter,
                v_total_a_reverser - v_total_a_collecter,
                v_total_mm_encaisse,
                v_total_ca_cash,
                v_nombre_periodes,
                NOW()
            )
            ON CONFLICT (entreprise_id) 
            DO UPDATE SET
                total_a_reverser = EXCLUDED.total_a_reverser,
                total_a_collecter = EXCLUDED.total_a_collecter,
                balance_courante = EXCLUDED.balance_courante,
                total_mobile_money_encaisse = EXCLUDED.total_mobile_money_encaisse,
                total_ca_cash = EXCLUDED.total_ca_cash,
                nombre_periodes_traitees = EXCLUDED.nombre_periodes_traitees,
                date_derniere_mise_a_jour = NOW();
        ELSE
            -- Si pas de données, supprimer la balance
            DELETE FROM balance_entreprises WHERE entreprise_id = entreprise_rec.id;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Balances recalculées pour toutes les entreprises';
END;
$$ LANGUAGE plpgsql;

-- Fonction pour recalculer le flux financier d'une période spécifique
CREATE OR REPLACE FUNCTION recalculer_flux_periode(p_periode_id UUID)
RETURNS void AS $$
DECLARE
    commission_rec RECORD;
BEGIN
    -- Pour chaque commission de la période
    FOR commission_rec IN 
        SELECT * FROM commissions_detail 
        WHERE periode_id = p_periode_id 
    LOOP
        -- Recalculer le flux financier pour cette entreprise/période
        PERFORM calculer_flux_financier_entreprise(
            commission_rec.entreprise_id, 
            p_periode_id
        );
    END LOOP;
    
    -- Ensuite recalculer les balances globales
    PERFORM recalculer_balances_entreprises();
    
    RAISE NOTICE 'Flux financier recalculé pour la période %', p_periode_id;
END;
$$ LANGUAGE plpgsql;

-- Fonction helper pour calculer le flux d'une entreprise sur une période
CREATE OR REPLACE FUNCTION calculer_flux_financier_entreprise(
    p_entreprise_id UUID,
    p_periode_id UUID
)
RETURNS void AS $$
DECLARE
    v_periode RECORD;
    v_reservations_mm INTEGER;
    v_reservations_cash INTEGER;
    v_ca_mm DECIMAL(12,2);
    v_ca_cash DECIMAL(12,2);
    v_taux_commission DECIMAL(5,2);
BEGIN
    -- Récupérer la période
    SELECT * INTO v_periode 
    FROM facturation_periodes 
    WHERE id = p_periode_id;
    
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    -- Compter et calculer les réservations Mobile Money vs Cash
    WITH reservation_analysis AS (
        SELECT 
            r.id,
            r.prix_total,
            CASE 
                WHEN lp.status = 'SUCCESS' THEN 'mobile_money'
                ELSE 'cash'
            END as payment_type
        FROM reservations r
        INNER JOIN conducteurs c ON c.id = r.conducteur_id
        LEFT JOIN lengopay_payments lp ON lp.reservation_id = r.id
        WHERE c.entreprise_id = p_entreprise_id
        AND r.date_code_validation IS NOT NULL
        AND r.created_at >= v_periode.periode_debut
        AND r.created_at < (v_periode.periode_fin::date + INTERVAL '1 day')
    )
    SELECT 
        COUNT(*) FILTER (WHERE payment_type = 'mobile_money'),
        COUNT(*) FILTER (WHERE payment_type = 'cash'),
        COALESCE(SUM(prix_total) FILTER (WHERE payment_type = 'mobile_money'), 0),
        COALESCE(SUM(prix_total) FILTER (WHERE payment_type = 'cash'), 0)
    INTO v_reservations_mm, v_reservations_cash, v_ca_mm, v_ca_cash
    FROM reservation_analysis;
    
    -- Récupérer le taux de commission
    SELECT COALESCE(taux_commission_moyen, 11) INTO v_taux_commission
    FROM commissions_detail
    WHERE entreprise_id = p_entreprise_id
    AND periode_id = p_periode_id;
    
    -- Mettre à jour les données de flux
    UPDATE commissions_detail SET
        nombre_reservations_mobile = v_reservations_mm,
        nombre_reservations_cash = v_reservations_cash,
        ca_mobile_money = v_ca_mm,
        ca_cash = v_ca_cash,
        montant_encaisse = v_ca_mm,
        montant_a_reverser = v_ca_mm * (1 - v_taux_commission/100),
        montant_commission_cash = v_ca_cash * (v_taux_commission/100),
        balance_nette = (v_ca_mm * (1 - v_taux_commission/100)) - (v_ca_cash * (v_taux_commission/100)),
        statut_balance = CASE 
            WHEN ((v_ca_mm * (1 - v_taux_commission/100)) - (v_ca_cash * (v_taux_commission/100))) > 0 THEN 'crediteur'
            WHEN ((v_ca_mm * (1 - v_taux_commission/100)) - (v_ca_cash * (v_taux_commission/100))) < 0 THEN 'debiteur'
            ELSE 'equilibre'
        END,
        flux_financier_calcule = true,
        date_calcul_flux = NOW(),
        updated_at = NOW()
    WHERE entreprise_id = p_entreprise_id
    AND periode_id = p_periode_id;
    
END;
$$ LANGUAGE plpgsql;

-- Commentaires
COMMENT ON FUNCTION recalculer_balances_entreprises() IS 
'Recalcule toutes les balances entreprises depuis les données de commissions_detail';

COMMENT ON FUNCTION recalculer_flux_periode(UUID) IS 
'Recalcule le flux financier pour tous les entreprises d''une période donnée';

COMMENT ON FUNCTION calculer_flux_financier_entreprise(UUID, UUID) IS 
'Calcule le flux MM vs Cash pour une entreprise sur une période';