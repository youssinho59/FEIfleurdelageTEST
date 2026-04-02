-- Étendre indicateurs_actions pour le PACQ Stratégique
-- action_id peut désormais référencer actions_correctives OU pacq_strategique_actions

ALTER TABLE indicateurs_actions ADD COLUMN IF NOT EXISTS action_type TEXT NOT NULL DEFAULT 'operationnel';

-- Supprimer la contrainte FK (action_id doit rester polymorphe sur deux tables)
ALTER TABLE indicateurs_actions DROP CONSTRAINT IF EXISTS indicateurs_actions_action_id_fkey;

-- Recréer l'index unique en incluant action_type pour éviter les doublons inter-tables
DROP INDEX IF EXISTS indicateurs_actions_unique;
CREATE UNIQUE INDEX indicateurs_actions_unique
  ON indicateurs_actions(indicateur_domaine, indicateur_label, action_id, action_type);
