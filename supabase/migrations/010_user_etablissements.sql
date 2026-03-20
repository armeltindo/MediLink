-- 010_user_etablissements.sql
-- Junction table for many-to-many relationship between paramedical users and établissements

CREATE TABLE IF NOT EXISTS user_etablissements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users_profiles(id) ON DELETE CASCADE,
  etablissement_id uuid NOT NULL REFERENCES etablissements(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, etablissement_id)
);

ALTER TABLE user_etablissements ENABLE ROW LEVEL SECURITY;

-- Admins can manage all assignments
CREATE POLICY "Admins manage user_etablissements" ON user_etablissements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users_profiles
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'admin_etablissement')
    )
  );

-- Users can read their own establishment assignments
CREATE POLICY "Users read own user_etablissements" ON user_etablissements
  FOR SELECT USING (user_id = auth.uid());

-- Migrate existing etablissement_id from users_profiles for paramedical roles
INSERT INTO user_etablissements (user_id, etablissement_id)
SELECT id, etablissement_id
FROM users_profiles
WHERE etablissement_id IS NOT NULL
  AND role IN ('medecin', 'infirmier', 'laborantin', 'pharmacien')
ON CONFLICT (user_id, etablissement_id) DO NOTHING;
