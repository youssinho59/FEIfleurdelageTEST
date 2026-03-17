CREATE TABLE questionnaire_satisfaction (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT DEFAULT 'externe' CHECK (source IN ('interne', 'externe')),
  repondant TEXT CHECK (repondant IN ('resident', 'famille', 'visiteur', 'autre')),
  nom_prenom TEXT,
  date_sejour DATE,
  service TEXT,

  note_accueil INTEGER CHECK (note_accueil BETWEEN 1 AND 5),
  note_soins INTEGER CHECK (note_soins BETWEEN 1 AND 5),
  note_restauration INTEGER CHECK (note_restauration BETWEEN 1 AND 5),
  note_proprete INTEGER CHECK (note_proprete BETWEEN 1 AND 5),
  note_communication INTEGER CHECK (note_communication BETWEEN 1 AND 5),
  note_globale INTEGER CHECK (note_globale BETWEEN 1 AND 5),

  points_positifs TEXT,
  points_ameliorer TEXT,
  suggestions TEXT,

  action_corrective_id UUID REFERENCES actions_correctives(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE questionnaire_satisfaction ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecture questionnaires" ON questionnaire_satisfaction FOR SELECT TO authenticated USING (true);
CREATE POLICY "Insert questionnaire anonyme" ON questionnaire_satisfaction FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Insert questionnaire auth" ON questionnaire_satisfaction FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Update questionnaire" ON questionnaire_satisfaction FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'responsable')));
