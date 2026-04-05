-- Table d'historique des imports de mandats
CREATE TABLE IF NOT EXISTS mandats_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom_fichier text NOT NULL,
  annee integer,
  nb_lignes integer,
  montant_total numeric,
  imported_at timestamptz DEFAULT now(),
  imported_by uuid REFERENCES profiles(id)
);

ALTER TABLE mandats_imports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mandats_imports_auth" ON mandats_imports;
CREATE POLICY "mandats_imports_auth" ON mandats_imports
  FOR ALL USING (auth.role() = 'authenticated');

-- Colonne import_id sur mandats (CASCADE supprime les mandats liés à un import supprimé)
ALTER TABLE mandats ADD COLUMN IF NOT EXISTS import_id uuid REFERENCES mandats_imports(id) ON DELETE CASCADE;
