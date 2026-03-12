-- Ajout des champs de catégorisation FEI (Standard / FEIG / FEIGS) et déclaration ARS

ALTER TABLE public.fei
  ADD COLUMN IF NOT EXISTS categorie_fei TEXT NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS nature_evenement_ars TEXT,
  ADD COLUMN IF NOT EXISTS circonstances_ars TEXT,
  ADD COLUMN IF NOT EXISTS consequences_resident_ars TEXT,
  ADD COLUMN IF NOT EXISTS mesures_prises_ars TEXT,
  ADD COLUMN IF NOT EXISTS date_envoi_ars DATE,
  ADD COLUMN IF NOT EXISTS statut_ars TEXT DEFAULT NULL;

-- Commentaires sur les colonnes
COMMENT ON COLUMN public.fei.categorie_fei IS 'Catégorie de la FEI : standard | feig | feigs';
COMMENT ON COLUMN public.fei.nature_evenement_ars IS 'Nature de l''événement — champ réglementaire ARS (FEIGS uniquement)';
COMMENT ON COLUMN public.fei.circonstances_ars IS 'Circonstances — champ réglementaire ARS (FEIGS uniquement)';
COMMENT ON COLUMN public.fei.consequences_resident_ars IS 'Conséquences pour le résident — champ réglementaire ARS (FEIGS uniquement)';
COMMENT ON COLUMN public.fei.mesures_prises_ars IS 'Mesures prises — champ réglementaire ARS (FEIGS uniquement)';
COMMENT ON COLUMN public.fei.date_envoi_ars IS 'Date d''envoi de la déclaration à l''ARS (FEIGS uniquement)';
COMMENT ON COLUMN public.fei.statut_ars IS 'Statut de la déclaration ARS : a_declarer | declare (FEIGS uniquement)';
