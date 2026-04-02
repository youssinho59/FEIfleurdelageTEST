-- Table for custom indicators created from PACQ actions
CREATE TABLE IF NOT EXISTS indicateurs (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  domaine    TEXT        NOT NULL DEFAULT 'Personnalisé',
  label      TEXT        NOT NULL,
  unite      TEXT,
  valeur_cible TEXT,
  frequence  TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE indicateurs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON indicateurs USING (true) WITH CHECK (true);
