-- MediLink — Schéma Supabase complet
-- Version 1.0 — Mars 2026

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLES PRINCIPALES
-- ============================================================

-- Établissements de santé
CREATE TABLE etablissements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('CHU', 'CSP', 'clinique', 'hopital', 'cabinet')),
  ville TEXT NOT NULL,
  region TEXT NOT NULL,
  pays TEXT NOT NULL DEFAULT 'Bénin',
  adresse TEXT,
  telephone TEXT,
  email TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Profils utilisateurs (étend auth.users)
CREATE TABLE users_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin_etablissement', 'medecin', 'infirmier', 'laborantin', 'pharmacien')),
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  specialite TEXT,
  etablissement_id UUID REFERENCES etablissements(id),
  telephone TEXT,
  signature_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Patients
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  npi TEXT UNIQUE NOT NULL,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  date_naissance DATE NOT NULL,
  lieu_naissance TEXT,
  sexe CHAR(1) NOT NULL CHECK (sexe IN ('M', 'F')),
  situation_matrimoniale TEXT,
  nombre_enfants INTEGER DEFAULT 0,
  groupe_sanguin TEXT CHECK (groupe_sanguin IN ('A', 'B', 'AB', 'O')),
  rhesus CHAR(1) CHECK (rhesus IN ('+', '-')),
  nationalite TEXT DEFAULT 'Béninoise',
  ethnie TEXT,
  photo_url TEXT,
  profession TEXT,
  niveau_etudes TEXT,
  langue_preferee TEXT DEFAULT 'Français',
  contact_urgence_nom TEXT,
  contact_urgence_lien TEXT,
  contact_urgence_tel TEXT,
  assurance_organisme TEXT,
  assurance_numero TEXT,
  assurance_taux DECIMAL(5,2),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Antécédents médicaux personnels
CREATE TABLE antecedents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id),
  categorie TEXT NOT NULL CHECK (categorie IN ('medical', 'chirurgical', 'obstetrical', 'psychiatrique', 'traumatologique')),
  description TEXT NOT NULL,
  date_debut DATE,
  date_fin DATE,
  actif BOOLEAN DEFAULT TRUE,
  cim10_code TEXT,
  etablissement TEXT,
  medecin TEXT,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Antécédents familiaux
CREATE TABLE antecedents_familiaux (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id),
  parent TEXT NOT NULL CHECK (parent IN ('pere', 'mere', 'frere', 'soeur', 'gp_paternel', 'gm_paternelle', 'gp_maternel', 'gm_maternelle')),
  pathologie TEXT NOT NULL,
  statut_vital TEXT DEFAULT 'inconnu' CHECK (statut_vital IN ('vivant', 'decede', 'inconnu')),
  cause_deces TEXT,
  age_deces INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habitudes de vie
CREATE TABLE habitudes_vie (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID UNIQUE NOT NULL REFERENCES patients(id),
  tabac TEXT CHECK (tabac IN ('non_fumeur', 'fumeur', 'ex_fumeur')),
  tabac_quantite TEXT,
  tabac_duree TEXT,
  alcool TEXT CHECK (alcool IN ('non', 'occasionnel', 'regulier', 'excessif')),
  alcool_unites_semaine DECIMAL(5,1),
  drogues TEXT, -- champ chiffré (visible médecin seulement)
  activite_physique TEXT CHECK (activite_physique IN ('sedentaire', 'moderee', 'intense')),
  alimentation TEXT,
  eau_potable BOOLEAN,
  electricite BOOLEAN,
  assainissement BOOLEAN,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Allergies
CREATE TABLE allergies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id),
  substance TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('medicamenteuse', 'alimentaire', 'environnementale')),
  severite TEXT NOT NULL CHECK (severite IN ('legere', 'moderee', 'anaphylactique')),
  reaction TEXT NOT NULL,
  date_decouverte DATE,
  actif BOOLEAN DEFAULT TRUE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Consultations
CREATE TABLE consultations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id),
  medecin_id UUID NOT NULL REFERENCES auth.users(id),
  etablissement_id UUID NOT NULL REFERENCES etablissements(id),
  date_consultation TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  motif TEXT NOT NULL,
  anamnese TEXT,
  diagnostic_principal TEXT,
  diagnostic_cim10 TEXT,
  diagnostics_differentiels JSONB,
  plan_prise_en_charge TEXT,
  notes_confidentielles TEXT, -- chiffré, médecin uniquement
  type_consultation TEXT DEFAULT 'externe' CHECK (type_consultation IN ('externe', 'urgence', 'hospitalisation', 'teleconsultation')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Constantes vitales
CREATE TABLE constantes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consultation_id UUID REFERENCES consultations(id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  ta_sys INTEGER, -- mmHg
  ta_dia INTEGER, -- mmHg
  fc INTEGER, -- bpm
  fr INTEGER, -- rpm
  temperature DECIMAL(4,1), -- °C
  spo2 DECIMAL(4,1), -- %
  poids DECIMAL(5,1), -- kg
  taille DECIMAL(5,1), -- cm
  imc DECIMAL(4,1),
  glycemie DECIMAL(5,1), -- mmol/L
  date_mesure TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prescriptions / Ordonnances
CREATE TABLE prescriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consultation_id UUID REFERENCES consultations(id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  medecin_id UUID NOT NULL REFERENCES auth.users(id),
  medicament_dci TEXT NOT NULL,
  medicament_commercial TEXT,
  dosage TEXT NOT NULL,
  forme TEXT,
  posologie TEXT NOT NULL,
  duree TEXT NOT NULL,
  instructions TEXT,
  statut TEXT DEFAULT 'prescrit' CHECK (statut IN ('prescrit', 'dispense', 'en_cours', 'termine', 'annule')),
  dispense_par UUID REFERENCES auth.users(id),
  date_dispensation TIMESTAMPTZ,
  substitution_generique TEXT,
  date_prescription TIMESTAMPTZ DEFAULT NOW(),
  date_expiration DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Analyses prescrites
CREATE TABLE analyses_prescrites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consultation_id UUID REFERENCES consultations(id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  medecin_id UUID NOT NULL REFERENCES auth.users(id),
  type_analyse TEXT NOT NULL,
  urgence BOOLEAN DEFAULT FALSE,
  statut TEXT DEFAULT 'prescrit' CHECK (statut IN ('prescrit', 'en_attente', 'en_cours', 'rendu', 'annule')),
  instructions TEXT,
  date_prescription TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Résultats d'analyses
CREATE TABLE resultats_analyse (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  analyse_id UUID NOT NULL REFERENCES analyses_prescrites(id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  laborantin_id UUID NOT NULL REFERENCES auth.users(id),
  parametre TEXT NOT NULL,
  valeur DECIMAL(10,3),
  valeur_texte TEXT,
  unite TEXT,
  valeur_min DECIMAL(10,3),
  valeur_max DECIMAL(10,3),
  interpretation TEXT,
  date_resultat TIMESTAMPTZ DEFAULT NOW(),
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vaccinations
CREATE TABLE vaccinations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id),
  vaccin TEXT NOT NULL,
  dose TEXT,
  lot TEXT,
  voie TEXT,
  operateur_id UUID NOT NULL REFERENCES auth.users(id),
  etablissement_id UUID NOT NULL REFERENCES etablissements(id),
  date_vaccination DATE NOT NULL,
  prochain_rappel DATE,
  statut TEXT DEFAULT 'a_jour' CHECK (statut IN ('a_jour', 'en_retard', 'contre_indique')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hospitalisations
CREATE TABLE hospitalisations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id),
  etablissement_id UUID NOT NULL REFERENCES etablissements(id),
  medecin_referent_id UUID REFERENCES auth.users(id),
  date_entree TIMESTAMPTZ NOT NULL,
  date_sortie TIMESTAMPTZ,
  service TEXT NOT NULL,
  motif TEXT NOT NULL,
  resume_sejour TEXT,
  mode_sortie TEXT CHECK (mode_sortie IN ('domicile', 'transfert', 'deces', 'fugue')),
  cr_operatoire_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Soins infirmiers
CREATE TABLE soins_infirmiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospitalisation_id UUID NOT NULL REFERENCES hospitalisations(id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  infirmier_id UUID NOT NULL REFERENCES auth.users(id),
  type_soin TEXT NOT NULL,
  description TEXT NOT NULL,
  medicament_administre TEXT,
  dose TEXT,
  heure_administration TIMESTAMPTZ,
  constantes_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documents (imagerie, PDF, etc.)
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id),
  nom TEXT NOT NULL,
  url TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('imagerie', 'compte_rendu', 'ordonnance', 'certificat', 'autre')),
  taille INTEGER,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  etablissement_id UUID REFERENCES etablissements(id),
  description TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Consentements
CREATE TABLE consentements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id),
  type TEXT NOT NULL,
  date_consentement DATE NOT NULL,
  fichier_url TEXT,
  operateur_id UUID NOT NULL REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Journal d'audit (immuable — pas de UPDATE ni DELETE)
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  patient_id UUID REFERENCES patients(id),
  action TEXT NOT NULL,
  details TEXT,
  ip_address TEXT,
  etablissement_id UUID REFERENCES etablissements(id),
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES PERFORMANCE
-- ============================================================
CREATE INDEX idx_patients_npi ON patients(npi);
CREATE INDEX idx_patients_nom ON patients(nom, prenom);
CREATE INDEX idx_patients_dob ON patients(date_naissance);
CREATE INDEX idx_consultations_patient ON consultations(patient_id);
CREATE INDEX idx_consultations_medecin ON consultations(medecin_id);
CREATE INDEX idx_consultations_date ON consultations(date_consultation DESC);
CREATE INDEX idx_prescriptions_patient ON prescriptions(patient_id);
CREATE INDEX idx_prescriptions_statut ON prescriptions(statut);
CREATE INDEX idx_analyses_patient ON analyses_prescrites(patient_id);
CREATE INDEX idx_vaccinations_patient ON vaccinations(patient_id);
CREATE INDEX idx_hospitalisations_patient ON hospitalisations(patient_id);
CREATE INDEX idx_audit_logs_patient ON audit_logs(patient_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);

-- ============================================================
-- TRIGGER: updated_at automatique
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER patients_updated_at BEFORE UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER consultations_updated_at BEFORE UPDATE ON consultations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE etablissements ENABLE ROW LEVEL SECURITY;
ALTER TABLE users_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE antecedents ENABLE ROW LEVEL SECURITY;
ALTER TABLE antecedents_familiaux ENABLE ROW LEVEL SECURITY;
ALTER TABLE habitudes_vie ENABLE ROW LEVEL SECURITY;
ALTER TABLE allergies ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE constantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyses_prescrites ENABLE ROW LEVEL SECURITY;
ALTER TABLE resultats_analyse ENABLE ROW LEVEL SECURITY;
ALTER TABLE vaccinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospitalisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE soins_infirmiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE consentements ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper: récupérer le rôle de l'utilisateur connecté
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM users_profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: récupérer l'établissement de l'utilisateur connecté
CREATE OR REPLACE FUNCTION get_user_etablissement()
RETURNS UUID AS $$
  SELECT etablissement_id FROM users_profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- users_profiles: chaque utilisateur voit son profil; super_admin voit tout
CREATE POLICY "users_own_profile" ON users_profiles
  FOR ALL USING (id = auth.uid() OR get_user_role() = 'super_admin');

-- etablissements: lecture pour tous les authentifiés
CREATE POLICY "etablissements_read" ON etablissements
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "etablissements_write_admin" ON etablissements
  FOR ALL USING (get_user_role() = 'super_admin');

-- patients: accès selon rôle
CREATE POLICY "patients_super_admin" ON patients
  FOR ALL USING (get_user_role() = 'super_admin');

CREATE POLICY "patients_staff_read" ON patients
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND
    get_user_role() IN ('admin_etablissement', 'medecin', 'infirmier', 'laborantin', 'pharmacien')
    AND deleted_at IS NULL
  );

CREATE POLICY "patients_create" ON patients
  FOR INSERT WITH CHECK (
    get_user_role() IN ('medecin', 'admin_etablissement', 'super_admin')
  );

CREATE POLICY "patients_update" ON patients
  FOR UPDATE USING (
    get_user_role() IN ('medecin', 'admin_etablissement', 'super_admin')
  );

-- antecedents: médecin + admin
CREATE POLICY "antecedents_access" ON antecedents
  FOR ALL USING (
    get_user_role() IN ('super_admin', 'admin_etablissement', 'medecin', 'infirmier')
    AND deleted_at IS NULL
  );

-- antecedents_familiaux
CREATE POLICY "antecedents_familiaux_access" ON antecedents_familiaux
  FOR ALL USING (
    get_user_role() IN ('super_admin', 'admin_etablissement', 'medecin', 'infirmier')
  );

-- habitudes_vie: médecin uniquement pour les drogues (champ sensible)
CREATE POLICY "habitudes_vie_access" ON habitudes_vie
  FOR ALL USING (
    get_user_role() IN ('super_admin', 'admin_etablissement', 'medecin', 'infirmier')
  );

-- allergies
CREATE POLICY "allergies_access" ON allergies
  FOR ALL USING (
    auth.uid() IS NOT NULL AND deleted_at IS NULL
  );

-- consultations
CREATE POLICY "consultations_super_admin" ON consultations
  FOR ALL USING (get_user_role() = 'super_admin');

CREATE POLICY "consultations_medecin_write" ON consultations
  FOR ALL USING (
    get_user_role() = 'medecin'
    AND deleted_at IS NULL
  );

CREATE POLICY "consultations_staff_read" ON consultations
  FOR SELECT USING (
    get_user_role() IN ('admin_etablissement', 'infirmier', 'pharmacien', 'laborantin')
    AND deleted_at IS NULL
  );

-- constantes
CREATE POLICY "constantes_access" ON constantes
  FOR ALL USING (
    get_user_role() IN ('super_admin', 'medecin', 'infirmier', 'admin_etablissement')
  );

-- prescriptions
CREATE POLICY "prescriptions_super_admin" ON prescriptions
  FOR ALL USING (get_user_role() = 'super_admin');

CREATE POLICY "prescriptions_medecin_write" ON prescriptions
  FOR ALL USING (
    get_user_role() = 'medecin' AND deleted_at IS NULL
  );

CREATE POLICY "prescriptions_pharmacien_read" ON prescriptions
  FOR SELECT USING (get_user_role() = 'pharmacien' AND deleted_at IS NULL);

CREATE POLICY "prescriptions_pharmacien_update" ON prescriptions
  FOR UPDATE USING (get_user_role() = 'pharmacien');

CREATE POLICY "prescriptions_read_others" ON prescriptions
  FOR SELECT USING (
    get_user_role() IN ('admin_etablissement', 'infirmier')
    AND deleted_at IS NULL
  );

-- analyses_prescrites
CREATE POLICY "analyses_medecin" ON analyses_prescrites
  FOR ALL USING (
    get_user_role() IN ('super_admin', 'medecin') AND deleted_at IS NULL
  );

CREATE POLICY "analyses_laborantin_read" ON analyses_prescrites
  FOR SELECT USING (get_user_role() = 'laborantin' AND deleted_at IS NULL);

CREATE POLICY "analyses_read_others" ON analyses_prescrites
  FOR SELECT USING (
    get_user_role() IN ('admin_etablissement', 'infirmier') AND deleted_at IS NULL
  );

-- resultats_analyse
CREATE POLICY "resultats_laborantin_write" ON resultats_analyse
  FOR ALL USING (get_user_role() IN ('super_admin', 'laborantin'));

CREATE POLICY "resultats_read" ON resultats_analyse
  FOR SELECT USING (
    get_user_role() IN ('medecin', 'admin_etablissement', 'infirmier')
  );

-- vaccinations
CREATE POLICY "vaccinations_access" ON vaccinations
  FOR ALL USING (
    auth.uid() IS NOT NULL
  );

-- hospitalisations
CREATE POLICY "hospitalisations_access" ON hospitalisations
  FOR ALL USING (
    get_user_role() IN ('super_admin', 'admin_etablissement', 'medecin', 'infirmier')
    AND deleted_at IS NULL
  );

-- soins_infirmiers
CREATE POLICY "soins_infirmiers_access" ON soins_infirmiers
  FOR ALL USING (
    get_user_role() IN ('super_admin', 'medecin', 'infirmier')
  );

-- documents
CREATE POLICY "documents_access" ON documents
  FOR ALL USING (
    auth.uid() IS NOT NULL AND deleted_at IS NULL
  );

-- consentements
CREATE POLICY "consentements_access" ON consentements
  FOR ALL USING (
    get_user_role() IN ('super_admin', 'admin_etablissement', 'medecin')
  );

-- audit_logs: lecture admin seulement, écriture pour tous
CREATE POLICY "audit_logs_insert" ON audit_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "audit_logs_read_admin" ON audit_logs
  FOR SELECT USING (
    get_user_role() IN ('super_admin', 'admin_etablissement')
  );
