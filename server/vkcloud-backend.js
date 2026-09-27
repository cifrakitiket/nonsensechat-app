/**
 * NonsenseChat — VK Cloud Backend
 * ================================
 * Заменяет Supabase:
 *   - База данных: VK Cloud PostgreSQL (через pg pool)
 *   - Файловое хранилище: VK Cloud Object Storage (S3-compatible)
 *   - Realtime: SSE + pg_notify ('db_changes')
 *   - Auth: собственные JWT-like сессии в таблице auth_sessions
 *
 * Запуск:
 *   node server/vkcloud-backend.js
 *
 * Переменные окружения (.env):
 *   VK_PG_URL        — строка подключения к PostgreSQL
 *   VK_S3_ENDPOINT   — https://hb.vkcs.cloud
 *   VK_S3_BUCKET     — имя бакета (например: nonsensechat-uploads)
 *   VK_S3_ACCESS     — Access Key ID
 *   VK_S3_SECRET     — Secret Access Key
 *   VK_S3_REGION     — регион (ru-msk)
 *   JWT_SECRET       — секрет для подписи токенов (32+ символов)
 *   PORT             — порт (по умолчанию: 8787)
 *   HOST             — хост (по умолчанию: 0.0.0.0)
 */

'use strict';

// ---------------------------------------------------------------------------
// 0. Зависимости
// ---------------------------------------------------------------------------
const http     = require('http');
const crypto   = require('crypto');
const fs       = require('fs');
const path     = require('path');
const { URL }  = require('url');

// Динамически подгружаем pg — если не установлен, даём понятную ошибку.
let pg;
try { pg = require('pg'); } catch (_) {
  console.error('[vkcloud-backend] Модуль "pg" не найден. Выполните: npm install pg');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 1. Конфигурация из окружения / .env
// ---------------------------------------------------------------------------
(function loadDotEnv() {
  const envFile = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envFile)) return;
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const m = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)/.exec(line.trim());
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
})();

const rawPgUrl       = process.env.VK_PG_URL || '';
const isPgPlaceholder= !rawPgUrl || rawPgUrl.includes('ВАШ_ХОСТ') || rawPgUrl.includes('ПАРОЛЬ');
const VK_PG_URL      = isPgPlaceholder ? '' : rawPgUrl;
const VK_S3_ENDPOINT = process.env.VK_S3_ENDPOINT || 'https://hb.vkcs.cloud';
const VK_S3_BUCKET   = process.env.VK_S3_BUCKET   || 'nonsensechat-uploads';
const VK_S3_ACCESS   = process.env.VK_S3_ACCESS   || '';
const VK_S3_SECRET   = process.env.VK_S3_SECRET   || '';
const VK_S3_REGION   = process.env.VK_S3_REGION   || 'ru-msk';
const JWT_SECRET     = process.env.JWT_SECRET      || crypto.randomBytes(32).toString('hex');
const PORT           = Number(process.env.PORT || 8787);
const HOST           = process.env.HOST || '0.0.0.0';

const S3_READY = VK_S3_ACCESS.length > 4 && VK_S3_SECRET.length > 4;

if (!VK_PG_URL) {
  console.warn('[vkcloud-backend] VK_PG_URL не настроен или содержит плейсхолдер. База данных и Realtime отключены до настройки .env');
}

// ---------------------------------------------------------------------------
// 2. PostgreSQL pool
// ---------------------------------------------------------------------------
const pool = VK_PG_URL ? new pg.Pool({
  connectionString: VK_PG_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
}) : null;
if (pool) {
  pool.on('error', (err) => console.error('[pg pool]', err.message));
}

// ---------------------------------------------------------------------------
// 3. SSE клиенты (realtime)
// ---------------------------------------------------------------------------
const sseClients = new Set();  // Set<{ res, userId }>

// Один LISTEN-коннект на весь сервер
let pgListenClient = null;
async function startPgListen() {
  if (!pool) return;
  try {
    pgListenClient = await pool.connect();
    await pgListenClient.query('LISTEN db_changes');
    pgListenClient.on('notification', (msg) => {
      const payload = msg.payload || '{}';
      for (const client of sseClients) {
        try { client.res.write(`data: ${payload}\n\n`); } catch (_) {}
      }
    });
    pgListenClient.on('error', (e) => {
      console.error('[pg LISTEN]', e.message);
      pgListenClient = null;
      setTimeout(startPgListen, 3000); // переподключение
    });
    console.log('[vkcloud-backend] pg LISTEN db_changes OK');
  } catch (e) {
    console.error('[vkcloud-backend] pg LISTEN failed:', e.message);
    setTimeout(startPgListen, 5000);
  }
}

// ---------------------------------------------------------------------------
// 4. Helpers
// ---------------------------------------------------------------------------
function genId() {
  return crypto.randomUUID ? crypto.randomUUID()
    : crypto.randomBytes(16).toString('hex');
}

function hmac(data) {
  return crypto.createHmac('sha256', JWT_SECRET).update(data).digest('hex');
}

function makeToken(userId, email) {
  const tok = genId();
  const sig = hmac(tok + userId);
  return `${tok}.${sig}`;
}

function hashPassword(password, salt) {
  salt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(String(password), salt, 120000, 32, 'sha256').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = String(stored || '').split(':');
  if (!salt || !hash) return false;
  const next = hashPassword(password, salt).split(':')[1];
  try {
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(next, 'hex'));
  } catch (_) { return false; }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function json(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type':                 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Content-Length':               Buffer.byteLength(data),
  });
  res.end(data);
}

async function getSession(req) {
  const raw = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!raw || !pool) return null;
  try {
    const { rows } = await pool.query(
      'SELECT user_id, email FROM public.auth_sessions WHERE token=$1 AND expires_at > NOW()',
      [raw]
    );
    return rows[0] || null;
  } catch (err) {
    return null;
  }
}

// ---------------------------------------------------------------------------
// 5. AWS Signature v4 для presigned URL (без сторонних зависимостей)
// ---------------------------------------------------------------------------
function awsSign(method, key, contentType, expiresSeconds) {
  const now = new Date();
  const date = now.toISOString().slice(0,10).replace(/-/g,'');
  const datetime = date + 'T' + now.toISOString().slice(11,19).replace(/:/g,'') + 'Z';

  const host = new URL(VK_S3_ENDPOINT).host;
  const encodedKey = encodeURIComponent(key).replace(/%2F/g, '/');
  const credentialScope = `${date}/${VK_S3_REGION}/s3/aws4_request`;
  const credential = `${VK_S3_ACCESS}/${credentialScope}`;

  const queryParams = [
    `X-Amz-Algorithm=AWS4-HMAC-SHA256`,
    `X-Amz-Credential=${encodeURIComponent(credential)}`,
    `X-Amz-Date=${datetime}`,
    `X-Amz-Expires=${expiresSeconds}`,
    `X-Amz-SignedHeaders=host`,
  ].sort().join('&');

  const canonicalRequest = [
    method,
    `/${VK_S3_BUCKET}/${encodedKey}`,
    queryParams,
    `host:${host}\n`,
    'host',
    'UNSIGNED-PAYLOAD',
  ].join('\n');

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    datetime,
    credentialScope,
    crypto.createHash('sha256').update(canonicalRequest).digest('hex'),
  ].join('\n');

  const sign = (key, msg) => crypto.createHmac('sha256', key).update(msg).digest();
  const signingKey = sign(sign(sign(sign(
    'AWS4' + VK_S3_SECRET, date), VK_S3_REGION), 's3'), 'aws4_request');
  const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');

  const url = `${VK_S3_ENDPOINT}/${VK_S3_BUCKET}/${encodedKey}?${queryParams}&X-Amz-Signature=${signature}`;
  const publicUrl = `${VK_S3_ENDPOINT}/${VK_S3_BUCKET}/${encodedKey}`;
  return { url, publicUrl };
}

// ---------------------------------------------------------------------------
// 6. Маппинг коллекций (как в index.html)
// ---------------------------------------------------------------------------
const COLL_TABLE = {
  users: 'users',
  chats: 'chats',
  friend_requests: 'friend_requests',
  stickerPacks: 'sticker_packs',
  callHistory: 'call_history',
};

function mapCol(table, field) {
  if (field === 'type')      return table === 'messages' ? 'msg_type' : 'type';
  if (field === 'privacy')   return 'privacy';
  if (field === 'members')   return 'members';
  if (field === 'nickLower') return 'nick_lower';
  if (field === 'to')        return 'to_uid';
  if (field === 'order')     return 'ord';
  if (field === 'at')        return 'at';
  if (field === 'chat_id')   return 'chat_id';
  if (field === 'user_id')   return 'user_id';
  return `doc->>'${field}'`;
}

// ---------------------------------------------------------------------------
// 7. Обработчики запросов
// ---------------------------------------------------------------------------
async function handleRequest(req, res) {
  if (req.method === 'OPTIONS') { json(res, 204, {}); return; }

  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const p   = url.pathname;

  // Health check
  if (p === '/api/health') { json(res, 200, { ok: true, backend: 'vkcloud' }); return; }

  // ── SSE Realtime ──────────────────────────────────────────────────────────
  if (p === '/api/events') {
    const session = await getSession(req);
    res.writeHead(200, {
      'Content-Type':               'text/event-stream',
      'Cache-Control':              'no-cache',
      'Connection':                 'keep-alive',
      'Access-Control-Allow-Origin':'*',
      'X-Accel-Buffering':          'no',
    });
    res.write(': connected\n\n');
    const client = { res, userId: session?.user_id };
    sseClients.add(client);
    req.on('close', () => sseClients.delete(client));
    // Пинг каждые 25 сек чтобы не дропалось
    const ping = setInterval(() => {
      try { res.write(': ping\n\n'); } catch (_) { clearInterval(ping); }
    }, 25000);
    req.on('close', () => clearInterval(ping));
    return;
  }

  // ── Presigned URL для загрузки в S3 ──────────────────────────────────────
  if (p === '/api/presign') {
    if (!S3_READY) { json(res, 503, { error: 'S3 не настроен (VK_S3_ACCESS/VK_S3_SECRET)' }); return; }
    const session = await getSession(req);
    const authHeader = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
    const uid     = session?.user_id || url.searchParams.get('uid') || (authHeader && authHeader !== 'anon' ? authHeader : '') || 'anon';
    const name    = (url.searchParams.get('name') || 'file')
      .normalize('NFKD').replace(/[^\w.\-]+/g, '_').slice(-80) || 'file';
    const ctype   = url.searchParams.get('type') || 'application/octet-stream';
    const key     = `${uid}/${Date.now()}_${crypto.randomBytes(4).toString('hex')}_${name}`;
    const { url: uploadUrl, publicUrl } = awsSign('PUT', key, ctype, 300);
    json(res, 200, { uploadUrl, publicUrl, key });
    return;
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  if (!pool && (p.startsWith('/api/auth/signup') || p.startsWith('/api/auth/signin') || p.startsWith('/api/query') || p.startsWith('/api/doc/'))) {
    return json(res, 503, { error: 'База данных PostgreSQL ещё не настроена. Укажите реальный VK_PG_URL в файле .env' });
  }

  if (p === '/api/auth/signup' && req.method === 'POST') {
    const body  = JSON.parse((await readBody(req)).toString() || '{}');
    const email = String(body.email || '').trim().toLowerCase();
    const pass  = String(body.password || '');
    if (!email || pass.length < 6)
      return json(res, 400, { error: 'Password should be at least 6 characters' });
    const exists = await pool.query('SELECT id FROM public.auth_users WHERE email=$1', [email]);
    if (exists.rows.length) return json(res, 400, { error: 'User already registered' });
    const uid   = genId();
    const phash = hashPassword(pass);
    await pool.query(
      'INSERT INTO public.auth_users(id,email,password_hash) VALUES($1,$2,$3)',
      [uid, email, phash]
    );
    const token = makeToken(uid, email);
    await pool.query(
      'INSERT INTO public.auth_sessions(token,user_id,email) VALUES($1,$2,$3)',
      [token, uid, email]
    );
    return json(res, 200, {
      data: { session: { access_token: token, user: { id: uid, email } }, user: { id: uid, email } }
    });
  }

  if (p === '/api/auth/signin' && req.method === 'POST') {
    const body  = JSON.parse((await readBody(req)).toString() || '{}');
    const email = String(body.email || '').trim().toLowerCase();
    const { rows } = await pool.query('SELECT * FROM public.auth_users WHERE email=$1', [email]);
    const user  = rows[0];
    if (!user || !verifyPassword(body.password || '', user.password_hash))
      return json(res, 401, { error: 'Invalid login credentials' });
    const token = makeToken(user.id, email);
    await pool.query(
      'INSERT INTO public.auth_sessions(token,user_id,email) VALUES($1,$2,$3)',
      [token, user.id, email]
    );
    return json(res, 200, {
      data: { session: { access_token: token, user: { id: user.id, email } }, user: { id: user.id, email } }
    });
  }

  if (p === '/api/auth/session') {
    const session = await getSession(req);
    if (!session) return json(res, 200, { data: { session: null } });
    return json(res, 200, {
      data: {
        session: {
          access_token: String(req.headers.authorization || '').replace(/^Bearer\s+/i, ''),
          user: { id: session.user_id, email: session.email }
        }
      }
    });
  }

  if (p === '/api/auth/signout' && req.method === 'POST') {
    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (token && pool) await pool.query('DELETE FROM public.auth_sessions WHERE token=$1', [token]);
    return json(res, 200, { ok: true });
  }

  // ── Query (SELECT) ────────────────────────────────────────────────────────
  if (p === '/api/query' && req.method === 'POST') {
    const body = JSON.parse((await readBody(req)).toString() || '{}');
    const table = COLL_TABLE[body.table] || body.table;
    let params = [], conds = [];
    let sql = `SELECT * FROM public.${quoteIdent(table)}`;

    // WHERE условия
    if (body.parent) {
      params.push(body.parent.val);
      conds.push(`${quoteIdent(body.parent.col)} = $${params.length}`);
    }
    for (const w of (body.wheres || [])) {
      const col = mapCol(table, w.field);
      if (w.op === 'array-contains' || w.op === 'contains') {
        params.push(JSON.stringify([w.val]));
        conds.push(`${col} @> $${params.length}::jsonb`);
      } else {
        params.push(w.val);
        conds.push(`${col} = $${params.length}`);
      }
    }
    if (conds.length) sql += ' WHERE ' + conds.join(' AND ');

    // ORDER BY
    if (body.order) {
      const col = mapCol(table, body.order.col || body.order.field);
      const asc = body.order.ascending !== false;
      const dir = body._limitLast ? !asc : asc;
      sql += ` ORDER BY ${col} ${dir ? 'ASC' : 'DESC'} NULLS LAST`;
    }

    // LIMIT
    if (body.limit != null) {
      params.push(Number(body.limit));
      sql += ` LIMIT $${params.length}`;
    }

    const { rows } = await pool.query(sql, params);
    const data = body._limitLast ? rows.reverse() : rows;
    return json(res, 200, { data });
  }

  // ── Doc get ───────────────────────────────────────────────────────────────
  if (p === '/api/doc/get' && req.method === 'POST') {
    const body  = JSON.parse((await readBody(req)).toString() || '{}');
    const table = COLL_TABLE[body.table] || body.table;
    const { rows } = await pool.query(
      `SELECT * FROM public.${quoteIdent(table)} WHERE id=$1`, [body.id]
    );
    return json(res, 200, { data: rows[0] || null });
  }

  // ── Doc apply ─────────────────────────────────────────────────────────────
  if (p === '/api/doc/apply' && req.method === 'POST') {
    const body  = JSON.parse((await readBody(req)).toString() || '{}');
    const table = COLL_TABLE[body.table] || body.table;
    await pool.query('SELECT public.doc_apply($1,$2,$3)', [table, body.id, JSON.stringify(body.ops || [])]);
    const { rows } = await pool.query(`SELECT * FROM public.${quoteIdent(table)} WHERE id=$1`, [body.id]);
    return json(res, 200, { data: rows[0] || null });
  }

  // ── Doc apply-batch ───────────────────────────────────────────────────────
  if (p === '/api/doc/apply-batch' && req.method === 'POST') {
    const body = JSON.parse((await readBody(req)).toString() || '{}');
    const items = (body.items || []).map(i => ({
      ...i, table: COLL_TABLE[i.table] || i.table
    }));
    await pool.query('SELECT public.doc_apply_batch($1)', [JSON.stringify(items)]);
    return json(res, 200, { ok: true });
  }

  // ── Doc delete ────────────────────────────────────────────────────────────
  if (p === '/api/doc/delete' && req.method === 'POST') {
    const body  = JSON.parse((await readBody(req)).toString() || '{}');
    const table = COLL_TABLE[body.table] || body.table;
    await pool.query('SELECT public.doc_delete($1,$2)', [table, body.id]);
    return json(res, 200, { ok: true });
  }

  json(res, 404, { error: 'Not found' });
}

function quoteIdent(name) {
  return '"' + String(name).replace(/"/g, '""') + '"';
}

// ---------------------------------------------------------------------------
// 8. HTTP сервер
// ---------------------------------------------------------------------------
const server = http.createServer(async (req, res) => {
  try {
    await handleRequest(req, res);
  } catch (e) {
    console.error('[vkcloud-backend]', e.message);
    try { json(res, 500, { error: e.message }); } catch (_) {}
  }
});

server.listen(PORT, HOST, async () => {
  console.log(`[vkcloud-backend] http://${HOST}:${PORT}`);
  console.log(`[vkcloud-backend] S3 ready: ${S3_READY}`);
  console.log(`[vkcloud-backend] PostgreSQL ready: ${!!pool}`);
  if (pool) await startPgListen();
  else console.warn('[vkcloud-backend] Realtime & DB отключены (VK_PG_URL не настроен)');
});

module.exports = { server, pool };
