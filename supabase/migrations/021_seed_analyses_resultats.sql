-- ============================================================
-- SEED : Analyses prescrites + résultats détaillés
-- ============================================================
-- Stratégie : résolution des IDs par clés métier stables
--   patient   → cherché par IMU (jamais par UUID hardcodé)
--   medecin   → cherché par nom/prénom dans users_profiles
--   laborantin→ cherché par nom/prénom dans users_profiles
--   consultation → cherché par UUID seed (nullable — NULL si absent)
-- Si un patient ou un profil est introuvable, le seed est ignoré
-- sans erreur (RAISE NOTICE).
-- ============================================================

DO $$
DECLARE
  pid_agossou UUID;   -- IMU-2024-004821
  pid_hounsou UUID;   -- IMU-2024-007340
  mid_kpossou UUID;   -- Dr Kpossou Aristide
  lid_maxime  UUID;   -- Hounkanrin Maxime (laborantin)
  cid_001     UUID;
  cid_002     UUID;
  cid_003     UUID;
  cid_004     UUID;
BEGIN

  -- ── Résolution patients ─────────────────────────────────────────────────
  SELECT id INTO pid_agossou FROM patients WHERE imu = 'IMU-2024-004821' LIMIT 1;
  SELECT id INTO pid_hounsou FROM patients WHERE imu = 'IMU-2024-007340' LIMIT 1;

  IF pid_agossou IS NULL THEN
    RAISE NOTICE 'SEED 021 — patient Agossou (IMU-2024-004821) introuvable, seed ignoré.';
    RETURN;
  END IF;
  IF pid_hounsou IS NULL THEN
    RAISE NOTICE 'SEED 021 — patient Hounsou (IMU-2024-007340) introuvable, seed ignoré.';
    RETURN;
  END IF;

  -- ── Résolution profils ──────────────────────────────────────────────────
  SELECT id INTO mid_kpossou FROM users_profiles
    WHERE nom = 'KPOSSOU' AND prenom = 'Aristide' LIMIT 1;
  SELECT id INTO lid_maxime FROM users_profiles
    WHERE nom = 'HOUNKANRIN' AND prenom = 'Maxime' LIMIT 1;

  IF mid_kpossou IS NULL THEN
    RAISE NOTICE 'SEED 021 — profil Dr Kpossou introuvable, seed ignoré.';
    RETURN;
  END IF;
  IF lid_maxime IS NULL THEN
    RAISE NOTICE 'SEED 021 — profil Hounkanrin (laborantin) introuvable, seed ignoré.';
    RETURN;
  END IF;

  -- ── Résolution consultations (nullable) ─────────────────────────────────
  SELECT id INTO cid_001 FROM consultations
    WHERE id = 'c1000000-0000-0000-0000-000000000001' LIMIT 1;
  SELECT id INTO cid_002 FROM consultations
    WHERE id = 'c1000000-0000-0000-0000-000000000002' LIMIT 1;
  SELECT id INTO cid_003 FROM consultations
    WHERE id = 'c1000000-0000-0000-0000-000000000003' LIMIT 1;
  SELECT id INTO cid_004 FROM consultations
    WHERE id = 'c1000000-0000-0000-0000-000000000004' LIMIT 1;

  -- ============================================================
  -- ANALYSES PRESCRITES
  -- ============================================================

  -- f011 · Agossou · HbA1c (rendu)
  INSERT INTO analyses_prescrites (
    id, consultation_id, patient_id, medecin_id,
    type_analyse, urgence, statut, instructions,
    date_prescription, resultat_rapide, date_rendu, rendu_par
  ) VALUES (
    'f1000000-0000-0000-0000-000000000011',
    cid_001, pid_agossou, mid_kpossou,
    'Hémoglobine glyquée HbA1c', FALSE, 'rendu',
    'À jeun. Résultat sous 24h.',
    '2026-01-15 00:00:00+00', NULL, NULL, NULL
  ) ON CONFLICT (id) DO NOTHING;

  -- f012 · Agossou · Bilan lipidique (rendu)
  INSERT INTO analyses_prescrites (
    id, consultation_id, patient_id, medecin_id,
    type_analyse, urgence, statut, instructions,
    date_prescription, resultat_rapide, date_rendu, rendu_par
  ) VALUES (
    'f1000000-0000-0000-0000-000000000012',
    cid_001, pid_agossou, mid_kpossou,
    'Bilan lipidique complet', FALSE, 'rendu',
    'À jeun strict 12h.',
    '2026-01-15 00:00:00+00', NULL, NULL, NULL
  ) ON CONFLICT (id) DO NOTHING;

  -- f013 · Hounsou · NFS (rendu)
  INSERT INTO analyses_prescrites (
    id, consultation_id, patient_id, medecin_id,
    type_analyse, urgence, statut, instructions,
    date_prescription, resultat_rapide, date_rendu, rendu_par
  ) VALUES (
    'f1000000-0000-0000-0000-000000000013',
    cid_003, pid_hounsou, mid_kpossou,
    'Numération Formule Sanguine NFS', FALSE, 'rendu',
    'Contrôle anémie ferriprive.',
    '2026-02-03 00:00:00+00', NULL, NULL, NULL
  ) ON CONFLICT (id) DO NOTHING;

  -- f014 · Hounsou · NFS + CRP + Groupe sanguin URGENT (rendu)
  INSERT INTO analyses_prescrites (
    id, consultation_id, patient_id, medecin_id,
    type_analyse, urgence, statut, instructions,
    date_prescription, resultat_rapide, date_rendu, rendu_par
  ) VALUES (
    'f1000000-0000-0000-0000-000000000014',
    cid_004, pid_hounsou, mid_kpossou,
    'NFS + CRP + Groupe sanguin', TRUE, 'rendu',
    'URGENT bilan pré-opératoire.',
    '2026-02-10 00:00:00+00', NULL, NULL, NULL
  ) ON CONFLICT (id) DO NOTHING;

  -- f015 · Agossou · Bilan rénal (prescrit — pas encore réalisé)
  INSERT INTO analyses_prescrites (
    id, consultation_id, patient_id, medecin_id,
    type_analyse, urgence, statut, instructions,
    date_prescription, resultat_rapide, date_rendu, rendu_par
  ) VALUES (
    'f1000000-0000-0000-0000-000000000015',
    cid_002, pid_agossou, mid_kpossou,
    'Bilan rénal — Créatinine + Urée', FALSE, 'prescrit',
    'À réaliser avant prochain RDV.',
    '2025-10-08 00:00:00+00', NULL, NULL, NULL
  ) ON CONFLICT (id) DO NOTHING;

  -- ============================================================
  -- RÉSULTATS D'ANALYSES
  -- ============================================================

  -- ── f011 : HbA1c (Agossou) ─────────────────────────────────────────────
  INSERT INTO resultats_analyse (
    id, analyse_id, patient_id, laborantin_id,
    parametre, valeur, valeur_texte, unite,
    valeur_min, valeur_max, interpretation, date_resultat
  ) VALUES (
    'b183b202-0909-4908-9cde-595f3dd11de4',
    'f1000000-0000-0000-0000-000000000011',
    pid_agossou, lid_maxime,
    'HbA1c', 7.800, NULL, '%',
    NULL, 6.500,
    'Diabète insuffisamment contrôlé',
    '2026-01-16 13:00:00+00'
  ) ON CONFLICT (id) DO NOTHING;

  -- ── f012 : Bilan lipidique (Agossou) — 3 paramètres ───────────────────
  INSERT INTO resultats_analyse (
    id, analyse_id, patient_id, laborantin_id,
    parametre, valeur, valeur_texte, unite,
    valeur_min, valeur_max, interpretation, date_resultat
  ) VALUES (
    'c0fd52b6-2345-40b3-8e84-81b80f0a3a7f',
    'f1000000-0000-0000-0000-000000000012',
    pid_agossou, lid_maxime,
    'Cholestérol total', 6.200, NULL, 'mmol/L',
    NULL, 5.200,
    'Élevé',
    '2026-01-16 13:30:00+00'
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO resultats_analyse (
    id, analyse_id, patient_id, laborantin_id,
    parametre, valeur, valeur_texte, unite,
    valeur_min, valeur_max, interpretation, date_resultat
  ) VALUES (
    '5d099eda-9c49-4eee-80be-7a25520da979',
    'f1000000-0000-0000-0000-000000000012',
    pid_agossou, lid_maxime,
    'LDL-Cholestérol', 4.100, NULL, 'mmol/L',
    NULL, 3.400,
    'Élevé — risque cardiovasculaire',
    '2026-01-16 13:30:00+00'
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO resultats_analyse (
    id, analyse_id, patient_id, laborantin_id,
    parametre, valeur, valeur_texte, unite,
    valeur_min, valeur_max, interpretation, date_resultat
  ) VALUES (
    '2aba615f-cfa1-4dc5-bfbb-4c40ed2557fa',
    'f1000000-0000-0000-0000-000000000012',
    pid_agossou, lid_maxime,
    'Triglycérides', 2.100, NULL, 'mmol/L',
    NULL, 1.700,
    'Légèrement élevé',
    '2026-01-16 13:30:00+00'
  ) ON CONFLICT (id) DO NOTHING;

  -- ── f013 : NFS (Hounsou) — 2 paramètres ───────────────────────────────
  INSERT INTO resultats_analyse (
    id, analyse_id, patient_id, laborantin_id,
    parametre, valeur, valeur_texte, unite,
    valeur_min, valeur_max, interpretation, date_resultat
  ) VALUES (
    '821aa5d6-ee2c-42de-a4bd-ac398a3cc44c',
    'f1000000-0000-0000-0000-000000000013',
    pid_hounsou, lid_maxime,
    'Hémoglobine', 10.200, NULL, 'g/dL',
    11.500, 16.000,
    'Anémie légère',
    '2026-02-04 09:00:00+00'
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO resultats_analyse (
    id, analyse_id, patient_id, laborantin_id,
    parametre, valeur, valeur_texte, unite,
    valeur_min, valeur_max, interpretation, date_resultat
  ) VALUES (
    '6f31f0ec-9712-405d-b185-031421cf14c4',
    'f1000000-0000-0000-0000-000000000013',
    pid_hounsou, lid_maxime,
    'Ferritine', 8.000, NULL, 'ng/mL',
    15.000, 150.000,
    'Carence martiale confirmée',
    '2026-02-04 09:00:00+00'
  ) ON CONFLICT (id) DO NOTHING;

  -- ── f014 : NFS + CRP + Groupe sanguin URGENT (Hounsou) — 3 paramètres ─
  INSERT INTO resultats_analyse (
    id, analyse_id, patient_id, laborantin_id,
    parametre, valeur, valeur_texte, unite,
    valeur_min, valeur_max, interpretation, date_resultat
  ) VALUES (
    '821aa5d6-ee2c-42de-a4bd-ac398a3cc44e',
    'f1000000-0000-0000-0000-000000000014',
    pid_hounsou, lid_maxime,
    'Leucocytes', 14.500, NULL, 'G/L',
    4.000, 10.000,
    'Hyperleucocytose — infection active',
    '2026-02-10 22:00:00+00'
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO resultats_analyse (
    id, analyse_id, patient_id, laborantin_id,
    parametre, valeur, valeur_texte, unite,
    valeur_min, valeur_max, interpretation, date_resultat
  ) VALUES (
    'd312f910-78a6-4031-afee-20b2301be8b6',
    'f1000000-0000-0000-0000-000000000014',
    pid_hounsou, lid_maxime,
    'CRP', 98.000, NULL, 'mg/L',
    NULL, 10.000,
    'Très élevée — syndrome inflammatoire',
    '2026-02-10 22:00:00+00'
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO resultats_analyse (
    id, analyse_id, patient_id, laborantin_id,
    parametre, valeur, valeur_texte, unite,
    valeur_min, valeur_max, interpretation, date_resultat
  ) VALUES (
    '2046b166-9251-45bd-bdee-44dd00430334',
    'f1000000-0000-0000-0000-000000000014',
    pid_hounsou, lid_maxime,
    'Groupe sanguin', NULL, 'B Rh+', NULL,
    NULL, NULL,
    'B positif',
    '2026-02-10 22:00:00+00'
  ) ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE 'SEED 021 — 5 analyses + 9 résultats injectés avec succès.';

END $$;
