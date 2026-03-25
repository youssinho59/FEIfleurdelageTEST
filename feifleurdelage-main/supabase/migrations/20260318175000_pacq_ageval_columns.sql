-- Rollback du seed précédent
DELETE FROM pacq_strategique_actions;
DELETE FROM pacq_strategique_objectifs;

-- Ajout des colonnes Ageval sur pacq_strategique_objectifs
ALTER TABLE pacq_strategique_objectifs
  ADD COLUMN IF NOT EXISTS theme_has TEXT,
  ADD COLUMN IF NOT EXISTS reference TEXT,
  ADD COLUMN IF NOT EXISTS intitule_objectif TEXT,
  ADD COLUMN IF NOT EXISTS responsable TEXT,
  ADD COLUMN IF NOT EXISTS priorite TEXT,
  ADD COLUMN IF NOT EXISTS avancement TEXT,
  ADD COLUMN IF NOT EXISTS echeance DATE,
  ADD COLUMN IF NOT EXISTS sources TEXT[];

-- Ajout des colonnes Ageval sur pacq_strategique_actions
ALTER TABLE pacq_strategique_actions
  ADD COLUMN IF NOT EXISTS intitule_action TEXT,
  ADD COLUMN IF NOT EXISTS priorite TEXT,
  ADD COLUMN IF NOT EXISTS avancement TEXT,
  ADD COLUMN IF NOT EXISTS echeance DATE;
