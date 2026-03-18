-- ============================================================
-- 008 — Rendre le bucket 'documents' public
--       getPublicUrl() requiert public = TRUE pour fonctionner.
--       La sécurité d'accès est assurée par l'authentification
--       applicative (session Supabase obligatoire).
-- ============================================================

UPDATE storage.buckets
SET public = TRUE
WHERE id = 'documents';
