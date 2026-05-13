create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  body text not null check (char_length(body) between 1 and 280),
  ip_hash text not null,
  verification_count int not null default 0,
  flag_count int not null default 0,
  is_hidden boolean not null default false,
  is_system boolean not null default false,
  attached_lat double precision,
  attached_lng double precision,
  created_at timestamptz not null default now(),
  constraint chat_messages_attached_location_pair check (
    (attached_lat is null and attached_lng is null)
    or (attached_lat is not null and attached_lng is not null)
  ),
  constraint chat_messages_bojongsoang_bbox check (
    attached_lat is null
    or (
      attached_lat between -7.000 and -6.960
      and attached_lng between 107.610 and 107.650
    )
  )
);

create index if not exists chat_messages_created_at_idx
  on public.chat_messages (created_at desc);

alter table public.chat_messages enable row level security;

drop policy if exists "read chat" on public.chat_messages;
create policy "read chat" on public.chat_messages
  for select using (is_hidden = false);

create table if not exists public.chat_verifications (
  message_id uuid not null references public.chat_messages(id) on delete cascade,
  ip_hash text not null,
  created_at timestamptz not null default now(),
  primary key (message_id, ip_hash)
);

create table if not exists public.chat_flags (
  message_id uuid not null references public.chat_messages(id) on delete cascade,
  ip_hash text not null,
  created_at timestamptz not null default now(),
  primary key (message_id, ip_hash)
);

grant usage on schema public to anon, authenticated, service_role;
revoke all on public.chat_messages from anon, authenticated;
grant select (
  id,
  body,
  verification_count,
  flag_count,
  is_hidden,
  is_system,
  attached_lat,
  attached_lng,
  created_at
) on public.chat_messages to anon, authenticated;
grant select, insert, update, delete on public.chat_messages to service_role;
grant select, insert, update, delete on public.chat_verifications to service_role;
grant select, insert, update, delete on public.chat_flags to service_role;

create or replace function public.enforce_chat_cap() returns trigger as $$
begin
  delete from public.chat_messages
  where id in (
    select id from public.chat_messages
    order by created_at desc
    offset 50
  );
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_enforce_chat_cap on public.chat_messages;
create trigger trg_enforce_chat_cap
after insert on public.chat_messages
execute function public.enforce_chat_cap();

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

  update public.chat_messages
  set
    flag_count = flag_count + 1,
    is_hidden = case when flag_count + 1 >= 3 then true else is_hidden end
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

do $$
begin
  alter publication supabase_realtime add table public.chat_messages;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;
