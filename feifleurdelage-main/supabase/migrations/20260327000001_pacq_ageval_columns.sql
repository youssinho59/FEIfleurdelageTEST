-- Migration: colonnes Ageval pour PACQ Stratégique
-- À exécuter AVANT les scripts seed ÉTAPE 1 et ÉTAPE 2

ALTER TABLE pacq_strategique_objectifs
  ADD COLUMN IF NOT EXISTS reference   text,
  ADD COLUMN IF NOT EXISTS intitule    text,
  ADD COLUMN IF NOT EXISTS theme       text,
  ADD COLUMN IF NOT EXISTS responsable text,
  ADD COLUMN IF NOT EXISTS priorite    text DEFAULT 'Normale',
  ADD COLUMN IF NOT EXISTS avancement  text DEFAULT 'Non initié',
  ADD COLUMN IF NOT EXISTS echeance    date;

ALTER TABLE pacq_strategique_actions
  ADD COLUMN IF NOT EXISTS intitule   text,
  ADD COLUMN IF NOT EXISTS pilote     text,
  ADD COLUMN IF NOT EXISTS priorite   text DEFAULT 'Normale',
  ADD COLUMN IF NOT EXISTS avancement text DEFAULT 'Non initié',
  ADD COLUMN IF NOT EXISTS echeance   date;
