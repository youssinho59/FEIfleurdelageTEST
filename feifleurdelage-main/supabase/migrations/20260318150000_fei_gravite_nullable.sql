-- Rendre la colonne gravite nullable (0 = non renseignée)
ALTER TABLE fei ALTER COLUMN gravite DROP NOT NULL;
ALTER TABLE fei ALTER COLUMN gravite SET DEFAULT 0;
