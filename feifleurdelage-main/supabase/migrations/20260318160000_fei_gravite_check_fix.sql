-- Supprimer la contrainte existante
ALTER TABLE fei DROP CONSTRAINT IF EXISTS fei_gravite_check;

-- Rendre la colonne nullable
ALTER TABLE fei ALTER COLUMN gravite DROP NOT NULL;

-- Recréer la contrainte en autorisant null ou une valeur entre 1 et 5
ALTER TABLE fei ADD CONSTRAINT fei_gravite_check
  CHECK (gravite IS NULL OR (gravite >= 1 AND gravite <= 5));
