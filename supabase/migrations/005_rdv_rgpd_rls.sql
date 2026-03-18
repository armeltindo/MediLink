-- MediLink — Migration 005
-- Rendez-vous, Consentements RGPD, RLS policies explicites
-- Mars 2026

-- ============================================================
-- 1. TABLE: rendez_vous
-- ============================================================
CREATE TABLE IF NOT EXISTS rendez_vous (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  medecin_id UUID NOT NULL REFERENCES auth.users(id),
  etablissement_id UUID REFERENCES etablissements(id),
  date_rdv TIMESTAMPTZ NOT NULL,
  duree_minutes INTEGER NOT NULL DEFAULT 30,
  type_rdv TEXT NOT NULL CHECK (type_rdv IN (
    'consultation', 'suivi', 'urgence', 'vaccination',
    'analyse', 'chirurgie', 'autre'
  )),
  motif TEXT NOT NULL,
  statut TEXT NOT NULL DEFAULT 'planifie' CHECK (statut IN (
    'planifie', 'confirme', 'annule', 'effectue', 'absent'
  )),
  notes TEXT,
  rappel_envoye BOOLEAN DEFAULT FALSE,
  cree_par UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_rdv_patient ON rendez_vous(patient_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_rdv_medecin_date ON rendez_vous(medecin_id, date_rdv) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_rdv_date ON rendez_vous(date_rdv) WHERE deleted_at IS NULL;

-- ============================================================
-- 2. TABLE: consentements_rgpd
-- ============================================================
CREATE TABLE IF NOT EXISTS consentements_rgpd (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  type_consentement TEXT NOT NULL CHECK (type_consentement IN (
    'traitement_donnees',
    'partage_inter_etablissement',
    'recherche_medicale',
    'telemedicine',
    'contact_urgence',
    'photo_identite'
  )),
  statut TEXT NOT NULL DEFAULT 'accorde' CHECK (statut IN ('accorde', 'refuse', 'retire')),
  date_consentement TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  date_expiration TIMESTAMPTZ,
  recueilli_par UUID REFERENCES auth.users(id),
  commentaire TEXT,
  signature_numerique TEXT, -- base64 ou hash
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consentements_patient ON consentements_rgpd(patient_id);

-- ============================================================
-- 3. RLS — ACTIVATION ET POLICIES EXPLICITES
-- ============================================================

-- Helper function (recreate if not exists)
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM users_profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── rendez_vous ────────────────────────────────────────────
ALTER TABLE rendez_vous ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rdv_select" ON rendez_vous;
CREATE POLICY "rdv_select" ON rendez_vous
  FOR SELECT USING (
    get_user_role() IN ('super_admin', 'admin_etablissement', 'medecin', 'infirmier', 'pharmacien', 'laborantin')
  );

DROP POLICY IF EXISTS "rdv_insert" ON rendez_vous;
CREATE POLICY "rdv_insert" ON rendez_vous
  FOR INSERT WITH CHECK (
    get_user_role() IN ('super_admin', 'admin_etablissement', 'medecin', 'infirmier')
  );

DROP POLICY IF EXISTS "rdv_update" ON rendez_vous;
CREATE POLICY "rdv_update" ON rendez_vous
  FOR UPDATE USING (
    get_user_role() IN ('super_admin', 'admin_etablissement', 'medecin', 'infirmier')
  );

DROP POLICY IF EXISTS "rdv_delete" ON rendez_vous;
CREATE POLICY "rdv_delete" ON rendez_vous
  FOR DELETE USING (
    get_user_role() IN ('super_admin', 'admin_etablissement')
  );

-- ── consentements_rgpd ────────────────────────────────────
ALTER TABLE consentements_rgpd ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "consentements_select" ON consentements_rgpd;
CREATE POLICY "consentements_select" ON consentements_rgpd
  FOR SELECT USING (
    get_user_role() IN ('super_admin', 'admin_etablissement', 'medecin', 'infirmier')
  );

DROP POLICY IF EXISTS "consentements_insert" ON consentements_rgpd;
CREATE POLICY "consentements_insert" ON consentements_rgpd
  FOR INSERT WITH CHECK (
    get_user_role() IN ('super_admin', 'admin_etablissement', 'medecin', 'infirmier')
  );

DROP POLICY IF EXISTS "consentements_update" ON consentements_rgpd;
CREATE POLICY "consentements_update" ON consentements_rgpd
  FOR UPDATE USING (
    get_user_role() IN ('super_admin', 'admin_etablissement', 'medecin')
  );

-- ── patients ──────────────────────────────────────────────
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "patients_select" ON patients;
CREATE POLICY "patients_select" ON patients
  FOR SELECT USING (
    deleted_at IS NULL
    AND get_user_role() IN ('super_admin', 'admin_etablissement', 'medecin', 'infirmier', 'pharmacien', 'laborantin')
  );

DROP POLICY IF EXISTS "patients_insert" ON patients;
CREATE POLICY "patients_insert" ON patients
  FOR INSERT WITH CHECK (
    get_user_role() IN ('super_admin', 'admin_etablissement', 'medecin', 'infirmier')
  );

DROP POLICY IF EXISTS "patients_update" ON patients;
CREATE POLICY "patients_update" ON patients
  FOR UPDATE USING (
    get_user_role() IN ('super_admin', 'admin_etablissement', 'medecin', 'infirmier')
  );

-- ── consultations ─────────────────────────────────────────
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "consultations_select" ON consultations;
CREATE POLICY "consultations_select" ON consultations
  FOR SELECT USING (
    deleted_at IS NULL
    AND get_user_role() IN ('super_admin', 'admin_etablissement', 'medecin', 'infirmier')
  );

DROP POLICY IF EXISTS "consultations_insert" ON consultations;
CREATE POLICY "consultations_insert" ON consultations
  FOR INSERT WITH CHECK (
    get_user_role() IN ('super_admin', 'medecin')
  );

DROP POLICY IF EXISTS "consultations_update" ON consultations;
CREATE POLICY "consultations_update" ON consultations
  FOR UPDATE USING (
    get_user_role() IN ('super_admin', 'medecin')
  );

-- ── prescriptions ─────────────────────────────────────────
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "prescriptions_select" ON prescriptions;
CREATE POLICY "prescriptions_select" ON prescriptions
  FOR SELECT USING (
    deleted_at IS NULL
    AND get_user_role() IN ('super_admin', 'admin_etablissement', 'medecin', 'pharmacien', 'infirmier')
  );

DROP POLICY IF EXISTS "prescriptions_insert" ON prescriptions;
CREATE POLICY "prescriptions_insert" ON prescriptions
  FOR INSERT WITH CHECK (
    get_user_role() IN ('super_admin', 'medecin')
  );

DROP POLICY IF EXISTS "prescriptions_update" ON prescriptions;
CREATE POLICY "prescriptions_update" ON prescriptions
  FOR UPDATE USING (
    get_user_role() IN ('super_admin', 'medecin', 'pharmacien')
  );

-- ── analyses_prescrites ────────────────────────────────────
ALTER TABLE analyses_prescrites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "analyses_select" ON analyses_prescrites;
CREATE POLICY "analyses_select" ON analyses_prescrites
  FOR SELECT USING (
    deleted_at IS NULL
    AND get_user_role() IN ('super_admin', 'admin_etablissement', 'medecin', 'laborantin', 'infirmier')
  );

DROP POLICY IF EXISTS "analyses_insert" ON analyses_prescrites;
CREATE POLICY "analyses_insert" ON analyses_prescrites
  FOR INSERT WITH CHECK (
    get_user_role() IN ('super_admin', 'medecin')
  );

DROP POLICY IF EXISTS "analyses_update" ON analyses_prescrites;
CREATE POLICY "analyses_update" ON analyses_prescrites
  FOR UPDATE USING (
    get_user_role() IN ('super_admin', 'medecin', 'laborantin')
  );

-- ── vaccinations ──────────────────────────────────────────
ALTER TABLE vaccinations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vaccinations_select" ON vaccinations;
CREATE POLICY "vaccinations_select" ON vaccinations
  FOR SELECT USING (
    get_user_role() IN ('super_admin', 'admin_etablissement', 'medecin', 'infirmier')
  );

DROP POLICY IF EXISTS "vaccinations_insert" ON vaccinations;
CREATE POLICY "vaccinations_insert" ON vaccinations
  FOR INSERT WITH CHECK (
    get_user_role() IN ('super_admin', 'medecin', 'infirmier')
  );

-- ── hospitalisations ──────────────────────────────────────
ALTER TABLE hospitalisations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hospitalisations_select" ON hospitalisations;
CREATE POLICY "hospitalisations_select" ON hospitalisations
  FOR SELECT USING (
    deleted_at IS NULL
    AND get_user_role() IN ('super_admin', 'admin_etablissement', 'medecin', 'infirmier')
  );

DROP POLICY IF EXISTS "hospitalisations_insert" ON hospitalisations;
CREATE POLICY "hospitalisations_insert" ON hospitalisations
  FOR INSERT WITH CHECK (
    get_user_role() IN ('super_admin', 'medecin', 'admin_etablissement')
  );

DROP POLICY IF EXISTS "hospitalisations_update" ON hospitalisations;
CREATE POLICY "hospitalisations_update" ON hospitalisations
  FOR UPDATE USING (
    get_user_role() IN ('super_admin', 'medecin', 'admin_etablissement')
  );

-- ── audit_logs ────────────────────────────────────────────
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_logs_select" ON audit_logs;
CREATE POLICY "audit_logs_select" ON audit_logs
  FOR SELECT USING (
    get_user_role() IN ('super_admin', 'admin_etablissement')
  );

DROP POLICY IF EXISTS "audit_logs_insert" ON audit_logs;
CREATE POLICY "audit_logs_insert" ON audit_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ── users_profiles ────────────────────────────────────────
ALTER TABLE users_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON users_profiles;
CREATE POLICY "profiles_select_own" ON users_profiles
  FOR SELECT USING (
    id = auth.uid()
    OR get_user_role() IN ('super_admin', 'admin_etablissement')
  );

DROP POLICY IF EXISTS "profiles_update_own" ON users_profiles;
CREATE POLICY "profiles_update_own" ON users_profiles
  FOR UPDATE USING (
    id = auth.uid()
    OR get_user_role() IN ('super_admin', 'admin_etablissement')
  );

DROP POLICY IF EXISTS "profiles_insert_admin" ON users_profiles;
CREATE POLICY "profiles_insert_admin" ON users_profiles
  FOR INSERT WITH CHECK (
    get_user_role() IN ('super_admin', 'admin_etablissement')
  );

-- ── allergies ─────────────────────────────────────────────
ALTER TABLE allergies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allergies_select" ON allergies;
CREATE POLICY "allergies_select" ON allergies
  FOR SELECT USING (
    deleted_at IS NULL
    AND get_user_role() IN ('super_admin', 'admin_etablissement', 'medecin', 'infirmier', 'pharmacien')
  );

DROP POLICY IF EXISTS "allergies_insert" ON allergies;
CREATE POLICY "allergies_insert" ON allergies
  FOR INSERT WITH CHECK (
    get_user_role() IN ('super_admin', 'medecin', 'infirmier')
  );

-- ── antecedents ───────────────────────────────────────────
ALTER TABLE antecedents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "antecedents_select" ON antecedents;
CREATE POLICY "antecedents_select" ON antecedents
  FOR SELECT USING (
    deleted_at IS NULL
    AND get_user_role() IN ('super_admin', 'admin_etablissement', 'medecin', 'infirmier')
  );

DROP POLICY IF EXISTS "antecedents_insert" ON antecedents;
CREATE POLICY "antecedents_insert" ON antecedents
  FOR INSERT WITH CHECK (
    get_user_role() IN ('super_admin', 'medecin', 'infirmier')
  );

-- ── documents ─────────────────────────────────────────────
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "documents_select" ON documents;
CREATE POLICY "documents_select" ON documents
  FOR SELECT USING (
    deleted_at IS NULL
    AND get_user_role() IN ('super_admin', 'admin_etablissement', 'medecin', 'infirmier')
  );

DROP POLICY IF EXISTS "documents_insert" ON documents;
CREATE POLICY "documents_insert" ON documents
  FOR INSERT WITH CHECK (
    get_user_role() IN ('super_admin', 'medecin', 'infirmier', 'admin_etablissement')
  );

-- ── etablissements ────────────────────────────────────────
ALTER TABLE etablissements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "etablissements_select" ON etablissements;
CREATE POLICY "etablissements_select" ON etablissements
  FOR SELECT USING (
    deleted_at IS NULL AND auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "etablissements_insert" ON etablissements;
CREATE POLICY "etablissements_insert" ON etablissements
  FOR INSERT WITH CHECK (
    get_user_role() = 'super_admin'
  );

DROP POLICY IF EXISTS "etablissements_update" ON etablissements;
CREATE POLICY "etablissements_update" ON etablissements
  FOR UPDATE USING (
    get_user_role() IN ('super_admin', 'admin_etablissement')
  );

-- ============================================================
-- 4. TYPE dans database.types pour rendez_vous + consentements
--    (commentaire de référence — les types TS sont gérés manuellement)
-- ============================================================
-- rendez_vous: id, patient_id, medecin_id, etablissement_id,
--   date_rdv, duree_minutes, type_rdv, motif, statut,
--   notes, rappel_envoye, cree_par, created_at, updated_at, deleted_at
-- consentements_rgpd: id, patient_id, type_consentement, statut,
--   date_consentement, date_expiration, recueilli_par,
--   commentaire, signature_numerique, created_at, updated_at
