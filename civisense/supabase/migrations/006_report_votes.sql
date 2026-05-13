create table if not exists public.report_votes (
  id         uuid primary key default gen_random_uuid(),
  report_id  uuid not null references public.flood_reports(id) on delete cascade,
  voter_ip   text not null,
  action     text not null check (action in ('still_flooded', 'cleared')),
  created_at timestamptz not null default now(),
  unique (report_id, voter_ip)
);

create index if not exists report_votes_report_id_idx on public.report_votes (report_id);
create index if not exists report_votes_voter_ip_idx  on public.report_votes (voter_ip);

grant all on public.report_votes to service_role;
