-- 1. Ajouter la colonne source en premier (référencée par la policy)
ALTER TABLE plaintes ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'interne';

-- 2. Activer RLS (idempotent si déjà activé)
ALTER TABLE plaintes ENABLE ROW LEVEL SECURITY;

-- 3. Autoriser les insertions anonymes pour les plaintes externes
CREATE POLICY "Insert anonyme plainte externe" ON plaintes
  FOR INSERT
  TO anon
  WITH CHECK (source = 'externe');
