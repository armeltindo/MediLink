-- Rename NIP (Numéro d'Identification du Patient) → IMU (Identifiant Médical Unique)

ALTER TABLE patients RENAME COLUMN nip TO imu;

DROP INDEX IF EXISTS idx_patients_nip;
CREATE INDEX idx_patients_imu ON patients(imu);
