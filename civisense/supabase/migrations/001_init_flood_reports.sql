create extension if not exists postgis;

create table if not exists public.flood_reports (
  id uuid primary key default gen_random_uuid(),
  latitude double precision not null,
  longitude double precision not null,
  location geography(point, 4326) generated always as (
    st_setsrid(st_makepoint(longitude, latitude), 4326)::geography
  ) stored,
  severity text not null check (severity in ('light', 'moderate', 'severe')),
  status text not null default 'active' check (status in ('active', 'cleared', 'expired')),
  comment text not null check (char_length(comment) between 1 and 500),
  reporter_name text not null default 'Anonymous' check (char_length(reporter_name) between 1 and 80),
  photo_url text not null,
  confirmation_count integer not null default 1 check (confirmation_count >= 0),
  cleared_count integer not null default 0 check (cleared_count >= 0),
  last_confirmed_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '6 hours',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint flood_reports_bojongsoang_bbox check (
    latitude between -7.000 and -6.960
    and longitude between 107.610 and 107.650
  )
);

create index if not exists flood_reports_location_gist_idx
  on public.flood_reports using gist (location);

create index if not exists flood_reports_status_expires_idx
  on public.flood_reports (status, expires_at desc);

create index if not exists flood_reports_severity_created_idx
  on public.flood_reports (severity, created_at desc);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_flood_reports_updated_at on public.flood_reports;
create trigger touch_flood_reports_updated_at
before update on public.flood_reports
for each row execute function public.touch_updated_at();

alter table public.flood_reports enable row level security;

revoke insert, update, delete on public.flood_reports from anon, authenticated;
grant usage on schema public to anon, authenticated;
grant select on public.flood_reports to anon, authenticated;
grant usage on schema public to service_role;
grant select, insert, update, delete on public.flood_reports to service_role;

drop policy if exists "Anyone can read flood reports" on public.flood_reports;
create policy "Anyone can read flood reports"
on public.flood_reports for select
to anon, authenticated
using (status = 'active' and expires_at > now());

drop policy if exists "Anyone can create flood reports" on public.flood_reports;
drop policy if exists "Anyone can verify flood reports" on public.flood_reports;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'flood-photos',
  'flood-photos',
  true,
  524288,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Anyone can read flood photos" on storage.objects;
create policy "Anyone can read flood photos"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'flood-photos');

drop policy if exists "Anyone can upload flood photos" on storage.objects;
drop policy if exists "Anyone can update flood photos" on storage.objects;
