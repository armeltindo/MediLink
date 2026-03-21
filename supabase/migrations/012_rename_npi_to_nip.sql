-- Rename NPI (Numéro Patient Identifiant) → NIP (Numéro d'Identification du Patient)

ALTER TABLE patients RENAME COLUMN npi TO nip;

DROP INDEX IF EXISTS idx_patients_npi;
CREATE INDEX idx_patients_nip ON patients(nip);
