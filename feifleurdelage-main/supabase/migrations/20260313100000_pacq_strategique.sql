-- Table des objectifs (les thématiques sont fixes dans le code)
CREATE TABLE pacq_strategique_objectifs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thematique TEXT NOT NULL,
  titre TEXT NOT NULL,
  ordre INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Table des actions
CREATE TABLE pacq_strategique_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objectif_id UUID NOT NULL REFERENCES pacq_strategique_objectifs(id) ON DELETE CASCADE,
  titre TEXT NOT NULL,
  description TEXT,
  pilote_id UUID REFERENCES auth.users(id),
  date_echeance DATE,
  statut TEXT DEFAULT 'en_cours' CHECK (statut IN ('en_cours', 'realise', 'abandonne')),
  ordre INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Table des indicateurs annuels
CREATE TABLE pacq_strategique_indicateurs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id UUID NOT NULL REFERENCES pacq_strategique_actions(id) ON DELETE CASCADE,
  annee INTEGER NOT NULL,
  commentaire TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(action_id, annee)
);

-- RLS
ALTER TABLE pacq_strategique_objectifs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pacq_strategique_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pacq_strategique_indicateurs ENABLE ROW LEVEL SECURITY;

-- Lecture pour tous les authentifiés
CREATE POLICY "Lecture objectifs" ON pacq_strategique_objectifs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Lecture actions" ON pacq_strategique_actions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Lecture indicateurs" ON pacq_strategique_indicateurs FOR SELECT TO authenticated USING (true);

-- Écriture pour admin et responsable uniquement (via user_roles)
CREATE POLICY "Ecriture objectifs" ON pacq_strategique_objectifs FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'responsable')));
CREATE POLICY "Ecriture actions" ON pacq_strategique_actions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'responsable')));
CREATE POLICY "Ecriture indicateurs" ON pacq_strategique_indicateurs FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'responsable')));
