-- ============================================================
-- 009 — Extension des champs du profil patient
-- Ajout : coordonnées, anthropométrie, infos médicales initiales,
--         tuteur légal (mineurs)
-- ============================================================

ALTER TABLE patients
  -- Coordonnées du patient
  ADD COLUMN IF NOT EXISTS telephone          TEXT,
  ADD COLUMN IF NOT EXISTS email             TEXT,
  ADD COLUMN IF NOT EXISTS adresse_quartier  TEXT,
  ADD COLUMN IF NOT EXISTS adresse_commune   TEXT,
  ADD COLUMN IF NOT EXISTS adresse_departement TEXT,

  -- Anthropométrie de base (pour IMC)
  ADD COLUMN IF NOT EXISTS taille            DECIMAL(5, 2),   -- cm
  ADD COLUMN IF NOT EXISTS poids             DECIMAL(5, 2),   -- kg

  -- Informations médicales initiales
  ADD COLUMN IF NOT EXISTS medecin_traitant        TEXT,
  ADD COLUMN IF NOT EXISTS note_medicale_initiale  TEXT,

  -- Tuteur légal (requis si patient mineur)
  ADD COLUMN IF NOT EXISTS tuteur_nom   TEXT,
  ADD COLUMN IF NOT EXISTS tuteur_tel   TEXT,
  ADD COLUMN IF NOT EXISTS tuteur_lien  TEXT;

-- Commentaires de documentation
COMMENT ON COLUMN patients.taille IS 'Taille en centimètres';
COMMENT ON COLUMN patients.poids  IS 'Poids en kilogrammes';
COMMENT ON COLUMN patients.note_medicale_initiale IS
  'Note provisoire saisie à l''admission — les antécédents complets sont dans la table antecedents';
