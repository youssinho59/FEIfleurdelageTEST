
-- Allow admins to update any FEI (not just their own)
CREATE POLICY "Admins can update any FEI"
ON public.fei
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
