
-- Fix FEI policies: drop restrictive, create permissive
DROP POLICY IF EXISTS "Authenticated users can view all FEI" ON public.fei;
DROP POLICY IF EXISTS "Users can create FEI" ON public.fei;
DROP POLICY IF EXISTS "Users can update own FEI" ON public.fei;

CREATE POLICY "Authenticated users can view all FEI"
ON public.fei FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create FEI"
ON public.fei FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own FEI"
ON public.fei FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Fix Plaintes policies
DROP POLICY IF EXISTS "Authenticated users can view all plaintes" ON public.plaintes;
DROP POLICY IF EXISTS "Users can create plaintes" ON public.plaintes;
DROP POLICY IF EXISTS "Users can update own plaintes" ON public.plaintes;

CREATE POLICY "Authenticated users can view all plaintes"
ON public.plaintes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create plaintes"
ON public.plaintes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own plaintes"
ON public.plaintes FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Fix Profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
