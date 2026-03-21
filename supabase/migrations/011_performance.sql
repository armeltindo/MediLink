-- MediLink — Migration 011 : Index de performance + RPC agrégation
-- Corrige les slow queries identifiées lors de l'audit de performance — Mars 2026

-- ============================================================
-- 1. INDEXES MANQUANTS
-- ============================================================

-- Constantes par patient + date (onglet consultations, graphiques)
CREATE INDEX IF NOT EXISTS idx_constantes_patient_date
  ON constantes(patient_id, date_mesure DESC);

-- Constantes par consultation (chargement des cartes)
CREATE INDEX IF NOT EXISTS idx_constantes_consultation
  ON constantes(consultation_id);

-- Résultats d'analyse par patient + date (graphiques évolution)
CREATE INDEX IF NOT EXISTS idx_resultats_analyse_patient_date
  ON resultats_analyse(patient_id, date_resultat DESC);

-- Documents par patient (onglet documents)
CREATE INDEX IF NOT EXISTS idx_documents_patient
  ON documents(patient_id)
  WHERE deleted_at IS NULL;

-- Rendez-vous par patient (comptage dans l'onglet)
CREATE INDEX IF NOT EXISTS idx_rendez_vous_patient
  ON rendez_vous(patient_id);

-- Rendez-vous par date (queries plage temporelle dashboard)
CREATE INDEX IF NOT EXISTS idx_rendez_vous_date
  ON rendez_vous(date_heure DESC);

-- Vaccinations par statut (alertes vaccins en retard)
CREATE INDEX IF NOT EXISTS idx_vaccinations_statut
  ON vaccinations(patient_id, statut);

-- Consultations par patient + date (query principale onglet)
CREATE INDEX IF NOT EXISTS idx_consultations_patient_date
  ON consultations(patient_id, date_consultation DESC)
  WHERE deleted_at IS NULL;


-- ============================================================
-- 2. RPC : top diagnostics (remplace l'agrégation JS côté admin)
--    Retourne le TOP 10 des codes CIM-10 les plus fréquents
-- ============================================================
CREATE OR REPLACE FUNCTION get_top_diagnostics(p_limit INT DEFAULT 10)
RETURNS TABLE(code TEXT, count BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    diagnostic_cim10 AS code,
    COUNT(*) AS count
  FROM consultations
  WHERE diagnostic_cim10 IS NOT NULL
    AND deleted_at IS NULL
  GROUP BY diagnostic_cim10
  ORDER BY count DESC
  LIMIT p_limit;
$$;

-- ============================================================
-- 3. RPC : activité médecins (remplace l'agrégation JS)
--    Retourne le TOP 8 des médecins par nombre de consultations
-- ============================================================
CREATE OR REPLACE FUNCTION get_top_medecins(p_limit INT DEFAULT 8)
RETURNS TABLE(medecin_id UUID, nom TEXT, consultations BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    c.medecin_id,
    COALESCE('Dr. ' || u.prenom || ' ' || u.nom, LEFT(c.medecin_id::TEXT, 8)) AS nom,
    COUNT(*) AS consultations
  FROM consultations c
  LEFT JOIN users_profiles u ON u.id = c.medecin_id
  WHERE c.deleted_at IS NULL
  GROUP BY c.medecin_id, u.prenom, u.nom
  ORDER BY consultations DESC
  LIMIT p_limit;
$$;
