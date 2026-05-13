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
    -- extend expiry when someone confirms still flooded
    update public.flood_reports
    set
      confirmation_count = confirmation_count + 1,
      last_confirmed_at = v_now,
      expires_at = v_now + interval '10 hours'
    where id = p_report_id
    returning * into v_report;
  else
    -- only increment counter, never touch status or expiry
    update public.flood_reports
    set cleared_count = cleared_count + 1
    where id = p_report_id
    returning * into v_report;
  end if;

  return v_report;
end;
$$;
