-- Ajout colonne retour_analyse sur suivi_instances
ALTER TABLE suivi_instances ADD COLUMN IF NOT EXISTS retour_analyse TEXT;
