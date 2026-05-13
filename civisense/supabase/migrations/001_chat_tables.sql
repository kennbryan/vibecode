-- Chat messages table
create table if not exists public.chat_messages (
  id                 uuid primary key default gen_random_uuid(),
  body               text not null check (char_length(body) between 1 and 280),
  ip_hash            text not null,
  verification_count integer not null default 0,
  flag_count         integer not null default 0,
  is_hidden          boolean not null default false,
  is_system          boolean not null default false,
  attached_lat       double precision,
  attached_lng       double precision,
  created_at         timestamptz not null default now()
);

-- Keep only the 50 most recent visible messages
create or replace function public.trim_chat_messages()
returns trigger language plpgsql as $$
begin
  delete from public.chat_messages
  where id in (
    select id from public.chat_messages
    where is_hidden = false
    order by created_at desc
    offset 50
  );
  return null;
end;
$$;

drop trigger if exists trim_chat_messages_trigger on public.chat_messages;
create trigger trim_chat_messages_trigger
  after insert on public.chat_messages
  for each row execute function public.trim_chat_messages();

-- Chat verifications (one per ip_hash per message)
create table if not exists public.chat_verifications (
  id         uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.chat_messages(id) on delete cascade,
  ip_hash    text not null,
  created_at timestamptz not null default now(),
  unique (message_id, ip_hash)
);

-- Chat flags (one per ip_hash per message)
create table if not exists public.chat_flags (
  id         uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.chat_messages(id) on delete cascade,
  ip_hash    text not null,
  created_at timestamptz not null default now(),
  unique (message_id, ip_hash)
);

-- Return type for verify/flag RPCs
do $$ begin
  create type public.chat_action_result as (
    id                 uuid,
    body               text,
    verification_count integer,
    flag_count         integer,
    is_hidden          boolean,
    is_system          boolean,
    attached_lat       double precision,
    attached_lng       double precision,
    created_at         timestamptz,
    outcome            text
  );
exception when duplicate_object then null;
end $$;

-- RPC: verify a chat message
create or replace function public.verify_chat_message(p_message_id uuid, p_ip_hash text)
returns public.chat_action_result language plpgsql security definer as $$
declare
  v_msg  public.chat_messages;
  v_out  public.chat_action_result;
  v_inserted boolean;
begin
  select * into v_msg from public.chat_messages where id = p_message_id;

  if not found then
    v_out.outcome := 'not_found'; return v_out;
  end if;

  if v_msg.is_system then
    v_out.outcome := 'system';
  elsif v_msg.ip_hash = p_ip_hash then
    v_out.outcome := 'self';
  else
    insert into public.chat_verifications (message_id, ip_hash)
    values (p_message_id, p_ip_hash)
    on conflict (message_id, ip_hash) do nothing;

    get diagnostics v_inserted = row_count;

    if v_inserted = 0 then
      v_out.outcome := 'duplicate';
    else
      update public.chat_messages
      set verification_count = verification_count + 1
      where id = p_message_id
      returning * into v_msg;
      v_out.outcome := 'verified';
    end if;
  end if;

  v_out.id := v_msg.id; v_out.body := v_msg.body;
  v_out.verification_count := v_msg.verification_count;
  v_out.flag_count := v_msg.flag_count; v_out.is_hidden := v_msg.is_hidden;
  v_out.is_system := v_msg.is_system; v_out.attached_lat := v_msg.attached_lat;
  v_out.attached_lng := v_msg.attached_lng; v_out.created_at := v_msg.created_at;
  return v_out;
end;
$$;

-- RPC: flag a chat message (auto-hide at 3 flags)
create or replace function public.flag_chat_message(p_message_id uuid, p_ip_hash text)
returns public.chat_action_result language plpgsql security definer as $$
declare
  v_msg      public.chat_messages;
  v_out      public.chat_action_result;
  v_inserted boolean;
begin
  select * into v_msg from public.chat_messages where id = p_message_id;

  if not found then
    v_out.outcome := 'not_found'; return v_out;
  end if;

  if v_msg.is_system then
    v_out.outcome := 'system';
  elsif v_msg.ip_hash = p_ip_hash then
    v_out.outcome := 'self';
  else
    insert into public.chat_flags (message_id, ip_hash)
    values (p_message_id, p_ip_hash)
    on conflict (message_id, ip_hash) do nothing;

    get diagnostics v_inserted = row_count;

    if v_inserted = 0 then
      v_out.outcome := 'duplicate';
    else
      update public.chat_messages
      set
        flag_count = flag_count + 1,
        is_hidden  = case when flag_count + 1 >= 3 then true else is_hidden end
      where id = p_message_id
      returning * into v_msg;
      v_out.outcome := case when v_msg.is_hidden then 'hidden' else 'flagged' end;
    end if;
  end if;

  v_out.id := v_msg.id; v_out.body := v_msg.body;
  v_out.verification_count := v_msg.verification_count;
  v_out.flag_count := v_msg.flag_count; v_out.is_hidden := v_msg.is_hidden;
  v_out.is_system := v_msg.is_system; v_out.attached_lat := v_msg.attached_lat;
  v_out.attached_lng := v_msg.attached_lng; v_out.created_at := v_msg.created_at;
  return v_out;
end;
$$;

-- Indexes
create index if not exists chat_messages_created_at_idx on public.chat_messages (created_at desc);
create index if not exists chat_messages_is_hidden_idx  on public.chat_messages (is_hidden);
create index if not exists chat_verifications_ip_idx    on public.chat_verifications (ip_hash);
create index if not exists chat_flags_ip_idx            on public.chat_flags (ip_hash);

-- RLS: all access goes through service-role API routes
alter table public.chat_messages      enable row level security;
alter table public.chat_verifications enable row level security;
alter table public.chat_flags         enable row level security;

-- Service role bypasses RLS (used by all API routes)
create policy "service role full access" on public.chat_messages
  for all to service_role using (true) with check (true);

create policy "service role full access" on public.chat_verifications
  for all to service_role using (true) with check (true);

create policy "service role full access" on public.chat_flags
  for all to service_role using (true) with check (true);
