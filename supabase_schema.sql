-- ============================================================================
--  Supabase schema for the messenger app  (Firebase → Supabase migration)
--  Run this whole file in:  Supabase Dashboard → SQL Editor → New query → Run
--
--  Model: every Firestore "collection" is a table  (id text PK, doc jsonb, …).
--  The client (shim) only ever writes the `doc` jsonb (+ a parent id on insert);
--  BEFORE INSERT/UPDATE triggers derive the indexed query columns from `doc`.
--  Mutations go through one atomic RPC  doc_apply()  → no lost ICE candidates.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. TABLES
-- ---------------------------------------------------------------------------
create table if not exists public.users (
  id          text primary key,                 -- = auth.users.id (uuid as text)
  doc         jsonb not null default '{}'::jsonb,
  nick_lower  text
);

create table if not exists public.chats (
  id        text primary key,
  doc       jsonb not null default '{}'::jsonb,
  members   text[] not null default '{}',
  type      text,
  privacy   text
);

create table if not exists public.messages (
  id        text primary key,
  chat_id   text not null,
  doc       jsonb not null default '{}'::jsonb,
  at        timestamptz,
  msg_type  text
);

create table if not exists public.folders (
  id        text primary key,
  user_id   text not null,
  doc       jsonb not null default '{}'::jsonb,
  ord       double precision
);

-- one logical document  chats/{chatId}/callSession/current  → keyed by chat_id
create table if not exists public.call_sessions (
  id        text primary key,                    -- = chat_id  ('current' is a shim constant)
  doc       jsonb not null default '{}'::jsonb
);

create table if not exists public.call_history (
  id        text primary key,
  chat_id   text,
  doc       jsonb not null default '{}'::jsonb
);

create table if not exists public.friend_requests (
  id        text primary key,
  doc       jsonb not null default '{}'::jsonb,
  to_uid    text
);

create table if not exists public.sticker_packs (
  id        text primary key,
  doc       jsonb not null default '{}'::jsonb
);

-- ---------------------------------------------------------------------------
-- 2. INDEXES
-- ---------------------------------------------------------------------------
create index if not exists chats_members_idx   on public.chats   using gin (members);
create index if not exists chats_typepriv_idx  on public.chats   (type, privacy);
create index if not exists messages_chat_at_idx on public.messages (chat_id, at);
create index if not exists messages_chat_type_idx on public.messages (chat_id, msg_type);
create index if not exists folders_user_idx    on public.folders (user_id, ord);
create index if not exists users_nicklower_idx on public.users   (nick_lower);
create index if not exists freq_to_idx         on public.friend_requests (to_uid);
create index if not exists callhist_chat_idx   on public.call_history (chat_id);

-- ---------------------------------------------------------------------------
-- 3. TRIGGERS — derive query columns from `doc`
--    (FK columns chat_id / user_id are set by the shim on insert and preserved)
-- ---------------------------------------------------------------------------
create or replace function public.trg_users() returns trigger language plpgsql as $$
begin new.nick_lower := new.doc->>'nickLower'; return new; end $$;

create or replace function public.trg_chats() returns trigger language plpgsql as $$
begin
  new.members := coalesce(array(select jsonb_array_elements_text(new.doc->'members')), '{}');
  new.type    := new.doc->>'type';
  new.privacy := new.doc->>'privacy';
  return new;
end $$;

create or replace function public.trg_messages() returns trigger language plpgsql as $$
begin
  new.chat_id  := coalesce(new.doc->>'chat_id', new.chat_id);   -- родитель хранится в doc
  new.at       := nullif(new.doc#>>'{at,__ts__}','')::timestamptz;
  new.msg_type := new.doc->>'type';
  return new;
end $$;

create or replace function public.trg_folders() returns trigger language plpgsql as $$
begin
  new.user_id := coalesce(new.doc->>'user_id', new.user_id);
  new.ord     := nullif(new.doc->>'order','')::double precision;
  return new;
end $$;

create or replace function public.trg_callhist() returns trigger language plpgsql as $$
begin new.chat_id := new.doc->>'chat_id'; return new; end $$;

create or replace function public.trg_freq() returns trigger language plpgsql as $$
begin new.to_uid := new.doc->>'to'; return new; end $$;

drop trigger if exists users_derive    on public.users;
drop trigger if exists chats_derive    on public.chats;
drop trigger if exists messages_derive on public.messages;
drop trigger if exists folders_derive  on public.folders;
drop trigger if exists freq_derive     on public.friend_requests;
drop trigger if exists callhist_derive on public.call_history;

create trigger users_derive    before insert or update on public.users           for each row execute function public.trg_users();
create trigger chats_derive    before insert or update on public.chats           for each row execute function public.trg_chats();
create trigger messages_derive before insert or update on public.messages        for each row execute function public.trg_messages();
create trigger folders_derive  before insert or update on public.folders         for each row execute function public.trg_folders();
create trigger freq_derive     before insert or update on public.friend_requests for each row execute function public.trg_freq();
create trigger callhist_derive before insert or update on public.call_history     for each row execute function public.trg_callhist();

-- ---------------------------------------------------------------------------
-- 4. HELPER — ensure intermediate objects exist along a jsonb path
--    (jsonb_set with create_missing only creates the leaf, not parents)
-- ---------------------------------------------------------------------------
create or replace function public.ensure_parents(d jsonb, p text[]) returns jsonb
language plpgsql immutable as $$
declare i int;
begin
  if array_length(p,1) is null then return d; end if;
  for i in 1 .. array_length(p,1)-1 loop
    if jsonb_typeof(d #> p[1:i]) is distinct from 'object' then
      d := jsonb_set(d, p[1:i], '{}'::jsonb, true);
    end if;
  end loop;
  return d;
end $$;

-- ---------------------------------------------------------------------------
-- 5. CORE RPC — apply an ordered list of ops to a document, atomically.
--    _ops = [ {op, path:[seg,...], value?}, ... ]
--    op ∈ set | serverNow | delete | increment | arrayUnion | arrayRemove
--    path = [] (empty)  ⇒  replace the whole document (used by .set()/.add()).
-- ---------------------------------------------------------------------------
create or replace function public.doc_apply(_table text, _id text, _ops jsonb)
returns void language plpgsql as $$
declare
  d jsonb;
  o jsonb;
  p text[];
  arr jsonb;
  v jsonb;
begin
  execute format('select doc from public.%I where id = $1 for update', _table)
    into d using _id;
  if d is null then d := '{}'::jsonb; end if;

  for o in select * from jsonb_array_elements(_ops) loop
    p := array(select jsonb_array_elements_text(o->'path'));

    if coalesce(array_length(p,1),0) = 0 then
      -- whole-document replace
      if (o->>'op') = 'set' then d := coalesce(o->'value','{}'::jsonb); end if;
      continue;
    end if;

    case o->>'op'
      when 'set' then
        d := jsonb_set(public.ensure_parents(d,p), p, coalesce(o->'value','null'::jsonb), true);

      when 'serverNow' then
        d := jsonb_set(public.ensure_parents(d,p), p,
                       jsonb_build_object('__ts__', to_jsonb(now())), true);

      when 'delete' then
        d := d #- p;

      when 'increment' then
        d := jsonb_set(public.ensure_parents(d,p), p,
               to_jsonb( coalesce((d #>> p)::numeric, 0) + coalesce((o->>'value')::numeric,0) ), true);

      when 'arrayUnion' then
        arr := coalesce(d #> p, '[]'::jsonb);
        if jsonb_typeof(arr) is distinct from 'array' then arr := '[]'::jsonb; end if;
        for v in select * from jsonb_array_elements(coalesce(o->'value','[]'::jsonb)) loop
          if not (arr @> jsonb_build_array(v)) then
            arr := arr || jsonb_build_array(v);          -- append at tail, preserve order
          end if;
        end loop;
        d := jsonb_set(public.ensure_parents(d,p), p, arr, true);

      when 'arrayRemove' then
        arr := coalesce(d #> p, '[]'::jsonb);
        if jsonb_typeof(arr) is distinct from 'array' then arr := '[]'::jsonb; end if;
        select coalesce(jsonb_agg(e), '[]'::jsonb) into arr
          from jsonb_array_elements(arr) e
          where not ( coalesce(o->'value','[]'::jsonb) @> jsonb_build_array(e) );
        d := jsonb_set(d, p, arr, true);

      else
        null;
    end case;
  end loop;

  execute format(
    'insert into public.%I (id, doc) values ($1,$2)
       on conflict (id) do update set doc = excluded.doc', _table)
    using _id, d;
end $$;

-- ---------------------------------------------------------------------------
-- 6. BATCH — apply many doc_apply calls in one transaction (db.batch().commit)
--    _items = [ {table, id, ops, parent?}, ... ]
-- ---------------------------------------------------------------------------
create or replace function public.doc_apply_batch(_items jsonb)
returns void language plpgsql as $$
declare it jsonb;
begin
  for it in select * from jsonb_array_elements(_items) loop
    perform public.doc_apply(it->>'table', it->>'id', coalesce(it->'ops','[]'::jsonb));
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 7. DELETE helper (so the shim never needs table-name SQL on the client)
-- ---------------------------------------------------------------------------
create or replace function public.doc_delete(_table text, _id text)
returns void language plpgsql as $$
begin execute format('delete from public.%I where id=$1', _table) using _id; end $$;

-- ---------------------------------------------------------------------------
-- 8. REALTIME — publish all tables; FULL row image for reliable change events
-- ---------------------------------------------------------------------------
alter table public.users           replica identity full;
alter table public.chats           replica identity full;
alter table public.messages        replica identity full;
alter table public.folders         replica identity full;
alter table public.call_sessions   replica identity full;
alter table public.call_history    replica identity full;
alter table public.friend_requests replica identity full;
alter table public.sticker_packs   replica identity full;

do $$
declare t text;
begin
  foreach t in array array['users','chats','messages','folders','call_sessions',
                           'call_history','friend_requests','sticker_packs']
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 9. RLS — permissive: any authenticated user can read/write (mirrors the
--    app's current Firebase posture). NOT hardened — tighten later.
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['users','chats','messages','folders','call_sessions',
                           'call_history','friend_requests','sticker_packs']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists auth_all on public.%I', t);
    execute format($f$create policy auth_all on public.%I for all
                     to authenticated using (true) with check (true)$f$, t);
  end loop;
end $$;

-- Allow the RPCs to be called by authenticated clients
grant execute on function public.doc_apply(text,text,jsonb)        to authenticated;
grant execute on function public.doc_apply_batch(jsonb)            to authenticated;
grant execute on function public.doc_delete(text,text)             to authenticated;

-- ============================================================================
--  DONE.  Next: Authentication → Providers → Email = ON, "Confirm email" = OFF.
-- ============================================================================
