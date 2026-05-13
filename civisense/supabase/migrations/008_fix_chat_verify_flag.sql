drop function if exists public.verify_chat_message(uuid, text);
drop function if exists public.flag_chat_message(uuid, text);

create or replace function public.verify_chat_message(
  p_message_id uuid,
  p_ip_hash text
)
returns table (
  outcome text,
  id uuid,
  body text,
  verification_count int,
  flag_count int,
  is_hidden boolean,
  is_system boolean,
  attached_lat double precision,
  attached_lng double precision,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_message public.chat_messages;
  v_inserted_count int;
begin
  select *
  into v_message
  from public.chat_messages
  where chat_messages.id = p_message_id
  for update;

  if not found or v_message.is_hidden then
    return query select
      'not_found'::text,
      null::uuid,
      null::text,
      null::int,
      null::int,
      null::boolean,
      null::boolean,
      null::double precision,
      null::double precision,
      null::timestamptz;
    return;
  end if;

  if v_message.is_system then
    return query select
      'system'::text,
      v_message.id,
      v_message.body,
      v_message.verification_count,
      v_message.flag_count,
      v_message.is_hidden,
      v_message.is_system,
      v_message.attached_lat,
      v_message.attached_lng,
      v_message.created_at;
    return;
  end if;

  if v_message.ip_hash = p_ip_hash then
    return query select
      'self'::text,
      v_message.id,
      v_message.body,
      v_message.verification_count,
      v_message.flag_count,
      v_message.is_hidden,
      v_message.is_system,
      v_message.attached_lat,
      v_message.attached_lng,
      v_message.created_at;
    return;
  end if;

  insert into public.chat_verifications (message_id, ip_hash)
  values (p_message_id, p_ip_hash)
  on conflict do nothing;

  get diagnostics v_inserted_count = row_count;

  if v_inserted_count = 0 then
    return query select
      'duplicate'::text,
      v_message.id,
      v_message.body,
      v_message.verification_count,
      v_message.flag_count,
      v_message.is_hidden,
      v_message.is_system,
      v_message.attached_lat,
      v_message.attached_lng,
      v_message.created_at;
    return;
  end if;

  update public.chat_messages
  set verification_count = verification_count + 1
  where chat_messages.id = p_message_id
  returning * into v_message;

  return query select
    'verified'::text,
    v_message.id,
    v_message.body,
    v_message.verification_count,
    v_message.flag_count,
    v_message.is_hidden,
    v_message.is_system,
    v_message.attached_lat,
    v_message.attached_lng,
    v_message.created_at;
end;
$$;

create or replace function public.flag_chat_message(
  p_message_id uuid,
  p_ip_hash text
)
returns table (
  outcome text,
  id uuid,
  body text,
  verification_count int,
  flag_count int,
  is_hidden boolean,
  is_system boolean,
  attached_lat double precision,
  attached_lng double precision,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_message public.chat_messages;
  v_inserted_count int;
  v_new_flag_count int;
  v_new_is_hidden boolean;
begin
  select *
  into v_message
  from public.chat_messages
  where chat_messages.id = p_message_id
  for update;

  if not found or v_message.is_hidden then
    return query select
      'not_found'::text,
      null::uuid,
      null::text,
      null::int,
      null::int,
      null::boolean,
      null::boolean,
      null::double precision,
      null::double precision,
      null::timestamptz;
    return;
  end if;

  if v_message.is_system then
    return query select
      'system'::text,
      v_message.id,
      v_message.body,
      v_message.verification_count,
      v_message.flag_count,
      v_message.is_hidden,
      v_message.is_system,
      v_message.attached_lat,
      v_message.attached_lng,
      v_message.created_at;
    return;
  end if;

  if v_message.ip_hash = p_ip_hash then
    return query select
      'self'::text,
      v_message.id,
      v_message.body,
      v_message.verification_count,
      v_message.flag_count,
      v_message.is_hidden,
      v_message.is_system,
      v_message.attached_lat,
      v_message.attached_lng,
      v_message.created_at;
    return;
  end if;

  insert into public.chat_flags (message_id, ip_hash)
  values (p_message_id, p_ip_hash)
  on conflict do nothing;

  get diagnostics v_inserted_count = row_count;

  if v_inserted_count = 0 then
    return query select
      'duplicate'::text,
      v_message.id,
      v_message.body,
      v_message.verification_count,
      v_message.flag_count,
      v_message.is_hidden,
      v_message.is_system,
      v_message.attached_lat,
      v_message.attached_lng,
      v_message.created_at;
    return;
  end if;

  v_new_flag_count := v_message.flag_count + 1;
  v_new_is_hidden  := v_new_flag_count >= 3;

  update public.chat_messages
  set
    flag_count = v_new_flag_count,
    is_hidden  = v_new_is_hidden
  where chat_messages.id = p_message_id
  returning * into v_message;

  return query select
    case when v_message.is_hidden then 'hidden' else 'flagged' end::text,
    v_message.id,
    v_message.body,
    v_message.verification_count,
    v_message.flag_count,
    v_message.is_hidden,
    v_message.is_system,
    v_message.attached_lat,
    v_message.attached_lng,
    v_message.created_at;
end;
$$;

revoke all on function public.verify_chat_message(uuid, text) from public, anon, authenticated;
revoke all on function public.flag_chat_message(uuid, text) from public, anon, authenticated;
grant execute on function public.verify_chat_message(uuid, text) to service_role;
grant execute on function public.flag_chat_message(uuid, text) to service_role;
