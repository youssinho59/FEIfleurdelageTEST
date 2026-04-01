-- Table de liaison entre indicateurs et actions PACQ
CREATE TABLE IF NOT EXISTS indicateurs_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  indicateur_domaine TEXT NOT NULL,
  indicateur_label   TEXT NOT NULL,
  action_id          UUID NOT NULL REFERENCES actions_correctives(id) ON DELETE CASCADE,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS indicateurs_actions_unique
  ON indicateurs_actions(indicateur_domaine, indicateur_label, action_id);

ALTER TABLE indicateurs_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_indicateurs_actions"
  ON indicateurs_actions FOR ALL
  USING (true) WITH CHECK (true);
