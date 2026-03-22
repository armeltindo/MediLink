-- 022_fix_documents_laborantin_insert.sql
-- Ajouter laborantin à la politique d'insertion de documents
--
-- Contexte :
--   Quand un laborantin saisit un résultat d'analyse, le composant analyses.tsx
--   génère automatiquement un document HTML et tente de l'insérer dans la table
--   documents. La policy documents_insert de la migration 017 ne listait que
--   (medecin, infirmier, admin_etablissement), bloquant silencieusement tous
--   les inserts de laborantin.
-- ============================================================

DROP POLICY IF EXISTS "documents_insert" ON documents;
CREATE POLICY "documents_insert" ON documents
  FOR INSERT WITH CHECK (
    get_user_role() = 'super_admin'
    OR (
      get_user_role() IN ('medecin', 'infirmier', 'admin_etablissement', 'laborantin')
      AND (
        etablissement_id IS NULL
        OR user_belongs_to_etablissement(etablissement_id)
      )
    )
  );
