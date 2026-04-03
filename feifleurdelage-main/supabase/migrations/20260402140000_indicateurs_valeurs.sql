-- Table des valeurs mensuelles des indicateurs
CREATE TABLE IF NOT EXISTS indicateurs_valeurs (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  domaine               TEXT        NOT NULL,
  theme                 TEXT,
  indicateur            TEXT        NOT NULL,
  date_mois             DATE        NOT NULL,
  valeur                NUMERIC,
  action_corrective_id  UUID        REFERENCES actions_correctives(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ DEFAULT now()
);

-- Contrainte unique pour upsert (domaine, indicateur, date_mois)
CREATE UNIQUE INDEX IF NOT EXISTS indicateurs_valeurs_unique
  ON indicateurs_valeurs(domaine, indicateur, date_mois);

-- Ajout de la colonne action_corrective_id si la table existait déjà sans elle
ALTER TABLE indicateurs_valeurs
  ADD COLUMN IF NOT EXISTS action_corrective_id UUID REFERENCES actions_correctives(id) ON DELETE SET NULL;

ALTER TABLE indicateurs_valeurs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_indicateurs_valeurs"
  ON indicateurs_valeurs FOR ALL
  USING (true) WITH CHECK (true);
