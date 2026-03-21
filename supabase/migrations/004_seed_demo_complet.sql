-- MediLink — Seed de démonstration complet v2
-- Utilise session_replication_role = replica pour contourner les FK vers auth.users
-- (technique standard pour seeder Supabase sans comptes Auth préexistants)
-- UUIDs littéraux partout — pas de variables PL/pgSQL

SET session_replication_role = replica;

-- ============================================================
-- ÉTABLISSEMENTS
-- ============================================================
INSERT INTO etablissements (id, nom, type, ville, region, pays, adresse, telephone) VALUES
  ('e1000000-0000-0000-0000-000000000001', 'CNHU Hubert Koutoukou Maga',      'CHU',      'Cotonou',  'Littoral', 'Bénin', 'Avenue Jean-Paul II, Cotonou',     '+229 21 30 01 55'),
  ('e1000000-0000-0000-0000-000000000002', 'Centre de Santé de Cadjehoun',    'CSP',      'Cotonou',  'Littoral', 'Bénin', 'Rue 10.115, Cadjehoun',             '+229 21 30 22 44'),
  ('e1000000-0000-0000-0000-000000000003', 'Clinique Internationale Cotonou', 'clinique', 'Cotonou',  'Littoral', 'Bénin', 'Boulevard de la Marina',            '+229 21 31 40 40'),
  ('e1000000-0000-0000-0000-000000000004', 'Hôpital de Zone de Parakou',      'hopital',  'Parakou',  'Borgou',   'Bénin', 'Avenue de l''Université, Parakou',  '+229 23 61 05 20')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- PROFILS UTILISATEURS (fake auth UUIDs — FK désactivée)
-- ============================================================
INSERT INTO users_profiles (id, role, nom, prenom, specialite, etablissement_id, telephone, numero_ordre) VALUES
  ('9a000000-0000-0000-0000-000000000001', 'medecin',             'KPOSSOU',    'Aristide',  'Médecine interne',    'e1000000-0000-0000-0000-000000000001', '+229 97 01 02 03', 'OM-BJ-2015-0042'),
  ('9a000000-0000-0000-0000-000000000002', 'medecin',             'AMOUSSOU',   'Clarisse',  'Pédiatrie',           'e1000000-0000-0000-0000-000000000002', '+229 96 04 05 06', 'OM-BJ-2018-0118'),
  ('9a000000-0000-0000-0000-000000000003', 'super_admin',         'DOHOU',      'Gérard',    NULL,                  'e1000000-0000-0000-0000-000000000001', '+229 97 07 08 09', NULL),
  ('9a000000-0000-0000-0000-000000000004', 'infirmier',           'ZANNOU',     'Sophie',    NULL,                  'e1000000-0000-0000-0000-000000000001', '+229 96 10 11 12', NULL),
  ('9a000000-0000-0000-0000-000000000005', 'laborantin',          'HOUNKANRIN', 'Maxime',    NULL,                  'e1000000-0000-0000-0000-000000000001', '+229 97 13 14 15', NULL),
  ('9a000000-0000-0000-0000-000000000006', 'pharmacien',          'ADJOVI',     'Nadège',    NULL,                  'e1000000-0000-0000-0000-000000000003', '+229 96 16 17 18', NULL),
  ('9a000000-0000-0000-0000-000000000007', 'admin_etablissement', 'GLELE',      'Romuald',   NULL,                  'e1000000-0000-0000-0000-000000000002', '+229 97 19 20 21', NULL)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- PATIENTS
-- ============================================================
INSERT INTO patients (id, imu, nom, prenom, date_naissance, lieu_naissance, sexe, situation_matrimoniale,
  nombre_enfants, groupe_sanguin, rhesus, nationalite, profession, niveau_etudes,
  langue_preferee, contact_urgence_nom, contact_urgence_lien, contact_urgence_tel,
  assurance_organisme, assurance_numero, assurance_taux, ville, telephone) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'NPI-2024-004821', 'AGOSSOU',  'Dossou Félix',      '1968-03-15', 'Parakou',        'M', 'marié',      3, 'A',  '+', 'Béninoise', 'Comptable',          'Licence', 'Français', 'Agossou Cécile',   'Épouse', '+229 97 11 22 33', 'CNSS',  'CNSS-2024-00981',  80.00, 'Cotonou',    '+229 97 21 22 23'),
  ('a1000000-0000-0000-0000-000000000002', 'NPI-2024-007340', 'HOUNSOU',  'Fatoumata',         '1985-07-22', 'Abomey-Calavi',  'F', 'mariée',     4, 'O',  '+', 'Béninoise', 'Infirmière libérale', 'BTS',     'Français', 'Hounsou Sébastien','Mari',   '+229 96 22 33 44', 'RAMU',  'RAMU-2023-05521',  75.00, 'Cotonou',    '+229 96 24 25 26'),
  ('a1000000-0000-0000-0000-000000000003', 'NPI-2024-009156', 'GARBA',    'Ibrahima',          '1952-11-08', 'Kandi',          'M', 'marié',      6, 'B',  '-', 'Béninoise', 'Retraité',            'Primaire','Français', 'Garba Aminata',    'Fille',  '+229 95 33 44 55', NULL,    NULL,               NULL,  'Parakou',    '+229 95 27 28 29'),
  ('a1000000-0000-0000-0000-000000000004', 'NPI-2025-001243', 'DOSSOU',   'Bernadette Aïkpe',  '1995-01-30', 'Cotonou',        'F', 'célibataire',1, 'AB', '+', 'Béninoise', 'Étudiante',           'Master',  'Français', 'Dossou Paul',      'Père',   '+229 97 44 55 66', 'CNSS',  'CNSS-2025-01102',  60.00, 'Cotonou',    '+229 97 30 31 32'),
  ('a1000000-0000-0000-0000-000000000005', 'NPI-2025-003877', 'LOKOSSOU', 'Koffi Emmanuel',    '2019-05-12', 'Porto-Novo',     'M', NULL,         0, 'O',  '+', 'Béninoise', NULL,                  NULL,      'Français', 'Lokossou Marie',   'Mère',   '+229 97 55 66 77', 'RAMU',  'RAMU-2025-00412',  100.00,'Porto-Novo',  '+229 97 55 66 77')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- ANTÉCÉDENTS PERSONNELS
-- ============================================================
INSERT INTO antecedents (id, patient_id, categorie, description, date_debut, date_fin, actif, cim10_code, created_by) VALUES
  ('d1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'medical',        'Diabète sucré de type 2',                             '2015-03-01', NULL,         TRUE,  'E11', '9a000000-0000-0000-0000-000000000001'),
  ('d1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'medical',        'Hypertension artérielle essentielle',                 '2018-06-15', NULL,         TRUE,  'I10', '9a000000-0000-0000-0000-000000000001'),
  ('d1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001', 'chirurgical',    'Appendicectomie',                                     '2003-08-20', '2003-08-20', FALSE, 'K35', '9a000000-0000-0000-0000-000000000001'),
  ('d1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000002', 'medical',        'Infection VIH — sous traitement ARV',                 '2019-01-10', NULL,         TRUE,  'B24', '9a000000-0000-0000-0000-000000000001'),
  ('d1000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000002', 'obstetrical',    'G4P4 — 4 grossesses, 4 accouchements normaux',        '2024-01-01', NULL,         FALSE, 'Z34', '9a000000-0000-0000-0000-000000000001'),
  ('d1000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000003', 'medical',        'Drépanocytose SS homozygote',                         '1960-01-01', NULL,         TRUE,  'D57', '9a000000-0000-0000-0000-000000000001'),
  ('d1000000-0000-0000-0000-000000000007', 'a1000000-0000-0000-0000-000000000003', 'medical',        'Maladie rénale chronique stade 3',                    '2020-05-01', NULL,         TRUE,  'N18', '9a000000-0000-0000-0000-000000000001'),
  ('d1000000-0000-0000-0000-000000000008', 'a1000000-0000-0000-0000-000000000003', 'traumatologique','Fracture du fémur droit — accident de route 2010',    '2010-07-14', '2010-07-14', FALSE, 'S72', '9a000000-0000-0000-0000-000000000001'),
  ('d1000000-0000-0000-0000-000000000009', 'a1000000-0000-0000-0000-000000000004', 'medical',        'Asthme persistant modéré',                            '2008-01-01', NULL,         TRUE,  'J45', '9a000000-0000-0000-0000-000000000002'),
  ('d1000000-0000-0000-0000-000000000010', 'a1000000-0000-0000-0000-000000000004', 'psychiatrique',  'Épisode dépressif majeur — rémission partielle',      '2023-03-01', NULL,         TRUE,  'F32', '9a000000-0000-0000-0000-000000000002')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- ANTÉCÉDENTS FAMILIAUX
-- ============================================================
INSERT INTO antecedents_familiaux (id, patient_id, parent, pathologie, statut_vital, cause_deces, age_deces) VALUES
  ('f1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'pere',       'Diabète de type 2, HTA',             'decede', 'Infarctus du myocarde', 72),
  ('f1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'mere',       'Hypertension artérielle',            'vivant', NULL, NULL),
  ('f1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001', 'frere',      'Diabète de type 2',                  'vivant', NULL, NULL),
  ('f1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000003', 'pere',       'Drépanocytose trait (AS)',            'decede', 'Paludisme grave',       65),
  ('f1000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000003', 'mere',       'Drépanocytose trait (AS)',            'decede', 'Insuffisance cardiaque',70),
  ('f1000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000004', 'mere',       'Asthme, allergie aux arachides',     'vivant', NULL, NULL),
  ('f1000000-0000-0000-0000-000000000007', 'a1000000-0000-0000-0000-000000000004', 'gp_paternel','Cancer du côlon',                    'decede', 'Cancer du côlon',       68)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- HABITUDES DE VIE
-- ============================================================
INSERT INTO habitudes_vie (patient_id, tabac, alcool, activite_physique, alimentation, eau_potable, electricite, assainissement) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'ex_fumeur',   'occasionnel', 'sedentaire', 'Régime diabétique pauvre en sucre',         TRUE, TRUE,  TRUE),
  ('a1000000-0000-0000-0000-000000000002', 'non_fumeur',  'non',         'moderee',    'Alimentation équilibrée',                   TRUE, TRUE,  TRUE),
  ('a1000000-0000-0000-0000-000000000003', 'non_fumeur',  'non',         'sedentaire', 'Régime pauvre en sel',                      TRUE, FALSE, FALSE),
  ('a1000000-0000-0000-0000-000000000004', 'non_fumeur',  'occasionnel', 'moderee',    'Standard',                                  TRUE, TRUE,  TRUE),
  ('a1000000-0000-0000-0000-000000000005', 'non_fumeur',  'non',         'intense',    'Alimentation enfant — sevrage lait maternel',TRUE, TRUE,  TRUE)
ON CONFLICT (patient_id) DO NOTHING;

-- ============================================================
-- ALLERGIES
-- ============================================================
INSERT INTO allergies (id, patient_id, substance, type, severite, reaction, date_decouverte, created_by) VALUES
  ('9b000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'Pénicilline', 'medicamenteuse', 'moderee',       'Urticaire généralisée, prurit intense',                 '2010-04-15', '9a000000-0000-0000-0000-000000000001'),
  ('9b000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002', 'Sulfamides',  'medicamenteuse', 'moderee',       'Éruption cutanée maculopapuleuse',                      '2020-02-10', '9a000000-0000-0000-0000-000000000001'),
  ('9b000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000004', 'Arachides',   'alimentaire',    'anaphylactique','Choc anaphylactique — hospitalisée urgences 2022',      '2022-08-20', '9a000000-0000-0000-0000-000000000002'),
  ('9b000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000004', 'Aspirine',    'medicamenteuse', 'moderee',       'Bronchospasme, aggravation asthme',                     '2015-05-01', '9a000000-0000-0000-0000-000000000002')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- CONSULTATIONS
-- ============================================================
INSERT INTO consultations (id, patient_id, medecin_id, etablissement_id, date_consultation,
  type_consultation, motif, anamnese, diagnostic_principal, diagnostic_cim10, plan_prise_en_charge) VALUES

  -- Agossou — suivi diabète + HTA
  ('c1000000-0000-0000-0000-000000000001',
   'a1000000-0000-0000-0000-000000000001', '9a000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001',
   NOW() - INTERVAL '6 months', 'externe', 'Suivi diabète type 2 et hypertension artérielle',
   'Patient de 56 ans, diabétique T2 depuis 2015, hypertendu depuis 2018. Polydipsie et fatigue légère. Observance correcte.',
   'Diabète sucré type 2 mal équilibré — HbA1c 8,2%', 'E11',
   'Renforcement Metformine 1g × 2. Ajout Glibenclamide 5mg. Régime strict. HbA1c + bilan rénal à 3 mois.'),

  -- Agossou — contrôle HbA1c + début néphropathie
  ('c1000000-0000-0000-0000-000000000002',
   'a1000000-0000-0000-0000-000000000001', '9a000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001',
   NOW() - INTERVAL '3 months', 'externe', 'Contrôle HbA1c et bilan rénal',
   'HbA1c 7,4% (amélioration). Créatinine 98 µmol/L, DFG 68 mL/min. Microalbuminurie 35 mg/g.',
   'Diabète T2 en amélioration — début néphropathie diabétique stade 1', 'E11.2',
   'Ajout Ramipril 5mg. Consultation néphrologie dans 6 mois.'),

  -- Hounsou — suivi VIH
  ('c1000000-0000-0000-0000-000000000003',
   'a1000000-0000-0000-0000-000000000002', '9a000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001',
   NOW() - INTERVAL '5 months', 'externe', 'Suivi VIH — bilan semestriel',
   'Patiente 39 ans, VIH sous TDF+3TC+EFV depuis 2019. Asymptomatique, bonne observance. CD4 620/mm3, charge virale indétectable.',
   'VIH stade B3 — charge virale indétectable sous ARV', 'B24',
   'Poursuite ARV. Bilan hépatique de contrôle. Vaccin pneumocoque rappel. RDV dans 6 mois.'),

  -- Hounsou — paludisme
  ('c1000000-0000-0000-0000-000000000004',
   'a1000000-0000-0000-0000-000000000002', '9a000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000002',
   NOW() - INTERVAL '1 month', 'externe', 'Fièvre et céphalées — suspicion paludisme',
   'Fièvre 38,9°C depuis 48h, céphalées frontales, frissons. Retour de Parakou.',
   'Paludisme à P. falciparum non compliqué', 'B54',
   'Artéméther-Luméfantrine 3 jours. Paracétamol 1g × 3/j. GE de contrôle à J3.'),

  -- Garba — crise vaso-occlusive (urgence)
  ('c1000000-0000-0000-0000-000000000005',
   'a1000000-0000-0000-0000-000000000003', '9a000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001',
   NOW() - INTERVAL '4 months', 'urgence', 'Crise vaso-occlusive sévère — douleurs osseuses',
   'Patient 72 ans, drépanocytaire SS. Douleurs membres inférieurs et rachis VAS 8/10. T° 37,8°C. Pas de foyer infectieux.',
   'Crise vaso-occlusive sévère sur drépanocytose', 'D57',
   'Morphine IV titration. Hyperhydratation NaCl 0,9%. Acide folique. Bilan infectieux.'),

  -- Garba — suivi IRC + drépanocytose
  ('c1000000-0000-0000-0000-000000000006',
   'a1000000-0000-0000-0000-000000000003', '9a000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001',
   NOW() - INTERVAL '2 months', 'externe', 'Suivi IRC et drépanocytose',
   'DFG stable à 42 mL/min, créatinine 140 µmol/L. Hémoglobine 8,2 g/dL. Pas de crise depuis 2 mois.',
   'Maladie rénale chronique stade 3b — drépanocytose SS', 'N18.3',
   'EPO SC × 2/semaine. Régime hyposodé strict. Éviter AINS. Dialyse à envisager si DFG < 15.'),

  -- Dossou — crise asthme (urgence)
  ('c1000000-0000-0000-0000-000000000007',
   'a1000000-0000-0000-0000-000000000004', '9a000000-0000-0000-0000-000000000002', 'e1000000-0000-0000-0000-000000000002',
   NOW() - INTERVAL '3 months', 'urgence', 'Crise d''asthme modérée — dyspnée aiguë',
   'Patiente 29 ans, asthmatique. Dyspnée sifflante depuis 2h, exposition pollen. SaO2 93%, DEP 55% théorique.',
   'Exacerbation modérée d''asthme persistant', 'J45.1',
   'Salbutamol nébulisé × 3. Prednisolone 40mg × 5j. O2 nasal 2L/min. Spirométrie à J14.'),

  -- Dossou — suivi dépression
  ('c1000000-0000-0000-0000-000000000008',
   'a1000000-0000-0000-0000-000000000004', '9a000000-0000-0000-0000-000000000002', 'e1000000-0000-0000-0000-000000000002',
   NOW() - INTERVAL '6 weeks', 'externe', 'Suivi psychiatrique — dépression',
   'Score PHQ-9 à 9. Humeur légèrement déprimée, insomnie. Étudiante, charge de travail importante.',
   'Épisode dépressif modéré — amélioration partielle', 'F32.1',
   'Poursuite Sertraline 50mg. TCC hebdomadaire. Réévaluation dans 4 semaines.'),

  -- Lokossou — bronchite enfant
  ('c1000000-0000-0000-0000-000000000009',
   'a1000000-0000-0000-0000-000000000005', '9a000000-0000-0000-0000-000000000002', 'e1000000-0000-0000-0000-000000000002',
   NOW() - INTERVAL '2 months', 'externe', 'Consultation pédiatrique — fièvre et toux',
   'Enfant 4 ans, 17 kg. Fièvre 38,5°C depuis 3j, toux productive, rhinorrhée. Quelques râles bronchiques.',
   'Bronchite aiguë virale', 'J20.9',
   'Ambroxol sirop. Paracétamol 15mg/kg × 3/j. Lavage nasal. RDV si aggravation à J5.')

ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- CONSTANTES VITALES
-- ============================================================
INSERT INTO constantes (consultation_id, patient_id, ta_sys, ta_dia, fc, fr, temperature, spo2, poids, taille, imc, glycemie, date_mesure) VALUES
  ('c1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001', 148, 92,  78,  18, 36.8, 98.0, 84.0, 172.0, 28.4, 12.4, NOW() - INTERVAL '6 months'),
  ('c1000000-0000-0000-0000-000000000002','a1000000-0000-0000-0000-000000000001', 136, 84,  72,  17, 36.6, 98.5, 82.0, 172.0, 27.7,  8.2, NOW() - INTERVAL '3 months'),
  ('c1000000-0000-0000-0000-000000000003','a1000000-0000-0000-0000-000000000002', 118, 74,  68,  16, 36.4, 99.0, 64.0, 165.0, 23.5,  5.4, NOW() - INTERVAL '5 months'),
  ('c1000000-0000-0000-0000-000000000004','a1000000-0000-0000-0000-000000000002', 122, 76,  96,  22, 38.9, 97.5, 62.0, 165.0, 22.8,  5.8, NOW() - INTERVAL '1 month'),
  ('c1000000-0000-0000-0000-000000000005','a1000000-0000-0000-0000-000000000003', 132, 80,  88,  20, 37.8, 96.5, 58.0, 168.0, 20.5,  6.1, NOW() - INTERVAL '4 months'),
  ('c1000000-0000-0000-0000-000000000007','a1000000-0000-0000-0000-000000000004', 116, 72, 104,  24, 37.2, 93.0, 58.0, 162.0, 22.1,  5.2, NOW() - INTERVAL '3 months'),
  ('c1000000-0000-0000-0000-000000000009','a1000000-0000-0000-0000-000000000005',  98, 60, 110,  28, 38.5, 98.0, 17.0, 102.0, 16.3,  NULL,NOW() - INTERVAL '2 months')
ON CONFLICT DO NOTHING;

-- ============================================================
-- PRESCRIPTIONS
-- ============================================================
INSERT INTO prescriptions (consultation_id, patient_id, medecin_id, medicament_dci, medicament_commercial,
  dosage, forme, posologie, duree, instructions, statut) VALUES
  -- C1 Agossou
  ('c1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001','9a000000-0000-0000-0000-000000000001','Metformine',                   'Glucophage',         '1000 mg',        'comprimé',     '1 cp matin + 1 cp soir au cours des repas',        '3 mois',  'Prendre avec les repas',                    'en_cours'),
  ('c1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001','9a000000-0000-0000-0000-000000000001','Glibenclamide',                 NULL,                 '5 mg',           'comprimé',     '1 cp matin avant le repas',                        '3 mois',  'Surveiller les hypoglycémies',              'en_cours'),
  ('c1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001','9a000000-0000-0000-0000-000000000001','Amlodipine',                   'Amlor',              '5 mg',           'comprimé',     '1 cp/j le matin',                                  '3 mois',  NULL,                                        'en_cours'),
  -- C2 Agossou
  ('c1000000-0000-0000-0000-000000000002','a1000000-0000-0000-0000-000000000001','9a000000-0000-0000-0000-000000000001','Ramipril',                     'Triatec',            '5 mg',           'comprimé',     '1 cp/j le soir',                                   '6 mois',  'Surveiller créatinine à J15',               'en_cours'),
  -- C3 Hounsou VIH
  ('c1000000-0000-0000-0000-000000000003','a1000000-0000-0000-0000-000000000002','9a000000-0000-0000-0000-000000000001','Ténofovir + Lamivudine + Efavirenz','TDF/3TC/EFV',   '300/300/600 mg', 'comprimé',     '1 cp/j le soir à heure fixe',                      '6 mois',  'Jeun ou repas léger',                       'en_cours'),
  -- C4 Hounsou paludisme
  ('c1000000-0000-0000-0000-000000000004','a1000000-0000-0000-0000-000000000002','9a000000-0000-0000-0000-000000000001','Artéméther + Luméfantrine',    'Coartem',            '20/120 mg',      'comprimé',     '4 cp matin + 4 cp soir × 3 jours',                 '3 jours', 'Prendre avec aliment gras',                 'termine'),
  ('c1000000-0000-0000-0000-000000000004','a1000000-0000-0000-0000-000000000002','9a000000-0000-0000-0000-000000000001','Paracétamol',                  'Doliprane',          '1000 mg',        'comprimé',     '1 cp toutes les 6h si T° > 38,5°C',                '5 jours', NULL,                                        'termine'),
  -- C5 Garba CVO
  ('c1000000-0000-0000-0000-000000000005','a1000000-0000-0000-0000-000000000003','9a000000-0000-0000-0000-000000000001','Morphine',                     NULL,                 '10 mg',          'injectable IV','Titration IV par paliers de 2mg/5min (max 20mg)',   '48h',     'Sous monitoring continu en USPI',           'termine'),
  ('c1000000-0000-0000-0000-000000000005','a1000000-0000-0000-0000-000000000003','9a000000-0000-0000-0000-000000000001','Acide folique',                 NULL,                 '5 mg',           'comprimé',     '1 cp/j',                                           'continu', NULL,                                        'en_cours'),
  -- C6 Garba IRC
  ('c1000000-0000-0000-0000-000000000006','a1000000-0000-0000-0000-000000000003','9a000000-0000-0000-0000-000000000001','Hydroxyurée',                  'Hydrea',             '500 mg',         'gélule',       '1 gél/j',                                          'continu', 'NFS mensuelle',                             'en_cours'),
  -- C7 Dossou asthme
  ('c1000000-0000-0000-0000-000000000007','a1000000-0000-0000-0000-000000000004','9a000000-0000-0000-0000-000000000002','Prednisolone',                 'Solupred',           '40 mg',          'comprimé',     '1 cp/j le matin',                                  '5 jours', 'Avec repas',                                'termine'),
  ('c1000000-0000-0000-0000-000000000007','a1000000-0000-0000-0000-000000000004','9a000000-0000-0000-0000-000000000002','Salbutamol',                   'Ventoline',          '100 µg/bouffée', 'aérosol',      '2 bouffées si besoin, max 8/j',                    'continu', 'En cas de gêne respiratoire',               'en_cours'),
  -- C8 Dossou dépression
  ('c1000000-0000-0000-0000-000000000008','a1000000-0000-0000-0000-000000000004','9a000000-0000-0000-0000-000000000002','Sertraline',                   'Zoloft',             '50 mg',          'comprimé',     '1 cp/j le matin',                                  '3 mois',  'Ne pas interrompre brusquement',            'en_cours'),
  -- C9 Lokossou enfant
  ('c1000000-0000-0000-0000-000000000009','a1000000-0000-0000-0000-000000000005','9a000000-0000-0000-0000-000000000002','Ambroxol',                     'Mucosolvan',         '15 mg/5mL',      'sirop',        '5 mL × 3/j pendant les repas',                     '7 jours', NULL,                                        'termine'),
  ('c1000000-0000-0000-0000-000000000009','a1000000-0000-0000-0000-000000000005','9a000000-0000-0000-0000-000000000002','Paracétamol',                  'Efferalgan pédiatrie','250 mg/sachet', 'poudre orale', '1 sachet (15 mg/kg) × 3/j',                        '5 jours', 'Diluer dans un verre d''eau',               'termine')
ON CONFLICT DO NOTHING;

-- ============================================================
-- ANALYSES PRESCRITES
-- ============================================================
INSERT INTO analyses_prescrites (id, consultation_id, patient_id, medecin_id, type_analyse, urgence, statut,
  instructions, resultat_rapide, date_rendu) VALUES
  ('b1000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001','9a000000-0000-0000-0000-000000000001','HbA1c',                                FALSE,'rendu', NULL,                        'HbA1c : 8,2%',                              NOW()-INTERVAL '6 months'+INTERVAL '2 days'),
  ('b1000000-0000-0000-0000-000000000002','c1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001','9a000000-0000-0000-0000-000000000001','Bilan rénal (créatinine, urée, ionogramme)',FALSE,'rendu', NULL,                        'Créat 98 µmol/L, DFG 68 mL/min',           NOW()-INTERVAL '6 months'+INTERVAL '2 days'),
  ('b1000000-0000-0000-0000-000000000003','c1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001','9a000000-0000-0000-0000-000000000001','Microalbuminurie/créatininurie',            FALSE,'rendu', 'Urine du matin',           'Microalbuminurie 35 mg/g',                  NOW()-INTERVAL '6 months'+INTERVAL '3 days'),
  ('b1000000-0000-0000-0000-000000000004','c1000000-0000-0000-0000-000000000003','a1000000-0000-0000-0000-000000000002','9a000000-0000-0000-0000-000000000001','CD4 + Charge virale VIH',                  FALSE,'rendu', 'À jeun recommandé',        'CD4 620/mm3 — CV indétectable < 50 cp/mL', NOW()-INTERVAL '5 months'+INTERVAL '3 days'),
  ('b1000000-0000-0000-0000-000000000005','c1000000-0000-0000-0000-000000000003','a1000000-0000-0000-0000-000000000002','9a000000-0000-0000-0000-000000000001','Bilan hépatique (ASAT, ALAT, GGT)',         FALSE,'rendu', NULL,                        'Bilan hépatique normal',                    NOW()-INTERVAL '5 months'+INTERVAL '3 days'),
  ('b1000000-0000-0000-0000-000000000006','c1000000-0000-0000-0000-000000000004','a1000000-0000-0000-0000-000000000002','9a000000-0000-0000-0000-000000000001','Goutte épaisse + Frottis sanguin',          TRUE, 'rendu', 'URGENT — résultat sous 2h','P. falciparum +++ — parasitémie 12 000/µL', NOW()-INTERVAL '1 month' +INTERVAL '3 hours'),
  ('b1000000-0000-0000-0000-000000000007','c1000000-0000-0000-0000-000000000005','a1000000-0000-0000-0000-000000000003','9a000000-0000-0000-0000-000000000001','NFS complète',                             TRUE, 'rendu', 'Urgent — CVO drépanocytaire','Hb 7,8 g/dL, GB 11 200/mm3, réticulocytes 8,2%', NOW()-INTERVAL '4 months'+INTERVAL '1 hour'),
  ('b1000000-0000-0000-0000-000000000008','c1000000-0000-0000-0000-000000000006','a1000000-0000-0000-0000-000000000003','9a000000-0000-0000-0000-000000000001','Bilan rénal + ionogramme',                  FALSE,'rendu', NULL,                        'Créat 140 µmol/L, DFG 42 mL/min (stade 3b)',NOW()-INTERVAL '2 months'+INTERVAL '2 days'),
  ('b1000000-0000-0000-0000-000000000009','c1000000-0000-0000-0000-000000000007','a1000000-0000-0000-0000-000000000004','9a000000-0000-0000-0000-000000000002','Spirométrie (DEP)',                         FALSE,'rendu', NULL,                        'DEP 55% du théorique — exacerbation modérée',NOW()-INTERVAL '3 months'+INTERVAL '1 day'),
  ('b1000000-0000-0000-0000-000000000010','c1000000-0000-0000-0000-000000000009','a1000000-0000-0000-0000-000000000005','9a000000-0000-0000-0000-000000000002','NFS + CRP',                                 FALSE,'rendu', NULL,                        'NFS normale, CRP 12 mg/L (légèrement élevée)',NOW()-INTERVAL '2 months'+INTERVAL '2 days')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- VACCINATIONS
-- ============================================================
INSERT INTO vaccinations (patient_id, vaccin, dose, lot, voie, operateur_id, etablissement_id,
  date_vaccination, prochain_rappel, statut) VALUES
  ('a1000000-0000-0000-0000-000000000001','Vaccin grippe saisonnière',      '2024',  'FLU2024-BJ-001',  'IM',   '9a000000-0000-0000-0000-000000000001','e1000000-0000-0000-0000-000000000001', NOW()-INTERVAL '8 months',  NOW()+INTERVAL '4 months',  'a_jour'),
  ('a1000000-0000-0000-0000-000000000001','Vaccin pneumocoque (PPV23)',     NULL,    'PPV23-BJ-045',    'IM',   '9a000000-0000-0000-0000-000000000001','e1000000-0000-0000-0000-000000000001', NOW()-INTERVAL '2 years',   NULL,                        'a_jour'),
  ('a1000000-0000-0000-0000-000000000002','Vaccin pneumocoque (PCV13)',     NULL,    'PCV13-BJ-112',    'IM',   '9a000000-0000-0000-0000-000000000001','e1000000-0000-0000-0000-000000000001', NOW()-INTERVAL '6 months',  NULL,                        'a_jour'),
  ('a1000000-0000-0000-0000-000000000002','Vaccin hépatite B',             '3/3',   'HBV-BJ-778',      'IM',   '9a000000-0000-0000-0000-000000000001','e1000000-0000-0000-0000-000000000001', NOW()-INTERVAL '3 years',   NULL,                        'a_jour'),
  ('a1000000-0000-0000-0000-000000000003','Vaccin méningocoque ACWY',      NULL,    'MEN-BJ-234',      'IM',   '9a000000-0000-0000-0000-000000000001','e1000000-0000-0000-0000-000000000001', NOW()-INTERVAL '1 year',    NOW()+INTERVAL '4 years',   'a_jour'),
  ('a1000000-0000-0000-0000-000000000005','DTC-Hep B+Hib',                 '3/3',   'DTCHIB-BJ-501',   'IM',   '9a000000-0000-0000-0000-000000000002','e1000000-0000-0000-0000-000000000002', NOW()-INTERVAL '2 years',   NULL,                        'a_jour'),
  ('a1000000-0000-0000-0000-000000000005','Vaccin antipolio oral (VPO)',   '4/4',   'OPV-BJ-892',      'oral', '9a000000-0000-0000-0000-000000000002','e1000000-0000-0000-0000-000000000002', NOW()-INTERVAL '1 year',    NULL,                        'a_jour'),
  ('a1000000-0000-0000-0000-000000000005','ROR (rougeole, oreillons, rubéole)','2/2','ROR-BJ-445',     'SC',   '9a000000-0000-0000-0000-000000000002','e1000000-0000-0000-0000-000000000002', NOW()-INTERVAL '8 months',  NOW()+INTERVAL '3 years',   'a_jour')
ON CONFLICT DO NOTHING;

-- ============================================================
-- HOSPITALISATIONS
-- ============================================================
INSERT INTO hospitalisations (id, patient_id, etablissement_id, medecin_referent_id, date_entree, date_sortie,
  service, motif, resume_sejour, mode_sortie, diagnostic_entree, diagnostic_sortie, chambre, lit) VALUES
  ('9c000000-0000-0000-0000-000000000001',
   'a1000000-0000-0000-0000-000000000003','e1000000-0000-0000-0000-000000000001','9a000000-0000-0000-0000-000000000001',
   NOW()-INTERVAL '4 months', NOW()-INTERVAL '4 months'+INTERVAL '5 days',
   'Médecine interne', 'Crise vaso-occlusive sévère — douleurs résistantes aux antalgiques oraux',
   'Hospitalisé 5 jours. Morphine IV efficace. Hb stabilisée à 8,5 g/dL. Sortie sous Hydroxyurée 500mg/j + acide folique.',
   'domicile', 'Crise vaso-occlusive sévère (D57)', 'Résolution de crise — sortie sous traitement de fond',
   'B12', 'L3'),

  ('9c000000-0000-0000-0000-000000000002',
   'a1000000-0000-0000-0000-000000000004','e1000000-0000-0000-0000-000000000002','9a000000-0000-0000-0000-000000000002',
   NOW()-INTERVAL '1 year 2 months', NOW()-INTERVAL '1 year 2 months'+INTERVAL '2 days',
   'Urgences', 'Choc anaphylactique — ingestion accidentelle d''arachides',
   'Adrénaline 0,5mg IM, O2, remplissage, corticoïdes IV. Évolution favorable en 24h. Prescription EpiPen + éducation.',
   'domicile', 'Choc anaphylactique sévère (T78.0)', 'Stabilisation — sortie avec kit adrénaline',
   'U02', 'L1')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- RÉACTIVATION DES FK
-- ============================================================
RESET session_replication_role;

-- Vérification finale
DO $$
DECLARE
  nb_etab INT; nb_users INT; nb_pat INT; nb_cons INT;
  nb_presc INT; nb_ana INT; nb_vacc INT; nb_hospit INT;
BEGIN
  SELECT COUNT(*) INTO nb_etab  FROM etablissements;
  SELECT COUNT(*) INTO nb_users FROM users_profiles;
  SELECT COUNT(*) INTO nb_pat   FROM patients;
  SELECT COUNT(*) INTO nb_cons  FROM consultations;
  SELECT COUNT(*) INTO nb_presc FROM prescriptions;
  SELECT COUNT(*) INTO nb_ana   FROM analyses_prescrites;
  SELECT COUNT(*) INTO nb_vacc  FROM vaccinations;
  SELECT COUNT(*) INTO nb_hospit FROM hospitalisations;
  RAISE NOTICE '=== MediLink Seed OK ===';
  RAISE NOTICE 'Établissements : %  |  Utilisateurs : %  |  Patients : %', nb_etab, nb_users, nb_pat;
  RAISE NOTICE 'Consultations : %   |  Prescriptions : %  |  Analyses : %', nb_cons, nb_presc, nb_ana;
  RAISE NOTICE 'Vaccinations : %    |  Hospitalisations : %', nb_vacc, nb_hospit;
END $$;
