-- Ajout des champs de gestion admin sur la table plaintes (alignement avec la table fei)

ALTER TABLE public.plaintes
  ADD COLUMN IF NOT EXISTS "analyse"        TEXT,
  ADD COLUMN IF NOT EXISTS plan_action      TEXT,
  ADD COLUMN IF NOT EXISTS actions_correctives TEXT,
  ADD COLUMN IF NOT EXISTS retour_declarant TEXT,
  ADD COLUMN IF NOT EXISTS managed_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS managed_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS date_cloture     DATE;

COMMENT ON COLUMN public.plaintes.analyse           IS 'Analyse admin de la réclamation';
COMMENT ON COLUMN public.plaintes.plan_action       IS 'Plan d''action admin';
COMMENT ON COLUMN public.plaintes.actions_correctives IS 'Actions correctives mises en place (admin)';
COMMENT ON COLUMN public.plaintes.retour_declarant  IS 'Message de retour au déclarant (admin)';
COMMENT ON COLUMN public.plaintes.managed_by        IS 'UUID de l''admin qui a traité la réclamation';
COMMENT ON COLUMN public.plaintes.managed_at        IS 'Date/heure de la dernière modification admin';
COMMENT ON COLUMN public.plaintes.date_cloture      IS 'Date de clôture de la réclamation';
