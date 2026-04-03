-- Table des domaines d'indicateurs (système + personnalisés)
CREATE TABLE IF NOT EXISTS indicateurs_domaines (
  slug        TEXT        PRIMARY KEY,
  label       TEXT        NOT NULL,
  ordre       INTEGER     NOT NULL DEFAULT 0,
  is_system   BOOLEAN     NOT NULL DEFAULT false,
  acces_roles TEXT[]      NOT NULL DEFAULT '{}',
  created_by  UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE indicateurs_domaines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_indicateurs_domaines"
  ON indicateurs_domaines FOR ALL
  USING (true) WITH CHECK (true);

-- Seed des 7 domaines système (correspond à DOMAINE_ACCESS dans le front)
INSERT INTO indicateurs_domaines (slug, label, ordre, is_system, acces_roles)
VALUES
  ('animation',   'Animation',     1, true, ARRAY['animatrice', 'animation']),
  ('ergo',        'Ergothérapie',  2, true, ARRAY['ergothérapeute', 'ergo']),
  ('locaux',      'Locaux',        3, true, ARRAY['hôtellerie', 'ash', 'locaux']),
  ('psy',         'Psychologue',   4, true, ARRAY['psychologue', 'psy']),
  ('medecin',     'Médecin co.',   5, true, ARRAY['médecin', 'medecin_co']),
  ('rh_admin',    'RH & Admin',    6, true, ARRAY[]::TEXT[]),
  ('personnalise','Personnalisé',  7, true, ARRAY[]::TEXT[])
ON CONFLICT (slug) DO NOTHING;
