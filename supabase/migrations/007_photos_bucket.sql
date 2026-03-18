-- ============================================================
-- 007 — Bucket public "photos" pour les avatars patients
-- Le bucket "documents" est privé (données médicales sensibles).
-- Les photos de profil doivent être accessibles publiquement
-- pour s'afficher dans les balises <img> sans auth header.
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'photos',
  'photos',
  TRUE,
  5242880, -- 5 MB max
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = TRUE,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Upload : utilisateurs authentifiés uniquement
DROP POLICY IF EXISTS "photos_upload" ON storage.objects;
CREATE POLICY "photos_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'photos'
    AND auth.uid() IS NOT NULL
  );

-- Lecture : public (nécessaire pour affichage <img>)
DROP POLICY IF EXISTS "photos_read" ON storage.objects;
CREATE POLICY "photos_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'photos');

-- Mise à jour : utilisateurs authentifiés
DROP POLICY IF EXISTS "photos_update" ON storage.objects;
CREATE POLICY "photos_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'photos'
    AND auth.uid() IS NOT NULL
  );

-- Suppression : médecin/admin uniquement
DROP POLICY IF EXISTS "photos_delete" ON storage.objects;
CREATE POLICY "photos_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'photos'
    AND get_user_role() IN ('super_admin', 'admin_etablissement', 'medecin')
  );
