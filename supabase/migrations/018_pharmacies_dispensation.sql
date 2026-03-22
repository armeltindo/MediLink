-- 018_pharmacies_dispensation.sql
-- Support des pharmacies indépendantes et de la dispensation partielle d'ordonnances
--
-- Principe métier :
--   • Une pharmacie est un établissement de type 'pharmacie'
--   • Chaque ligne de prescription (= 1 produit) peut être servie par UNE SEULE pharmacie
--   • Une même ordonnance (= plusieurs lignes liées par consultation_id) peut être servie
--     partiellement : pharmacie A sert le produit 1, pharmacie B sert le produit 2
--   • Le pharmacien peut servir le produit exact OU un similaire/générique
--   • La contrainte "un produit servi = un seul" est assurée par le statut 'dispense'
--     + la RLS qui bloque toute mise à jour d'une ligne déjà dispensée

-- ============================================================
-- 1. Ajouter 'pharmacie' comme type d'établissement valide
-- ============================================================
ALTER TABLE etablissements DROP CONSTRAINT IF EXISTS etablissements_type_check;
ALTER TABLE etablissements
  ADD CONSTRAINT etablissements_type_check
  CHECK (type IN ('CHU', 'CSP', 'clinique', 'hopital', 'cabinet', 'pharmacie'));

-- ============================================================
-- 2. Tracer quelle pharmacie a servi chaque ligne
-- ============================================================
ALTER TABLE prescriptions
  ADD COLUMN IF NOT EXISTS pharmacie_id UUID REFERENCES etablissements(id);

-- ============================================================
-- 3. Renforcer la RLS pharmacien
--    • Un pharmacien ne peut mettre à jour qu'une prescription
--      qui n'a pas encore été dispensée et qui n'est pas expirée
--    • Il ne peut PAS annuler, créer, ou supprimer — seulement dispenser
-- ============================================================
DROP POLICY IF EXISTS "prescriptions_pharmacien_update" ON prescriptions;
CREATE POLICY "prescriptions_pharmacien_update" ON prescriptions
  FOR UPDATE USING (
    get_user_role() = 'pharmacien'
    AND statut NOT IN ('dispense', 'annule')
    AND (date_expiration IS NULL OR date_expiration >= CURRENT_DATE)
  );

-- ============================================================
-- 4. Index pour accélérer les recherches par pharmacie
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_prescriptions_pharmacie ON prescriptions(pharmacie_id);
