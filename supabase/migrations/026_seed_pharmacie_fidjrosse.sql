-- ============================================================
-- 026 — Pharmacie Fidjrossè & rattachements pharmaciens
--
-- Corrections apportées :
--   1. Crée les établissements pharmacie (idempotent)
--   2. Rattache les pharmaciens existants à Fidjrossè
--      en cherchant par nom/rôle (pas par UUID fixe)
--      → résistant aux UUIDs variables selon l'environnement
--   3. Ajoute du stock démo dans les deux pharmacies
--
-- NOTE : cette migration ne crée PAS de nouveaux comptes utilisateur.
--   Pour rattacher Christelle APLOGAN, son compte doit d'abord être
--   créé via l'interface Supabase Auth (ou l'admin MediLink),
--   puis cette migration liera automatiquement son profil à Fidjrossè
--   via le lookup nom='APLOGAN' / prenom='Christelle'.
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

-- ── 2. Rattachement de tous les pharmaciens existants à Fidjrossè ─────────────
-- Pour chaque profil de rôle 'pharmacien' qui n'a pas encore de pharmacie
-- dans user_etablissements, on insère le lien vers Fidjrossè.
-- Si le pharmacien avait déjà un lien vers un autre établissement non-pharmacie
-- (ex: une clinique héritée de l'ancienne migration 010), on ajoute Fidjrossè
-- en plus — l'UI prend automatiquement la première pharmacie trouvée.

INSERT INTO user_etablissements (user_id, etablissement_id)
SELECT up.id, 'e1000000-0000-0000-0000-000000000005'
FROM users_profiles up
WHERE up.role = 'pharmacien'
  AND NOT EXISTS (
    SELECT 1
    FROM user_etablissements ue
    JOIN etablissements e ON e.id = ue.etablissement_id
    WHERE ue.user_id = up.id
      AND e.type     = 'pharmacie'
      AND ue.suspended_at IS NULL
  )
ON CONFLICT (user_id, etablissement_id) DO NOTHING;

-- ── 3. Mettre à jour etablissement_id principal pour les pharmaciens ──────────
-- S'assurer que users_profiles.etablissement_id pointe vers une pharmacie
-- pour ceux qui n'en avaient pas.

UPDATE users_profiles up
   SET etablissement_id = 'e1000000-0000-0000-0000-000000000005'
WHERE up.role = 'pharmacien'
  AND NOT EXISTS (
    SELECT 1 FROM etablissements e
    WHERE e.id   = up.etablissement_id
      AND e.type = 'pharmacie'
  );

-- ── 4. Rattachement spécifique Christelle APLOGAN (si le compte existe) ───────
-- Lookup par nom/prénom/rôle — fonctionne quel que soit l'UUID attribué
-- par Supabase Auth lors de la création du compte.

INSERT INTO user_etablissements (user_id, etablissement_id)
SELECT up.id, 'e1000000-0000-0000-0000-000000000005'
FROM users_profiles up
WHERE up.nom    = 'APLOGAN'
  AND up.prenom = 'Christelle'
  AND up.role   = 'pharmacien'
ON CONFLICT (user_id, etablissement_id) DO NOTHING;

UPDATE users_profiles
   SET etablissement_id = 'e1000000-0000-0000-0000-000000000005',
       numero_ordre     = COALESCE(numero_ordre, 'OP-BJ-2014-0017')
 WHERE nom    = 'APLOGAN'
   AND prenom = 'Christelle'
   AND role   = 'pharmacien';

-- ── 5. Stock démo — Pharmacie Fidjrossè ──────────────────────────────────────

INSERT INTO stock_medicaments
  (pharmacie_id, medicament_dci, medicament_commercial, forme, unite,
   quantite_stock, seuil_alerte, date_peremption)
VALUES
  ('e1000000-0000-0000-0000-000000000005', 'Amoxicilline',       'Clamoxyl 500mg',   'gélule',       'gélule',     240,  30, '2026-08-01'),
  ('e1000000-0000-0000-0000-000000000005', 'Paracétamol',        'Doliprane 1000mg', 'comprimé',     'comprimé',   500,  50, '2027-03-01'),
  ('e1000000-0000-0000-0000-000000000005', 'Ibuprofène',         'Advil 400mg',      'comprimé',     'comprimé',     8,  20, '2026-12-01'),
  ('e1000000-0000-0000-0000-000000000005', 'Metformine',         'Glucophage 850mg', 'comprimé',     'comprimé',   180,  30, '2026-06-01'),
  ('e1000000-0000-0000-0000-000000000005', 'Amlodipine',         'Amlor 5mg',        'comprimé',     'comprimé',    15,  20, '2027-01-01'),
  ('e1000000-0000-0000-0000-000000000005', 'Cotrimoxazole',      'Bactrim Forte',    'comprimé',     'comprimé',   120,  30, '2026-09-01'),
  ('e1000000-0000-0000-0000-000000000005', 'Artéméther/Luméf.',  'Coartem 20/120mg', 'comprimé',     'plaquette',    5,  10, '2025-12-31'),
  ('e1000000-0000-0000-0000-000000000005', 'Sérum physiologique', NULL,              'solution inj.','flacon',       0,   5, '2026-04-15'),
  ('e1000000-0000-0000-0000-000000000005', 'Oméprazole',         'Mopral 20mg',      'gélule',       'gélule',     200,  30, '2027-02-01'),
  ('e1000000-0000-0000-0000-000000000005', 'Diclofénac',         'Voltarène 50mg',   'comprimé',     'comprimé',    60,  20, '2026-11-01')
ON CONFLICT DO NOTHING;

-- ── 6. Stock démo — Pharmacie Centrale ───────────────────────────────────────

INSERT INTO stock_medicaments
  (pharmacie_id, medicament_dci, medicament_commercial, forme, unite,
   quantite_stock, seuil_alerte, date_peremption)
VALUES
  ('e1000000-0000-0000-0000-000000000006', 'Paracétamol',  'Efferalgan 500mg', 'comprimé eff.', 'comprimé', 300, 50, '2027-01-01'),
  ('e1000000-0000-0000-0000-000000000006', 'Amoxicilline', 'Amoxil 250mg',     'sirop',         'flacon',    40, 10, '2026-07-01'),
  ('e1000000-0000-0000-0000-000000000006', 'Chloroquine',  'Nivaquine 100mg',  'comprimé',      'comprimé', 150, 30, '2026-10-01')
ON CONFLICT DO NOTHING;
