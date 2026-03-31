-- Ajouter la colonne pilote_id pour lier les actions aux vrais utilisateurs
ALTER TABLE pacq_strategique_actions
ADD COLUMN IF NOT EXISTS pilote_id uuid REFERENCES profiles(id);
