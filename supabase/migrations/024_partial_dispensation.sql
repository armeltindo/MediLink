-- 024_partial_dispensation.sql
-- Dispensation partielle des ordonnances
--
-- Problème résolu :
--   La dispensation était binaire (prescrit → dispense d'un coup).
--   Il est impossible de tracer qu'une pharmacie a dispensé 30/60 comprimés
--   et qu'une autre en dispense 30 supplémentaires.
--
-- Modèle :
--   • prescriptions.quantite  : quantité totale prescrite (ex: 60)
--   • prescriptions.unite     : unité (ex: 'comprimé', 'ml', 'boîte')
--   • prescription_dispensations : chaque ligne = une dispensation partielle
--       (pharmacie_id, quantite, dispense_par, date_dispensation, substitution_generique)
--   • Trigger BEFORE INSERT : vérifie que sum(dispensations) + nouvelle <= quantite prescrite
--   • Trigger AFTER INSERT  : met à jour prescriptions.statut
--       → 'partiellement_dispense' si reste encore à dispenser
--       → 'dispense' si quantite complète atteinte
--   • Prescriptions sans quantite (legacy) : comportement binaire inchangé,
--     géré directement via UPDATE dans l'API.
-- ============================================================


-- ============================================================
-- 1. Colonnes quantite et unite sur prescriptions
-- ============================================================
ALTER TABLE prescriptions
  ADD COLUMN IF NOT EXISTS quantite INTEGER CHECK (quantite > 0),
  ADD COLUMN IF NOT EXISTS unite TEXT;


-- ============================================================
-- 2. Nouveau statut : 'partiellement_dispense'
-- ============================================================
ALTER TABLE prescriptions
  DROP CONSTRAINT IF EXISTS prescriptions_statut_check;

ALTER TABLE prescriptions
  ADD CONSTRAINT prescriptions_statut_check
  CHECK (statut IN ('prescrit', 'partiellement_dispense', 'dispense', 'en_cours', 'termine', 'annule'));


-- ============================================================
-- 3. Table prescription_dispensations
-- ============================================================
CREATE TABLE IF NOT EXISTS prescription_dispensations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  pharmacie_id    UUID NOT NULL REFERENCES etablissements(id),
  dispense_par    UUID NOT NULL REFERENCES auth.users(id),
  quantite        INTEGER NOT NULL CHECK (quantite > 0),
  substitution_generique TEXT,
  date_dispensation TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dispensations_prescription ON prescription_dispensations(prescription_id);
CREATE INDEX IF NOT EXISTS idx_dispensations_pharmacie    ON prescription_dispensations(pharmacie_id);


-- ============================================================
-- 4. Trigger BEFORE INSERT — vérifie que la quantité dispensée
--    ne dépasse pas la quantité prescrite
-- ============================================================
CREATE OR REPLACE FUNCTION check_dispensation_quantite()
RETURNS TRIGGER AS $$
DECLARE
  v_quantite_prescrite INTEGER;
  v_total_deja         INTEGER;
BEGIN
  SELECT quantite INTO v_quantite_prescrite
  FROM prescriptions
  WHERE id = NEW.prescription_id;

  -- Pas de quantite prescrite = on laisse passer (legacy ou non renseigné)
  IF v_quantite_prescrite IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(SUM(quantite), 0) INTO v_total_deja
  FROM prescription_dispensations
  WHERE prescription_id = NEW.prescription_id;

  IF v_total_deja + NEW.quantite > v_quantite_prescrite THEN
    RAISE EXCEPTION 'quantite_depassee:% dispensé(s) sur % prescrit(s), vous en ajoutez %',
      v_total_deja, v_quantite_prescrite, NEW.quantite;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_check_dispensation_quantite
  BEFORE INSERT ON prescription_dispensations
  FOR EACH ROW EXECUTE FUNCTION check_dispensation_quantite();


-- ============================================================
-- 5. Trigger AFTER INSERT — met à jour le statut et les champs
--    de traçabilité sur prescriptions après chaque dispensation
-- ============================================================
CREATE OR REPLACE FUNCTION update_prescription_statut_apres_dispensation()
RETURNS TRIGGER AS $$
DECLARE
  v_quantite_prescrite INTEGER;
  v_total_dispensee    INTEGER;
BEGIN
  SELECT quantite INTO v_quantite_prescrite
  FROM prescriptions
  WHERE id = NEW.prescription_id;

  SELECT COALESCE(SUM(quantite), 0) INTO v_total_dispensee
  FROM prescription_dispensations
  WHERE prescription_id = NEW.prescription_id;

  IF v_quantite_prescrite IS NULL OR v_total_dispensee >= v_quantite_prescrite THEN
    -- Entièrement dispensée : on trace aussi le dernier dispensateur
    UPDATE prescriptions
    SET statut           = 'dispense',
        dispense_par     = NEW.dispense_par,
        date_dispensation = NEW.date_dispensation,
        pharmacie_id     = NEW.pharmacie_id
    WHERE id = NEW.prescription_id;
  ELSE
    -- Partiellement dispensée
    UPDATE prescriptions
    SET statut = 'partiellement_dispense'
    WHERE id = NEW.prescription_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_update_prescription_statut
  AFTER INSERT ON prescription_dispensations
  FOR EACH ROW EXECUTE FUNCTION update_prescription_statut_apres_dispensation();


-- ============================================================
-- 6. RLS sur prescription_dispensations
-- ============================================================
ALTER TABLE prescription_dispensations ENABLE ROW LEVEL SECURITY;

-- Lecture : tous les rôles cliniques
CREATE POLICY "dispensations_select" ON prescription_dispensations
  FOR SELECT USING (
    get_user_role() IN ('super_admin', 'admin_etablissement', 'medecin', 'pharmacien', 'infirmier')
  );

-- Insertion : pharmacien uniquement, sur prescriptions non terminées / non expirées
CREATE POLICY "dispensations_insert" ON prescription_dispensations
  FOR INSERT WITH CHECK (
    get_user_role() = 'pharmacien'
    AND EXISTS (
      SELECT 1 FROM prescriptions p
      WHERE p.id = prescription_id
        AND p.statut NOT IN ('dispense', 'annule')
        AND (p.date_expiration IS NULL OR p.date_expiration >= CURRENT_DATE)
        AND p.deleted_at IS NULL
    )
  );

-- Suppression / modification réservées au super_admin uniquement
CREATE POLICY "dispensations_admin" ON prescription_dispensations
  FOR ALL USING (get_user_role() = 'super_admin');


-- ============================================================
-- 7. Mise à jour de la policy pharmacien sur prescriptions
--    pour autoriser 'partiellement_dispense' (déjà implicite
--    car NOT IN ('dispense', 'annule'), mais on la documente
--    explicitement en recréant avec la liste complète)
-- ============================================================
DROP POLICY IF EXISTS "prescriptions_pharmacien_update" ON prescriptions;
CREATE POLICY "prescriptions_pharmacien_update" ON prescriptions
  FOR UPDATE USING (
    get_user_role() = 'pharmacien'
    AND statut NOT IN ('dispense', 'annule')
    AND (date_expiration IS NULL OR date_expiration >= CURRENT_DATE)
  );
