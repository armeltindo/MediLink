-- MediLink — Données de démonstration
-- 5 patients fictifs complets avec historique médical réaliste

-- ============================================================
-- ÉTABLISSEMENTS
-- ============================================================
INSERT INTO etablissements (id, nom, type, ville, region, pays, adresse, telephone) VALUES
  ('e1000000-0000-0000-0000-000000000001', 'CHU de Cocody', 'CHU', 'Abidjan', 'Lagunes', 'Côte d''Ivoire', 'Rue des Jardins, Cocody', '+225 27 22 44 00 00'),
  ('e1000000-0000-0000-0000-000000000002', 'Centre de Santé de Marcory', 'CSP', 'Abidjan', 'Lagunes', 'Côte d''Ivoire', 'Avenue 16, Marcory', '+225 27 21 35 00 00'),
  ('e1000000-0000-0000-0000-000000000003', 'Clinique Sainte-Marie', 'clinique', 'Abidjan', 'Lagunes', 'Côte d''Ivoire', 'Boulevard de la Corniche', '+225 27 22 41 00 00'),
  ('e1000000-0000-0000-0000-000000000004', 'Hôpital Général de Bouaké', 'hopital', 'Bouaké', 'Vallée du Bandama', 'Côte d''Ivoire', 'Avenue de la Paix', '+225 27 31 63 00 00');

-- Note: Les utilisateurs doivent être créés via Supabase Auth
-- Le seed ci-dessous assume que les UUIDs des utilisateurs demo sont connus
-- En production, utiliser les scripts de création de compte

-- ============================================================
-- PATIENTS FICTIFS (sans dépendance sur auth.users pour le seed initial)
-- Les patients seront créés via l'interface avec created_by réel
-- ============================================================

-- Patient 1: Konan Kouassi Yao — Diabétique type 2, HTA
INSERT INTO patients (id, npi, nom, prenom, date_naissance, lieu_naissance, sexe, situation_matrimoniale, nombre_enfants, groupe_sanguin, rhesus, nationalite, profession, niveau_etudes, langue_preferee, contact_urgence_nom, contact_urgence_lien, contact_urgence_tel, assurance_organisme, assurance_numero, assurance_taux) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'NPI-2024-004821', 'KONAN', 'Kouassi Yao', '1968-03-15', 'Bouaké', 'M', 'marié', 3, 'A', '+', 'Ivoirienne', 'Comptable', 'Licence', 'Français', 'Konan Marie-Claire', 'Épouse', '+225 07 00 11 22 33', 'CNPS', 'CNPS-2024-00981', 80.00),
  ('a1000000-0000-0000-0000-000000000002', 'NPI-2024-007340', 'BAMBA', 'Fatoumata', '1985-07-22', 'Korhogo', 'F', 'mariée', 4, 'O', '+', 'Ivoirienne', 'Infirmière libérale', 'BTS', 'Français', 'Bamba Seydou', 'Mari', '+225 05 00 22 33 44', 'MUGEF-CI', 'MUGEF-2023-05521', 75.00),
  ('a1000000-0000-0000-0000-000000000003', 'NPI-2024-009156', 'TRAORE', 'Ibrahima', '1952-11-08', 'Man', 'M', 'marié', 6, 'B', '-', 'Ivoirienne', 'Retraité', 'Primaire', 'Français', 'Traoré Aminata', 'Fille', '+225 01 00 33 44 55', NULL, NULL, NULL),
  ('a1000000-0000-0000-0000-000000000004', 'NPI-2025-001243', 'KOUAKOU', 'Ahou Bernadette', '1995-01-30', 'Abidjan', 'F', 'célibataire', 1, 'AB', '+', 'Ivoirienne', 'Étudiante', 'Master', 'Français', 'Kouakou Paul', 'Père', '+225 07 00 44 55 66', 'CNPS', 'CNPS-2025-01102', 60.00),
  ('a1000000-0000-0000-0000-000000000005', 'NPI-2025-003877', 'N''GORAN', 'Koffi Emmanuel', '2019-05-12', 'Abidjan', 'M', NULL, 0, 'O', '+', 'Ivoirienne', NULL, NULL, 'Français', 'N''Goran Marie', 'Mère', '+225 07 00 55 66 77', 'AMU', 'AMU-2025-00412', 100.00);

-- ============================================================
-- ANTÉCÉDENTS
-- ============================================================
-- Patient 1 — Konan (Diabète T2, HTA)
INSERT INTO antecedents (patient_id, categorie, description, date_debut, actif, cim10_code, created_by)
SELECT 'a1000000-0000-0000-0000-000000000001', 'medical', 'Diabète sucré de type 2', '2015-03-01', TRUE, 'E11', id
FROM auth.users LIMIT 1;

INSERT INTO antecedents (patient_id, categorie, description, date_debut, actif, cim10_code, created_by)
SELECT 'a1000000-0000-0000-0000-000000000001', 'medical', 'Hypertension artérielle essentielle', '2018-06-15', TRUE, 'I10', id
FROM auth.users LIMIT 1;

INSERT INTO antecedents (patient_id, categorie, description, date_debut, date_fin, actif, cim10_code, created_by)
SELECT 'a1000000-0000-0000-0000-000000000001', 'chirurgical', 'Appendicectomie', '2003-08-20', '2003-08-20', FALSE, 'K35', id
FROM auth.users LIMIT 1;

-- Patient 2 — Bamba Fatoumata (VIH, paludisme récurrent)
INSERT INTO antecedents (patient_id, categorie, description, date_debut, actif, cim10_code, created_by)
SELECT 'a1000000-0000-0000-0000-000000000002', 'medical', 'Infection VIH, sous traitement ARV', '2019-01-10', TRUE, 'B24', id
FROM auth.users LIMIT 1;

INSERT INTO antecedents (patient_id, categorie, description, date_debut, actif, cim10_code, created_by)
SELECT 'a1000000-0000-0000-0000-000000000002', 'obstetrical', 'G4P4 — 4 grossesses, 4 accouchements normaux, aucune complication', '2024-01-01', FALSE, 'Z34', id
FROM auth.users LIMIT 1;

-- Patient 3 — Traoré Ibrahima (Drépanocytose, insuffisance rénale)
INSERT INTO antecedents (patient_id, categorie, description, date_debut, actif, cim10_code, created_by)
SELECT 'a1000000-0000-0000-0000-000000000003', 'medical', 'Drépanocytose SS homozygote', '1960-01-01', TRUE, 'D57', id
FROM auth.users LIMIT 1;

INSERT INTO antecedents (patient_id, categorie, description, date_debut, actif, cim10_code, created_by)
SELECT 'a1000000-0000-0000-0000-000000000003', 'medical', 'Maladie rénale chronique stade 3', '2020-05-01', TRUE, 'N18', id
FROM auth.users LIMIT 1;

INSERT INTO antecedents (patient_id, categorie, description, date_debut, actif, cim10_code, created_by)
SELECT 'a1000000-0000-0000-0000-000000000003', 'traumatologique', 'Fracture du fémur droit (AVC — accident de route 2010)', '2010-07-14', FALSE, 'S72', id
FROM auth.users LIMIT 1;

-- Patient 4 — Kouakou Ahou (Asthme, dépression)
INSERT INTO antecedents (patient_id, categorie, description, date_debut, actif, cim10_code, created_by)
SELECT 'a1000000-0000-0000-0000-000000000004', 'medical', 'Asthme persistant modéré', '2008-01-01', TRUE, 'J45', id
FROM auth.users LIMIT 1;

INSERT INTO antecedents (patient_id, categorie, description, date_debut, actif, cim10_code, created_by)
SELECT 'a1000000-0000-0000-0000-000000000004', 'psychiatrique', 'Épisode dépressif majeur — rémission partielle', '2023-03-01', TRUE, 'F32', id
FROM auth.users LIMIT 1;

-- ============================================================
-- ANTÉCÉDENTS FAMILIAUX
-- ============================================================
INSERT INTO antecedents_familiaux (patient_id, parent, pathologie, statut_vital, cause_deces, age_deces) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'pere', 'Diabète de type 2, HTA', 'decede', 'Infarctus du myocarde', 72),
  ('a1000000-0000-0000-0000-000000000001', 'mere', 'Hypertension artérielle', 'vivant', NULL, NULL),
  ('a1000000-0000-0000-0000-000000000001', 'frere', 'Diabète de type 2', 'vivant', NULL, NULL),
  ('a1000000-0000-0000-0000-000000000003', 'pere', 'Drépanocytose trait (AS)', 'decede', 'Paludisme grave', 65),
  ('a1000000-0000-0000-0000-000000000003', 'mere', 'Drépanocytose trait (AS)', 'decede', 'Insuffisance cardiaque', 70),
  ('a1000000-0000-0000-0000-000000000004', 'mere', 'Asthme, allergie aux arachides', 'vivant', NULL, NULL),
  ('a1000000-0000-0000-0000-000000000004', 'gp_paternel', 'Cancer du côlon', 'decede', 'Cancer du côlon', 68);

-- ============================================================
-- HABITUDES DE VIE
-- ============================================================
INSERT INTO habitudes_vie (patient_id, tabac, alcool, activite_physique, alimentation, eau_potable, electricite, assainissement) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'ex_fumeur', 'occasionnel', 'sedentaire', 'Régime diabétique pauvre en sucre', TRUE, TRUE, TRUE),
  ('a1000000-0000-0000-0000-000000000002', 'non_fumeur', 'non', 'moderee', 'Alimentation équilibrée', TRUE, TRUE, TRUE),
  ('a1000000-0000-0000-0000-000000000003', 'non_fumeur', 'non', 'sedentaire', 'Régime pauvre en sel', TRUE, FALSE, FALSE),
  ('a1000000-0000-0000-0000-000000000004', 'non_fumeur', 'occasionnel', 'moderee', 'Standard', TRUE, TRUE, TRUE),
  ('a1000000-0000-0000-0000-000000000005', 'non_fumeur', 'non', 'intense', 'Alimentation enfant — lait maternel sevré', TRUE, TRUE, TRUE);

-- ============================================================
-- ALLERGIES
-- ============================================================
INSERT INTO allergies (patient_id, substance, type, severite, reaction, date_decouverte, created_by)
SELECT 'a1000000-0000-0000-0000-000000000001', 'Pénicilline', 'medicamenteuse', 'moderee', 'Urticaire généralisée, prurit intense', '2010-04-15', id
FROM auth.users LIMIT 1;

INSERT INTO allergies (patient_id, substance, type, severite, reaction, date_decouverte, created_by)
SELECT 'a1000000-0000-0000-0000-000000000002', 'Sulfamides', 'medicamenteuse', 'moderee', 'Éruption cutanée maculopapuleuse', '2020-02-10', id
FROM auth.users LIMIT 1;

INSERT INTO allergies (patient_id, substance, type, severite, reaction, date_decouverte, created_by)
SELECT 'a1000000-0000-0000-0000-000000000004', 'Arachides', 'alimentaire', 'anaphylactique', 'Choc anaphylactique — hospitalisée urgences 2022', '2022-08-20', id
FROM auth.users LIMIT 1;

INSERT INTO allergies (patient_id, substance, type, severite, reaction, date_decouverte, created_by)
SELECT 'a1000000-0000-0000-0000-000000000004', 'Aspirine', 'medicamenteuse', 'moderee', 'Bronchospasme, aggravation asthme', '2015-05-01', id
FROM auth.users LIMIT 1;
