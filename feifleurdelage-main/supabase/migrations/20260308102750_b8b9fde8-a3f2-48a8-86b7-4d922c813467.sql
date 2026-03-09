
ALTER TABLE public.fei
  ADD COLUMN IF NOT EXISTS "analyse" text,
  ADD COLUMN IF NOT EXISTS plan_action text,
  ADD COLUMN IF NOT EXISTS retour_declarant text,
  ADD COLUMN IF NOT EXISTS date_cloture date,
  ADD COLUMN IF NOT EXISTS managed_by uuid,
  ADD COLUMN IF NOT EXISTS managed_at timestamp with time zone;
