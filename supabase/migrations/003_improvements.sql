-- MediLink — Migration 003 : Corrections et améliorations du schéma
-- Générée suite à l'audit de conformité — Mars 2026
-- Applique tous les correctifs identifiés lors de l'audit des nouvelles fonctionnalités

-- ============================================================
-- 1. FIX: habitudes_vie.alcool — contrainte CHECK incomplète
--    La valeur 'aucun' est utilisée dans le formulaire mais absente du CHECK
-- ============================================================
ALTER TABLE habitudes_vie
  DROP CONSTRAINT IF EXISTS habitudes_vie_alcool_check;

ALTER TABLE habitudes_vie
  ADD CONSTRAINT habitudes_vie_alcool_check
  CHECK (alcool IN ('aucun', 'non', 'occasionnel', 'regulier', 'excessif'));


-- ============================================================
-- 2. FIX: antecedents.created_by — NOT NULL sans valeur par défaut
--    Le formulaire AddAntecedentDialog n'envoie pas created_by.
--    Solution : trigger BEFORE INSERT qui injecte auth.uid() si absent.
-- ============================================================
CREATE OR REPLACE FUNCTION set_created_by()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by = auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER antecedents_set_created_by
  BEFORE INSERT ON antecedents
  FOR EACH ROW EXECUTE FUNCTION set_created_by();


-- ============================================================
-- 3. FIX: allergies.created_by — même problème que antecedents
-- ============================================================
CREATE TRIGGER allergies_set_created_by
  BEFORE INSERT ON allergies
  FOR EACH ROW EXECUTE FUNCTION set_created_by();


-- ============================================================
-- 4. NOUVEAU: consultations — champ constantes embarquées
--    Permet de stocker les constantes vitales directement dans
--    la consultation (utilisé dans le formulaire de consultation)
-- ============================================================
ALTER TABLE consultations
  ADD COLUMN IF NOT EXISTS constantes_json JSONB;


-- ============================================================
-- 5. NOUVEAU: analyses_prescrites — résultat rapide texte
--    Permet au laborantin de saisir un résultat textuel global
--    sans passer par resultats_analyse pour les cas simples
-- ============================================================
ALTER TABLE analyses_prescrites
  ADD COLUMN IF NOT EXISTS resultat_rapide TEXT,
  ADD COLUMN IF NOT EXISTS date_rendu TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rendu_par UUID REFERENCES auth.users(id);


-- ============================================================
-- 6. NOUVEAU: hospitalisations — numéro de chambre/lit
--    Requis pour la gestion des lits hospitaliers
-- ============================================================
ALTER TABLE hospitalisations
  ADD COLUMN IF NOT EXISTS chambre TEXT,
  ADD COLUMN IF NOT EXISTS lit TEXT,
  ADD COLUMN IF NOT EXISTS diagnostic_entree TEXT,
  ADD COLUMN IF NOT EXISTS diagnostic_sortie TEXT,
  ADD COLUMN IF NOT EXISTS diagnostic_sortie_cim10 TEXT;


-- ============================================================
-- 7. NOUVEAU: patients — champs additionnels spec complète
--    Adresse complète, code postal, ville (spec NPI)
-- ============================================================
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS adresse TEXT,
  ADD COLUMN IF NOT EXISTS ville TEXT,
  ADD COLUMN IF NOT EXISTS code_postal TEXT,
  ADD COLUMN IF NOT EXISTS telephone TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT;


-- ============================================================
-- 8. NOUVEAU: users_profiles — numéro d'ordre médical
--    Requis pour les ordonnances et lettres de référence
-- ============================================================
ALTER TABLE users_profiles
  ADD COLUMN IF NOT EXISTS numero_ordre TEXT,
  ADD COLUMN IF NOT EXISTS titre TEXT;


-- ============================================================
-- 9. INDEXES PERFORMANCE — nouvelles requêtes identifiées
-- ============================================================

-- Admin dashboard: hospitalisations en cours (date_sortie IS NULL)
CREATE INDEX IF NOT EXISTS idx_hospitalisations_en_cours
  ON hospitalisations(date_sortie)
  WHERE date_sortie IS NULL AND deleted_at IS NULL;

-- Break-the-glass: recherche par action dans audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_action
  ON audit_logs(action);

-- Filtres antécédents actifs
CREATE INDEX IF NOT EXISTS idx_antecedents_patient_actif
  ON antecedents(patient_id, actif)
  WHERE deleted_at IS NULL;

-- Filtres allergies actives
CREATE INDEX IF NOT EXISTS idx_allergies_patient_actif
  ON allergies(patient_id, actif)
  WHERE deleted_at IS NULL;

-- Recherche prescriptions actives par patient
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_actif
  ON prescriptions(patient_id, statut)
  WHERE deleted_at IS NULL;

-- Analyses par statut (liste laborantin)
CREATE INDEX IF NOT EXISTS idx_analyses_statut
  ON analyses_prescrites(statut)
  WHERE deleted_at IS NULL;

-- Vaccinations par date de rappel (alertes vaccin)
CREATE INDEX IF NOT EXISTS idx_vaccinations_rappel
  ON vaccinations(prochain_rappel)
  WHERE prochain_rappel IS NOT NULL;

-- Consultations par établissement + date (stats admin)
CREATE INDEX IF NOT EXISTS idx_consultations_etab_date
  ON consultations(etablissement_id, date_consultation DESC)
  WHERE deleted_at IS NULL;


-- ============================================================
-- 10. TRIGGER: audit_logs — bloquer UPDATE et DELETE (immuabilité)
--     Garantit que les logs d'audit ne peuvent pas être modifiés
-- ============================================================
CREATE OR REPLACE FUNCTION prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Les logs d''audit sont immuables et ne peuvent pas être modifiés ou supprimés.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_logs_no_update ON audit_logs;
CREATE TRIGGER audit_logs_no_update
  BEFORE UPDATE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();

DROP TRIGGER IF EXISTS audit_logs_no_delete ON audit_logs;
CREATE TRIGGER audit_logs_no_delete
  BEFORE DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();


-- ============================================================
-- 11. RLS POLICY: soins_infirmiers — lecture pour admin_etablissement
--     Manquait pour les rapports d'administration
-- ============================================================
DROP POLICY IF EXISTS "soins_infirmiers_admin_read" ON soins_infirmiers;
CREATE POLICY "soins_infirmiers_admin_read" ON soins_infirmiers
  FOR SELECT USING (
    get_user_role() IN ('super_admin', 'admin_etablissement', 'medecin', 'infirmier')
  );


-- ============================================================
-- 12. RLS POLICY: resultats_analyse — le médecin peut lire
--     La politique actuelle oublie le medecin en SELECT+INSERT
-- ============================================================
DROP POLICY IF EXISTS "resultats_read" ON resultats_analyse;
CREATE POLICY "resultats_read" ON resultats_analyse
  FOR SELECT USING (
    get_user_role() IN ('super_admin', 'medecin', 'admin_etablissement', 'infirmier')
  );


-- ============================================================
-- 13. STORAGE: bucket 'documents' — politique d'accès
--     Les photos patient et documents sont uploadés dans ce bucket
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  FALSE,
  52428800, -- 50 MB max
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Politique upload : utilisateurs authentifiés peuvent uploader
DROP POLICY IF EXISTS "documents_upload" ON storage.objects;
CREATE POLICY "documents_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documents'
    AND auth.uid() IS NOT NULL
  );

-- Politique lecture : utilisateurs authentifiés peuvent lire
DROP POLICY IF EXISTS "documents_read" ON storage.objects;
CREATE POLICY "documents_read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documents'
    AND auth.uid() IS NOT NULL
  );

-- Politique suppression : médecin/admin uniquement
DROP POLICY IF EXISTS "documents_delete" ON storage.objects;
CREATE POLICY "documents_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'documents'
    AND get_user_role() IN ('super_admin', 'admin_etablissement', 'medecin')
  );
