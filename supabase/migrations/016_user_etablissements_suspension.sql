-- 016_user_etablissements_suspension.sql
-- Allow admin_etablissement to suspend a staff member's access to their etablissement
-- without affecting the user's access to other etablissements or their global account.

ALTER TABLE user_etablissements
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz DEFAULT NULL;
