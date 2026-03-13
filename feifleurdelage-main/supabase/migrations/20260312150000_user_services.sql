-- ──────────────────────────────────────────────────────────────
-- Table user_services : multi-services par responsable
-- Remplace user_roles.service (une seule valeur) par N lignes.
-- ──────────────────────────────────────────────────────────────

-- 1. Créer la table
CREATE TABLE public.user_services (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service TEXT NOT NULL,
  UNIQUE (user_id, service)
);

ALTER TABLE public.user_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own services" ON public.user_services
  FOR SELECT USING (auth.uid() = user_id);

-- 2. Migrer les données existantes (un service par responsable → user_services)
INSERT INTO public.user_services (user_id, service)
SELECT user_id, service
FROM   public.user_roles
WHERE  role = 'responsable' AND service IS NOT NULL
ON CONFLICT DO NOTHING;

-- 3. Fonction helper SECURITY DEFINER
--    (bypass RLS pour éviter la récursivité dans les politiques)
CREATE OR REPLACE FUNCTION public.user_has_service(uid UUID, svc TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_services WHERE user_id = uid AND service = svc
  );
$$;

-- 4. Remplacer les politiques RLS FEI et Plaintes
--    (utilisation de user_has_service au lieu de get_user_service)
DROP POLICY IF EXISTS "FEI select policy"      ON public.fei;
DROP POLICY IF EXISTS "FEI update policy"      ON public.fei;
DROP POLICY IF EXISTS "FEI delete policy"      ON public.fei;
DROP POLICY IF EXISTS "Plaintes select policy" ON public.plaintes;
DROP POLICY IF EXISTS "Plaintes update policy" ON public.plaintes;
DROP POLICY IF EXISTS "Plaintes delete policy" ON public.plaintes;

CREATE POLICY "FEI select policy" ON public.fei
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR (has_role(auth.uid(), 'responsable'::app_role) AND user_has_service(auth.uid(), service))
    OR user_id = auth.uid()
  );

CREATE POLICY "FEI update policy" ON public.fei
  FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR (has_role(auth.uid(), 'responsable'::app_role) AND user_has_service(auth.uid(), service))
    OR user_id = auth.uid()
  );

CREATE POLICY "FEI delete policy" ON public.fei
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Plaintes select policy" ON public.plaintes
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR (has_role(auth.uid(), 'responsable'::app_role) AND user_has_service(auth.uid(), service))
    OR user_id = auth.uid()
  );

CREATE POLICY "Plaintes update policy" ON public.plaintes
  FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR (has_role(auth.uid(), 'responsable'::app_role) AND user_has_service(auth.uid(), service))
    OR user_id = auth.uid()
  );

CREATE POLICY "Plaintes delete policy" ON public.plaintes
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
