-- 026 - Pharmacie Fidjrosse & rattachements pharmaciens
--
-- 1. Cree les etablissements de type pharmacie (idempotent)
-- 2. Rattache tous les pharmaciens sans pharmacie a Fidjrosse
-- 3. Met a jour etablissement_id principal si necessaire
-- 4. Rattachement specifique Christelle APLOGAN (si compte existant)
-- 5. Ajoute du stock demo dans les deux pharmacies

-- 1. Etablissements pharmacie

INSERT INTO etablissements (id, nom, type, ville, region, pays, adresse, telephone)
VALUES
  (
    'e1000000-0000-0000-0000-000000000005',
    'Pharmacie Fidjrosse',
    'pharmacie',
    'Cotonou', 'Littoral', 'Benin',
    'Carrefour Fidjrosse, Cotonou',
    '+229 21 32 55 66'
  ),
  (
    'e1000000-0000-0000-0000-000000000006',
    'Pharmacie Centrale de Cotonou',
    'pharmacie',
    'Cotonou', 'Littoral', 'Benin',
    'Avenue Steinmetz, Cotonou',
    '+229 21 31 22 11'
  )
ON CONFLICT (id) DO UPDATE SET
  nom       = EXCLUDED.nom,
  type      = EXCLUDED.type,
  adresse   = EXCLUDED.adresse,
  telephone = EXCLUDED.telephone;

-- 2. Rattachement : pharmaciens sans aucune pharmacie liee -> Fidjrosse

INSERT INTO user_etablissements (user_id, etablissement_id)
SELECT up.id, 'e1000000-0000-0000-0000-000000000005'
FROM users_profiles up
WHERE up.role = 'pharmacien'
  AND NOT EXISTS (
    SELECT 1
    FROM user_etablissements ue
    INNER JOIN etablissements e ON e.id = ue.etablissement_id
    WHERE ue.user_id = up.id
      AND e.type = 'pharmacie'
      AND ue.suspended_at IS NULL
      AND e.deleted_at IS NULL
  )
ON CONFLICT (user_id, etablissement_id) DO NOTHING;

-- 3. Corriger etablissement_id principal pour les pharmaciens pointes vers non-pharmacie

UPDATE users_profiles
SET etablissement_id = 'e1000000-0000-0000-0000-000000000005'
WHERE role = 'pharmacien'
  AND NOT EXISTS (
    SELECT 1
    FROM etablissements e
    WHERE e.id = users_profiles.etablissement_id
      AND e.type = 'pharmacie'
  );

-- 4. Rattachement specifique APLOGAN Christelle (si le compte existe deja)

INSERT INTO user_etablissements (user_id, etablissement_id)
SELECT id, 'e1000000-0000-0000-0000-000000000005'
FROM users_profiles
WHERE nom = 'APLOGAN'
  AND prenom = 'Christelle'
  AND role = 'pharmacien'
ON CONFLICT (user_id, etablissement_id) DO NOTHING;

UPDATE users_profiles
SET
  etablissement_id = 'e1000000-0000-0000-0000-000000000005',
  numero_ordre = COALESCE(numero_ordre, 'OP-BJ-2014-0017')
WHERE nom = 'APLOGAN'
  AND prenom = 'Christelle'
  AND role = 'pharmacien';

-- 5. Stock demo - Pharmacie Fidjrosse

INSERT INTO stock_medicaments
  (pharmacie_id, medicament_dci, medicament_commercial, forme, unite, quantite_stock, seuil_alerte, date_peremption)
VALUES
  ('e1000000-0000-0000-0000-000000000005', 'Amoxicilline',          'Clamoxyl 500mg',   'gelule',       'gelule',    240, 30, '2026-08-01'),
  ('e1000000-0000-0000-0000-000000000005', 'Paracetamol',           'Doliprane 1000mg', 'comprime',     'comprime',  500, 50, '2027-03-01'),
  ('e1000000-0000-0000-0000-000000000005', 'Ibuprofene',            'Advil 400mg',      'comprime',     'comprime',    8, 20, '2026-12-01'),
  ('e1000000-0000-0000-0000-000000000005', 'Metformine',            'Glucophage 850mg', 'comprime',     'comprime',  180, 30, '2026-06-01'),
  ('e1000000-0000-0000-0000-000000000005', 'Amlodipine',            'Amlor 5mg',        'comprime',     'comprime',   15, 20, '2027-01-01'),
  ('e1000000-0000-0000-0000-000000000005', 'Cotrimoxazole',         'Bactrim Forte',    'comprime',     'comprime',  120, 30, '2026-09-01'),
  ('e1000000-0000-0000-0000-000000000005', 'Artemether/Lumefantrine','Coartem 20/120mg','comprime',     'plaquette',   5, 10, '2025-12-31'),
  ('e1000000-0000-0000-0000-000000000005', 'Serum physiologique',   NULL,               'solution inj.','flacon',      0,  5, '2026-04-15'),
  ('e1000000-0000-0000-0000-000000000005', 'Omeprazole',            'Mopral 20mg',      'gelule',       'gelule',    200, 30, '2027-02-01'),
  ('e1000000-0000-0000-0000-000000000005', 'Diclofenac',            'Voltarene 50mg',   'comprime',     'comprime',   60, 20, '2026-11-01')
ON CONFLICT DO NOTHING;

-- 6. Stock demo - Pharmacie Centrale

INSERT INTO stock_medicaments
  (pharmacie_id, medicament_dci, medicament_commercial, forme, unite, quantite_stock, seuil_alerte, date_peremption)
VALUES
  ('e1000000-0000-0000-0000-000000000006', 'Paracetamol',  'Efferalgan 500mg', 'comprime eff.', 'comprime', 300, 50, '2027-01-01'),
  ('e1000000-0000-0000-0000-000000000006', 'Amoxicilline', 'Amoxil 250mg',     'sirop',         'flacon',    40, 10, '2026-07-01'),
  ('e1000000-0000-0000-0000-000000000006', 'Chloroquine',  'Nivaquine 100mg',  'comprime',      'comprime', 150, 30, '2026-10-01')
ON CONFLICT DO NOTHING;
