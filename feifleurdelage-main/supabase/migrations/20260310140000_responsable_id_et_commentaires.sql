-- 1. Ajouter responsable_id (FK vers auth.users) dans actions_correctives
alter table public.actions_correctives
  add column responsable_id uuid references auth.users(id) on delete set null;

-- Politique : le responsable assigné peut aussi mettre à jour l'action
create policy "Assigned agent can update their action"
  on public.actions_correctives for update
  to authenticated
  using (auth.uid() = responsable_id);

-- 2. Table des commentaires d'actions
create table public.action_commentaires (
  id uuid primary key default gen_random_uuid(),
  action_id uuid references public.actions_correctives(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  auteur_nom text not null,
  contenu text not null,
  created_at timestamptz default now() not null
);

alter table public.action_commentaires enable row level security;

create policy "Authenticated users can view all comments"
  on public.action_commentaires for select
  to authenticated
  using (true);

create policy "Users can insert their own comments"
  on public.action_commentaires for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can delete their own comments"
  on public.action_commentaires for delete
  to authenticated
  using (auth.uid() = user_id);

create policy "Admins can delete any comment"
  on public.action_commentaires for delete
  to authenticated
  using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role = 'admin'
    )
  );
