-- Catégories de documents
CREATE TABLE classeur_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  ordre INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Procédures / documents (pdf_path = chemin relatif dans public/classeur-documentaire/)
CREATE TABLE classeur_procedures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categorie_id UUID NOT NULL REFERENCES classeur_categories(id) ON DELETE CASCADE,
  titre TEXT NOT NULL,
  description TEXT,
  pdf_filename TEXT NOT NULL,
  services TEXT[] DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Émargements individuels
CREATE TABLE classeur_emargements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  procedure_id UUID NOT NULL REFERENCES classeur_procedures(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  emarge_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(procedure_id, user_id)
);

-- RLS
ALTER TABLE classeur_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE classeur_procedures ENABLE ROW LEVEL SECURITY;
ALTER TABLE classeur_emargements ENABLE ROW LEVEL SECURITY;

-- Lecture : tous les authentifiés
CREATE POLICY "Lecture categories" ON classeur_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Lecture procedures" ON classeur_procedures FOR SELECT TO authenticated USING (true);
CREATE POLICY "Lecture emargements" ON classeur_emargements FOR SELECT TO authenticated USING (true);

-- Écriture catégories et procédures : admin et responsable uniquement
CREATE POLICY "Ecriture categories" ON classeur_categories FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'responsable')));
CREATE POLICY "Ecriture procedures" ON classeur_procedures FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'responsable')));

-- Émargement : chaque agent pour lui-même uniquement
CREATE POLICY "Insert emargements" ON classeur_emargements FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
