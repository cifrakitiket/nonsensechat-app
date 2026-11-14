-- ============================================================================
--  VK Cloud PostgreSQL schema for NonsenseChat
--  Совместима с supabase_schema.sql, но без Supabase-зависимостей.
--
--  Запустить: psql -h <HOST> -U postgres -d <DB> -f vkcloud-schema.sql
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. TABLES
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  id          TEXT PRIMARY KEY,
  doc         JSONB NOT NULL DEFAULT '{}',
  nick_lower  TEXT
);

CREATE TABLE IF NOT EXISTS public.chats (
  id        TEXT PRIMARY KEY,
  doc       JSONB NOT NULL DEFAULT '{}',
  members   TEXT[] NOT NULL DEFAULT '{}',
  type      TEXT,
  privacy   TEXT
);

CREATE TABLE IF NOT EXISTS public.messages (
  id        TEXT PRIMARY KEY,
  chat_id   TEXT NOT NULL,
  doc       JSONB NOT NULL DEFAULT '{}',
  at        TIMESTAMPTZ,
  msg_type  TEXT
);

CREATE TABLE IF NOT EXISTS public.folders (
  id        TEXT PRIMARY KEY,
  user_id   TEXT NOT NULL,
  doc       JSONB NOT NULL DEFAULT '{}',
  ord       DOUBLE PRECISION
);

CREATE TABLE IF NOT EXISTS public.call_sessions (
  id        TEXT PRIMARY KEY,
  doc       JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS public.call_history (
  id        TEXT PRIMARY KEY,
  chat_id   TEXT,
  doc       JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS public.friend_requests (
  id        TEXT PRIMARY KEY,
  doc       JSONB NOT NULL DEFAULT '{}',
  to_uid    TEXT
);

CREATE TABLE IF NOT EXISTS public.sticker_packs (
  id        TEXT PRIMARY KEY,
  doc       JSONB NOT NULL DEFAULT '{}'
);

-- Сессии пользователей (хранятся на сервере)
CREATE TABLE IF NOT EXISTS public.auth_sessions (
  token      TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  email      TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 days'
);

-- Пользователи авторизации
CREATE TABLE IF NOT EXISTS public.auth_users (
  id            TEXT PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 2. INDEXES
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS chats_members_idx    ON public.chats    USING GIN (members);
CREATE INDEX IF NOT EXISTS chats_typepriv_idx   ON public.chats    (type, privacy);
CREATE INDEX IF NOT EXISTS messages_chat_at_idx ON public.messages (chat_id, at);
CREATE INDEX IF NOT EXISTS messages_type_idx    ON public.messages (chat_id, msg_type);
CREATE INDEX IF NOT EXISTS folders_user_idx     ON public.folders  (user_id, ord);
CREATE INDEX IF NOT EXISTS users_nicklower_idx  ON public.users    (nick_lower);
CREATE INDEX IF NOT EXISTS freq_to_idx          ON public.friend_requests (to_uid);
CREATE INDEX IF NOT EXISTS callhist_chat_idx    ON public.call_history (chat_id);
CREATE INDEX IF NOT EXISTS auth_sessions_uid    ON public.auth_sessions (user_id);
CREATE INDEX IF NOT EXISTS auth_sessions_exp    ON public.auth_sessions (expires_at);

-- ---------------------------------------------------------------------------
-- 3. TRIGGERS — derive query columns from doc
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_users() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN new.nick_lower := new.doc->>'nickLower'; RETURN new; END $$;

CREATE OR REPLACE FUNCTION public.trg_chats() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  new.members := COALESCE(ARRAY(SELECT jsonb_array_elements_text(new.doc->'members')), '{}');
  new.type    := new.doc->>'type';
  new.privacy := new.doc->>'privacy';
  RETURN new;
END $$;

CREATE OR REPLACE FUNCTION public.trg_messages() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  new.chat_id  := COALESCE(new.doc->>'chat_id', new.chat_id);
  new.at       := NULLIF(new.doc#>>'{at,__ts__}','')::TIMESTAMPTZ;
  new.msg_type := new.doc->>'type';
  RETURN new;
END $$;

CREATE OR REPLACE FUNCTION public.trg_folders() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  new.user_id := COALESCE(new.doc->>'user_id', new.user_id);
  new.ord     := NULLIF(new.doc->>'order','')::DOUBLE PRECISION;
  RETURN new;
END $$;

CREATE OR REPLACE FUNCTION public.trg_callhist() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN new.chat_id := new.doc->>'chat_id'; RETURN new; END $$;

CREATE OR REPLACE FUNCTION public.trg_freq() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN new.to_uid := new.doc->>'to'; RETURN new; END $$;

DROP TRIGGER IF EXISTS users_derive    ON public.users;
DROP TRIGGER IF EXISTS chats_derive    ON public.chats;
DROP TRIGGER IF EXISTS messages_derive ON public.messages;
DROP TRIGGER IF EXISTS folders_derive  ON public.folders;
DROP TRIGGER IF EXISTS freq_derive     ON public.friend_requests;
DROP TRIGGER IF EXISTS callhist_derive ON public.call_history;

CREATE TRIGGER users_derive    BEFORE INSERT OR UPDATE ON public.users           FOR EACH ROW EXECUTE FUNCTION public.trg_users();
CREATE TRIGGER chats_derive    BEFORE INSERT OR UPDATE ON public.chats           FOR EACH ROW EXECUTE FUNCTION public.trg_chats();
CREATE TRIGGER messages_derive BEFORE INSERT OR UPDATE ON public.messages        FOR EACH ROW EXECUTE FUNCTION public.trg_messages();
CREATE TRIGGER folders_derive  BEFORE INSERT OR UPDATE ON public.folders         FOR EACH ROW EXECUTE FUNCTION public.trg_folders();
CREATE TRIGGER freq_derive     BEFORE INSERT OR UPDATE ON public.friend_requests FOR EACH ROW EXECUTE FUNCTION public.trg_freq();
CREATE TRIGGER callhist_derive BEFORE INSERT OR UPDATE ON public.call_history    FOR EACH ROW EXECUTE FUNCTION public.trg_callhist();

-- ---------------------------------------------------------------------------
-- 4. HELPER — ensure intermediate objects exist along a jsonb path
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ensure_parents(d JSONB, p TEXT[]) RETURNS JSONB
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE i INT;
BEGIN
  IF array_length(p,1) IS NULL THEN RETURN d; END IF;
  FOR i IN 1 .. array_length(p,1)-1 LOOP
    IF jsonb_typeof(d #> p[1:i]) IS DISTINCT FROM 'object' THEN
      d := jsonb_set(d, p[1:i], '{}'::JSONB, TRUE);
    END IF;
  END LOOP;
  RETURN d;
END $$;

-- ---------------------------------------------------------------------------
-- 5. CORE RPC
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.doc_apply(_table TEXT, _id TEXT, _ops JSONB)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  d JSONB;
  o JSONB;
  p TEXT[];
  arr JSONB;
  v JSONB;
BEGIN
  EXECUTE format('SELECT doc FROM public.%I WHERE id = $1 FOR UPDATE', _table)
    INTO d USING _id;
  IF d IS NULL THEN d := '{}'::JSONB; END IF;

  FOR o IN SELECT * FROM jsonb_array_elements(_ops) LOOP
    p := ARRAY(SELECT jsonb_array_elements_text(o->'path'));

    IF COALESCE(array_length(p,1),0) = 0 THEN
      IF (o->>'op') = 'set' THEN d := COALESCE(o->'value','{}'::JSONB); END IF;
      CONTINUE;
    END IF;

    CASE o->>'op'
      WHEN 'set' THEN
        d := jsonb_set(public.ensure_parents(d,p), p, COALESCE(o->'value','null'::JSONB), TRUE);
      WHEN 'serverNow' THEN
        d := jsonb_set(public.ensure_parents(d,p), p,
                       jsonb_build_object('__ts__', to_jsonb(now())), TRUE);
      WHEN 'delete' THEN
        d := d #- p;
      WHEN 'increment' THEN
        d := jsonb_set(public.ensure_parents(d,p), p,
               to_jsonb( COALESCE((d #>> p)::NUMERIC, 0) + COALESCE((o->>'value')::NUMERIC,0) ), TRUE);
      WHEN 'arrayUnion' THEN
        arr := COALESCE(d #> p, '[]'::JSONB);
        IF jsonb_typeof(arr) IS DISTINCT FROM 'array' THEN arr := '[]'::JSONB; END IF;
        FOR v IN SELECT * FROM jsonb_array_elements(COALESCE(o->'value','[]'::JSONB)) LOOP
          IF NOT (arr @> jsonb_build_array(v)) THEN arr := arr || jsonb_build_array(v); END IF;
        END LOOP;
        d := jsonb_set(public.ensure_parents(d,p), p, arr, TRUE);
      WHEN 'arrayRemove' THEN
        arr := COALESCE(d #> p, '[]'::JSONB);
        IF jsonb_typeof(arr) IS DISTINCT FROM 'array' THEN arr := '[]'::JSONB; END IF;
        SELECT COALESCE(jsonb_agg(e), '[]'::JSONB) INTO arr
          FROM jsonb_array_elements(arr) e
          WHERE NOT ( COALESCE(o->'value','[]'::JSONB) @> jsonb_build_array(e) );
        d := jsonb_set(d, p, arr, TRUE);
      ELSE NULL;
    END CASE;
  END LOOP;

  EXECUTE format(
    'INSERT INTO public.%I (id, doc) VALUES ($1,$2)
       ON CONFLICT (id) DO UPDATE SET doc = EXCLUDED.doc', _table)
    USING _id, d;
END $$;

-- ---------------------------------------------------------------------------
-- 6. BATCH
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.doc_apply_batch(_items JSONB)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE it JSONB;
BEGIN
  FOR it IN SELECT * FROM jsonb_array_elements(_items) LOOP
    PERFORM public.doc_apply(it->>'table', it->>'id', COALESCE(it->'ops','[]'::JSONB));
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 7. DELETE helper
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.doc_delete(_table TEXT, _id TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN EXECUTE format('DELETE FROM public.%I WHERE id=$1', _table) USING _id; END $$;

-- ---------------------------------------------------------------------------
-- 8. REALTIME via pg_notify
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_change()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE payload TEXT;
BEGIN
  payload := json_build_object(
    'table',   TG_TABLE_NAME,
    'op',      TG_OP,
    'id',      COALESCE(NEW.id, OLD.id),
    'chat_id', CASE
      WHEN TG_TABLE_NAME = 'messages' THEN COALESCE(NEW.chat_id, OLD.chat_id)
      WHEN TG_TABLE_NAME = 'folders'  THEN COALESCE(NEW.user_id, OLD.user_id)
      ELSE NULL
    END
  )::TEXT;
  PERFORM pg_notify('db_changes', payload);
  RETURN COALESCE(NEW, OLD);
END $$;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['users','chats','messages','folders','call_sessions',
                           'call_history','friend_requests','sticker_packs']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', t||'_notify', t);
    EXECUTE format(
      'CREATE TRIGGER %I AFTER INSERT OR UPDATE OR DELETE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.notify_change()',
      t||'_notify', t
    );
  END LOOP;
END $$;

-- ============================================================================
--  DONE. Next: run server/vkcloud-backend.js with proper .env
-- ============================================================================
