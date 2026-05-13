create table if not exists public.report_confirmations (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.flood_reports(id) on delete cascade,
  action text not null check (action in ('still_flooded', 'cleared')),
  photo_url text,
  comment text check (comment is null or char_length(comment) <= 500),
  created_at timestamptz not null default now()
);

create index if not exists report_confirmations_report_created_idx
  on public.report_confirmations (report_id, created_at desc);

alter table public.report_confirmations enable row level security;

grant usage on schema public to anon, authenticated, service_role;
grant select on public.report_confirmations to anon, authenticated;
grant select, insert, update, delete on public.report_confirmations to service_role;

drop policy if exists "read confirmations" on public.report_confirmations;
create policy "read confirmations"
on public.report_confirmations for select
to anon, authenticated
using (true);

create or replace function public.confirm_flood_report(
  p_report_id uuid,
  p_action text,
  p_photo_url text default null,
  p_comment text default null
)
returns public.flood_reports
language plpgsql
security definer
set search_path = public
as $$
declare
  v_report public.flood_reports;
  v_now timestamptz := now();
begin
  if p_action not in ('still_flooded', 'cleared') then
    raise exception 'Invalid confirmation action';
  end if;

  if p_comment is not null and char_length(p_comment) > 500 then
    raise exception 'Comment is too long';
  end if;

  select *
  into v_report
  from public.flood_reports
  where id = p_report_id
  for update;

  if not found then
    raise exception 'Report not found';
  end if;

  insert into public.report_confirmations (report_id, action, photo_url, comment)
  values (p_report_id, p_action, p_photo_url, nullif(trim(coalesce(p_comment, '')), ''));

  if p_action = 'still_flooded' then
    update public.flood_reports
    set
      status = 'active',
      confirmation_count = confirmation_count + 1,
      last_confirmed_at = v_now,
      expires_at = v_now + interval '6 hours'
    where id = p_report_id
    returning * into v_report;
  else
    update public.flood_reports
    set
      status = 'cleared',
      cleared_count = cleared_count + 1
    where id = p_report_id
    returning * into v_report;
  end if;

  return v_report;
end;
$$;

revoke all on function public.confirm_flood_report(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.confirm_flood_report(uuid, text, text, text) to service_role;
