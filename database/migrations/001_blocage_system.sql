-- =====================================================
-- SCRIPT MIGRATION SYSTÈME DE BLOCAGE
-- Entreprises et Conducteurs
-- =====================================================

-- 1. MODIFICATIONS TABLE ENTREPRISES
-- Ajouter colonnes pour la désactivation
ALTER TABLE entreprises 
ADD COLUMN IF NOT EXISTS motif_desactivation TEXT,
ADD COLUMN IF NOT EXISTS date_desactivation TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS desactive_par TEXT;

-- 2. MODIFICATIONS TABLE CONDUCTEURS
-- Ajouter colonnes pour le blocage
ALTER TABLE conducteurs 
ADD COLUMN IF NOT EXISTS motif_blocage TEXT,
ADD COLUMN IF NOT EXISTS date_blocage TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS bloque_par TEXT CHECK (bloque_par IN ('entreprise', 'super-admin', 'super-admin-entreprise'));

-- 3. CRÉATION TABLE HISTORIQUE BLOCAGES
CREATE TABLE IF NOT EXISTS historique_blocages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  type VARCHAR(20) CHECK (type IN ('entreprise', 'conducteur')),
  entite_id UUID NOT NULL,
  action VARCHAR(20) CHECK (action IN ('bloquer', 'debloquer')),
  motif TEXT,
  par TEXT,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. INDEX POUR PERFORMANCES
CREATE INDEX IF NOT EXISTS idx_entreprises_actif ON entreprises(actif);
CREATE INDEX IF NOT EXISTS idx_entreprises_desactivation ON entreprises(date_desactivation);
CREATE INDEX IF NOT EXISTS idx_conducteurs_actif ON conducteurs(actif);
CREATE INDEX IF NOT EXISTS idx_conducteurs_blocage ON conducteurs(date_blocage);
CREATE INDEX IF NOT EXISTS idx_conducteurs_bloque_par ON conducteurs(bloque_par);
CREATE INDEX IF NOT EXISTS idx_historique_blocages_entite ON historique_blocages(entite_id);
CREATE INDEX IF NOT EXISTS idx_historique_blocages_date ON historique_blocages(date);

-- 5. FONCTION POUR BLOCAGE EN CASCADE
-- Bloque tous les conducteurs quand l'entreprise est désactivée
CREATE OR REPLACE FUNCTION bloquer_conducteurs_entreprise()
RETURNS TRIGGER AS $$
BEGIN
  -- Si l'entreprise passe de actif=true à actif=false
  IF OLD.actif = true AND NEW.actif = false THEN
    -- Bloquer tous les conducteurs de cette entreprise
    UPDATE conducteurs
    SET 
      actif = false,
      motif_blocage = COALESCE(NEW.motif_desactivation, 'Entreprise désactivée'),
      bloque_par = 'super-admin-entreprise',
      date_blocage = NOW()
    WHERE entreprise_id = NEW.id
    AND actif = true;
    
    -- Enregistrer dans l'historique
    INSERT INTO historique_blocages (type, entite_id, action, motif, par)
    VALUES ('entreprise', NEW.id, 'bloquer', NEW.motif_desactivation, NEW.desactive_par);
  END IF;
  
  -- Si l'entreprise est réactivée
  IF OLD.actif = false AND NEW.actif = true THEN
    -- Débloquer seulement les conducteurs bloqués par désactivation entreprise
    UPDATE conducteurs
    SET 
      actif = true,
      motif_blocage = NULL,
      bloque_par = NULL,
      date_blocage = NULL
    WHERE entreprise_id = NEW.id
    AND bloque_par = 'super-admin-entreprise';
    
    -- Enregistrer dans l'historique
    INSERT INTO historique_blocages (type, entite_id, action, motif, par)
    VALUES ('entreprise', NEW.id, 'debloquer', 'Entreprise réactivée', NEW.desactive_par);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. TRIGGER POUR BLOCAGE EN CASCADE
DROP TRIGGER IF EXISTS trigger_blocage_conducteurs ON entreprises;
CREATE TRIGGER trigger_blocage_conducteurs
AFTER UPDATE OF actif ON entreprises
FOR EACH ROW
EXECUTE FUNCTION bloquer_conducteurs_entreprise();

-- 7. FONCTION POUR HISTORIQUE AUTOMATIQUE CONDUCTEURS
CREATE OR REPLACE FUNCTION historique_blocage_conducteur()
RETURNS TRIGGER AS $$
BEGIN
  -- Si le conducteur est bloqué
  IF OLD.actif = true AND NEW.actif = false THEN
    INSERT INTO historique_blocages (type, entite_id, action, motif, par)
    VALUES ('conducteur', NEW.id, 'bloquer', NEW.motif_blocage, NEW.bloque_par);
  END IF;
  
  -- Si le conducteur est débloqué
  IF OLD.actif = false AND NEW.actif = true THEN
    INSERT INTO historique_blocages (type, entite_id, action, motif, par)
    VALUES ('conducteur', NEW.id, 'debloquer', 'Conducteur débloqué', NEW.bloque_par);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. TRIGGER POUR HISTORIQUE CONDUCTEURS
DROP TRIGGER IF EXISTS trigger_historique_conducteur ON conducteurs;
CREATE TRIGGER trigger_historique_conducteur
AFTER UPDATE OF actif ON conducteurs
FOR EACH ROW
EXECUTE FUNCTION historique_blocage_conducteur();

-- 9. VUES UTILES POUR LE MONITORING

-- Vue des entreprises désactivées
CREATE OR REPLACE VIEW v_entreprises_desactivees AS
SELECT 
  e.id,
  e.nom,
  e.email,
  e.motif_desactivation,
  e.date_desactivation,
  e.desactive_par,
  COUNT(c.id) as nombre_conducteurs_bloques
FROM entreprises e
LEFT JOIN conducteurs c ON c.entreprise_id = e.id AND c.bloque_par = 'super-admin-entreprise'
WHERE e.actif = false
GROUP BY e.id, e.nom, e.email, e.motif_desactivation, e.date_desactivation, e.desactive_par;

-- Vue des conducteurs bloqués
CREATE OR REPLACE VIEW v_conducteurs_bloques AS
SELECT 
  c.id,
  c.nom,
  c.prenom,
  c.telephone,
  c.motif_blocage,
  c.date_blocage,
  c.bloque_par,
  e.nom as entreprise_nom,
  e.actif as entreprise_active
FROM conducteurs c
JOIN entreprises e ON e.id = c.entreprise_id
WHERE c.actif = false
ORDER BY c.date_blocage DESC;

-- 10. PERMISSIONS (À ajuster selon votre configuration)
-- Assurez-vous que les tables sont accessibles par votre application
GRANT ALL ON historique_blocages TO authenticated;
GRANT ALL ON v_entreprises_desactivees TO authenticated;
GRANT ALL ON v_conducteurs_bloques TO authenticated;

-- 11. COMMENTAIRES POUR DOCUMENTATION
COMMENT ON COLUMN entreprises.motif_desactivation IS 'Raison de la désactivation de l''entreprise';
COMMENT ON COLUMN entreprises.date_desactivation IS 'Date et heure de désactivation';
COMMENT ON COLUMN entreprises.desactive_par IS 'Identifiant de l''utilisateur qui a désactivé';

COMMENT ON COLUMN conducteurs.motif_blocage IS 'Raison du blocage du conducteur';
COMMENT ON COLUMN conducteurs.date_blocage IS 'Date et heure du blocage';
COMMENT ON COLUMN conducteurs.bloque_par IS 'Origine du blocage: entreprise, super-admin, ou super-admin-entreprise';

COMMENT ON TABLE historique_blocages IS 'Historique complet des actions de blocage/déblocage';

-- =====================================================
-- FIN DU SCRIPT MIGRATION
-- Pour exécuter: psql -U username -d database -f 001_blocage_system.sql
-- =====================================================