-- fix-placeholder-urls.sql
-- Corrige les URLs placeholder (https://placeholder.medilink.bj/...)
-- insérées par un ancien seed SQL et les remplace par les vraies URLs Supabase Storage.
--
-- AVANT D'EXÉCUTER :
--   Remplace 'https://VOTRE_PROJECT_REF.supabase.co' par la valeur de
--   NEXT_PUBLIC_SUPABASE_URL dans ton .env.local
--
-- EXÉCUTION :
--   Colle ce script dans l'éditeur SQL de Supabase (Table Editor → SQL Editor)
--   ou via : psql $DATABASE_URL -f scripts/fix-placeholder-urls.sql
-- ============================================================

DO $$
DECLARE
  -- ⚠️  Remplace cette valeur par ton NEXT_PUBLIC_SUPABASE_URL
  base_url  TEXT := 'https://VOTRE_PROJECT_REF.supabase.co';

  storage_prefix TEXT;
  nb_updated     INTEGER;
BEGIN
  storage_prefix := base_url || '/storage/v1/object/public/documents/';

  -- Vérifie que le placeholder a bien été remplacé
  IF base_url = 'https://VOTRE_PROJECT_REF.supabase.co' THEN
    RAISE EXCEPTION
      'Remplace base_url par ton NEXT_PUBLIC_SUPABASE_URL avant d''exécuter ce script.';
  END IF;

  -- Aperçu avant modification
  RAISE NOTICE '--- Documents avec URL placeholder détectés ---';
  FOR r IN
    SELECT id, nom, url
    FROM documents
    WHERE url LIKE 'https://placeholder.%'
    ORDER BY nom
  LOOP
    RAISE NOTICE 'id=% | nom=% | url=%', r.id, r.nom, r.url;
  END LOOP;

  -- Mise à jour :
  --   Formule : {base_url}/storage/v1/object/public/documents/{patient_id}/{lower(nom)}
  --   Exemple : .../b1000000-.../ecg_kodjovi_2025.pdf
  UPDATE documents
  SET url = storage_prefix || patient_id::TEXT || '/' || lower(nom)
  WHERE url LIKE 'https://placeholder.%';

  GET DIAGNOSTICS nb_updated = ROW_COUNT;

  RAISE NOTICE '--- Terminé : % enregistrement(s) mis à jour ---', nb_updated;
END;
$$;

-- Vérification finale : affiche les enregistrements modifiés
SELECT id, nom, url
FROM documents
WHERE url LIKE '%/storage/v1/object/public/documents/%'
  AND uploaded_at < NOW() - INTERVAL '1 minute'  -- exclut les uploads récents
ORDER BY nom;
