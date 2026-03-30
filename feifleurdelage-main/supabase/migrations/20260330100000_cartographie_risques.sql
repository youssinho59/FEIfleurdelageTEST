-- Table cartographie des risques
CREATE TABLE IF NOT EXISTS cartographie_risques (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  categorie text NOT NULL,
  intitule_risque text NOT NULL,
  descriptif text,
  facteurs_favorisants text,
  mesures_en_place text,
  probabilite integer CHECK (probabilite BETWEEN 1 AND 5),
  gravite integer CHECK (gravite BETWEEN 1 AND 5),
  criticite_brute integer GENERATED ALWAYS AS (probabilite * gravite) STORED,
  niveau_maitrise integer CHECK (niveau_maitrise BETWEEN 1 AND 5),
  criticite_residuelle integer GENERATED ALWAYS AS (probabilite * gravite * niveau_maitrise) STORED,
  proposition_amelioration text,
  date_evaluation date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id)
);

ALTER TABLE cartographie_risques ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_full" ON cartographie_risques FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
