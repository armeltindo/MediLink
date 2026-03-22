-- ============================================================
-- SEED : Prescriptions complémentaires avec dates explicites
-- ============================================================
-- Stratégie : résolution dynamique des IDs par clés métier
--   patient   → cherché par IMU
--   medecin   → cherché par nom/prénom dans users_profiles
--   consultation → nullable, NULL si absente
-- UUIDs prescriptions : préfixe ab000000- (hex valide, non utilisé ailleurs)
-- ============================================================

DO $$
DECLARE
  pid_agossou UUID;   -- IMU-2024-004821
  pid_hounsou UUID;   -- IMU-2024-007340
  mid_kpossou UUID;   -- Dr Kpossou Aristide
  cid_001     UUID;
  cid_002     UUID;
  cid_003     UUID;
  cid_004     UUID;
BEGIN

  -- ── Résolution patients ─────────────────────────────────────────────────
  SELECT id INTO pid_agossou FROM patients WHERE imu = 'IMU-2024-004821' LIMIT 1;
  SELECT id INTO pid_hounsou FROM patients WHERE imu = 'IMU-2024-007340' LIMIT 1;

  IF pid_agossou IS NULL THEN
    RAISE NOTICE 'SEED 020 — patient Agossou (IMU-2024-004821) introuvable, seed ignoré.';
    RETURN;
  END IF;
  IF pid_hounsou IS NULL THEN
    RAISE NOTICE 'SEED 020 — patient Hounsou (IMU-2024-007340) introuvable, seed ignoré.';
    RETURN;
  END IF;

  -- ── Résolution médecin ──────────────────────────────────────────────────
  SELECT id INTO mid_kpossou FROM users_profiles
    WHERE nom = 'KPOSSOU' AND prenom = 'Aristide' LIMIT 1;

  IF mid_kpossou IS NULL THEN
    RAISE NOTICE 'SEED 020 — profil Dr Kpossou introuvable, seed ignoré.';
    RETURN;
  END IF;

  -- ── Résolution consultations (nullable) ─────────────────────────────────
  SELECT id INTO cid_001 FROM consultations WHERE id = 'c1000000-0000-0000-0000-000000000001' LIMIT 1;
  SELECT id INTO cid_002 FROM consultations WHERE id = 'c1000000-0000-0000-0000-000000000002' LIMIT 1;
  SELECT id INTO cid_003 FROM consultations WHERE id = 'c1000000-0000-0000-0000-000000000003' LIMIT 1;
  SELECT id INTO cid_004 FROM consultations WHERE id = 'c1000000-0000-0000-0000-000000000004' LIMIT 1;

  -- ── Prescriptions ───────────────────────────────────────────────────────

  -- ab01 · Agossou · Amlodipine HTA (en cours)
  INSERT INTO prescriptions (
    id, consultation_id, patient_id, medecin_id,
    medicament_dci, medicament_commercial, dosage, forme,
    posologie, duree, instructions, statut,
    date_prescription, date_expiration
  ) VALUES (
    'ab000000-0000-0000-0000-000000000001',
    cid_001, pid_agossou, mid_kpossou,
    'Amlodipine', 'Amlor', '10 mg', 'comprimé',
    '1 comprimé le matin', '3 mois',
    'Prendre à heure fixe. Ne pas arrêter sans avis médical.',
    'en_cours',
    '2026-01-15 00:00:00+00', '2026-04-15'
  ) ON CONFLICT (id) DO NOTHING;

  -- ab02 · Agossou · Metformine diabète (en cours)
  INSERT INTO prescriptions (
    id, consultation_id, patient_id, medecin_id,
    medicament_dci, medicament_commercial, dosage, forme,
    posologie, duree, instructions, statut,
    date_prescription, date_expiration
  ) VALUES (
    'ab000000-0000-0000-0000-000000000002',
    cid_001, pid_agossou, mid_kpossou,
    'Metformine', 'Glucophage', '1000 mg', 'comprimé',
    '1 comprimé matin et soir pendant les repas', '3 mois',
    'Prendre impérativement pendant le repas.',
    'en_cours',
    '2026-01-15 00:00:00+00', '2026-04-15'
  ) ON CONFLICT (id) DO NOTHING;

  -- ab03 · Agossou · Metformine renouvellement (terminé)
  INSERT INTO prescriptions (
    id, consultation_id, patient_id, medecin_id,
    medicament_dci, medicament_commercial, dosage, forme,
    posologie, duree, instructions, statut,
    date_prescription, date_expiration
  ) VALUES (
    'ab000000-0000-0000-0000-000000000003',
    cid_002, pid_agossou, mid_kpossou,
    'Metformine', 'Glucophage', '1000 mg', 'comprimé',
    '1 comprimé matin et soir pendant les repas', '3 mois',
    'Renouvellement — ancienne ordonnance terminée.',
    'termine',
    '2025-10-08 00:00:00+00', '2026-01-08'
  ) ON CONFLICT (id) DO NOTHING;

  -- ab04 · Hounsou · Sulfate ferreux + Acide folique (en cours)
  INSERT INTO prescriptions (
    id, consultation_id, patient_id, medecin_id,
    medicament_dci, medicament_commercial, dosage, forme,
    posologie, duree, instructions, statut,
    date_prescription, date_expiration
  ) VALUES (
    'ab000000-0000-0000-0000-000000000004',
    cid_003, pid_hounsou, mid_kpossou,
    'Sulfate ferreux + Acide folique', 'Gynofar', '100 mg', 'comprimé',
    '1 comprimé par jour', '2 mois',
    'Prendre à distance des repas. Peut colorer les selles en noir.',
    'en_cours',
    '2026-02-03 00:00:00+00', '2026-04-03'
  ) ON CONFLICT (id) DO NOTHING;

  -- ab05 · Hounsou · Amoxicilline/Clavulanate antibioprophylaxie (dispensée)
  INSERT INTO prescriptions (
    id, consultation_id, patient_id, medecin_id,
    medicament_dci, medicament_commercial, dosage, forme,
    posologie, duree, instructions, statut,
    date_prescription, date_expiration
  ) VALUES (
    'ab000000-0000-0000-0000-000000000005',
    cid_004, pid_hounsou, mid_kpossou,
    'Amoxicilline/Acide clavulanique', 'Augmentin', '2g/200mg IV', 'injection',
    '1 injection en pré-opératoire', '1 dose',
    'Antibioprophylaxie chirurgicale — 30 min avant incision.',
    'dispense',
    '2026-02-10 00:00:00+00', '2026-02-11'
  ) ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE 'SEED 020 — 5 prescriptions injectées avec succès.';

END $$;
