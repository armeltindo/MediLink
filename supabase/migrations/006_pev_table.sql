-- Migration 006: PEV Reference Table
-- Programme Élargi de Vaccination — calendrier de référence configurable
-- US-ADM-02: admin_etablissement peut configurer le PEV par pays

-- ── TABLE: pev_reference ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pev_reference (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom                      TEXT NOT NULL,
  age_cible_mois           INTEGER NOT NULL CHECK (age_cible_mois >= 0),
  nb_doses                 INTEGER NOT NULL DEFAULT 1 CHECK (nb_doses >= 1),
  intervalle_rappel_mois   INTEGER CHECK (intervalle_rappel_mois > 0),
  pays                     CHAR(2) NOT NULL DEFAULT 'BJ',
  actif                    BOOLEAN NOT NULL DEFAULT true,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pev_pays_actif ON pev_reference(pays, actif);
CREATE INDEX IF NOT EXISTS idx_pev_age ON pev_reference(age_cible_mois);

-- ── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE pev_reference ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read active PEV entries
DROP POLICY IF EXISTS "pev_select" ON pev_reference;
CREATE POLICY "pev_select" ON pev_reference
  FOR SELECT TO authenticated USING (true);

-- Only super_admin and admin_etablissement can insert/update/delete
DROP POLICY IF EXISTS "pev_insert" ON pev_reference;
CREATE POLICY "pev_insert" ON pev_reference
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profiles
      WHERE id = auth.uid()
        AND role IN ('super_admin', 'admin_etablissement')
        AND deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS "pev_update" ON pev_reference;
CREATE POLICY "pev_update" ON pev_reference
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles
      WHERE id = auth.uid()
        AND role IN ('super_admin', 'admin_etablissement')
        AND deleted_at IS NULL
    )
  );

-- ── SEED: Calendrier PEV Bénin (MSPRSS) ─────────────────────────────────────
INSERT INTO pev_reference (nom, age_cible_mois, nb_doses, intervalle_rappel_mois, pays, actif) VALUES
  ('BCG',                      0,   1,  NULL, 'BJ', true),
  ('Hépatite B (naissance)',    0,   1,  NULL, 'BJ', true),
  ('DTCHepB-Hib 1',            2,   1,  NULL, 'BJ', true),
  ('VPO 1',                    2,   1,  NULL, 'BJ', true),
  ('PCV13 1',                  2,   1,  NULL, 'BJ', true),
  ('DTCHepB-Hib 2',            3,   1,  NULL, 'BJ', true),
  ('VPO 2',                    3,   1,  NULL, 'BJ', true),
  ('PCV13 2',                  3,   1,  NULL, 'BJ', true),
  ('DTCHepB-Hib 3',            4,   1,  NULL, 'BJ', true),
  ('VPO 3',                    4,   1,  NULL, 'BJ', true),
  ('PCV13 3',                  4,   1,  NULL, 'BJ', true),
  ('VAR (Rougeole)',            9,   1,  NULL, 'BJ', true),
  ('Méningite A (MenAfriVac)', 12,   1,  NULL, 'BJ', true),
  ('Fièvre Jaune',             12,   1,  NULL, 'BJ', true),
  ('ROR (rappel)',             18,   1,  NULL, 'BJ', true),
  ('DTP (rappel 4 ans)',       48,   1,  NULL, 'BJ', true),
  ('HPV (filles 9-14 ans)',   108,   2,    6,  'BJ', true),
  ('Grippe saisonnière',       12,   1,   12,  'BJ', false)
ON CONFLICT DO NOTHING;
