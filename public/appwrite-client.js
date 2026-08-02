/* ════════════════════════════════════════════════════════════════════════
   APPWRITE BACKEND ADAPTER
   Эмулирует тот же интерфейс window.supabase.createClient(), что и
   pocketbase-client.js, но работает поверх Appwrite Cloud (бесплатный план).
   Приложение (index.html) не меняется — только загрузчик бэкенда.

   Требует Appwrite Web SDK (window.Appwrite), подключить ПЕРЕД этим файлом:
     <script src="https://cdn.jsdelivr.net/npm/appwrite@16.0.2"></script>

   Конфиг задаётся в index.html:
     window.NONSENSE_APPWRITE = { endpoint, projectId, databaseId, bucketId }

   Схему БД (коллекции + атрибуты + индексы + бакет) создаёт один раз
   server/setup-appwrite.js.
   ════════════════════════════════════════════════════════════════════════ */
(function () {
  const CFG = window.NONSENSE_APPWRITE || {};
  const ENDPOINT = String(CFG.endpoint || 'https://cloud.appwrite.io/v1').replace(/\/+$/, '');
  const PROJECT = String(CFG.projectId || '');
  const DB_ID = String(CFG.databaseId || 'nonsense');
  const BUCKET = String(CFG.bucketId || 'uploads');
  const IMGBB_KEY = String(CFG.imgbbKey || ''); // безлимитный хост для картинок
  const SESSION_KEY = 'nonsense-appwrite-session';
  const PAGE = 100; // размер страницы listDocuments

  if (typeof window.Appwrite === 'undefined') {
    console.error('[appwrite-client] Appwrite SDK не загружен. Подключите CDN appwrite@16 перед appwrite-client.js');
  }
  if (!PROJECT) {
    console.error('[appwrite-client] Не задан projectId. Заполните window.NONSENSE_APPWRITE.projectId в index.html');
  }

  const AW = window.Appwrite || {};
  const { Client, Account, Databases, Storage, Query, ID, Permission, Role } = AW;

  const client = new Client();
  try { client.setEndpoint(ENDPOINT).setProject(PROJECT); } catch (_) {}
  const account = new Account(client);
  const databases = new Databases(client);
  const storage = new Storage(client);

  // Колонки запроса, которые можно протолкнуть в Appwrite Query (индексируемые атрибуты).
  // Только однозначные id-подобные поля — чтобы не попасть на атрибут, которого нет в коллекции.
  const PUSH_ATTR = {
    id: 'doc_id', doc_id: 'doc_id', chat_id: 'chat_id',
    to_uid: 'to_uid', user_id: 'user_id', nick_lower: 'nick_lower'
  };

  let session = parseStoredSession();
  const authListeners = new Set();
  const tableListeners = {};
  const realtimeUnsub = {};

  function parseStoredSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch (_) { return null; }
  }
  function saveSession(next) {
    session = next;
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  }
  function token() { return session && session.access_token; }

  function emitAuth(event) {
    const payload = session ? { user: session.user, access_token: session.access_token } : null;
    authListeners.forEach((fn) => {
      try { fn(event || (session ? 'SIGNED_IN' : 'SIGNED_OUT'), payload); } catch (_) {}
    });
  }

  function safeId() {
    try { return crypto.randomUUID(); } catch (_) { return 'id' + Date.now() + Math.random().toString(36).slice(2, 10); }
  }
  function newId() {
    if (ID && typeof ID.unique === 'function') return ID.unique();
    return safeId().replace(/-/g, '').slice(0, 36);
  }

  /* ── операции над doc (идентично pocketbase-client.js) ── */
  function getAt(obj, parts) {
    let cur = obj;
    for (const p of parts) { if (cur == null) return undefined; cur = cur[p]; }
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
  function deepEqual(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

  function applyOps(doc, ops) {
    for (const op of ops || []) {
      const parts = op.path || [];
      if (op.op === 'set' && parts.length === 0) {
        for (const key of Object.keys(doc)) delete doc[key];
        Object.assign(doc, op.value || {});
        continue;
      }
      if (op.op === 'set') setAt(doc, parts, op.value);
      else if (op.op === 'serverNow') setAt(doc, parts, { __ts__: new Date().toISOString() });
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

  function tsValue(v) {
    if (v && typeof v === 'object' && typeof v.__ts__ === 'string') return v.__ts__;
    if (v instanceof Date) return v.toISOString();
    if (typeof v === 'string') return v;
    return '';
  }

  // Индексируемые поля коллекции + сериализованный doc (строка JSON для Appwrite).
  function buildData(table, docId, docObj) {
    const doc = docObj || {};
    const data = { doc_id: String(docId), doc: JSON.stringify(doc) };
    if (table === 'users') {
      data.nick_lower = doc.nickLower ? String(doc.nickLower) : '';
    } else if (table === 'chats') {
      data.members = Array.isArray(doc.members) ? doc.members : [];
      data.type = doc.type ? String(doc.type) : '';
      data.privacy = doc.privacy ? String(doc.privacy) : '';
    } else if (table === 'messages') {
      data.chat_id = doc.chat_id ? String(doc.chat_id) : '';
      // Никогда не пишем пустой at: сообщение без метки времени вылетало
      // из сортировки по at и «терялось» в списке чата.
      data.at = tsValue(doc.at) || new Date().toISOString();
      data.msg_type = doc.type ? String(doc.type) : '';
    } else if (table === 'folders') {
      data.user_id = doc.user_id ? String(doc.user_id) : '';
      data.ord = Number(doc.order ? doc.order : 0);
    } else if (table === 'call_history') {
      data.chat_id = doc.chat_id ? String(doc.chat_id) : '';
    } else if (table === 'friend_requests') {
      data.to_uid = doc.to ? String(doc.to) : '';
    }
    return data;
  }

  // Appwrite-документ → строка приложения (id = doc_id, doc распакован из JSON).
  function recordToRow(record) {
    let doc = {};
    try {
      if (record && typeof record.doc === 'string') doc = JSON.parse(record.doc || '{}');
      else if (record && record.doc && typeof record.doc === 'object') doc = record.doc;
    } catch (_) { doc = {}; }
    return Object.assign({}, record, {
      id: record.doc_id || record.$id,
      _awId: record.$id,
      doc
    });
  }

  function colValue(row, col) {
    const doc = row.doc || {};
    if (col === 'id') return row.id;
    if (col === 'members') return row.members != null ? row.members : doc.members;
    if (col === 'type' || col === 'msg_type') return row[col] != null ? row[col] : doc.type;
    if (col === 'privacy') return row.privacy != null ? row.privacy : doc.privacy;
    if (col === 'nick_lower') return row.nick_lower != null ? row.nick_lower : doc.nickLower;
    if (col === 'to_uid') return row.to_uid != null ? row.to_uid : doc.to;
    if (col === 'ord') return row.ord != null ? row.ord : doc.order;
    if (col === 'at') return row.at != null ? row.at : doc.at;
    if (col === 'chat_id') return row.chat_id != null ? row.chat_id : doc.chat_id;
    if (col === 'user_id') return row.user_id != null ? row.user_id : doc.user_id;
    const m = /^doc->>(.+)$/.exec(col);
    if (m) return doc[m[1]];
    return row[col] != null ? row[col] : doc[col];
  }

  function comparable(v) {
    if (v && typeof v === 'object' && typeof v.__ts__ === 'string') return new Date(v.__ts__).getTime();
    if (typeof v === 'string' && /^\d{4}-\d\d-\d\dT/.test(v)) return new Date(v).getTime();
    return v == null ? '' : v;
  }
  // Сравнение с учётом смешанных типов: число и строка раньше сравнивались
  // напрямую ('' < 1700000000000 → false в JS), из-за чего сообщения без
  // корректного at рвали порядок сортировки и «прятали» соседние сообщения.
  function cmpValues(a, b) {
    const an = typeof a === 'number', bn = typeof b === 'number';
    if (an && bn) return a < b ? -1 : a > b ? 1 : 0;
    if (an) return 1;   // валидная дата всегда «позже» мусора
    if (bn) return -1;
    const as = String(a == null ? '' : a), bs = String(b == null ? '' : b);
    return as < bs ? -1 : as > bs ? 1 : 0;
  }

  /* ── чтение из Appwrite ── */
  async function listAll(table) {
    const all = [];
    for (let off = 0; off < 20000; off += PAGE) {
      const res = await databases.listDocuments(DB_ID, table, [Query.limit(PAGE), Query.offset(off)]);
      const items = res.documents || [];
      all.push(...items.map(recordToRow));
      if (items.length < PAGE) break;
    }
    return all;
  }

  async function pagedList(table, filters) {
    const all = [];
    for (let off = 0; off < 20000; off += PAGE) {
      const q = filters.concat([Query.limit(PAGE), Query.offset(off)]);
      const res = await databases.listDocuments(DB_ID, table, q);
      const items = res.documents || [];
      all.push(...items.map(recordToRow));
      if (items.length < PAGE) break;
    }
    return all;
  }

  async function findRecord(table, docId) {
    // Возвращаем null ТОЛЬКО когда запрос успешно вернул 0 документов.
    // Сбой запроса пробрасываем: раньше он маскировался под «документа нет»,
    // из-за чего профиль перезаписывался дефолтом (слетали ник/аватар),
    // а записи создавали дубликаты.
    const res = await databases.listDocuments(DB_ID, table, [Query.equal('doc_id', String(docId)), Query.limit(1)]);
    return (res.documents && res.documents[0]) || null;
  }

  function pushFilters(wheres) {
    // members — массив без индекса в Appwrite, поэтому не проталкиваем такие
    // фильтры на сервер: возвращаем null → runQuery делает клиентский скан.
    const q = [];
    for (const w of wheres) {
      const attr = PUSH_ATTR[w.col];
      if (!attr || w.op !== 'eq') return null;
      q.push(Query.equal(attr, w.val));
    }
    return q;
  }

  function filterClient(rows, wheres) {
    let out = rows;
    for (const w of wheres) {
      out = out.filter((row) => {
        const got = colValue(row, w.col);
        if (w.op === 'contains') return Array.isArray(got) && (w.val || []).every((x) => got.includes(x));
        return got === w.val;
      });
    }
    return out;
  }

  async function runQuery(state) {
    if (state.single && state.wheres.length === 1 && state.wheres[0].op === 'eq' && state.wheres[0].col === 'id') {
      const rec = await findRecord(state.table, state.wheres[0].val);
      return rec ? [recordToRow(rec)] : [];
    }

    let rows;
    const filters = pushFilters(state.wheres);
    if (filters) {
      try { rows = await pagedList(state.table, filters); }
      catch (_) { rows = filterClient(await listAll(state.table), state.wheres); }
    } else {
      rows = filterClient(await listAll(state.table), state.wheres);
    }

    if (state.order) {
      const dir = state.order.ascending === false ? -1 : 1;
      rows.sort((a, b) => {
        const av = comparable(colValue(a, state.order.col));
        const bv = comparable(colValue(b, state.order.col));
        return cmpValues(av, bv) * dir;
      });
    }
    if (state.limit != null) rows = rows.slice(0, Number(state.limit));
    return rows;
  }

  function makeQuery(table) {
    const state = { table, wheres: [], order: null, limit: null, single: false };
    const q = {
      select() { return q; },
      eq(col, val) { state.wheres.push({ op: 'eq', col, val }); return q; },
      contains(col, val) { state.wheres.push({ op: 'contains', col, val }); return q; },
      order(col, opts) { state.order = { col, ascending: !(opts && opts.ascending === false) }; return q; },
      limit(n) { state.limit = n; return q; },
      maybeSingle() { state.single = true; return q; },
      then(resolve) {
        runQuery(state)
          .then((rows) => resolve({ data: state.single ? (rows[0] || null) : rows, error: null }))
          // Сбой запроса — это ОШИБКА, а не «данных нет». Пробрасываем code/status,
          // чтобы вызывающий код (DocRef.get) отличал реальное отсутствие документа
          // (PGRST116) от неудавшегося чтения и не затирал профиль дефолтом.
          .catch((e) => resolve({
            data: state.single ? null : [],
            error: {
              message: e.message,
              code: e.code || e.status || 'query_failed',
              status: e.code || e.status
            }
          }));
      }
    };
    return q;
  }

  /* ── realtime ── */
  function emitTable(table, record, action) {
    const row = record ? recordToRow(record) : null;
    const payload = action === 'delete' ? { old: row || {}, new: null } : { old: {}, new: row || {} };
    (tableListeners[table] || []).forEach((fn) => {
      try { fn(payload); } catch (_) {}
    });
  }

  function registerRealtime(table, cb) {
    tableListeners[table] = tableListeners[table] || [];
    tableListeners[table].push(cb);
    if (!realtimeUnsub[table] && typeof client.subscribe === 'function') {
      try {
        realtimeUnsub[table] = client.subscribe(
          `databases.${DB_ID}.collections.${table}.documents`,
          (resp) => {
            const events = resp && resp.events || [];
            const isDelete = events.some((e) => /\.delete$/.test(e));
            emitTable(table, resp && resp.payload, isDelete ? 'delete' : 'update');
          }
        );
      } catch (_) {}
    }
    return () => {
      const arr = tableListeners[table] || [];
      const i = arr.indexOf(cb);
      if (i >= 0) arr.splice(i, 1);
    };
  }

  /* ── запись документов ── */
  async function docApply(table, docId, ops) {
    // В Appwrite auth и коллекция users независимы: отсутствие документа users
    // означает «профиль ещё не создан», а не битую сессию — просто создаём его.
    let record = await findRecord(table, docId);
    let docObj = {};
    if (record) { try { docObj = JSON.parse(record.doc || '{}'); } catch (_) { docObj = {}; } }
    applyOps(docObj, ops || []);
    // У сообщения всегда должна быть метка времени — иначе оно не отрис��ется
    // корректно и выпадет из сортировки/группировки по дате.
    if (table === 'messages' && !tsValue(docObj.at)) {
      docObj.at = { __ts__: new Date().toISOString() };
    }
    const data = buildData(table, docId, docObj);
    let saved;
    if (record) {
      try {
        saved = await databases.updateDocument(DB_ID, table, record.$id, data);
      } catch (err) {
        console.warn('[appwrite-client] updateDocument (PATCH) failed, falling back to recreate via POST:', err.message);
        try { await databases.deleteDocument(DB_ID, table, record.$id); } catch (_) {}
        saved = await databases.createDocument(DB_ID, table, newId(), data);
      }
    } else {
      saved = await databases.createDocument(DB_ID, table, newId(), data);
    }
    emitTable(table, saved, 'update');
    return saved;
  }

  async function docDelete(table, docId) {
    const record = await findRecord(table, docId);
    if (!record) return;
    await databases.deleteDocument(DB_ID, table, record.$id);
    emitTable(table, record, 'delete');
  }

  /* ── auth ── */
  function mapAuthErr(error) {
    const m = (error && error.message || '').toLowerCase();
    if (/already|unique|exists|registered/.test(m)) return { message: error.message, code: 'auth/email-already-in-use' };
    if (/invalid|failed|password|identity|credential/.test(m)) return { message: error.message, code: 'auth/invalid-credential' };
    if (/short|length|weak|least|8 char/.test(m)) return { message: error.message, code: 'auth/weak-password' };
    return { message: error.message || 'auth error', code: (error && (error.code || error.status)) || 'auth/error' };
  }

  let refreshInFlight = null;
  async function refreshSession() {
    // Дедуп: getSession() и onAuthStateChange на старте зовут это одновременно —
    // делим один account.get(), чтобы не удваивать запрос и не ловить лимит.
    if (refreshInFlight) return refreshInFlight;
    refreshInFlight = (async () => {
      try {
        const u = await account.get();
        if (!u || !u.$id) throw new Error('no user');
        const next = { access_token: 'appwrite:' + u.$id, user: { id: u.$id, email: u.email || '', verified: !!u.emailVerification } };
        saveSession(next);
        return next;
      } catch (e) {
        // Разлогиниваем ТОЛЬКО при явной потере авторизации (401/гость).
        // Сетевые сбои и лимит запросов (частая перезагрузка) НЕ должны выкидывать
        // из аккаунта — иначе после reload приходится входить заново.
        const code = e && (e.code || e.status);
        const msg = String(e && e.message || '').toLowerCase();
        const unauth = code === 401 || /unauthor|role: guest|guests|missing scope|not authorized/.test(msg);
        if (unauth) { saveSession(null); return null; }
        return session; // оставляем прежнюю сессию (cookie Appwrite ещё в localStorage)
      } finally {
        refreshInFlight = null;
      }
    })();
    return refreshInFlight;
  }

  const client_api = {
    auth: {
      async signUp({ email, password }) {
        try {
          await account.create(newId(), email, password);
          return await this.signInWithPassword({ email, password });
        } catch (e) {
          return { data: {}, error: mapAuthErr(e) };
        }
      },
      async signInWithPassword({ email, password }) {
        try {
          try {
            await account.createEmailPasswordSession(email, password);
          } catch (e) {
            // Уже есть активная сессия — не считаем ошибкой, просто продолжаем.
            if (!/session is active|already|prohibited when a session/i.test(e && e.message || '')) throw e;
          }
          const u = await account.get();
          const next = { access_token: 'appwrite:' + u.$id, user: { id: u.$id, email: u.email || '', verified: !!u.emailVerification } };
          saveSession(next);
          emitAuth('SIGNED_IN');
          return { data: { session: next, user: next.user }, error: null };
        } catch (e) {
          return { data: {}, error: mapAuthErr(e) };
        }
      },
      async getSession() {
        const current = await refreshSession();
        return { data: { session: current }, error: null };
      },
      onAuthStateChange(cb) {
        authListeners.add(cb);
        setTimeout(async () => cb('INITIAL_SESSION', await refreshSession()), 0);
        return { data: { subscription: { unsubscribe() { authListeners.delete(cb); } } } };
      },
      async signOut() {
        try { await account.deleteSession('current'); } catch (_) {}
        saveSession(null);
        emitAuth('SIGNED_OUT');
        return { error: null };
      }
    },
    realtime: { setAuth() {} },
    from: makeQuery,
    channel() {
      const handlers = [];
      return {
        on(_kind, cfg, cb) {
          if (cfg && cfg.table && cb) handlers.push({ table: cfg.table, cb });
          return this;
        },
        subscribe() {
          handlers.forEach((h) => registerRealtime(h.table, h.cb));
          return this;
        }
      };
    },
    async rpc(name, args) {
      try {
        if (name === 'doc_apply') {
          const data = await docApply(args._table, args._id, args._ops || []);
          return { data, error: null };
        }
        if (name === 'doc_delete') {
          await docDelete(args._table, args._id);
          return { data: null, error: null };
        }
        if (name === 'doc_apply_batch') {
          for (const item of args._items || []) await docApply(item.table, item.id, item.ops || []);
          return { data: null, error: null };
        }
        return { data: null, error: { message: 'Unknown RPC ' + name } };
      } catch (e) {
        return { data: null, error: { message: e.message, status: e.code || e.status } };
      }
    }
  };

  /* ── загрузка файлов ──
     Картинки → ImgBB (бесплатно, безлимитно, навсегда, CORS работает).
     Остальное (видео/документы) → Appwrite Storage. Так 10 ГБ Appwrite
     почти не расходуется, а картинки — основной объём — уходят в безлимит. */

  // ImgBB через FormData: multipart = «простой» CORS-запрос, preflight не нужен.
  function uploadImgbb(file, onProgress, onXhr) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      if (onXhr) { try { onXhr(xhr); } catch (_) {} }
      xhr.open('POST', 'https://api.imgbb.com/1/upload?key=' + encodeURIComponent(IMGBB_KEY));
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total);
      };
      xhr.onload = () => {
        let j = {};
        try { j = JSON.parse(xhr.responseText || '{}'); } catch (_) {}
        if (xhr.status >= 200 && xhr.status < 300 && j.data && j.data.url) resolve(j.data.url);
        else reject(new Error('ImgBB ' + xhr.status + (j.error && j.error.message ? ': ' + j.error.message : '')));
      };
      xhr.onerror = () => reject(new Error('ImgBB network error'));
      xhr.onabort = () => reject(Object.assign(new Error('aborted'), { aborted: true }));
      onProgress && onProgress(0);
      const fd = new FormData();
      fd.append('image', file);
      xhr.send(fd);
    });
  }

  function uploadAppwrite(file, onProgress, onXhr) {
    // onXhr не поддерживается SDK (нет доступа к XHR/отмене) — вызываем со стабом.
    if (onXhr) { try { onXhr({ abort() {} }); } catch (_) {} }
    const perms = (Permission && Role) ? [Permission.read(Role.any())] : undefined;
    onProgress && onProgress(0);
    return storage.createFile(BUCKET, newId(), file, perms, (p) => {
      if (onProgress && p && typeof p.progress === 'number') onProgress(Math.max(0, Math.min(1, p.progress / 100)));
    }).then((f) => {
      onProgress && onProgress(1);
      const v = storage.getFileView(BUCKET, f.$id);
      return (v && v.href) ? v.href : String(v);
    });
  }

  function upload(file, onProgress, onXhr) {
    const isImage = file && typeof file.type === 'string' && file.type.indexOf('image/') === 0;
    if (isImage && IMGBB_KEY) {
      return uploadImgbb(file, onProgress, onXhr)
        .then((url) => { onProgress && onProgress(1); return url; })
        .catch((err) => {
          if (err && err.aborted) throw err;
          console.warn('[appwrite-client] ImgBB не сработал, падаю на Appwrite Storage:', err && err.message);
          return uploadAppwrite(file, onProgress, onXhr);
        });
    }
    return uploadAppwrite(file, onProgress, onXhr);
  }

  /* ── Подтверждение email 6-значным кодом (Appwrite Email OTP) ──
     send(): Appwrite сам отправляет письмо с 6-значным кодом.
     confirm(): обмен кода на сессию. Успешный вход по OTP автоматически
     помечает email пользователя как подтверждённый (emailVerification=true). */
  window.NonsenseAppwriteVerify = {
    async send(email, userId) {
      const t = await account.createEmailToken(userId || newId(), String(email || '').trim());
      return { userId: t.userId };
    },
    async confirm(userId, secret) {
      const code = String(secret || '').trim();
      if (!/^\d{6}$/.test(code)) { const e = new Error('bad-code'); e.code = 'verify/bad-code'; throw e; }
      try {
        await account.createSession(userId, code);
      } catch (err) {
        const msg = String(err && err.message || '').toLowerCase();
        // Активная сессия мешает обмену кода — снимаем её и повторяем.
        if (/prohibited|session is active|missing scope|role: member/.test(msg)) {
          try { await account.deleteSession('current'); } catch (_) {}
          try {
            await account.createSession(userId, code);
          } catch (err2) {
            // Код неверный, а сессия уже удалена — чистим локальную сессию.
            saveSession(null);
            const e = new Error(err2 && err2.message || 'invalid code');
            e.code = 'verify/invalid-code';
            e.sessionLost = true;
            throw e;
          }
        } else {
          const e = new Error(err && err.message || 'invalid code');
          e.code = 'verify/invalid-code';
          throw e;
        }
      }
      const u = await account.get();
      const next = { access_token: 'appwrite:' + u.$id, user: { id: u.$id, email: u.email || '', verified: !!u.emailVerification } };
      saveSession(next);
      emitAuth('SIGNED_IN');
      return next;
    },
    async isVerified() {
      try { const u = await account.get(); return !!u.emailVerification; } catch (_) { return null; }
    }
  };

  window.NonsenseAppwrite = { endpoint: ENDPOINT, projectId: PROJECT, databaseId: DB_ID, bucketId: BUCKET };
  window.NonsenseLocalBackend = { apiBase: ENDPOINT, upload };
  window.supabase = {
    createClient() { return client_api; }
  };
})();
