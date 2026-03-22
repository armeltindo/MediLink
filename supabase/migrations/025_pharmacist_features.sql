-- ============================================================
-- 025 — Fonctionnalités pharmacien
--   1. Table stock_medicaments (gestion inventaire)
--   2. Fix race condition sur les dispensations partielles
--      (verrouillage SELECT ... FOR UPDATE dans le trigger)
-- ============================================================

-- ── 1. Table stock_medicaments ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS stock_medicaments (
  id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacie_id       UUID         NOT NULL REFERENCES etablissements(id) ON DELETE CASCADE,
  medicament_dci     TEXT         NOT NULL,
  medicament_commercial TEXT,
  forme              TEXT,
  unite              TEXT         NOT NULL DEFAULT 'comprimé',
  quantite_stock     INTEGER      NOT NULL DEFAULT 0 CHECK (quantite_stock >= 0),
  seuil_alerte       INTEGER      NOT NULL DEFAULT 10  CHECK (seuil_alerte >= 0),
  lot                TEXT,
  date_peremption    DATE,
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  deleted_at         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_stock_pharmacie ON stock_medicaments(pharmacie_id);
CREATE INDEX IF NOT EXISTS idx_stock_dci       ON stock_medicaments(medicament_dci);

-- Trigger : mise à jour automatique de updated_at
CREATE OR REPLACE FUNCTION set_stock_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_stock_updated_at ON stock_medicaments;
CREATE TRIGGER trg_stock_updated_at
  BEFORE UPDATE ON stock_medicaments
  FOR EACH ROW EXECUTE FUNCTION set_stock_updated_at();

-- ── RLS stock_medicaments ─────────────────────────────────────────────────────

ALTER TABLE stock_medicaments ENABLE ROW LEVEL SECURITY;

-- super_admin : accès total
CREATE POLICY "super_admin_stock_all" ON stock_medicaments
  FOR ALL USING (get_user_role() = 'super_admin');

-- admin_etablissement : lecture seule
CREATE POLICY "admin_etab_stock_select" ON stock_medicaments
  FOR SELECT USING (
    get_user_role() = 'admin_etablissement'
    AND deleted_at IS NULL
  );

-- pharmacien : CRUD sur ses pharmacies
CREATE POLICY "pharmacien_stock_select" ON stock_medicaments
  FOR SELECT USING (
    get_user_role() = 'pharmacien'
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM user_etablissements ue
      WHERE ue.user_id    = auth.uid()
        AND ue.etablissement_id = stock_medicaments.pharmacie_id
        AND ue.suspended_at IS NULL
    )
  );

CREATE POLICY "pharmacien_stock_insert" ON stock_medicaments
  FOR INSERT WITH CHECK (
    get_user_role() = 'pharmacien'
    AND EXISTS (
      SELECT 1 FROM user_etablissements ue
      WHERE ue.user_id    = auth.uid()
        AND ue.etablissement_id = stock_medicaments.pharmacie_id
        AND ue.suspended_at IS NULL
    )
  );

CREATE POLICY "pharmacien_stock_update" ON stock_medicaments
  FOR UPDATE USING (
    get_user_role() = 'pharmacien'
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM user_etablissements ue
      WHERE ue.user_id    = auth.uid()
        AND ue.etablissement_id = stock_medicaments.pharmacie_id
        AND ue.suspended_at IS NULL
    )
  );

CREATE POLICY "pharmacien_stock_delete" ON stock_medicaments
  FOR DELETE USING (
    get_user_role() IN ('pharmacien', 'super_admin')
    AND EXISTS (
      SELECT 1 FROM user_etablissements ue
      WHERE ue.user_id    = auth.uid()
        AND ue.etablissement_id = stock_medicaments.pharmacie_id
        AND ue.suspended_at IS NULL
    )
  );

-- ── 2. Fix race condition : verrouillage de la ligne prescription ─────────────
--
-- Problème : deux transactions concurrentes peuvent lire le même total dispensé
-- avant que l'une ne commite, permettant de dépasser la quantité prescrite.
-- Solution : SELECT … FOR UPDATE sur la ligne prescription dans le BEFORE trigger.
-- Cela sérialise les insertions concurrentes pour la même ordonnance.

CREATE OR REPLACE FUNCTION check_dispensation_quantite()
RETURNS TRIGGER AS $$
DECLARE
  v_quantite_prescrite INTEGER;
  v_total_dispense     INTEGER;
BEGIN
  -- Verrouiller la ligne prescription pour éviter la race condition
  SELECT quantite
    INTO v_quantite_prescrite
    FROM prescriptions
   WHERE id = NEW.prescription_id
   FOR UPDATE;

  IF v_quantite_prescrite IS NULL THEN
    RAISE EXCEPTION 'prescription_introuvable: Prescription % introuvable', NEW.prescription_id;
  END IF;

  -- Calculer la quantité déjà dispensée (hors la ligne en cours d'insertion)
  SELECT COALESCE(SUM(quantite), 0)
    INTO v_total_dispense
    FROM prescription_dispensations
   WHERE prescription_id = NEW.prescription_id;

  IF v_total_dispense + NEW.quantite > v_quantite_prescrite THEN
    RAISE EXCEPTION
      'quantite_depassee: Quantité totale dispensée (%) dépasse la quantité prescrite (%)',
      v_total_dispense + NEW.quantite,
      v_quantite_prescrite;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
