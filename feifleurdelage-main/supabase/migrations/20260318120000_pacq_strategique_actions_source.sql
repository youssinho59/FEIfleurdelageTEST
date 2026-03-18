-- Ajout colonne source sur pacq_strategique_actions
ALTER TABLE pacq_strategique_actions ADD COLUMN IF NOT EXISTS source TEXT;
