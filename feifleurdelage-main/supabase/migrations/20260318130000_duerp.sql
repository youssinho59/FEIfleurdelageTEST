CREATE TABLE duerp_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  annee INTEGER NOT NULL,
  titre TEXT NOT NULL,
  date_validation DATE,
  statut TEXT DEFAULT 'en_cours' CHECK (statut IN ('en_cours', 'valide', 'archive')),
  fichier_nom TEXT,
  observations TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE duerp_risques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES duerp_versions(id) ON DELETE CASCADE,
  unite_travail TEXT NOT NULL,
  situation_dangereuse TEXT NOT NULL,
  dangers TEXT,
  personnes_exposees TEXT,
  probabilite INTEGER CHECK (probabilite BETWEEN 1 AND 4),
  gravite INTEGER CHECK (gravite BETWEEN 1 AND 4),
  criticite INTEGER GENERATED ALWAYS AS (probabilite * gravite) STORED,
  mesures_existantes TEXT,
  mesures_proposees TEXT,
  priorite TEXT DEFAULT 'moyenne' CHECK (priorite IN ('faible', 'moyenne', 'haute', 'critique')),
  action_corrective_id UUID REFERENCES actions_correctives(id) ON DELETE SET NULL,
  pacq_action_id UUID REFERENCES pacq_strategique_actions(id) ON DELETE SET NULL,
  statut TEXT DEFAULT 'ouvert' CHECK (statut IN ('ouvert', 'en_traitement', 'clos')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE duerp_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE duerp_risques ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecture DUERP" ON duerp_versions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Lecture risques DUERP" ON duerp_risques FOR SELECT TO authenticated USING (true);
CREATE POLICY "Ecriture DUERP" ON duerp_versions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'responsable')));
CREATE POLICY "Ecriture risques DUERP" ON duerp_risques FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'responsable')));
