alter table public.flood_reports
  add column if not exists report_type text not null default 'flood'
  check (report_type in ('flood', 'river'));
