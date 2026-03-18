-- Ajout colonnes source et service sur actions_correctives
ALTER TABLE actions_correctives ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE actions_correctives ADD COLUMN IF NOT EXISTS service TEXT;
