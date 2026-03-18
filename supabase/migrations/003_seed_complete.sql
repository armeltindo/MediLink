-- MediLink — Seed complet : consultations, constantes, prescriptions, analyses, vaccinations, hospitalisations
-- À exécuter APRÈS 002_seed_data.sql
-- Les patients UUIDs utilisent les mêmes IDs que le seed précédent

-- ============================================================
-- CONSULTATIONS (avec constantes vitales)
-- ============================================================

-- Patient 1: Konan Kouassi — Diabète T2 + HTA
-- Consultation 1 (il y a 6 mois)
INSERT INTO consultations (id, patient_id, medecin_id, etablissement_id, date_consultation, motif, anamnese, diagnostic_principal, diagnostic_cim10, plan_prise_en_charge, type_consultation)
SELECT
  'c1000000-0000-0000-0000-000000000001',
  'p1000000-0000-0000-0000-000000000001',
  id,
  'e1000000-0000-0000-0000-000000000001',
  NOW() - INTERVAL '180 days',
  'Contrôle diabète et HTA — suivi trimestriel',
  'Patient diabétique type 2 sous metformine depuis 2015. Tension correctement contrôlée sous amlodipine. Se plaint de fatigue chronique et de soif accrue. Glycémie à domicile entre 1.8 et 2.4 g/L. Observance thérapeutique bonne.',
  'Diabète sucré de type 2 déséquilibré — ajustement thérapeutique nécessaire',
  'E11',
  'Augmentation metformine 1000mg × 2/j → 1000mg × 3/j. HbA1c dans 3 mois. Régime strict. Contrôle ophtalmo annuel.',
  'externe'
FROM auth.users LIMIT 1;

INSERT INTO constantes (consultation_id, patient_id, ta_sys, ta_dia, fc, fr, temperature, spo2, poids, taille, imc, date_mesure)
VALUES (
  'c1000000-0000-0000-0000-000000000001',
  'p1000000-0000-0000-0000-000000000001',
  148, 92, 78, 16, 36.8, 97, 87.5, 172, 29.6,
  NOW() - INTERVAL '180 days'
);

-- Consultation 2 (il y a 3 mois)
INSERT INTO consultations (id, patient_id, medecin_id, etablissement_id, date_consultation, motif, anamnese, diagnostic_principal, diagnostic_cim10, plan_prise_en_charge, type_consultation)
SELECT
  'c1000000-0000-0000-0000-000000000002',
  'p1000000-0000-0000-0000-000000000001',
  id,
  'e1000000-0000-0000-0000-000000000001',
  NOW() - INTERVAL '90 days',
  'Suivi diabète — contrôle HbA1c',
  'Résultats HbA1c à 8.2% — amélioration notable depuis l''ajustement. Tension mieux contrôlée. Patient signale légère douleur épigastrique avec metformine.',
  'Diabète type 2 — amélioration sous traitement ajusté',
  'E11',
  'Maintien traitement. Metformine en milieu de repas pour tolérance. Prochain contrôle dans 3 mois. Bilan rénal annuel.',
  'externe'
FROM auth.users LIMIT 1;

INSERT INTO constantes (consultation_id, patient_id, ta_sys, ta_dia, fc, fr, temperature, spo2, poids, taille, imc, date_mesure)
VALUES (
  'c1000000-0000-0000-0000-000000000002',
  'p1000000-0000-0000-0000-000000000001',
  138, 86, 74, 16, 36.6, 98, 86.2, 172, 29.2,
  NOW() - INTERVAL '90 days'
);

-- Consultation 3 (récente)
INSERT INTO consultations (id, patient_id, medecin_id, etablissement_id, date_consultation, motif, anamnese, diagnostic_principal, diagnostic_cim10, plan_prise_en_charge, type_consultation)
SELECT
  'c1000000-0000-0000-0000-000000000003',
  'p1000000-0000-0000-0000-000000000001',
  id,
  'e1000000-0000-0000-0000-000000000002',
  NOW() - INTERVAL '15 days',
  'Céphalées matinales persistantes depuis 2 semaines',
  'Patient se présente pour céphalées frontales matinales, améliorées en cours de journée. Tension élevée à la mesure. Pas de signe neurologique focal.',
  'HTA non contrôlée — pointe hypertensive',
  'I10',
  'Augmentation amlodipine 10mg/j. Repos. Régime hyposodé strict. Contrôle TA à domicile. Retour si TA > 160 mmHg.',
  'externe'
FROM auth.users LIMIT 1;

INSERT INTO constantes (consultation_id, patient_id, ta_sys, ta_dia, fc, fr, temperature, spo2, poids, taille, imc, date_mesure)
VALUES (
  'c1000000-0000-0000-0000-000000000003',
  'p1000000-0000-0000-0000-000000000001',
  162, 98, 82, 18, 37.1, 97, 87.0, 172, 29.4,
  NOW() - INTERVAL '15 days'
);

-- Patient 2: Bamba Fatoumata — VIH sous ARV
INSERT INTO consultations (id, patient_id, medecin_id, etablissement_id, date_consultation, motif, anamnese, diagnostic_principal, diagnostic_cim10, plan_prise_en_charge, type_consultation)
SELECT
  'c2000000-0000-0000-0000-000000000001',
  'p1000000-0000-0000-0000-000000000002',
  id,
  'e1000000-0000-0000-0000-000000000001',
  NOW() - INTERVAL '60 days',
  'Suivi VIH — bilan CD4 et charge virale',
  'Patiente sous Tenofovir/Lamivudine/Efavirenz depuis 2019. Bonne observance. CD4 à 480 cel/mm³ (en hausse). Charge virale indétectable. Pas d''infections opportunistes. Légère neuropathie des extrémités.',
  'Infection VIH sous traitement ARV — réponse satisfaisante',
  'B24',
  'Maintien ARV. Bilan hépatique dans 6 mois. Surveillance neuropathie. Rappel vaccins recommandés selon statut immunitaire.',
  'externe'
FROM auth.users LIMIT 1;

INSERT INTO constantes (consultation_id, patient_id, ta_sys, ta_dia, fc, fr, temperature, spo2, poids, taille, imc, date_mesure)
VALUES (
  'c2000000-0000-0000-0000-000000000001',
  'p1000000-0000-0000-0000-000000000002',
  118, 74, 72, 16, 36.7, 99, 65.3, 162, 24.9,
  NOW() - INTERVAL '60 days'
);

INSERT INTO consultations (id, patient_id, medecin_id, etablissement_id, date_consultation, motif, anamnese, diagnostic_principal, diagnostic_cim10, plan_prise_en_charge, type_consultation)
SELECT
  'c2000000-0000-0000-0000-000000000002',
  'p1000000-0000-0000-0000-000000000002',
  id,
  'e1000000-0000-0000-0000-000000000002',
  NOW() - INTERVAL '10 days',
  'Fièvre + frissons depuis 3 jours',
  'Fièvre à 39.2°C. Frissons. Céphalées. Myalgies. Retour de voyage en zone rurale. Test rapide paludisme positif (Pf).',
  'Paludisme à Plasmodium falciparum non compliqué',
  'B50',
  'Artéméther-Luméfantrine (Coartem) 4cp × 2/j × 3 jours. Repos. Hydratation. Frottis de contrôle J3. Éviter automédication.',
  'urgence'
FROM auth.users LIMIT 1;

INSERT INTO constantes (consultation_id, patient_id, ta_sys, ta_dia, fc, fr, temperature, spo2, poids, taille, imc, date_mesure)
VALUES (
  'c2000000-0000-0000-0000-000000000002',
  'p1000000-0000-0000-0000-000000000002',
  108, 68, 96, 22, 39.2, 96, 64.8, 162, 24.7,
  NOW() - INTERVAL '10 days'
);

-- Patient 3: Traoré Ibrahima — Drépanocytose + IRC
INSERT INTO consultations (id, patient_id, medecin_id, etablissement_id, date_consultation, motif, anamnese, diagnostic_principal, diagnostic_cim10, plan_prise_en_charge, type_consultation)
SELECT
  'c3000000-0000-0000-0000-000000000001',
  'p1000000-0000-0000-0000-000000000003',
  id,
  'e1000000-0000-0000-0000-000000000004',
  NOW() - INTERVAL '45 days',
  'Douleurs osseuses — crise drépanocytaire suspectée',
  'Patient drépanocytaire SS, 72 ans. Douleurs intenses membres inférieurs, dorsalgie. Apyrétique. NFS : Hb à 7.2 g/dL. Créatinine à 185 µmol/L (IRC stade 3 connu). Urée normale.',
  'Crise vaso-occlusive drépanocytaire — insuffisance rénale chronique stade 3',
  'D57',
  'Morphine 10mg/4h si EVA > 6. Hyperhydratation IV. Acide folique maintenu. Éviter AINS (IRC). Bilan rénal dans 1 mois. Hématologue en consultation.',
  'urgence'
FROM auth.users LIMIT 1;

INSERT INTO constantes (consultation_id, patient_id, ta_sys, ta_dia, fc, fr, temperature, spo2, poids, taille, imc, date_mesure)
VALUES (
  'c3000000-0000-0000-0000-000000000001',
  'p1000000-0000-0000-0000-000000000003',
  132, 78, 94, 20, 37.4, 94, 58.0, 168, 20.5,
  NOW() - INTERVAL '45 days'
);

-- Patient 4: Kouakou Ahou — Asthme + Dépression
INSERT INTO consultations (id, patient_id, medecin_id, etablissement_id, date_consultation, motif, anamnese, diagnostic_principal, diagnostic_cim10, plan_prise_en_charge, type_consultation)
SELECT
  'c4000000-0000-0000-0000-000000000001',
  'p1000000-0000-0000-0000-000000000004',
  id,
  'e1000000-0000-0000-0000-000000000003',
  NOW() - INTERVAL '30 days',
  'Dyspnée nocturne + aggravation asthme',
  'Patiente asthmatique depuis l''enfance. Crise nocturne 3 fois cette semaine. Sifflements à l''auscultation. Peak flow à 55% théorique. Utilisation excessive du bronchodilatateur de secours. Traitement de fond sous-dosé.',
  'Asthme persistant modéré — exacerbation',
  'J45',
  'Corticoïde inhalé augmenté (Béclométasone 500µg × 2/j). Salbutamol en secours. Éviction allergènes. Spirométrie dans 1 mois. Consultation psychiatrique maintenue.',
  'externe'
FROM auth.users LIMIT 1;

INSERT INTO constantes (consultation_id, patient_id, ta_sys, ta_dia, fc, fr, temperature, spo2, poids, taille, imc, date_mesure)
VALUES (
  'c4000000-0000-0000-0000-000000000001',
  'p1000000-0000-0000-0000-000000000004',
  122, 76, 88, 24, 36.9, 93, 58.5, 165, 21.5,
  NOW() - INTERVAL '30 days'
);

-- Patient 5: N'Goran Koffi Emmanuel — Enfant (6 ans)
INSERT INTO consultations (id, patient_id, medecin_id, etablissement_id, date_consultation, motif, anamnese, diagnostic_principal, diagnostic_cim10, plan_prise_en_charge, type_consultation)
SELECT
  'c5000000-0000-0000-0000-000000000001',
  'p1000000-0000-0000-0000-000000000005',
  id,
  'e1000000-0000-0000-0000-000000000002',
  NOW() - INTERVAL '20 days',
  'Fièvre + diarrhée — enfant 6 ans',
  'Enfant de 6 ans amené par sa mère. Fièvre à 38.8°C depuis 2 jours. Diarrhée liquide 4-5 selles/jour sans sang. Vomissements. Légère déshydratation. Pas de signe de gravité.',
  'Gastro-entérite aiguë — déshydratation légère',
  'A09',
  'SRO (solutés de réhydratation orale). Zinc 10mg/j × 10 jours. Antipyrétique si fièvre > 38.5°C. Régime BRAT. Retour si aggravation.',
  'externe'
FROM auth.users LIMIT 1;

INSERT INTO constantes (consultation_id, patient_id, ta_sys, ta_dia, fc, fr, temperature, spo2, poids, taille, imc, date_mesure)
VALUES (
  'c5000000-0000-0000-0000-000000000005',
  'p1000000-0000-0000-0000-000000000005',
  90, 58, 108, 28, 38.8, 98, 22.0, 118, 15.8,
  NOW() - INTERVAL '20 days'
);

-- ============================================================
-- PRESCRIPTIONS
-- ============================================================

-- Patient 1 — Konan (Diabète + HTA)
INSERT INTO prescriptions (patient_id, consultation_id, medecin_id, medicament_dci, medicament_commercial, dosage, forme, posologie, duree, statut, date_prescription, date_expiration)
SELECT
  'p1000000-0000-0000-0000-000000000001',
  'c1000000-0000-0000-0000-000000000003',
  id,
  'Metformine',
  'Glucophage',
  '1000 mg',
  'Comprimé',
  '1 comprimé matin, midi et soir (en milieu de repas)',
  '3 mois',
  'en_cours',
  NOW() - INTERVAL '15 days',
  (NOW() + INTERVAL '75 days')::date
FROM auth.users LIMIT 1;

INSERT INTO prescriptions (patient_id, consultation_id, medecin_id, medicament_dci, medicament_commercial, dosage, forme, posologie, duree, statut, date_prescription, date_expiration)
SELECT
  'p1000000-0000-0000-0000-000000000001',
  'c1000000-0000-0000-0000-000000000003',
  id,
  'Amlodipine',
  'Amlor',
  '10 mg',
  'Comprimé',
  '1 comprimé le matin',
  '3 mois',
  'en_cours',
  NOW() - INTERVAL '15 days',
  (NOW() + INTERVAL '75 days')::date
FROM auth.users LIMIT 1;

INSERT INTO prescriptions (patient_id, consultation_id, medecin_id, medicament_dci, medicament_commercial, dosage, forme, posologie, duree, statut, date_prescription, date_expiration)
SELECT
  'p1000000-0000-0000-0000-000000000001',
  'c1000000-0000-0000-0000-000000000001',
  id,
  'Aspirine',
  'Aspégic',
  '100 mg',
  'Comprimé gastro-résistant',
  '1 comprimé le soir',
  '6 mois',
  'en_cours',
  NOW() - INTERVAL '180 days',
  (NOW() + INTERVAL '5 days')::date
FROM auth.users LIMIT 1;

-- Patient 2 — Bamba (VIH + Paludisme)
INSERT INTO prescriptions (patient_id, consultation_id, medecin_id, medicament_dci, medicament_commercial, dosage, forme, posologie, duree, statut, date_prescription, date_expiration)
SELECT
  'p1000000-0000-0000-0000-000000000002',
  'c2000000-0000-0000-0000-000000000001',
  id,
  'Tenofovir/Lamivudine/Efavirenz',
  'Tribuss',
  '300/300/600 mg',
  'Comprimé',
  '1 comprimé le soir à jeun',
  '3 mois (renouvellement)',
  'en_cours',
  NOW() - INTERVAL '60 days',
  (NOW() + INTERVAL '30 days')::date
FROM auth.users LIMIT 1;

INSERT INTO prescriptions (patient_id, consultation_id, medecin_id, medicament_dci, medicament_commercial, dosage, forme, posologie, duree, statut, date_prescription, date_expiration)
SELECT
  'p1000000-0000-0000-0000-000000000002',
  'c2000000-0000-0000-0000-000000000002',
  id,
  'Artéméther/Luméfantrine',
  'Coartem',
  '20/120 mg',
  'Comprimé',
  '4 comprimés × 2/j × 3 jours (aux heures des repas)',
  '3 jours',
  'termine',
  NOW() - INTERVAL '10 days',
  (NOW() - INTERVAL '7 days')::date
FROM auth.users LIMIT 1;

-- Patient 3 — Traoré (Drépanocytose)
INSERT INTO prescriptions (patient_id, consultation_id, medecin_id, medicament_dci, medicament_commercial, dosage, forme, posologie, duree, statut, date_prescription, date_expiration)
SELECT
  'p1000000-0000-0000-0000-000000000003',
  'c3000000-0000-0000-0000-000000000001',
  id,
  'Acide folique',
  'Spéciafoldine',
  '5 mg',
  'Comprimé',
  '1 comprimé/jour',
  '6 mois',
  'en_cours',
  NOW() - INTERVAL '45 days',
  (NOW() + INTERVAL '135 days')::date
FROM auth.users LIMIT 1;

-- Patient 4 — Kouakou (Asthme)
INSERT INTO prescriptions (patient_id, consultation_id, medecin_id, medicament_dci, medicament_commercial, dosage, forme, posologie, duree, statut, date_prescription, date_expiration)
SELECT
  'p1000000-0000-0000-0000-000000000004',
  'c4000000-0000-0000-0000-000000000001',
  id,
  'Béclométasone',
  'Becotide',
  '500 µg',
  'Aérosol inhalateur',
  '2 bouffées matin et soir (rinçage buccal obligatoire)',
  '2 mois',
  'prescrit',
  NOW() - INTERVAL '30 days',
  (NOW() + INTERVAL '30 days')::date
FROM auth.users LIMIT 1;

INSERT INTO prescriptions (patient_id, consultation_id, medecin_id, medicament_dci, medicament_commercial, dosage, forme, posologie, duree, statut, date_prescription, date_expiration)
SELECT
  'p1000000-0000-0000-0000-000000000004',
  'c4000000-0000-0000-0000-000000000001',
  id,
  'Salbutamol',
  'Ventoline',
  '100 µg',
  'Aérosol doseur',
  '2 bouffées en cas de crise (max 8/j)',
  '3 mois',
  'en_cours',
  NOW() - INTERVAL '30 days',
  (NOW() + INTERVAL '60 days')::date
FROM auth.users LIMIT 1;

-- ============================================================
-- ANALYSES PRESCRITES + RÉSULTATS
-- ============================================================

-- Patient 1 — Konan : HbA1c + NFS + bilan rénal
INSERT INTO analyses_prescrites (id, patient_id, consultation_id, medecin_id, type_analyse, urgence, statut, date_prescription)
SELECT
  'a1000000-0000-0000-0000-000000000001',
  'p1000000-0000-0000-0000-000000000001',
  'c1000000-0000-0000-0000-000000000002',
  id,
  'HbA1c (hémoglobine glyquée)',
  FALSE,
  'rendu',
  NOW() - INTERVAL '90 days'
FROM auth.users LIMIT 1;

INSERT INTO resultats_analyse (analyse_id, patient_id, laborantin_id, parametre, valeur, unite, valeur_min, valeur_max, interpretation, date_resultat)
SELECT
  'a1000000-0000-0000-0000-000000000001',
  'p1000000-0000-0000-0000-000000000001',
  id,
  'HbA1c',
  8.2,
  '%',
  4.0,
  6.5,
  'Au-dessus de la valeur cible pour diabétique (objectif < 7%). Amélioration par rapport aux 9.1% du dernier bilan.',
  NOW() - INTERVAL '85 days'
FROM auth.users LIMIT 1;

INSERT INTO analyses_prescrites (id, patient_id, consultation_id, medecin_id, type_analyse, urgence, statut, date_prescription)
SELECT
  'a1000000-0000-0000-0000-000000000002',
  'p1000000-0000-0000-0000-000000000001',
  'c1000000-0000-0000-0000-000000000003',
  id,
  'Glycémie à jeun',
  FALSE,
  'rendu',
  NOW() - INTERVAL '15 days'
FROM auth.users LIMIT 1;

INSERT INTO resultats_analyse (analyse_id, patient_id, laborantin_id, parametre, valeur, unite, valeur_min, valeur_max, interpretation, date_resultat)
SELECT
  'a1000000-0000-0000-0000-000000000002',
  'p1000000-0000-0000-0000-000000000001',
  id,
  'Glycémie à jeun',
  1.98,
  'g/L',
  0.70,
  1.10,
  'Hyperglycémie persistante malgré traitement. Réévaluation thérapeutique recommandée.',
  NOW() - INTERVAL '12 days'
FROM auth.users LIMIT 1;

INSERT INTO analyses_prescrites (id, patient_id, consultation_id, medecin_id, type_analyse, urgence, statut, date_prescription)
SELECT
  'a1000000-0000-0000-0000-000000000003',
  'p1000000-0000-0000-0000-000000000001',
  'c1000000-0000-0000-0000-000000000003',
  id,
  'Créatininémie + DFG',
  FALSE,
  'en_attente',
  NOW() - INTERVAL '15 days'
FROM auth.users LIMIT 1;

-- Patient 2 — Bamba : CD4 + Charge virale + NFS
INSERT INTO analyses_prescrites (id, patient_id, consultation_id, medecin_id, type_analyse, urgence, statut, date_prescription)
SELECT
  'a2000000-0000-0000-0000-000000000001',
  'p1000000-0000-0000-0000-000000000002',
  'c2000000-0000-0000-0000-000000000001',
  id,
  'Numération CD4',
  FALSE,
  'rendu',
  NOW() - INTERVAL '60 days'
FROM auth.users LIMIT 1;

INSERT INTO resultats_analyse (analyse_id, patient_id, laborantin_id, parametre, valeur, unite, valeur_min, valeur_max, interpretation, date_resultat)
SELECT
  'a2000000-0000-0000-0000-000000000001',
  'p1000000-0000-0000-0000-000000000002',
  id,
  'CD4',
  480,
  'cel/mm³',
  500,
  1500,
  'Légèrement en dessous de la normale mais en progression par rapport au bilan précédent (380 cel/mm³). Réponse immunitaire satisfaisante sous ARV.',
  NOW() - INTERVAL '55 days'
FROM auth.users LIMIT 1;

INSERT INTO analyses_prescrites (id, patient_id, consultation_id, medecin_id, type_analyse, urgence, statut, date_prescription)
SELECT
  'a2000000-0000-0000-0000-000000000002',
  'p1000000-0000-0000-0000-000000000002',
  'c2000000-0000-0000-0000-000000000002',
  id,
  'Frottis sanguin + TDR paludisme',
  TRUE,
  'rendu',
  NOW() - INTERVAL '10 days'
FROM auth.users LIMIT 1;

INSERT INTO resultats_analyse (analyse_id, patient_id, laborantin_id, parametre, valeur_texte, unite, interpretation, date_resultat)
SELECT
  'a2000000-0000-0000-0000-000000000002',
  'p1000000-0000-0000-0000-000000000002',
  id,
  'Plasmodium falciparum',
  'POSITIF',
  NULL,
  'Frottis positif — Plasmodium falciparum confirmé. Parasitémie : 0.8%. Non compliqué.',
  NOW() - INTERVAL '10 days'
FROM auth.users LIMIT 1;

-- Patient 3 — Traoré : NFS + Créatinine
INSERT INTO analyses_prescrites (id, patient_id, consultation_id, medecin_id, type_analyse, urgence, statut, date_prescription)
SELECT
  'a3000000-0000-0000-0000-000000000001',
  'p1000000-0000-0000-0000-000000000003',
  'c3000000-0000-0000-0000-000000000001',
  id,
  'Numération formule sanguine complète',
  TRUE,
  'rendu',
  NOW() - INTERVAL '45 days'
FROM auth.users LIMIT 1;

INSERT INTO resultats_analyse (analyse_id, patient_id, laborantin_id, parametre, valeur, unite, valeur_min, valeur_max, interpretation, date_resultat)
SELECT
  'a3000000-0000-0000-0000-000000000001',
  'p1000000-0000-0000-0000-000000000003',
  id,
  'Hémoglobine',
  7.2,
  'g/dL',
  12.0,
  17.0,
  'Anémie sévère — compatible avec crise drépanocytaire. Transfusion à discuter si dégradation.',
  NOW() - INTERVAL '44 days'
FROM auth.users LIMIT 1;

-- Patient 4 — Kouakou : Spirométrie en attente
INSERT INTO analyses_prescrites (id, patient_id, consultation_id, medecin_id, type_analyse, urgence, statut, date_prescription)
SELECT
  'a4000000-0000-0000-0000-000000000001',
  'p1000000-0000-0000-0000-000000000004',
  'c4000000-0000-0000-0000-000000000001',
  id,
  'Spirométrie (EFR)',
  FALSE,
  'prescrit',
  NOW() - INTERVAL '30 days'
FROM auth.users LIMIT 1;

-- ============================================================
-- VACCINATIONS
-- ============================================================

-- Patient 1 — Konan
INSERT INTO vaccinations (patient_id, vaccin, dose, lot, voie, operateur_id, etablissement_id, date_vaccination, prochain_rappel, statut)
SELECT 'p1000000-0000-0000-0000-000000000001', 'Vaccin anti-tétanique (VAT)', 'Rappel', 'LOT-2022-TT01', 'IM', id, 'e1000000-0000-0000-0000-000000000001', '2022-05-10', '2032-05-10', 'a_jour'
FROM auth.users LIMIT 1;

INSERT INTO vaccinations (patient_id, vaccin, dose, lot, voie, operateur_id, etablissement_id, date_vaccination, prochain_rappel, statut)
SELECT 'p1000000-0000-0000-0000-000000000001', 'Vaccin anti-grippal', 'Annuel', 'LOT-2023-FLU', 'IM', id, 'e1000000-0000-0000-0000-000000000001', '2023-10-15', '2024-10-15', 'en_retard'
FROM auth.users LIMIT 1;

-- Patient 2 — Bamba
INSERT INTO vaccinations (patient_id, vaccin, dose, lot, voie, operateur_id, etablissement_id, date_vaccination, prochain_rappel, statut, notes)
SELECT 'p1000000-0000-0000-0000-000000000002', 'Vaccin contre l''hépatite B', 'Dose 3/3', 'LOT-2020-HBV', 'IM', id, 'e1000000-0000-0000-0000-000000000001', '2020-06-20', NULL, 'a_jour', 'Série complète — contrôle anticorps anti-HBs positif'
FROM auth.users LIMIT 1;

INSERT INTO vaccinations (patient_id, vaccin, dose, lot, voie, operateur_id, etablissement_id, date_vaccination, prochain_rappel, statut)
SELECT 'p1000000-0000-0000-0000-000000000002', 'Vaccin pneumococcique (Pneumo 23)', 'Dose unique', 'LOT-2021-PCV', 'IM', id, 'e1000000-0000-0000-0000-000000000001', '2021-03-08', '2026-03-08', 'a_jour'
FROM auth.users LIMIT 1;

-- Patient 5 — N'Goran (enfant) — calendrier PEV
INSERT INTO vaccinations (patient_id, vaccin, dose, lot, voie, operateur_id, etablissement_id, date_vaccination, prochain_rappel, statut)
SELECT 'p1000000-0000-0000-0000-000000000005', 'BCG (tuberculose)', 'Dose naissance', 'LOT-2019-BCG', 'ID', id, 'e1000000-0000-0000-0000-000000000002', '2019-05-12', NULL, 'a_jour'
FROM auth.users LIMIT 1;

INSERT INTO vaccinations (patient_id, vaccin, dose, lot, voie, operateur_id, etablissement_id, date_vaccination, prochain_rappel, statut)
SELECT 'p1000000-0000-0000-0000-000000000005', 'DTCoq-Polio-Hib (Pentavalent)', 'Dose 3/3', 'LOT-2019-PENTA', 'IM', id, 'e1000000-0000-0000-0000-000000000002', '2019-11-15', '2023-11-15', 'en_retard'
FROM auth.users LIMIT 1;

INSERT INTO vaccinations (patient_id, vaccin, dose, lot, voie, operateur_id, etablissement_id, date_vaccination, prochain_rappel, statut)
SELECT 'p1000000-0000-0000-0000-000000000005', 'Vaccin anti-rougeole-oreillons-rubéole (ROR)', 'Dose 1/2', 'LOT-2020-ROR', 'SC', id, 'e1000000-0000-0000-0000-000000000002', '2020-05-12', '2021-05-12', 'en_retard'
FROM auth.users LIMIT 1;

INSERT INTO vaccinations (patient_id, vaccin, dose, lot, voie, operateur_id, etablissement_id, date_vaccination, prochain_rappel, statut)
SELECT 'p1000000-0000-0000-0000-000000000005', 'Vaccin anti-méningococcique A', 'Dose unique', 'LOT-2021-MENA', 'IM', id, 'e1000000-0000-0000-0000-000000000002', '2021-04-20', '2026-04-20', 'a_jour'
FROM auth.users LIMIT 1;

-- ============================================================
-- HOSPITALISATIONS
-- ============================================================

-- Patient 3 — Traoré : Hospitalisation en cours pour crise drépanocytaire
INSERT INTO hospitalisations (id, patient_id, etablissement_id, medecin_referent_id, date_entree, service, motif, resume_sejour, mode_sortie)
SELECT
  'h3000000-0000-0000-0000-000000000001',
  'p1000000-0000-0000-0000-000000000003',
  'e1000000-0000-0000-0000-000000000004',
  id,
  NOW() - INTERVAL '3 days',
  'Médecine interne — Hématologie',
  'Crise vaso-occlusive sévère — douleurs osseuses intenses, anémie à 7.2 g/dL',
  'Patient admis pour crise douloureuse intense. Analgésie IV morphinique initiée. Hyperhydratation. Transfusion de 2 culots globulaires avec bonne tolérance. Hb remontée à 9.1 g/dL. Patient stabilisé.',
  NULL
FROM auth.users LIMIT 1;

-- Patient 4 — Kouakou : Hospitalisation antérieure (dépression)
INSERT INTO hospitalisations (id, patient_id, etablissement_id, medecin_referent_id, date_entree, date_sortie, service, motif, resume_sejour, mode_sortie)
SELECT
  'h4000000-0000-0000-0000-000000000001',
  'p1000000-0000-0000-0000-000000000004',
  'e1000000-0000-0000-0000-000000000003',
  id,
  '2023-04-10',
  '2023-04-24',
  'Psychiatrie',
  'Épisode dépressif majeur avec idéations suicidaires passives',
  'Patiente admise suite à décompensation dépressive. Bilan somatique normal. Instauration Escitalopram 10mg/j + psychothérapie. Bonne réponse thérapeutique à J10. Sortie avec suivi ambulatoire hebdomadaire.',
  'domicile'
FROM auth.users LIMIT 1;

-- Patient 1 — Konan : Hospitalisation ancienne (appendicite)
INSERT INTO hospitalisations (id, patient_id, etablissement_id, medecin_referent_id, date_entree, date_sortie, service, motif, resume_sejour, mode_sortie)
SELECT
  'h1000000-0000-0000-0000-000000000001',
  'p1000000-0000-0000-0000-000000000001',
  'e1000000-0000-0000-0000-000000000001',
  id,
  '2003-08-18',
  '2003-08-23',
  'Chirurgie générale',
  'Appendicite aiguë non compliquée',
  'Appendicectomie par laparotomie sous anesthésie générale. Suites opératoires simples. Ablation fils J5. Sortie en bon état général.',
  'domicile'
FROM auth.users LIMIT 1;

-- ============================================================
-- ANTÉCÉDENTS FAMILIAUX SUPPLÉMENTAIRES
-- ============================================================
INSERT INTO antecedents_familiaux (patient_id, parent, pathologie, statut_vital, cause_deces, age_deces) VALUES
  ('p1000000-0000-0000-0000-000000000001', 'gp_paternel', 'HTA, Infarctus du myocarde', 'decede', 'Infarctus du myocarde', 68),
  ('p1000000-0000-0000-0000-000000000001', 'gm_paternelle', 'Diabète de type 2', 'decede', 'AVC hémorragique', 75),
  ('p1000000-0000-0000-0000-000000000003', 'frere', 'Drépanocytose SC', 'vivant', NULL, NULL),
  ('p1000000-0000-0000-0000-000000000004', 'pere', 'Hypertension artérielle', 'vivant', NULL, NULL),
  ('p1000000-0000-0000-0000-000000000005', 'pere', 'Drépanocytose trait (AS)', 'vivant', NULL, NULL),
  ('p1000000-0000-0000-0000-000000000005', 'mere', 'Asthme allergique', 'vivant', NULL, NULL);

-- ============================================================
-- SOINS INFIRMIERS (pour l'hospitalisation de Traoré)
-- ============================================================
INSERT INTO soins_infirmiers (hospitalisation_id, patient_id, infirmier_id, type_soin, description, medicament_administre, dose, heure_administration, constantes_json)
SELECT
  'h3000000-0000-0000-0000-000000000001',
  'p1000000-0000-0000-0000-000000000003',
  id,
  'Analgésie IV',
  'Administration morphine IV selon protocole antidouleur. Patient coopératif. EVA 4/10 après administration.',
  'Morphine',
  '10 mg IVL en 15 min',
  NOW() - INTERVAL '2 days' + INTERVAL '8 hours',
  '{"ta_sys": 130, "ta_dia": 76, "fc": 88, "spo2": 95, "eva_douleur": 4}'::jsonb
FROM auth.users LIMIT 1;

INSERT INTO soins_infirmiers (hospitalisation_id, patient_id, infirmier_id, type_soin, description, medicament_administre, dose, heure_administration, constantes_json)
SELECT
  'h3000000-0000-0000-0000-000000000001',
  'p1000000-0000-0000-0000-000000000003',
  id,
  'Transfusion sanguine',
  'Transfusion culot globulaire O- (compatible). Surveillance toutes les 15 min pendant 1h. Pas de réaction transfusionnelle.',
  'Culot globulaire O-',
  '2 culots (400 mL/culot)',
  NOW() - INTERVAL '2 days' + INTERVAL '14 hours',
  '{"ta_sys": 128, "ta_dia": 74, "fc": 82, "spo2": 96, "temperature": 36.9}'::jsonb
FROM auth.users LIMIT 1;

-- ============================================================
-- CONSENTEMENTS
-- ============================================================
INSERT INTO consentements (patient_id, type, date_consentement, operateur_id, notes)
SELECT 'p1000000-0000-0000-0000-000000000001', 'Consentement général aux soins', '2024-01-15', id, 'Consentement signé lors de l''enregistrement initial. Patient informé de ses droits.'
FROM auth.users LIMIT 1;

INSERT INTO consentements (patient_id, type, date_consentement, operateur_id, notes)
SELECT 'p1000000-0000-0000-0000-000000000002', 'Consentement partage données inter-établissements', '2024-02-20', id, 'Consentement exprès pour accès cross-établissements dans le cadre du suivi VIH.'
FROM auth.users LIMIT 1;

INSERT INTO consentements (patient_id, type, date_consentement, operateur_id, notes)
SELECT 'p1000000-0000-0000-0000-000000000004', 'Consentement données psychiatriques', '2023-04-10', id, 'Consentement spécifique pour le partage des données psychiatriques avec les soignants impliqués.'
FROM auth.users LIMIT 1;
