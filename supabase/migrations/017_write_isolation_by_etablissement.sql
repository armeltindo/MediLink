-- 017_write_isolation_by_etablissement.sql
-- Restriction des écritures aux actes de l'établissement de l'auteur
--
-- Principe :
--   • Un patient n'appartient à aucun établissement (dossier partagé inter-établissements)
--   • Chaque acte clinique (consultation, hospit., vaccination…) porte un etablissement_id
--   • En lecture : tout le staff autorisé voit tous les patients (RLS par rôle, pas changé)
--   • En écriture : on ne peut créer/modifier que les actes de son propre établissement
--     Exception intentionnelle (cross-établissement voulu) :
--       - laborantin : peut entrer des résultats d'analyses prescrites ailleurs
--       - pharmacien : peut dispenser des ordonnances prescrites ailleurs
-- ============================================================

-- ============================================================
-- HELPER FUNCTION
-- Vérifie que l'utilisateur connecté appartient à un établissement donné.
-- Vérifie via user_etablissements (staff multi-établissements, suspended_at IS NULL)
-- OU via users_profiles.etablissement_id (admin_etablissement à établissement unique).
-- ============================================================

CREATE OR REPLACE FUNCTION user_belongs_to_etablissement(etab_id UUID)
RETURNS BOOLEAN AS $$
  SELECT
    EXISTS (
      SELECT 1 FROM user_etablissements
      WHERE user_id = auth.uid()
        AND etablissement_id = etab_id
        AND suspended_at IS NULL
    )
    OR EXISTS (
      SELECT 1 FROM users_profiles
      WHERE id = auth.uid()
        AND etablissement_id = etab_id
    )
$$ LANGUAGE sql SECURITY DEFINER STABLE;


-- ============================================================
-- CONSULTATIONS
-- ============================================================

DROP POLICY IF EXISTS "consultations_insert" ON consultations;
CREATE POLICY "consultations_insert" ON consultations
  FOR INSERT WITH CHECK (
    get_user_role() = 'super_admin'
    OR (
      get_user_role() = 'medecin'
      AND user_belongs_to_etablissement(NEW.etablissement_id)
    )
  );

DROP POLICY IF EXISTS "consultations_update" ON consultations;
CREATE POLICY "consultations_update" ON consultations
  FOR UPDATE USING (
    get_user_role() = 'super_admin'
    OR (
      get_user_role() = 'medecin'
      AND user_belongs_to_etablissement(etablissement_id)
    )
  );


-- ============================================================
-- VACCINATIONS
-- Nettoyage : la policy FOR ALL "vaccinations_access" de 001 n'a jamais été supprimée
-- et coexiste avec les policies séparées de 005.
-- ============================================================

DROP POLICY IF EXISTS "vaccinations_access" ON vaccinations;   -- ancienne FOR ALL (001)
DROP POLICY IF EXISTS "vaccinations_select" ON vaccinations;
DROP POLICY IF EXISTS "vaccinations_insert" ON vaccinations;
DROP POLICY IF EXISTS "vaccinations_update" ON vaccinations;

CREATE POLICY "vaccinations_select" ON vaccinations
  FOR SELECT USING (
    get_user_role() IN ('super_admin', 'admin_etablissement', 'medecin', 'infirmier')
  );

CREATE POLICY "vaccinations_insert" ON vaccinations
  FOR INSERT WITH CHECK (
    get_user_role() = 'super_admin'
    OR (
      get_user_role() IN ('medecin', 'infirmier')
      AND user_belongs_to_etablissement(NEW.etablissement_id)
    )
  );

CREATE POLICY "vaccinations_update" ON vaccinations
  FOR UPDATE USING (
    get_user_role() = 'super_admin'
    OR (
      get_user_role() IN ('medecin', 'infirmier')
      AND user_belongs_to_etablissement(etablissement_id)
    )
  );


-- ============================================================
-- HOSPITALISATIONS
-- ============================================================

DROP POLICY IF EXISTS "hospitalisations_insert" ON hospitalisations;
CREATE POLICY "hospitalisations_insert" ON hospitalisations
  FOR INSERT WITH CHECK (
    get_user_role() = 'super_admin'
    OR (
      get_user_role() IN ('medecin', 'admin_etablissement')
      AND user_belongs_to_etablissement(NEW.etablissement_id)
    )
  );

DROP POLICY IF EXISTS "hospitalisations_update" ON hospitalisations;
CREATE POLICY "hospitalisations_update" ON hospitalisations
  FOR UPDATE USING (
    get_user_role() = 'super_admin'
    OR (
      get_user_role() IN ('medecin', 'admin_etablissement', 'infirmier')
      AND user_belongs_to_etablissement(etablissement_id)
    )
  );


-- ============================================================
-- SOINS INFIRMIERS (liés à une hospitalisation)
-- Nettoyage : la policy FOR ALL "soins_infirmiers_access" de 001 n'a jamais été remplacée.
-- ============================================================

DROP POLICY IF EXISTS "soins_infirmiers_access" ON soins_infirmiers;  -- ancienne FOR ALL (001)
DROP POLICY IF EXISTS "soins_infirmiers_select" ON soins_infirmiers;
DROP POLICY IF EXISTS "soins_infirmiers_insert" ON soins_infirmiers;
DROP POLICY IF EXISTS "soins_infirmiers_update" ON soins_infirmiers;

CREATE POLICY "soins_infirmiers_select" ON soins_infirmiers
  FOR SELECT USING (
    get_user_role() IN ('super_admin', 'admin_etablissement', 'medecin', 'infirmier')
  );

-- L'infirmier ne peut ajouter des soins qu'au sein de l'hospitalisation de son établissement
CREATE POLICY "soins_infirmiers_insert" ON soins_infirmiers
  FOR INSERT WITH CHECK (
    get_user_role() = 'super_admin'
    OR (
      get_user_role() IN ('medecin', 'infirmier')
      AND EXISTS (
        SELECT 1 FROM hospitalisations h
        WHERE h.id = NEW.hospitalisation_id
          AND user_belongs_to_etablissement(h.etablissement_id)
      )
    )
  );

CREATE POLICY "soins_infirmiers_update" ON soins_infirmiers
  FOR UPDATE USING (
    get_user_role() = 'super_admin'
    OR (
      get_user_role() IN ('medecin', 'infirmier')
      AND EXISTS (
        SELECT 1 FROM hospitalisations h
        WHERE h.id = hospitalisation_id
          AND user_belongs_to_etablissement(h.etablissement_id)
      )
    )
  );


-- ============================================================
-- DOCUMENTS
-- etablissement_id est nullable : si renseigné, l'auteur doit appartenir à cet établissement.
-- ============================================================

DROP POLICY IF EXISTS "documents_insert" ON documents;
CREATE POLICY "documents_insert" ON documents
  FOR INSERT WITH CHECK (
    get_user_role() = 'super_admin'
    OR (
      get_user_role() IN ('medecin', 'infirmier', 'admin_etablissement')
      AND (
        NEW.etablissement_id IS NULL
        OR user_belongs_to_etablissement(NEW.etablissement_id)
      )
    )
  );


-- ============================================================
-- RENDEZ_VOUS
-- etablissement_id est nullable.
-- ============================================================

DROP POLICY IF EXISTS "rdv_insert" ON rendez_vous;
CREATE POLICY "rdv_insert" ON rendez_vous
  FOR INSERT WITH CHECK (
    get_user_role() = 'super_admin'
    OR (
      get_user_role() IN ('admin_etablissement', 'medecin', 'infirmier')
      AND (
        NEW.etablissement_id IS NULL
        OR user_belongs_to_etablissement(NEW.etablissement_id)
      )
    )
  );

DROP POLICY IF EXISTS "rdv_update" ON rendez_vous;
CREATE POLICY "rdv_update" ON rendez_vous
  FOR UPDATE USING (
    get_user_role() = 'super_admin'
    OR (
      get_user_role() IN ('admin_etablissement', 'medecin', 'infirmier')
      AND (
        etablissement_id IS NULL
        OR user_belongs_to_etablissement(etablissement_id)
      )
    )
  );


-- ============================================================
-- PRESCRIPTIONS (pas d'etablissement_id direct — lien via consultation)
-- Le médecin ne peut prescrire que dans le cadre d'une consultation de son établissement.
-- Exception : le pharmacien peut dispenser n'importe quelle ordonnance (cross-établissement voulu).
-- ============================================================

DROP POLICY IF EXISTS "prescriptions_insert" ON prescriptions;
CREATE POLICY "prescriptions_insert" ON prescriptions
  FOR INSERT WITH CHECK (
    get_user_role() = 'super_admin'
    OR (
      get_user_role() = 'medecin'
      AND (
        -- prescription sans consultation (cas de prescription directe)
        NEW.consultation_id IS NULL
        OR EXISTS (
          SELECT 1 FROM consultations c
          WHERE c.id = NEW.consultation_id
            AND user_belongs_to_etablissement(c.etablissement_id)
        )
      )
    )
  );

DROP POLICY IF EXISTS "prescriptions_update" ON prescriptions;
CREATE POLICY "prescriptions_update" ON prescriptions
  FOR UPDATE USING (
    get_user_role() = 'super_admin'
    -- Médecin : seulement via consultation de son établissement
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
    -- Pharmacien : peut dispenser depuis n'importe quel établissement (cross-établissement voulu)
    OR get_user_role() = 'pharmacien'
  );


-- ============================================================
-- ANALYSES_PRESCRITES (pas d'etablissement_id direct — lien via consultation)
-- Le médecin ne prescrit que pour ses consultations.
-- Exception : le laborantin peut mettre à jour le statut depuis n'importe quel établissement
--   (patient envoyé faire ses analyses dans un laboratoire tiers — cross-établissement voulu).
-- ============================================================

DROP POLICY IF EXISTS "analyses_insert" ON analyses_prescrites;
CREATE POLICY "analyses_insert" ON analyses_prescrites
  FOR INSERT WITH CHECK (
    get_user_role() = 'super_admin'
    OR (
      get_user_role() = 'medecin'
      AND (
        NEW.consultation_id IS NULL
        OR EXISTS (
          SELECT 1 FROM consultations c
          WHERE c.id = NEW.consultation_id
            AND user_belongs_to_etablissement(c.etablissement_id)
        )
      )
    )
  );

DROP POLICY IF EXISTS "analyses_update" ON analyses_prescrites;
CREATE POLICY "analyses_update" ON analyses_prescrites
  FOR UPDATE USING (
    get_user_role() = 'super_admin'
    -- Médecin : seulement via consultation de son établissement
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
    -- Laborantin : cross-établissement voulu (entre les résultats pour n'importe quelle analyse)
    OR get_user_role() = 'laborantin'
  );


-- ============================================================
-- RESULTATS_ANALYSE
-- Aucune restriction par établissement : le laborantin entre les résultats
-- d'analyses prescrites par un autre établissement — c'est le cas d'usage nominal.
-- La restriction par rôle (laborantin uniquement) est suffisante.
-- ============================================================

-- (aucun changement — restriction par rôle déjà en place dans 005)
