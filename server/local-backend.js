const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { URL } = require('url');

const ROOT = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const DEFAULT_DATA_DIR = path.join(ROOT, 'data');

function ensureDirs(dataDir, uploadDir) {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(uploadDir, { recursive: true });
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (_) {
    return fallback;
  }
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function id() {
  return crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(String(password), salt, 120000, 32, 'sha256').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = String(stored || '').split(':');
  if (!salt || !hash) return false;
  const next = hashPassword(password, salt).split(':')[1];
  const b1 = Buffer.from(hash, 'hex');
  const b2 = Buffer.from(next, 'hex');
  if (b1.length !== b2.length) return false;
  return crypto.timingSafeEqual(b1, b2);
}

function nowTs() {
  return { __ts__: new Date().toISOString() };
}

function getAt(obj, parts) {
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

function setAt(obj, parts, value) {
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    if (!cur[key] || typeof cur[key] !== 'object' || Array.isArray(cur[key])) cur[key] = {};
    cur = cur[key];
  }
  cur[parts[parts.length - 1]] = value;
}

function deleteAt(obj, parts) {
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    cur = cur && cur[parts[i]];
    if (!cur || typeof cur !== 'object') return;
  }
  delete cur[parts[parts.length - 1]];
}

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function applyOps(doc, ops) {
  for (const op of ops || []) {
    const parts = op.path || [];
    if (op.op === 'set' && parts.length === 0) {
      for (const key of Object.keys(doc)) delete doc[key];
      Object.assign(doc, op.value || {});
      continue;
    }
    if (op.op === 'set') setAt(doc, parts, op.value);
    else if (op.op === 'serverNow') setAt(doc, parts, nowTs());
    else if (op.op === 'delete') deleteAt(doc, parts);
    else if (op.op === 'increment') setAt(doc, parts, Number(getAt(doc, parts) || 0) + Number(op.value || 0));
    else if (op.op === 'arrayUnion') {
      const prev = Array.isArray(getAt(doc, parts)) ? getAt(doc, parts) : [];
      for (const item of op.value || []) if (!prev.some((x) => deepEqual(x, item))) prev.push(item);
      setAt(doc, parts, prev);
    } else if (op.op === 'arrayRemove') {
      const prev = Array.isArray(getAt(doc, parts)) ? getAt(doc, parts) : [];
      setAt(doc, parts, prev.filter((x) => !(op.value || []).some((item) => deepEqual(x, item))));
    }
  }
}

function colValue(row, col) {
  const doc = row.doc || {};
  if (col === 'id') return row.id;
  if (col === 'members') return doc.members;
  if (col === 'type' || col === 'msg_type') return doc.type;
  if (col === 'privacy') return doc.privacy;
  if (col === 'nick_lower') return doc.nickLower;
  if (col === 'to_uid') return doc.to;
  if (col === 'ord') return doc.order;
  if (col === 'at') return doc.at;
  if (col === 'chat_id') return doc.chat_id;
  if (col === 'user_id') return doc.user_id;
  const m = /^doc->>(.+)$/.exec(col);
  if (m) return getAt(doc, m[1].split('.'));
  return getAt(doc, String(col).split('.'));
}

function comparable(v) {
  if (v && typeof v === 'object' && typeof v.__ts__ === 'string') return new Date(v.__ts__).getTime();
  return v == null ? '' : v;
}

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.html') return 'text/html; charset=utf-8';
  if (ext === '.js') return 'text/javascript; charset=utf-8';
  if (ext === '.css') return 'text/css; charset=utf-8';
  if (ext === '.json' || ext === '.webmanifest') return 'application/manifest+json; charset=utf-8';
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.svg') return 'image/svg+xml; charset=utf-8';
  return 'application/octet-stream';
}

function createLocalBackend(options = {}) {
  const dataDir = options.dataDir || DEFAULT_DATA_DIR;
  const uploadDir = path.join(dataDir, 'uploads');
  const dbPath = path.join(dataDir, 'db.json');
  const authPath = path.join(dataDir, 'auth.json');
  ensureDirs(dataDir, uploadDir);
  let db = readJson(dbPath, { tables: {} });
  let auth = readJson(authPath, { users: {} });
  const sessions = new Map();
  const clients = new Set();
  const publicDir = options.publicDir || PUBLIC_DIR;

  function saveDb() { writeJson(dbPath, db); }
  function saveAuth() { writeJson(authPath, auth); }
  function table(name) {
    db.tables[name] = db.tables[name] || {};
    return db.tables[name];
  }
  function notify(tableName, rowId) {
    const data = `data: ${JSON.stringify({ table: tableName, id: rowId, at: Date.now() })}\n\n`;
    for (const res of clients) res.write(data);
  }
  function json(res, status, body) {
    res.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
    });
    res.end(JSON.stringify(body));
  }
  function readBody(req) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      req.on('data', (chunk) => chunks.push(chunk));
      req.on('end', () => resolve(Buffer.concat(chunks)));
      req.on('error', reject);
    });
  }
  function userFromReq(req) {
    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    return token ? sessions.get(token) : null;
  }
  function authResponse(user) {
    const token = id();
    sessions.set(token, { id: user.id, email: user.email });
    return {
      user: { id: user.id, email: user.email },
      access_token: token
    };
  }

  async function handleApi(req, res, url) {
    if (req.method === 'OPTIONS') return json(res, 204, {});

    if (url.pathname === '/api/health') return json(res, 200, { ok: true });

    if (url.pathname === '/api/events') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      });
      res.write('\n');
      clients.add(res);
      req.on('close', () => clients.delete(res));
      return;
    }

    if (url.pathname === '/api/auth/signup' && req.method === 'POST') {
      const body = JSON.parse((await readBody(req)).toString('utf8') || '{}');
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');
      const nick = String(body.nick || body.username || '').trim().replace(/^@+/, '');

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return json(res, 400, { error: 'Некорректный формат email' });
      }
      if (email.length > 32) {
        return json(res, 400, { error: 'Логин не должен превышать 32 символа' });
      }
      if (password.length < 6 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
        return json(res, 400, { error: 'Пароль должен содержать не менее 6 символов, буквы и цифры' });
      }
      if (nick) {
        if (!/^[a-zA-Z0-9_]{3,32}$/.test(nick) || !/[a-zA-Z]/.test(nick)) {
          return json(res, 400, { error: 'Юзернейм может содержать только латиницу (a-z), цифры и _ (3-32 символа)' });
        }
        const nickTaken = Object.values(auth.users).some(u => String(u.nick || '').toLowerCase() === nick.toLowerCase());
        if (nickTaken) {
          return json(res, 400, { error: `Юзернейм @${nick} уже занят` });
        }
      }
      if (auth.users[email]) return json(res, 400, { error: 'Пользователь с таким email уже зарегистрирован' });
      const user = { 
        id: id(), 
        email, 
        nick: nick || email.split('@')[0], 
        nickLower: (nick || email.split('@')[0]).toLowerCase(), 
        passwordHash: hashPassword(password) 
      };
      auth.users[email] = user;
      saveAuth();
      return json(res, 200, { data: { session: authResponse(user), user: { id: user.id, email } } });
    }

    if (url.pathname === '/api/auth/signin' && req.method === 'POST') {
      const body = JSON.parse((await readBody(req)).toString('utf8') || '{}');
      const input = String(body.email || body.login || '').trim().toLowerCase();
      const password = String(body.password || '');
      
      let user = auth.users[input];
      if (!user) {
        const clean = input.replace(/^@+/, '');
        user = Object.values(auth.users).find(u => 
          String(u.nickLower || u.nick || '').toLowerCase() === clean
        );
      }
      if (!user || !verifyPassword(password, user.passwordHash)) {
        return json(res, 401, { error: 'Неверный логин или пароль' });
      }
      return json(res, 200, { data: { session: authResponse(user), user: { id: user.id, email: user.email } } });
    }

    if (url.pathname === '/api/auth/otp-request' && req.method === 'POST') {
      const body = JSON.parse((await readBody(req)).toString('utf8') || '{}');
      const input = String(body.email || body.login || '').trim().toLowerCase();
      let user = auth.users[input];
      if (!user) {
        const clean = input.replace(/^@+/, '');
        user = Object.values(auth.users).find(u => 
          String(u.nickLower || u.nick || '').toLowerCase() === clean
        );
      }
      if (!user) return json(res, 404, { error: 'Пользователь не найден' });

      const code = String(Math.floor(100000 + Math.random() * 900000));
      if (!global._localOtps) global._localOtps = new Map();
      global._localOtps.set(user.email, {
        code,
        expiresAt: Date.now() + 10 * 60 * 1000,
        user
      });
      console.log(`[LocalBackend OTP] Код для ${user.email}: ${code}`);
      return json(res, 200, { success: true, email: user.email, code });
    }

    if (url.pathname === '/api/auth/otp-verify' && req.method === 'POST') {
      const body = JSON.parse((await readBody(req)).toString('utf8') || '{}');
      const email = String(body.email || '').trim().toLowerCase();
      const code = String(body.code || '').trim();

      if (!global._localOtps) global._localOtps = new Map();
      const rec = global._localOtps.get(email);
      if (!rec || Date.now() > rec.expiresAt || rec.code !== code) {
        return json(res, 400, { error: 'Неверный или истёкший одноразовый код' });
      }
      global._localOtps.delete(email);
      return json(res, 200, { data: { session: authResponse(rec.user), user: { id: rec.user.id, email: rec.user.email } } });
    }

    if (url.pathname === '/api/auth/session') {
      const user = userFromReq(req);
      return json(res, 200, { data: { session: user ? { user, access_token: String(req.headers.authorization).replace(/^Bearer\s+/i, '') } : null } });
    }

    if (url.pathname === '/api/auth/signout' && req.method === 'POST') {
      const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
      if (token) sessions.delete(token);
      return json(res, 200, { ok: true });
    }

    if (url.pathname === '/api/query' && req.method === 'POST') {
      const body = JSON.parse((await readBody(req)).toString('utf8') || '{}');
      let rows = Object.entries(table(body.table)).map(([rowId, doc]) => ({ id: rowId, doc }));
      for (const w of body.wheres || []) {
        rows = rows.filter((row) => {
          const got = colValue(row, w.col);
          if (w.op === 'contains') return Array.isArray(got) && (w.val || []).every((x) => got.includes(x));
          return got === w.val;
        });
      }
      if (body.order) {
        const dir = body.order.ascending === false ? -1 : 1;
        rows.sort((a, b) => {
          const av = comparable(colValue(a, body.order.col));
          const bv = comparable(colValue(b, body.order.col));
          return av < bv ? -dir : av > bv ? dir : 0;
        });
      }
      if (body.limit != null) rows = rows.slice(0, Number(body.limit));
      return json(res, 200, { data: rows });
    }

    if (url.pathname === '/api/doc/get' && req.method === 'POST') {
      const body = JSON.parse((await readBody(req)).toString('utf8') || '{}');
      const doc = table(body.table)[body.id] || null;
      return json(res, 200, { data: doc ? { id: body.id, doc } : null });
    }

    if (url.pathname === '/api/doc/apply' && req.method === 'POST') {
      const body = JSON.parse((await readBody(req)).toString('utf8') || '{}');
      const t = table(body.table);
      t[body.id] = t[body.id] || {};
      applyOps(t[body.id], body.ops || []);
      saveDb();
      notify(body.table, body.id);
      return json(res, 200, { data: t[body.id] });
    }

    if (url.pathname === '/api/doc/apply-batch' && req.method === 'POST') {
      const body = JSON.parse((await readBody(req)).toString('utf8') || '{}');
      for (const item of body.items || []) {
        const t = table(item.table);
        t[item.id] = t[item.id] || {};
        applyOps(t[item.id], item.ops || []);
        notify(item.table, item.id);
      }
      saveDb();
      return json(res, 200, { ok: true });
    }

    if (url.pathname === '/api/doc/delete' && req.method === 'POST') {
      const body = JSON.parse((await readBody(req)).toString('utf8') || '{}');
      delete table(body.table)[body.id];
      saveDb();
      notify(body.table, body.id);
      return json(res, 200, { ok: true });
    }

    // YooKassa Payment integration
    if (url.pathname === '/api/payment/yookassa/create' && req.method === 'POST') {
      try {
        const body = JSON.parse((await readBody(req)).toString('utf8') || '{}');
        const { amount, pirozhki, uid, email, description, returnUrl } = body;
        const shopId = process.env.YOOKASSA_SHOP_ID;
        const secretKey = process.env.YOOKASSA_SECRET_KEY;
        const orderId = 'bch_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex');
        const fallbackConfirmationUrl = (returnUrl || 'https://nonsensechattm-e5d18.web.app') + 
          '?paymentSuccess=true&orderId=' + encodeURIComponent(orderId) + 
          '&pirozhki=' + encodeURIComponent(pirozhki || 100);

        if (shopId && secretKey) {
          try {
            const ykPayload = {
              amount: { value: parseFloat(amount || 40).toFixed(2), currency: 'RUB' },
              confirmation: {
                type: 'redirect',
                return_url: fallbackConfirmationUrl
              },
              capture: true,
              description: description || ('Пополнение баланса (' + (pirozhki || 100) + ' пирожков) в NonsenseChat'),
              metadata: { orderId, uid: uid || '', pirozhki: pirozhki || 100 }
            };
            const ykRes = await fetch('https://api.yookassa.ru/v3/payments', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Idempotence-Key': orderId,
                'Authorization': 'Basic ' + Buffer.from(shopId + ':' + secretKey).toString('base64')
              },
              body: JSON.stringify(ykPayload)
            });
            const ykData = await ykRes.json();
            return json(res, 200, {
              ok: true,
              orderId,
              paymentId: ykData.id,
              confirmationUrl: ykData.confirmation ? ykData.confirmation.confirmation_url : fallbackConfirmationUrl,
              status: ykData.status
            });
          } catch (ykErr) {
            console.error('[YooKassa] API Error:', ykErr);
          }
        }

        // Demo/Sandbox fallback mode for YooKassa moderation and local verification
        return json(res, 200, {
          ok: true,
          orderId,
          paymentId: 'demo_' + orderId,
          confirmationUrl: fallbackConfirmationUrl,
          isDemo: true,
          message: 'Демо-режим: укажите YOOKASSA_SHOP_ID и YOOKASSA_SECRET_KEY в .env для боевых платежей.'
        });
      } catch (err) {
        return json(res, 500, { ok: false, error: err.message });
      }
    }

    if (url.pathname === '/api/payment/yookassa/webhook' && req.method === 'POST') {
      try {
        const event = JSON.parse((await readBody(req)).toString('utf8') || '{}');
        if (event && event.event === 'payment.succeeded' && event.object) {
          const { metadata, amount } = event.object;
          const uid = metadata && metadata.uid;
          const pirozhki = parseInt(metadata && metadata.pirozhki, 10);
          if (uid && pirozhki > 0) {
            const usersTbl = table('users');
            if (usersTbl[uid]) {
              usersTbl[uid].pirozhki = (usersTbl[uid].pirozhki || 0) + pirozhki;
              saveDb();
              notify('users', uid);
            }
          }
        }
        return json(res, 200, { ok: true });
      } catch (err) {
        return json(res, 400, { ok: false, error: err.message });
      }
    }

    if (url.pathname === '/api/upload' && req.method === 'PUT') {
      const name = path.basename(url.searchParams.get('name') || 'file').replace(/[^\w.\-]+/g, '_') || 'file';
      const ext = path.extname(name);
      const fileName = `${Date.now()}_${crypto.randomBytes(4).toString('hex')}${ext || '_' + name}`;
      const filePath = path.join(uploadDir, fileName);
      const body = await readBody(req);
      fs.writeFileSync(filePath, body);
      return json(res, 200, { url: `/uploads/${encodeURIComponent(fileName)}` });
    }

    return json(res, 404, { error: 'Not found' });
  }

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url || '/', 'http://127.0.0.1');
      if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url);
      if (url.pathname.startsWith('/uploads/')) {
        const filePath = path.join(uploadDir, path.basename(decodeURIComponent(url.pathname.slice('/uploads/'.length))));
        fs.readFile(filePath, (err, data) => {
          if (err) { res.writeHead(404); res.end('Not found'); return; }
          res.writeHead(200, { 'Content-Type': contentType(filePath), 'Cache-Control': 'public, max-age=31536000' });
          res.end(data);
        });
        return;
      }
      const rawPath = decodeURIComponent(url.pathname);
      let relativePath = rawPath === '/' ? '' : rawPath.replace(/^\/+/, '');

      const defaultIndex = 'index.html';

      if (!relativePath) {
        relativePath = defaultIndex;
      }

      let resolved = path.resolve(publicDir, relativePath);

      if (!resolved.startsWith(path.resolve(publicDir))) { res.writeHead(403); res.end('Forbidden'); return; }

      // If directory is requested, look for index.html inside
      try {
        if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
          const subIndex = path.join(resolved, 'index.html');
          if (fs.existsSync(subIndex)) {
            resolved = subIndex;
          }
        }
      } catch (_) {}

      fs.readFile(resolved, (err, data) => {
        if (err) {
          // Only fallback to index.html for navigation routes (not static files with extensions)
          const ext = path.extname(url.pathname);
          if (ext && ext !== '.html') {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Not found: ' + url.pathname);
            return;
          }
          const fallbackPath = path.join(publicDir, defaultIndex);
          fs.readFile(fallbackPath, (fallbackErr, fallback) => {
            if (fallbackErr) { res.writeHead(404); res.end('Not found'); return; }
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
            res.end(fallback);
          });
          return;
        }
        res.writeHead(200, { 'Content-Type': contentType(resolved), 'Cache-Control': 'no-store' });
        res.end(data);
      });
    } catch (error) {
      json(res, 500, { error: error.message });
    }
  });

  return server;
}

if (require.main === module) {
  const port = Number(process.env.PORT || 8787);
  const host = process.env.HOST || '127.0.0.1';
  createLocalBackend().listen(port, host, () => {
    console.log(`Nonsense local backend: http://${host}:${port}`);
  });
}

module.exports = { createLocalBackend };
