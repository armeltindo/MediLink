-- 023_fix_prescriptions_rls.sql
-- Correction du bug RLS prescriptions : double policy pharmacien incompatible
--
-- Problème :
--   Migration 017 crée "prescriptions_update" avec une clause
--   OR get_user_role() = 'pharmacien' sans restriction (tout pharmacien peut
--   modifier n'importe quelle prescription, même déjà dispensée).
--
--   Migration 018 tente de restreindre via "prescriptions_pharmacien_update"
--   (statut NOT IN ('dispense', 'annule'), date non expirée), MAIS les deux
--   policies coexistent. PostgreSQL évalue les policies en OR : la policy large
--   de 017 passe toujours → la restriction de 018 est totalement ignorée.
--
-- Solution :
--   1. Supprimer "prescriptions_update" (017, trop large)
--   2. Recréer "prescriptions_update" pour médecin + super_admin uniquement
--   3. Conserver "prescriptions_pharmacien_update" (018) séparée et stricte
--      (statut non dispensé, non annulé, non expiré)
-- ============================================================


-- ============================================================
-- 1. Supprimer la policy large qui inclut le pharmacien sans restriction
-- ============================================================
DROP POLICY IF EXISTS "prescriptions_update" ON prescriptions;


-- ============================================================
-- 2. Recréer une policy UPDATE stricte pour super_admin et médecin uniquement
--    (les mêmes conditions de consultation que 017, sans le pharmacien)
-- ============================================================
CREATE POLICY "prescriptions_update" ON prescriptions
  FOR UPDATE USING (
    get_user_role() = 'super_admin'
    OR (
      get_user_role() = 'medecin'
      AND (
        consultation_id IS NULL
        OR EXISTS (
          SELECT 1 FROM consultations c
          WHERE c.id = consultation_id
            AND user_belongs_to_etablissement(c.etablissement_id)
        )
      )
    )
  );


-- ============================================================
-- 3. S'assurer que "prescriptions_pharmacien_update" (018) est bien présente
--    et correspond à la définition attendue (recréation idempotente)
-- ============================================================
DROP POLICY IF EXISTS "prescriptions_pharmacien_update" ON prescriptions;
CREATE POLICY "prescriptions_pharmacien_update" ON prescriptions
  FOR UPDATE USING (
    get_user_role() = 'pharmacien'
    AND statut NOT IN ('dispense', 'annule')
    AND (date_expiration IS NULL OR date_expiration >= CURRENT_DATE)
  );
