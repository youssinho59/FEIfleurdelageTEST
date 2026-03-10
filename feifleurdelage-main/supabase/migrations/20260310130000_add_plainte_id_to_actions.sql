-- Ajout de la référence plainte dans actions_correctives
alter table public.actions_correctives
  add column plainte_id uuid references public.plaintes(id) on delete set null;
