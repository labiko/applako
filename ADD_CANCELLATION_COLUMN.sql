-- ========================================
-- SYSTÈME ANNULATION - AJOUT COLONNE TRACKING
-- Date: 2025-01-08
-- ========================================

-- 1. AJOUTER COLONNE POUR TRACKING NOTIFICATIONS ANNULATION
ALTER TABLE reservations 
ADD COLUMN IF NOT EXISTS cancellation_notified_at TIMESTAMPTZ NULL;

-- 2. CRÉER INDEX POUR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_reservations_cancelled_notified 
ON reservations(statut, cancellation_notified_at) 
WHERE statut = 'canceled';

-- 3. AJOUTER COMMENTAIRE EXPLICATIF
COMMENT ON COLUMN reservations.cancellation_notified_at IS 
'Timestamp de notification d''annulation envoyée au conducteur assigné';

-- 4. VÉRIFICATION
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'reservations' 
  AND column_name = 'cancellation_notified_at';

-- 5. TEST - Voir les réservations annulées existantes
SELECT 
    id,
    conducteur_id,
    depart_nom,
    destination_nom,
    statut,
    cancellation_notified_at,
    updated_at
FROM reservations 
WHERE statut = 'canceled' 
  AND conducteur_id IS NOT NULL
ORDER BY updated_at DESC
LIMIT 10;