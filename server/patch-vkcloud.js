// patch-vkcloud.js — Node.js скрипт для замены Supabase шима на VK Cloud шим
const fs = require('fs');
const path = require('path');

const files = [
  path.join(__dirname, '..', 'public', 'index.html'),
  path.join(__dirname, '..', 'electron-desktop', 'public', 'index.html'),
];

// ─── 1. Заменяем блок инициализации Supabase (строки с SB_URL / SB_KEY / createClient)
const OLD_SB_INIT = `const SB_URL = 'https://xpkiirwnpxyfwbrktmqm.supabase.co';
const SB_KEY = 'sb_publishable_RiO2j0EsDPsJ0mO7v-7ebw_g1rI1jqc';
const sb = window.supabase.createClient(SB_URL, SB_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
  realtime: { params: { eventsPerSecond: 20 } }
});`;

const NEW_SB_INIT = `/* VK Cloud backend — настройка URL */
const VKC_URL = (()=>{
  const s = localStorage.getItem('nonsense-vkc-url');
  if(s) return s;
  // Если фронт и бэк на одном домене — используем тот же origin.
  // Для локальной разработки: http://localhost:8787
  return window.location.hostname === 'localhost'
    ? 'http://localhost:8787'
    : window.location.origin;
})();
const _vkcToken = { v: localStorage.getItem('nonsense-vkc-token') || '' };
function vkcSetToken(t){ _vkcToken.v=t||''; t ? localStorage.setItem('nonsense-vkc-token',t) : localStorage.removeItem('nonsense-vkc-token'); }
async function vkcFetch(p, body, tries=4){
  for(let i=0;i<tries;i++){
    try{
      const opts = body!=null
        ? {method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+_vkcToken.v}, body:JSON.stringify(body)}
        : {method:'GET',  headers:{'Authorization':'Bearer '+_vkcToken.v}};
      const r = await fetch(VKC_URL+'/api/'+p, opts);
      const json = await r.json();
      if(!r.ok) return {data:null, error:{message:json.error||('HTTP '+r.status)}};
      return {data:json.data!==undefined?json.data:json, error:null};
    }catch(e){
      if(i===tries-1) return {data:null, error:{message:e.message}};
      await new Promise(r=>setTimeout(r,400*(i+1)));
    }
  }
}
window.VKCloud = {
  setUrl(u){ localStorage.setItem('nonsense-vkc-url',u); location.reload(); },
  resetUrl(){ localStorage.removeItem('nonsense-vkc-url'); location.reload(); },
  getUrl(){ return VKC_URL; }
};`;

// ─── 2. Заменяем rtEnsure / rtAdd (использовали supabase.channel)
const OLD_RT = `/* ── Realtime: один канал на таблицу, мультиплекс по слушателям ── */
const RT = { channels:{}, listeners:{} };
function rtEnsure(table){
  if(RT.channels[table]) return;
  RT.listeners[table] = RT.listeners[table] || new Set();
  RT.channels[table] = sb.channel('rt_'+table)
    .on('postgres_changes', {event:'*', schema:'public', table}, payload=>{
      RT.listeners[table].forEach(L=>{ try{ if(L.match(payload)){ clearTimeout(L.timer); L.timer=setTimeout(L.run, 60); } }catch(e){} });
    })
    .subscribe();
}
function rtAdd(table, listener){ rtEnsure(table); RT.listeners[table].add(listener); return ()=>{ RT.listeners[table] && RT.listeners[table].delete(listener); }; }`;

const NEW_RT = `/* ── Realtime: SSE + pg_notify (VK Cloud) ── */
const RT = { listeners:{} };
let _sseEs = null;
function sseEnsure(){
  if(_sseEs && _sseEs.readyState < 2) return;
  try{
    _sseEs = new EventSource(VKC_URL+'/api/events?token='+encodeURIComponent(_vkcToken.v));
    _sseEs.onmessage = (e)=>{
      if(!e.data||e.data.startsWith(':')) return;
      let payload; try{ payload=JSON.parse(e.data); }catch(_){ return; }
      const table=payload.table; if(!table) return;
      const set=RT.listeners[table]; if(!set) return;
      const pRow={new:payload,old:payload};
      set.forEach(L=>{ try{ if(L.match(pRow)){ clearTimeout(L.timer); L.timer=setTimeout(L.run,60); } }catch(e){} });
    };
    _sseEs.onerror=()=>{ setTimeout(sseEnsure,3000); };
  }catch(e){ setTimeout(sseEnsure,5000); }
}
function rtAdd(table, listener){
  RT.listeners[table]=RT.listeners[table]||new Set();
  RT.listeners[table].add(listener);
  sseEnsure();
  return ()=>{ RT.listeners[table]&&RT.listeners[table].delete(listener); };
}`;

// ─── 3. Заменяем sbCall + rpcApply + buildQuery + runQuery
const OLD_SBCALL = `/* ── Ретрай на сетевых сбоях (холодный старт Supabase, блипы) ─\u{1F}`;
// Слишком сложно точно найти — заменяем rpcApply отдельно

const OLD_RPC = `/* ── Вызов RPC (родитель chat_id/user_id хранится прямо в doc) ── */
async function rpcApply(table, id, ops, pokeRow){
  const {error:err} = await sbCall(()=>sb.rpc('doc_apply', {_table:table,_id:id,_ops:ops}));
  if(err) throw new Error('doc_apply '+table+': '+err.message);
  // Гарантированно обновляем локальные слушатели, не дожидаясь realtime-события.
  if(typeof rtPoke==='function') rtPoke(table, Object.assign({id}, pokeRow||{}));
}`;
const NEW_RPC = `/* ── Вызов RPC через VK Cloud API ── */
async function rpcApply(table, id, ops, pokeRow){
  const {error:err} = await vkcFetch('doc/apply', {table, id, ops});
  if(err) throw new Error('doc_apply '+table+': '+err.message);
  if(typeof rtPoke==='function') rtPoke(table, Object.assign({id}, pokeRow||{}));
}`;

// ─── 4. buildQuery / runQuery → runQuery через vkcFetch
const OLD_BUILDQ = `/* ── Query helpers ── */
function mapCol(table, field){
  if(field==='type')      return table==='messages' ? 'msg_type' : 'type';
  if(field==='privacy')   return 'privacy';
  if(field==='members')   return 'members';
  if(field==='nickLower') return 'nick_lower';
  if(field==='to')        return 'to_uid';
  if(field==='order')     return 'ord';
  if(field==='at')        return 'at';
  return 'doc>>'+field;
}
function buildQuery(cr){
  let q = sb.from(cr.table).select('*');
  if(cr.parent) q = q.eq(cr.parent.col, cr.parent.val);
  for(const w of cr._wheres){
    const col = mapCol(cr.table, w.field);
    if(w.op==='array-contains') q = q.contains(col, [w.val]);
    else                        q = q.eq(col, w.val);
  }
  if(cr._order){
    // limitToLast: нужны ПОСЛЕДНИЕ N строк — запрашиваем в обратном порядке,
    // а результат разворачиваем назад в runQuery.
    let asc = cr._order.dir!=='desc';
    if(cr._limitLast) asc = !asc;
    q = q.order(mapCol(cr.table, cr._order.field), {ascending: asc});
  }
  if(cr._limit!=null) q = q.limit(cr._limit);
  return q;
}
async function runQuery(cr){
  const {data, error} = await sbCall(()=>buildQuery(cr));   // builder пересоздаётся каждой попыткой
  if(error) throw new Error('query '+cr.table+': '+error.message);
  const rows = data||[];
  return cr._limitLast ? rows.slice().reverse() : rows;
}`;
const NEW_BUILDQ = `/* ── Query helpers (VK Cloud) ── */
async function runQuery(cr){
  const body = {table:cr.table, wheres:cr._wheres, parent:cr.parent||null, limit:cr._limit, _limitLast:cr._limitLast};
  if(cr._order) body.order = {col:cr._order.field, ascending:cr._order.dir!=='desc'};
  const {data, error} = await vkcFetch('query', body);
  if(error) throw new Error('query '+cr.table+': '+error.message);
  const rows = data||[];
  return cr._limitLast ? rows.slice().reverse() : rows;
}`;

// ─── 5. DocRef.get → vkcFetch
const OLD_DOC_GET = `  async get(){
    const {data, error} = await sbCall(()=>sb.from(this.table).select('*').eq('id', this.id).maybeSingle());
    // PGRST116 = «строк нет» — это НЕ ошибка, документа просто не существует.
    // Любую другую ошибку обязательно пробрасываем: раньше сбойное чтение
    // (429/401/сеть при жёсткой перезагрузке) возвращало exists:false, и
    // вызывающий код принимал это за «профиля нет» и затирал его дефолтом.
    if(error && error.code!=='PGRST116') throw new Error('get '+this.table+': '+error.message);
    return makeDocSnap(this.table, this.id, data||null, this.parent);
  }`;
const NEW_DOC_GET = `  async get(){
    const {data, error} = await vkcFetch('doc/get', {table:this.table, id:this.id});
    if(error) throw new Error('get '+this.table+': '+error.message);
    return makeDocSnap(this.table, this.id, data||null, this.parent);
  }`;

// ─── 6. DocRef.delete → vkcFetch
const OLD_DOC_DEL = `  async delete(){
    const {error}=await sbCall(()=>sb.rpc('doc_delete',{_table:this.table,_id:this.id}));
    if(error) throw new Error(error.message);
    if(typeof rtPoke==='function') rtPoke(this.table, Object.assign({id:this.id}, this._pokeRow()));
  }`;
const NEW_DOC_DEL = `  async delete(){
    const {error}=await vkcFetch('doc/delete',{table:this.table,id:this.id});
    if(error) throw new Error(error.message);
    if(typeof rtPoke==='function') rtPoke(this.table, Object.assign({id:this.id}, this._pokeRow()));
  }`;

// ─── 7. WriteBatch.commit → vkcFetch
const OLD_BATCH = `  async commit(){
    if(this._items.length){ const {error}=await sb.rpc('doc_apply_batch',{_items:this._items.map(i=>({table:i.table,id:i.id,ops:i.ops}))}); if(error) throw new Error(error.message); }
    for(const d of this._dels){ await sb.rpc('doc_delete',{_table:d.table,_id:d.id}); }`;
const NEW_BATCH = `  async commit(){
    if(this._items.length){ const {error}=await vkcFetch('doc/apply-batch',{items:this._items.map(i=>({table:i.table,id:i.id,ops:i.ops}))}); if(error) throw new Error(error.message); }
    for(const d of this._dels){ await vkcFetch('doc/delete',{table:d.table,id:d.id}); }`;

// ─── 8. auth → vkcFetch
const OLD_AUTH_CREATE = `  async createUserWithEmailAndPassword(email, pass){
    const {data, error} = await sb.auth.signUp({email, password:pass});
    if(error) throw mapAuthErr(error);
    if(!data.session && data.user){ // на случай, если confirm email включён — попробуем сразу войти
      const r = await sb.auth.signInWithPassword({email, password:pass});
      if(r.error) throw mapAuthErr(r.error);
    }
    const u = { uid: data.user.id, email, verified: data.user.verified }; auth.currentUser=u; return { user:u };
  },`;
const NEW_AUTH_CREATE = `  async createUserWithEmailAndPassword(email, pass){
    const {data, error} = await vkcFetch('auth/signup',{email,password:pass});
    if(error) throw mapAuthErr(error);
    const session=data.session; vkcSetToken(session.access_token); sseEnsure();
    const u={uid:session.user.id,email:session.user.email,verified:false}; auth.currentUser=u;
    _authStateListeners.forEach(cb=>cb(u)); return {user:u};
  },`;

const OLD_AUTH_SIGNIN = `  async signInWithEmailAndPassword(email, pass){
    const {data, error} = await sb.auth.signInWithPassword({email, password:pass});
    if(error) throw mapAuthErr(error);
    const u = { uid: data.user.id, email, verified: data.user.verified }; auth.currentUser=u; return { user:u };
  },`;
const NEW_AUTH_SIGNIN = `  async signInWithEmailAndPassword(email, pass){
    const {data, error} = await vkcFetch('auth/signin',{email,password:pass});
    if(error) throw mapAuthErr(error);
    const session=data.session; vkcSetToken(session.access_token); sseEnsure();
    const u={uid:session.user.id,email:session.user.email,verified:false}; auth.currentUser=u;
    _authStateListeners.forEach(cb=>cb(u)); return {user:u};
  },`;

const OLD_AUTH_STATE = `  onAuthStateChanged(cb){
    let lastUid = undefined;
    const emit = (session)=>{
      const u = session ? { uid: session.user.id, email: session.user.email, verified: session.user.verified } : null;
      auth.currentUser = u;
      try{ if(session) sb.realtime.setAuth(session.access_token); }catch(e){}  // RLS-фильтрация realtime
      const uid = u ? u.uid : null;
      if(uid === lastUid) return;      // дедуп повторных событий (token refresh и т.п.)
      lastUid = uid; cb(u);
    };
    sb.auth.getSession().then(({data})=>emit(data.session));
    sb.auth.onAuthStateChange((_e, session)=>emit(session));
    return ()=>{};
  },
  async signOut(){ await sb.auth.signOut(); auth.currentUser=null; }`;
const NEW_AUTH_STATE = `  onAuthStateChanged(cb){
    _authStateListeners.push(cb);
    vkcFetch('auth/session').then(({data})=>{
      const s=data&&data.session;
      const u=s?{uid:s.user.id,email:s.user.email,verified:false}:null;
      auth.currentUser=u; if(u) sseEnsure(); cb(u);
    }).catch(()=>cb(null));
    return ()=>{ const i=_authStateListeners.indexOf(cb); if(i>=0)_authStateListeners.splice(i,1); };
  },
  async signOut(){
    await vkcFetch('auth/signout',{}); vkcSetToken('');
    auth.currentUser=null; _authStateListeners.forEach(cb=>cb(null));
  }`;

// Замена «шапки» комментария (Supabase → VK Cloud)
const OLD_COMMENT = `/* ═════════════════\u{0}/\u{0}══════════════════════════════════════════════════════
   SUPABASE BACKEND + FIREBASE-COMPAT SHIM
   Заменяет Firestore + Firebase Auth на Supabase, сохраняя API Firebase v9-compat
   (db.collection().doc().onSnapshot(), .update(), FieldValue.*, auth.*).
   Схема БД: см. supabase_schema.sql (запустить в Supabase SQL Editor).
   ════════════════════════════════════════════════════════════════════════ */`;

const OLD_SBCALL_FULL = `/* ── Ретрай на сетевых сбоях (холодный старт Supabase, блипы) ─\u{1F} */
async function sbCall(fn, tries){
  tries = tries||5;
  for(let i=0;i<tries;i++){
    try{
      const res = await fn();
      if(res && res.error){
        const msg = String(res.error.message || '');
        const net = /failed to fetch|networkerror|load failed|fetch/i.test(msg);
        if(net && i < tries-1){
          await new Promise(r=>setTimeout(r, 400*(i+1)));
          continue;
        }
      }
      return res;
    } catch(e){
      const msg = String((e&&e.message)||e||'');
      const net = /failed to fetch|networkerror|load failed|fetch/i.test(msg);
      if(i===tries-1 || !net) throw e;
      await new Promise(r=>setTimeout(r, 400*(i+1)));
    }
  }
}`;
const NEW_SBCALL_FULL = `// sbCall не нужен — используем vkcFetch с встроенным ретраем`;

// ─── Добавляем _authStateListeners перед auth = {...}
const OLD_AUTH_DECL = `/* ── auth ── */
function mapAuthErr(error){`;
const NEW_AUTH_DECL = `/* ── auth ── */
const _authStateListeners = [];
function mapAuthErr(error){`;

// ─── Применяем все замены ───────────────────────────────────────────────────
const REPLACEMENTS = [
  [OLD_SB_INIT, NEW_SB_INIT],
  [OLD_RT, NEW_RT],
  [OLD_RPC, NEW_RPC],
  [OLD_BUILDQ, NEW_BUILDQ, true],  // true = логировать если не найдено
  [OLD_DOC_GET, NEW_DOC_GET],
  [OLD_DOC_DEL, NEW_DOC_DEL],
  [OLD_BATCH, NEW_BATCH],
  [OLD_AUTH_CREATE, NEW_AUTH_CREATE],
  [OLD_AUTH_SIGNIN, NEW_AUTH_SIGNIN],
  [OLD_AUTH_STATE, NEW_AUTH_STATE],
  [OLD_AUTH_DECL, NEW_AUTH_DECL],
];

// Убираем sbCall отдельно — ищем по regexp
const SBCALL_RE = /\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\/\s*\nasync function sbCall\(fn, tries\)\{[\s\S]*?\n\}/;

for (const filePath of files) {
  if (!fs.existsSync(filePath)) {
    console.log('SKIP (not found):', filePath);
    continue;
  }
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = 0;

  for (const [oldStr, newStr] of REPLACEMENTS) {
    if (content.includes(oldStr)) {
      content = content.replace(oldStr, newStr);
      changed++;
    } else {
      // Нормализуем пробелы и пробуем снова (из-за \u{0} и подобных символов)
      console.log('  WARNING: pattern not found in', path.basename(filePath), '—', oldStr.slice(0,60));
    }
  }

  // Убираем sbCall через regexp
  content = content.replace(SBCALL_RE, '// sbCall removed — using vkcFetch');

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`PATCHED (${changed} replacements):`, filePath);
}

console.log('Done!');
