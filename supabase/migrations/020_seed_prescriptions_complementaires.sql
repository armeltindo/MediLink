-- ============================================================
-- SEED : Prescriptions complémentaires avec dates explicites
-- ============================================================
-- Contexte : ordonnances générées par l'application (non uploadées).
-- Les IDs consultation_id, patient_id et medecin_id correspondent
-- aux données insérées dans 004_seed_demo_complet.sql.
--
-- Correspondances CSV → seed réel
--   b1000000-...-001 → a1000000-...-001  (Agossou Ibrahima)
--   b1000000-...-002 → a1000000-...-002  (Hounsou Roseline)
--   b1000000-...-003 → a1000000-...-002  (Hounsou — consultation c004)
--   medecin a1000000-...-003 (CSV) → 9a000000-...-001 (Dr Kpossou Aristide)
-- ============================================================

INSERT INTO prescriptions (
  id,
  consultation_id,
  patient_id,
  medecin_id,
  medicament_dci,
  medicament_commercial,
  dosage,
  forme,
  posologie,
  duree,
  instructions,
  statut,
  date_prescription,
  date_expiration
) VALUES

  -- e001 · Agossou · c001 · Amlodipine (HTA)
  (
    'p1000000-0000-0000-0000-000000000001',
    'c1000000-0000-0000-0000-000000000001',
    'a1000000-0000-0000-0000-000000000001',
    '9a000000-0000-0000-0000-000000000001',
    'Amlodipine',
    'Amlor',
    '10 mg',
    'comprimé',
    '1 comprimé le matin',
    '3 mois',
    'Prendre à heure fixe. Ne pas arrêter sans avis médical.',
    'en_cours',
    '2026-01-15 00:00:00+00',
    '2026-04-15'
  ),

  -- e002 · Agossou · c001 · Metformine (diabète)
  (
    'p1000000-0000-0000-0000-000000000002',
    'c1000000-0000-0000-0000-000000000001',
    'a1000000-0000-0000-0000-000000000001',
    '9a000000-0000-0000-0000-000000000001',
    'Metformine',
    'Glucophage',
    '1000 mg',
    'comprimé',
    '1 comprimé matin et soir pendant les repas',
    '3 mois',
    'Prendre impérativement pendant le repas.',
    'en_cours',
    '2026-01-15 00:00:00+00',
    '2026-04-15'
  ),

  -- e003 · Agossou · c002 · Metformine renouvellement (terminé)
  (
    'p1000000-0000-0000-0000-000000000003',
    'c1000000-0000-0000-0000-000000000002',
    'a1000000-0000-0000-0000-000000000001',
    '9a000000-0000-0000-0000-000000000001',
    'Metformine',
    'Glucophage',
    '1000 mg',
    'comprimé',
    '1 comprimé matin et soir pendant les repas',
    '3 mois',
    'Renouvellement — ancienne ordonnance terminée.',
    'termine',
    '2025-10-08 00:00:00+00',
    '2026-01-08'
  ),

  -- e004 · Hounsou · c003 · Sulfate ferreux + Acide folique (grossesse / VIH)
  (
    'p1000000-0000-0000-0000-000000000004',
    'c1000000-0000-0000-0000-000000000003',
    'a1000000-0000-0000-0000-000000000002',
    '9a000000-0000-0000-0000-000000000001',
    'Sulfate ferreux + Acide folique',
    'Gynofar',
    '100 mg',
    'comprimé',
    '1 comprimé par jour',
    '2 mois',
    'Prendre à distance des repas. Peut colorer les selles en noir.',
    'en_cours',
    '2026-02-03 00:00:00+00',
    '2026-04-03'
  ),

  -- e005 · Hounsou · c004 · Amoxicilline/Clavulanate antibioprophylaxie (dispensée)
  (
    'p1000000-0000-0000-0000-000000000005',
    'c1000000-0000-0000-0000-000000000004',
    'a1000000-0000-0000-0000-000000000002',
    '9a000000-0000-0000-0000-000000000001',
    'Amoxicilline/Acide clavulanique',
    'Augmentin',
    '2g/200mg IV',
    'injection',
    '1 injection en pré-opératoire',
    '1 dose',
    'Antibioprophylaxie chirurgicale — 30 min avant incision.',
    'dispense',
    '2026-02-10 00:00:00+00',
    '2026-02-11'
  )

ON CONFLICT (id) DO NOTHING;
