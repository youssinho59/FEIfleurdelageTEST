-- Ajout du champ précisions pour compléter la catégorie de plainte
ALTER TABLE public.plaintes ADD COLUMN IF NOT EXISTS precisions TEXT;
