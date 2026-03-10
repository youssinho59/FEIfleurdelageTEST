-- Table des actions correctives (PACQ)
create table public.actions_correctives (
  id uuid primary key default gen_random_uuid(),
  titre text not null,
  description text,
  responsable text not null,
  date_echeance date not null,
  priorite text not null default 'moyenne'
    check (priorite in ('haute', 'moyenne', 'faible')),
  statut text not null default 'a_faire'
    check (statut in ('a_faire', 'en_cours', 'realisee', 'evaluee')),
  fei_id uuid references public.fei(id) on delete set null,
  user_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Trigger updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger actions_correctives_updated_at
  before update on public.actions_correctives
  for each row execute function public.set_updated_at();

-- RLS
alter table public.actions_correctives enable row level security;

create policy "Authenticated users can view all actions"
  on public.actions_correctives for select
  to authenticated
  using (true);

create policy "Authenticated users can insert their own actions"
  on public.actions_correctives for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own actions"
  on public.actions_correctives for update
  to authenticated
  using (auth.uid() = user_id);

create policy "Admins can update any action"
  on public.actions_correctives for update
  to authenticated
  using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins can delete any action"
  on public.actions_correctives for delete
  to authenticated
  using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role = 'admin'
    )
  );

create policy "Users can delete their own actions"
  on public.actions_correctives for delete
  to authenticated
  using (auth.uid() = user_id);
