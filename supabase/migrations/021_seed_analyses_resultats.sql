-- ============================================================
-- SEED : Analyses prescrites + résultats détaillés
-- ============================================================
-- Corrections appliquées depuis le CSV :
--   patient_id  b1000000-...-001 → a1000000-...-001 (Agossou Ibrahima)
--   patient_id  b1000000-...-002 → a1000000-...-002 (Hounsou Roseline)
--   patient_id  b1000000-...-003 → a1000000-...-002 (Hounsou — consultation c004)
--   medecin_id  a1000000-...-003 → 9a000000-...-001 (Dr Kpossou Aristide)
--   laborantin_id a1000000-...-005 → 9a000000-...-005 (Hounkanrin Maxime)
--   Colonnes CSV absentes du schéma (resultat_rapide / date_rendu / rendu_par) → NULL
-- ============================================================

-- ── ANALYSES PRESCRITES ───────────────────────────────────────────────────────

INSERT INTO analyses_prescrites (
  id, consultation_id, patient_id, medecin_id,
  type_analyse, urgence, statut, instructions,
  date_prescription, resultat_rapide, date_rendu, rendu_par
) VALUES

  -- f001 · Agossou · c001 · HbA1c (rendu)
  (
    'f1000000-0000-0000-0000-000000000011',
    'c1000000-0000-0000-0000-000000000001',
    'a1000000-0000-0000-0000-000000000001',
    '9a000000-0000-0000-0000-000000000001',
    'Hémoglobine glyquée HbA1c',
    FALSE, 'rendu',
    'À jeun. Résultat sous 24h.',
    '2026-01-15 00:00:00+00',
    NULL, NULL, NULL
  ),

  -- f002 · Agossou · c001 · Bilan lipidique (rendu)
  (
    'f1000000-0000-0000-0000-000000000012',
    'c1000000-0000-0000-0000-000000000001',
    'a1000000-0000-0000-0000-000000000001',
    '9a000000-0000-0000-0000-000000000001',
    'Bilan lipidique complet',
    FALSE, 'rendu',
    'À jeun strict 12h.',
    '2026-01-15 00:00:00+00',
    NULL, NULL, NULL
  ),

  -- f003 · Hounsou · c003 · NFS (rendu)
  (
    'f1000000-0000-0000-0000-000000000013',
    'c1000000-0000-0000-0000-000000000003',
    'a1000000-0000-0000-0000-000000000002',
    '9a000000-0000-0000-0000-000000000001',
    'Numération Formule Sanguine NFS',
    FALSE, 'rendu',
    'Contrôle anémie ferriprive.',
    '2026-02-03 00:00:00+00',
    NULL, NULL, NULL
  ),

  -- f004 · Hounsou · c004 · NFS + CRP + Groupe sanguin URGENT (rendu)
  (
    'f1000000-0000-0000-0000-000000000014',
    'c1000000-0000-0000-0000-000000000004',
    'a1000000-0000-0000-0000-000000000002',
    '9a000000-0000-0000-0000-000000000001',
    'NFS + CRP + Groupe sanguin',
    TRUE, 'rendu',
    'URGENT bilan pré-opératoire.',
    '2026-02-10 00:00:00+00',
    NULL, NULL, NULL
  ),

  -- f005 · Agossou · c002 · Bilan rénal (prescrit — pas encore réalisé)
  (
    'f1000000-0000-0000-0000-000000000015',
    'c1000000-0000-0000-0000-000000000002',
    'a1000000-0000-0000-0000-000000000001',
    '9a000000-0000-0000-0000-000000000001',
    'Bilan rénal — Créatinine + Urée',
    FALSE, 'prescrit',
    'À réaliser avant prochain RDV.',
    '2025-10-08 00:00:00+00',
    NULL, NULL, NULL
  )

ON CONFLICT (id) DO NOTHING;


-- ── RÉSULTATS D'ANALYSES ──────────────────────────────────────────────────────

INSERT INTO resultats_analyse (
  id, analyse_id, patient_id, laborantin_id,
  parametre, valeur, valeur_texte, unite,
  valeur_min, valeur_max, interpretation,
  date_resultat, pdf_url
) VALUES

  -- ── f001 : HbA1c (Agossou) ──────────────────────────────────────────────
  (
    'b183b202-0909-4908-9cde-595f3dd11de4',
    'f1000000-0000-0000-0000-000000000011',
    'a1000000-0000-0000-0000-000000000001',
    '9a000000-0000-0000-0000-000000000005',
    'HbA1c',
    7.800, NULL, '%',
    NULL, 6.500,
    'Diabète insuffisamment contrôlé',
    '2026-01-16 13:00:00+00',
    NULL
  ),

  -- ── f002 : Bilan lipidique (Agossou) — 3 paramètres ────────────────────
  (
    'c0fd52b6-2345-40b3-8e84-81b80f0a3a7f',
    'f1000000-0000-0000-0000-000000000012',
    'a1000000-0000-0000-0000-000000000001',
    '9a000000-0000-0000-0000-000000000005',
    'Cholestérol total',
    6.200, NULL, 'mmol/L',
    NULL, 5.200,
    'Élevé',
    '2026-01-16 13:30:00+00',
    NULL
  ),
  (
    '5d099eda-9c49-4eee-80be-7a25520da979',
    'f1000000-0000-0000-0000-000000000012',
    'a1000000-0000-0000-0000-000000000001',
    '9a000000-0000-0000-0000-000000000005',
    'LDL-Cholestérol',
    4.100, NULL, 'mmol/L',
    NULL, 3.400,
    'Élevé — risque cardiovasculaire',
    '2026-01-16 13:30:00+00',
    NULL
  ),
  (
    '2aba615f-cfa1-4dc5-bfbb-4c40ed2557fa',
    'f1000000-0000-0000-0000-000000000012',
    'a1000000-0000-0000-0000-000000000001',
    '9a000000-0000-0000-0000-000000000005',
    'Triglycérides',
    2.100, NULL, 'mmol/L',
    NULL, 1.700,
    'Légèrement élevé',
    '2026-01-16 13:30:00+00',
    NULL
  ),

  -- ── f003 : NFS (Hounsou) — 2 paramètres ────────────────────────────────
  (
    '821aa5d6-ee2c-42de-a4bd-ac398a3cc44c',
    'f1000000-0000-0000-0000-000000000013',
    'a1000000-0000-0000-0000-000000000002',
    '9a000000-0000-0000-0000-000000000005',
    'Hémoglobine',
    10.200, NULL, 'g/dL',
    11.500, 16.000,
    'Anémie légère',
    '2026-02-04 09:00:00+00',
    NULL
  ),
  (
    '6f31f0ec-9712-405d-b185-031421cf14c4',
    'f1000000-0000-0000-0000-000000000013',
    'a1000000-0000-0000-0000-000000000002',
    '9a000000-0000-0000-0000-000000000005',
    'Ferritine',
    8.000, NULL, 'ng/mL',
    15.000, 150.000,
    'Carence martiale confirmée',
    '2026-02-04 09:00:00+00',
    NULL
  ),

  -- ── f004 : NFS + CRP + Groupe sanguin URGENT (Hounsou) — 3 paramètres ──
  (
    '821aa5d6-ee2c-42de-a4bd-ac398a3cc44e',
    'f1000000-0000-0000-0000-000000000014',
    'a1000000-0000-0000-0000-000000000002',
    '9a000000-0000-0000-0000-000000000005',
    'Leucocytes',
    14.500, NULL, 'G/L',
    4.000, 10.000,
    'Hyperleucocytose — infection active',
    '2026-02-10 22:00:00+00',
    NULL
  ),
  (
    'd312f910-78a6-4031-afee-20b2301be8b6',
    'f1000000-0000-0000-0000-000000000014',
    'a1000000-0000-0000-0000-000000000002',
    '9a000000-0000-0000-0000-000000000005',
    'CRP',
    98.000, NULL, 'mg/L',
    NULL, 10.000,
    'Très élevée — syndrome inflammatoire',
    '2026-02-10 22:00:00+00',
    NULL
  ),
  (
    '2046b166-9251-45bd-bdee-44dd00430334',
    'f1000000-0000-0000-0000-000000000014',
    'a1000000-0000-0000-0000-000000000002',
    '9a000000-0000-0000-0000-000000000005',
    'Groupe sanguin',
    NULL, 'B Rh+', NULL,
    NULL, NULL,
    'B positif',
    '2026-02-10 22:00:00+00',
    NULL
  )

ON CONFLICT (id) DO NOTHING;
