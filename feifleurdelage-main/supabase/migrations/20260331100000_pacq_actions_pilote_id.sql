-- NOTE : la colonne pilote_id existe déjà dans pacq_strategique_actions
-- (migration 20260313100000) avec REFERENCES auth.users(id).
-- Ce fichier est un no-op conservé pour l'historique de migration.
-- La valeur stockée est auth.uid() du pilote sélectionné.
ALTER TABLE pacq_strategique_actions
ADD COLUMN IF NOT EXISTS pilote_id uuid;
