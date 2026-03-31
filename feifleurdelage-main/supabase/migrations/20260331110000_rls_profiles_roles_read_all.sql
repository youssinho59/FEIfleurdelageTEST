-- Permettre à tous les utilisateurs authentifiés de lire tous les profils
-- (nécessaire pour les listes déroulantes de pilotes, responsables, etc.)
CREATE POLICY "Authenticated users can view all profiles"
ON public.profiles FOR SELECT TO authenticated USING (true);

-- Permettre à tous les utilisateurs authentifiés de lire tous les rôles
-- (nécessaire pour grouper les utilisateurs par rôle dans les selects)
CREATE POLICY "Authenticated users can view all roles"
ON public.user_roles FOR SELECT TO authenticated USING (true);
