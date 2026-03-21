-- Mise à jour des valeurs IMU existantes : remplacement du préfixe NPI- par IMU-
-- Concerne tous les patients dont l'IMU commence encore par l'ancien préfixe NPI-

UPDATE patients
SET imu = REPLACE(imu, 'NPI-', 'IMU-')
WHERE imu LIKE 'NPI-%';
