-- Correction de la politique RLS cartographie_risques
-- La migration 20260330100000 référençait profiles.role (inexistant).
-- Le rôle est dans la table user_roles.
DROP POLICY IF EXISTS "admin_full" ON cartographie_risques;

CREATE POLICY "admin_full" ON cartographie_risques FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));
