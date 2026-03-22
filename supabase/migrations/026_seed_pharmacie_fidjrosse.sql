-- ============================================================
-- 026 — Pharmacie Fidjrossè & données démo pharmacien
--
-- Problème : la migration 004 (seed démo) ne contenait aucun
--   établissement de type 'pharmacie'. La pharmacienne ADJOVI Nadège
--   était rattachée à 'Clinique Internationale Cotonou' (type='clinique').
--   Résultat : le filtre `etablissements.type = 'pharmacie'` retournait
--   toujours [] et le système affichait "Aucune pharmacie rattachée".
--
-- Ce que fait cette migration :
--   1. Crée Pharmacie Fidjrossè (type='pharmacie')
--   2. Crée Pharmacie Centrale de Cotonou (type='pharmacie') — deuxième
--      pharmacie de démo pour tester le multi-établissement
--   3. Met à jour le rattachement d'ADJOVI Nadège vers Fidjrossè
--   4. Crée le profil démo de Christelle APLOGAN et la lie à Fidjrossè
--   5. Ajoute des articles de stock démo dans les deux pharmacies
-- ============================================================

-- ── 1. Établissements pharmacie ──────────────────────────────────────────────

INSERT INTO etablissements (id, nom, type, ville, region, pays, adresse, telephone)
VALUES
  ('e1000000-0000-0000-0000-000000000005',
   'Pharmacie Fidjrossè',
   'pharmacie',
   'Cotonou', 'Littoral', 'Bénin',
   'Carrefour Fidjrossè, Cotonou',
   '+229 21 32 55 66'),

  ('e1000000-0000-0000-0000-000000000006',
   'Pharmacie Centrale de Cotonou',
   'pharmacie',
   'Cotonou', 'Littoral', 'Bénin',
   'Avenue Steinmetz, Cotonou',
   '+229 21 31 22 11')
ON CONFLICT (id) DO UPDATE SET
  nom       = EXCLUDED.nom,
  type      = EXCLUDED.type,
  adresse   = EXCLUDED.adresse,
  telephone = EXCLUDED.telephone;

-- ── 2. Mise à jour du rattachement d'ADJOVI Nadège ───────────────────────────
-- Remplacer l'ancien lien vers la clinique par Pharmacie Fidjrossè

UPDATE users_profiles
   SET etablissement_id = 'e1000000-0000-0000-0000-000000000005'
 WHERE id = '9a000000-0000-0000-0000-000000000006';

-- Supprimer l'ancien lien clinique dans user_etablissements
DELETE FROM user_etablissements
 WHERE user_id         = '9a000000-0000-0000-0000-000000000006'
   AND etablissement_id = 'e1000000-0000-0000-0000-000000000003';

-- Insérer le bon lien pharmacie
INSERT INTO user_etablissements (user_id, etablissement_id)
VALUES ('9a000000-0000-0000-0000-000000000006', 'e1000000-0000-0000-0000-000000000005')
ON CONFLICT (user_id, etablissement_id) DO NOTHING;

-- ── 3. Profil démo Christelle APLOGAN ────────────────────────────────────────
-- Note : auth.users doit déjà contenir l'UUID correspondant.
-- Si l'utilisateur est créé via l'interface Supabase Auth, remplacer
-- '9a000000-0000-0000-0000-000000000008' par le vrai UUID.

INSERT INTO users_profiles (id, role, nom, prenom, specialite, etablissement_id, telephone, numero_ordre)
VALUES (
  '9a000000-0000-0000-0000-000000000008',
  'pharmacien',
  'APLOGAN',
  'Christelle',
  NULL,
  'e1000000-0000-0000-0000-000000000005',
  '+229 97 22 33 44',
  'OP-BJ-2014-0017'
)
ON CONFLICT (id) DO UPDATE SET
  role             = EXCLUDED.role,
  nom              = EXCLUDED.nom,
  prenom           = EXCLUDED.prenom,
  etablissement_id = EXCLUDED.etablissement_id,
  numero_ordre     = EXCLUDED.numero_ordre;

-- Rattachement Christelle ↔ Fidjrossè
INSERT INTO user_etablissements (user_id, etablissement_id)
VALUES ('9a000000-0000-0000-0000-000000000008', 'e1000000-0000-0000-0000-000000000005')
ON CONFLICT (user_id, etablissement_id) DO NOTHING;

-- ── 4. Stock démo — Pharmacie Fidjrossè ──────────────────────────────────────

INSERT INTO stock_medicaments
  (pharmacie_id, medicament_dci, medicament_commercial, forme, unite, quantite_stock, seuil_alerte, date_peremption)
VALUES
  ('e1000000-0000-0000-0000-000000000005', 'Amoxicilline',      'Clamoxyl 500mg',     'gélule',      'gélule',     240,  30, '2026-08-01'),
  ('e1000000-0000-0000-0000-000000000005', 'Paracétamol',       'Doliprane 1000mg',   'comprimé',    'comprimé',   500,  50, '2027-03-01'),
  ('e1000000-0000-0000-0000-000000000005', 'Ibuprofène',        'Advil 400mg',        'comprimé',    'comprimé',     8,  20, '2026-12-01'),
  ('e1000000-0000-0000-0000-000000000005', 'Metformine',        'Glucophage 850mg',   'comprimé',    'comprimé',   180,  30, '2026-06-01'),
  ('e1000000-0000-0000-0000-000000000005', 'Amlodipine',        'Amlor 5mg',          'comprimé',    'comprimé',    15,  20, '2027-01-01'),
  ('e1000000-0000-0000-0000-000000000005', 'Cotrimoxazole',     'Bactrim Forte',      'comprimé',    'comprimé',   120,  30, '2026-09-01'),
  ('e1000000-0000-0000-0000-000000000005', 'Artéméther/Luméf.', 'Coartem 20/120mg',   'comprimé',    'plaquette',    5,  10, '2025-12-31'),
  ('e1000000-0000-0000-0000-000000000005', 'Serum physiologique', NULL,               'solution inj.','flacon',     0,   5, '2026-04-15'),
  ('e1000000-0000-0000-0000-000000000005', 'Oméprazole',        'Mopral 20mg',        'gélule',      'gélule',     200,  30, '2027-02-01'),
  ('e1000000-0000-0000-0000-000000000005', 'Diclofénac',        'Voltarène 50mg',     'comprimé',    'comprimé',    60,  20, '2026-11-01')
ON CONFLICT DO NOTHING;

-- ── 5. Stock démo — Pharmacie Centrale ───────────────────────────────────────

INSERT INTO stock_medicaments
  (pharmacie_id, medicament_dci, medicament_commercial, forme, unite, quantite_stock, seuil_alerte, date_peremption)
VALUES
  ('e1000000-0000-0000-0000-000000000006', 'Paracétamol',       'Efferalgan 500mg',   'comprimé eff.','comprimé',  300, 50, '2027-01-01'),
  ('e1000000-0000-0000-0000-000000000006', 'Amoxicilline',      'Amoxil 250mg',       'sirop',       'flacon',      40, 10, '2026-07-01'),
  ('e1000000-0000-0000-0000-000000000006', 'Chloroquine',       'Nivaquine 100mg',    'comprimé',    'comprimé',   150, 30, '2026-10-01')
ON CONFLICT DO NOTHING;
