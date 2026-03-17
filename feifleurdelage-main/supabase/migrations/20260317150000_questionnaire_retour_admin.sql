-- Ajout colonnes retour administrateur sur les questionnaires de satisfaction
ALTER TABLE questionnaire_satisfaction
  ADD COLUMN IF NOT EXISTS retour_admin TEXT,
  ADD COLUMN IF NOT EXISTS retour_admin_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS retour_admin_by UUID REFERENCES auth.users(id);
