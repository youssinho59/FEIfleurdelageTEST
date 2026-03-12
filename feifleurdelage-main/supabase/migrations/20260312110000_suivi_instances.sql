-- Table de suivi de passage des FEI et Plaintes dans les instances (CSE, CVS, CODIR)

CREATE TABLE public.suivi_instances (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fei_id        UUID REFERENCES public.fei(id) ON DELETE CASCADE,
  plainte_id    UUID REFERENCES public.plaintes(id) ON DELETE CASCADE,
  cse_date      DATE,
  cvs_date      DATE,
  codir_date    DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Une ligne par FEI ou par Plainte (pas les deux en même temps)
  CONSTRAINT suivi_instances_source_check CHECK (
    (fei_id IS NOT NULL AND plainte_id IS NULL) OR
    (fei_id IS NULL AND plainte_id IS NOT NULL)
  ),
  CONSTRAINT suivi_instances_fei_unique     UNIQUE (fei_id),
  CONSTRAINT suivi_instances_plainte_unique UNIQUE (plainte_id)
);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.update_suivi_instances_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_suivi_instances_updated_at
  BEFORE UPDATE ON public.suivi_instances
  FOR EACH ROW EXECUTE FUNCTION public.update_suivi_instances_updated_at();

-- RLS
ALTER TABLE public.suivi_instances ENABLE ROW LEVEL SECURITY;

-- Les admins peuvent tout lire/écrire
CREATE POLICY "Admins peuvent lire suivi_instances"
  ON public.suivi_instances FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins peuvent insérer suivi_instances"
  ON public.suivi_instances FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins peuvent modifier suivi_instances"
  ON public.suivi_instances FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

COMMENT ON TABLE  public.suivi_instances          IS 'Suivi du passage des événements (FEI/Plaintes) dans les instances CSE, CVS, CODIR';
COMMENT ON COLUMN public.suivi_instances.cse_date   IS 'Date de présentation en CSE (Comité Social et Économique)';
COMMENT ON COLUMN public.suivi_instances.cvs_date   IS 'Date de présentation en CVS (Conseil de la Vie Sociale)';
COMMENT ON COLUMN public.suivi_instances.codir_date IS 'Date de présentation en CODIR (Comité de Direction)';
