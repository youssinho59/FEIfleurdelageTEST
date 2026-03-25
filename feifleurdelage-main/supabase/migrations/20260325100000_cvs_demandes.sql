create table if not exists cvs_demandes (
  id uuid primary key default gen_random_uuid(),
  suivi_instance_id uuid references suivi_instances(id) on delete set null,
  date_reunion date not null,
  auteur text not null,
  categorie text not null default 'autre',
  description text not null,
  statut text not null default 'en_analyse',
  motif_refus text,
  action_proposee text,
  delai_prevu date,
  responsable text,
  ajoute_au_pacq boolean default false,
  pacq_action_id uuid,
  date_reponse_cvs date,
  compte_rendu_reunion text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table cvs_demandes enable row level security;

create policy "Authenticated users" on cvs_demandes
  for all using (auth.role() = 'authenticated');
