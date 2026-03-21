-- ============================================================
-- 015 — Autoriser text/html dans le bucket 'documents'
-- Tous les documents générés (ordonnances, lettres, certificats,
-- résultats d'analyse) sont des fichiers HTML. Sans ce type MIME,
-- Supabase Storage rejetait silencieusement tous les uploads.
-- ============================================================

UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'image/gif',
  'text/html',
  'text/html; charset=utf-8'
]
WHERE id = 'documents';
