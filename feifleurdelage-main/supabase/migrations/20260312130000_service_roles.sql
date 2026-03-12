-- ──────────────────────────────────────────────────────────────
-- Système de services et rôles par service
-- ──────────────────────────────────────────────────────────────

-- 1. Étendre l'enum app_role avec 'responsable'
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'responsable';

-- 2. Ajouter la colonne service à user_roles (nullable)
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS service TEXT;

-- 3. Ajouter le service aux FEI et Plaintes
ALTER TABLE public.fei      ADD COLUMN IF NOT EXISTS service TEXT;
ALTER TABLE public.plaintes ADD COLUMN IF NOT EXISTS service TEXT;

-- 4. Fonction helper : retourne le service d'un responsable
CREATE OR REPLACE FUNCTION public.get_user_service(uid UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT service
  FROM public.user_roles
  WHERE user_id = uid AND role = 'responsable'
  LIMIT 1;
$$;

-- 5. Suppression des anciennes politiques permissives
DROP POLICY IF EXISTS "Authenticated users can view all FEI"    ON public.fei;
DROP POLICY IF EXISTS "Users can update own FEI"                ON public.fei;
DROP POLICY IF EXISTS "Authenticated users can view all plaintes" ON public.plaintes;
DROP POLICY IF EXISTS "Users can update own plaintes"           ON public.plaintes;

-- 6. Nouvelles politiques FEI ─────────────────────────────────

-- SELECT : admin voit tout | responsable voit son service | agent voit ses propres fiches
CREATE POLICY "FEI select policy" ON public.fei
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR (
      has_role(auth.uid(), 'responsable'::app_role)
      AND service = get_user_service(auth.uid())
    )
    OR user_id = auth.uid()
  );

-- UPDATE : admin et responsable (sur leur service) peuvent gérer ; agent modifie ses propres fiches
CREATE POLICY "FEI update policy" ON public.fei
  FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR (
      has_role(auth.uid(), 'responsable'::app_role)
      AND service = get_user_service(auth.uid())
    )
    OR user_id = auth.uid()
  );

-- DELETE : admin uniquement
CREATE POLICY "FEI delete policy" ON public.fei
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 7. Nouvelles politiques Plaintes ───────────────────────────

CREATE POLICY "Plaintes select policy" ON public.plaintes
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR (
      has_role(auth.uid(), 'responsable'::app_role)
      AND service = get_user_service(auth.uid())
    )
    OR user_id = auth.uid()
  );

CREATE POLICY "Plaintes update policy" ON public.plaintes
  FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR (
      has_role(auth.uid(), 'responsable'::app_role)
      AND service = get_user_service(auth.uid())
    )
    OR user_id = auth.uid()
  );

CREATE POLICY "Plaintes delete policy" ON public.plaintes
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
