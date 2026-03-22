-- 019_type_polyclinique.sql
-- Ajoute 'polyclinique' comme type d'établissement valide
ALTER TABLE etablissements DROP CONSTRAINT IF EXISTS etablissements_type_check;
ALTER TABLE etablissements
  ADD CONSTRAINT etablissements_type_check
  CHECK (type IN ('CHU', 'CSP', 'clinique', 'hopital', 'cabinet', 'pharmacie', 'polyclinique'));
