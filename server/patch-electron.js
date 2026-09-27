// patch-electron.js — применяем те же патчи к electron-desktop
const fs = require('fs');

const ELECTRON = 'd:/messenger/electron-desktop/public/index.html';
if (!fs.existsSync(ELECTRON)) { console.log('NOT FOUND:', ELECTRON); process.exit(0); }

let c = fs.readFileSync(ELECTRON, 'utf8');
let changed = 0;

function replace(oldStr, newStr, name) {
  if (c.includes(oldStr)) {
    c = c.replace(oldStr, newStr);
    changed++;
    console.log(' OK:', name);
  } else {
    console.warn(' MISS:', name);
  }
}

// 1. rpcApply
replace(
  `  const {error:err} = await sbCall(()=> sb.rpc('doc_apply', {_table:table,_id:id,_ops:ops}));`,
  `  const {error:err} = await vkcFetch('doc/apply', {table, id, ops});`,
  'rpcApply'
);

// 2. runQuery — убираем buildQuery и заменяем runQuery
const buildQstart = c.indexOf('function buildQuery(cr){');
const runQend = c.indexOf('\n}\n', c.indexOf('async function runQuery(cr){')) + 3;
if (buildQstart > 0 && runQend > buildQstart) {
  const newRunQ = `/* buildQuery removed — VK Cloud API handles query building */
async function runQuery(cr){
  const body = {table:cr.table, wheres:cr._wheres, parent:cr.parent||null, limit:cr._limit, _limitLast:cr._limitLast};
  if(cr._order) body.order = {col:cr._order.field, ascending:cr._order.dir!=='desc'};
  const {data, error} = await vkcFetch('query', body);
  if(error) throw new Error('query '+cr.table+': '+error.message);
  const rows = data||[];
  return cr._limitLast ? rows.slice().reverse() : rows;
}
`;
  c = c.slice(0, buildQstart) + newRunQ + c.slice(runQend);
  changed++;
  console.log(' OK: buildQuery+runQuery');
}

// 3. DocRef.get
replace(
  `    const {data, error} = await sbCall(()=> sb.from(this.table).select('*').eq('id', this.id).maybeSingle());
    // PGRST116 = «строк нет» — это НЕ ошибка, документа просто не существует.
    // Любую другую ошибку обязательно пробрасываем: раньше сбойное чтение
    // (429/401/сеть при жёсткой перезагрузке) возвращало exists:false, и
    // вызывающий код принимал это за «профиля нет» и затирал его дефолтом.
    if(error && error.code!=='PGRST116') throw new Error('get '+this.table+': '+error.message);`,
  `    const {data, error} = await vkcFetch('doc/get', {table:this.table, id:this.id});
    if(error) throw new Error('get '+this.table+': '+error.message);`,
  'DocRef.get'
);

// 4. DocRef.delete
replace(
  `    const {error}=await sbCall(()=> sb.rpc('doc_delete',{_table:this.table,_id:this.id}));`,
  `    const {error}=await vkcFetch('doc/delete',{table:this.table,id:this.id});`,
  'DocRef.delete'
);

// 5. WriteBatch.commit
replace(
  `    if(this._items.length){ const {error}=await sb.rpc('doc_apply_batch',{_items:this._items.map(i=>({table:i.table,id:i.id,ops:i.ops}))}); if(error) throw new Error(error.message); }
    for(const d of this._dels){ await sb.rpc('doc_delete',{_table:d.table,_id:d.id}); }`,
  `    if(this._items.length){ const {error}=await vkcFetch('doc/apply-batch',{items:this._items.map(i=>({table:i.table,id:i.id,ops:i.ops}))}); if(error) throw new Error(error.message); }
    for(const d of this._dels){ await vkcFetch('doc/delete',{table:d.table,id:d.id}); }`,
  'WriteBatch.commit'
);

// 6. auth.onAuthStateChanged + signOut
const authStateOld = `  onAuthStateChanged(cb){
    let lastUid = undefined;
    const emit = (session)=>{
      const u = session ? { uid: session.user.id, email: session.user.email, verified: session.user.verified } : null;
      auth.currentUser = u;
      try{ if(session) sb.realtime.setAuth(session.access_token); }catch(e){}  // RLS-`;
if (c.includes(authStateOld)) {
  // Find the full block end
  const blockStart = c.indexOf('  onAuthStateChanged(cb){');
  const blockEnd = c.indexOf('\n  async signOut(){', blockStart) + 1;
  const signOutEnd = c.indexOf('\n  }', blockEnd) + 3;
  const newBlock = `  onAuthStateChanged(cb){
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
  c = c.slice(0, blockStart) + newBlock + c.slice(signOutEnd);
  changed++;
  console.log(' OK: auth.onAuthStateChanged+signOut');
} else {
  console.warn(' MISS: auth.onAuthStateChanged');
}

// 7. _authStateListeners declaration
replace(
  `/* ── auth ── */\nfunction mapAuthErr(error){`,
  `/* ── auth ── */\nconst _authStateListeners = [];\nfunction mapAuthErr(error){`,
  '_authStateListeners decl'
);

// 8. Supabase storage block
const sbStorageStart = c.indexOf("const SUPABASE_URL = 'https://xpkiirwnpxyfwbrktmqm.supabase.co';");
const sbStorageEnd = c.indexOf('function uploadToLocalBackend(file, onStatus, onProgress, onXhr)', sbStorageStart);
if (sbStorageStart >= 0 && sbStorageEnd > sbStorageStart) {
  c = c.slice(0, sbStorageStart) + c.slice(sbStorageEnd);
  changed++;
  console.log(' OK: removed SUPABASE_URL block');
}

// 9. uploadToSupabase function
replace(
  `// Загружает файл в Supabase Storage и возвращает публичный URL.
// onProgress(0..1) — реальный прогресс (через XHR); onXhr(xhr) — для отмены.
function uploadToSupabase(file, onStatus, onProgress, onXhr) {`,
  `// uploadToSupabase is now an alias for uploadToVKCloud (defined earlier)
function uploadToSupabase(file, onStatus, onProgress, onXhr) {`,
  'uploadToSupabase comment'
);

// 10. Realtime: replace rtEnsure with SSE version
const rtOldStart = c.indexOf('/* ── Realtime: один канал на таблицу, мультиплекс по слушателям ── */');
const rtOldEnd = c.indexOf('\nfunction rtAdd(table, listener){', rtOldStart);
if (rtOldStart >= 0 && rtOldEnd > rtOldStart) {
  const rtNewSection = `/* ── Realtime: SSE + pg_notify (VK Cloud) ── */
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
`;
  const rtNewAddLine = c.slice(rtOldEnd); // keep rtAdd and onwards
  c = c.slice(0, rtOldStart) + rtNewSection + rtNewAddLine;
  changed++;
  console.log(' OK: realtime SSE');
}

// Fix rtAdd to use RT instead of RT.channels
replace(
  `function rtAdd(table, listener){ rtEnsure(table); RT.listeners[table].add(listener); return ()=>{ RT.listeners[table] && RT.listeners[table].delete(listener); }; }`,
  `function rtAdd(table, listener){
  RT.listeners[table]=RT.listeners[table]||new Set();
  RT.listeners[table].add(listener);
  sseEnsure();
  return ()=>{ RT.listeners[table]&&RT.listeners[table].delete(listener); };
}`,
  'rtAdd'
);

fs.writeFileSync(ELECTRON, c, 'utf8');
console.log(`\nDone! ${changed} changes applied to electron-desktop`);
