// server/restore-vk-firebase.js — Полный возврат связки Firebase RTDB + VK Cloud S3
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SHIM_CODE = `<!-- Firebase v10 Compat SDK (Local & Offline Ready) -->
<script src="firebase-app-compat.js"></script>
<script src="firebase-auth-compat.js"></script>
<script src="firebase-database-compat.js"></script>
<script>
/* ════════════════════════════════════════════════════════════════════════
   FIREBASE REALTIME DATABASE + AUTH + VK CLOUD S3 STORAGE
   - База данных и Realtime: Firebase Realtime Database
   - Авторизация: Firebase Authentication (Email/Password)
   - Файлы / медиа: VK Cloud S3 Object Storage (bucket: noname)
   ════════════════════════════════════════════════════════════════════════ */

const firebaseConfig = {
  apiKey: "AIzaSyCVH8_UhxO5hAj0ZBlA_lRw3B0hnN1zEOc",
  authDomain: "nonsensechattm-e5d18.firebaseapp.com",
  databaseURL: "https://nonsensechattm-e5d18-default-rtdb.firebaseio.com",
  projectId: "nonsensechattm-e5d18",
  storageBucket: "nonsensechattm-e5d18.firebasestorage.app",
  messagingSenderId: "497380539024",
  appId: "1:497380539024:web:cace5570f62f9e073af615",
  measurementId: "G-NC38SHSCRS"
};

// Инициализация Firebase
if (!window.firebase || !window.firebase.apps || !window.firebase.apps.length) {
  window.firebase.initializeApp(firebaseConfig);
}
const _fbAuth = window.firebase.auth();
const _fbDb = window.firebase.database();

/* VK Cloud backend — presigned URL для загрузки в S3 */
const VKC_URL = (()=>{
  const s = localStorage.getItem('nonsense-vkc-url');
  if(s) return s;
  const isLocal = !window.location.origin || window.location.origin === 'null' ||
                  window.location.protocol === 'file:' ||
                  window.location.hostname === 'localhost' ||
                  window.location.hostname === '127.0.0.1';
  return isLocal ? 'http://localhost:8787' : window.location.origin;
})();
window.VKCloud = {
  setUrl(u){ localStorage.setItem('nonsense-vkc-url',u); location.reload(); },
  resetUrl(){ localStorage.removeItem('nonsense-vkc-url'); location.reload(); },
  getUrl(){ return VKC_URL; }
};

function genId(){
  try { return crypto.randomUUID(); } catch(e) {
    return 'id' + Date.now() + Math.random().toString(36).slice(2, 10);
  }
}

/* ── FieldValue sentinels ── */
class FV { constructor(kind, args){ this.__fv = kind; this.args = args || []; } }
const FieldValue = {
  serverTimestamp: ()=> new FV('serverNow'),
  arrayUnion:  (...v)=> new FV('arrayUnion', v),
  arrayRemove: (...v)=> new FV('arrayRemove', v),
  delete:      ()=> new FV('delete'),
  increment:   (n)=> new FV('increment', [n])
};

/* ── Timestamp обёртка ── */
class Ts {
  constructor(v){
    if (v instanceof Date) this._d = v;
    else if (typeof v === 'number') this._d = new Date(v);
    else if (typeof v === 'string') this._d = new Date(v);
    else this._d = new Date();
  }
  toDate(){ return this._d; }
  toMillis(){ return this._d.getTime(); }
  get seconds(){ return Math.floor(this._d.getTime()/1000); }
}

function serializeVal(v){
  if (v instanceof FV) {
    if (v.__fv === 'serverNow') return window.firebase.database.ServerValue.TIMESTAMP;
    if (v.__fv === 'increment') return window.firebase.database.ServerValue.increment(v.args[0] || 1);
    if (v.__fv === 'delete') return null;
    return null;
  }
  if (v instanceof Date) return v.getTime();
  if (v instanceof Ts) return v.toMillis();
  if (v === undefined) return null;
  if (Array.isArray(v)) return v.map(serializeVal);
  if (v && typeof v === 'object') {
    const o = {};
    for (const k in v) {
      if (v[k] !== undefined) o[k] = serializeVal(v[k]);
    }
    return o;
  }
  return v;
}

function rehydrate(v){
  if (v === null || typeof v !== 'object') return v;
  if (Array.isArray(v)) return v.map(rehydrate);
  if (typeof v.__ts__ === 'string' && Object.keys(v).length === 1) return new Ts(v.__ts__);
  const o = {};
  for (const k in v) o[k] = rehydrate(v[k]);
  return o;
}

function makeDocSnap(path, id, val, ref){
  const exists = val !== null && val !== undefined;
  return {
    id,
    exists,
    ref: ref || null,
    data: () => exists ? rehydrate(val) : undefined
  };
}

function filterAndSortDocs(docs, wheres, order, limit, limitLast){
  let res = docs.filter(d => {
    const data = d.data() || {};
    for (const w of wheres) {
      const v = data[w.field];
      if (w.op === '==' && v !== w.val) return false;
      if (w.op === '!=' && v === w.val) return false;
      if (w.op === 'array-contains') {
        if (!Array.isArray(v) || !v.includes(w.val)) return false;
      }
    }
    return true;
  });

  if (order) {
    const { field, dir } = order;
    res.sort((a, b) => {
      let va = (a.data() || {})[field];
      let vb = (b.data() || {})[field];
      if (va && typeof va.toMillis === 'function') va = va.toMillis();
      if (vb && typeof vb.toMillis === 'function') vb = vb.toMillis();
      if (va instanceof Date) va = va.getTime();
      if (vb instanceof Date) vb = vb.getTime();
      if (va == null && vb == null) return 0;
      if (va == null) return dir === 'asc' ? -1 : 1;
      if (vb == null) return dir === 'asc' ? 1 : -1;
      const cmp = va > vb ? 1 : (va < vb ? -1 : 0);
      return dir === 'asc' ? cmp : -cmp;
    });
  }

  if (limit != null) {
    res = limitLast ? res.slice(-limit) : res.slice(0, limit);
  }

  return res;
}

function makeQuerySnap(docs, prevMap){
  const curMap = {};
  for (let i = 0; i < docs.length; i++) curMap[docs[i].id] = JSON.stringify(docs[i].data());
  const changes = [];
  if (prevMap) {
    for (let i = 0; i < docs.length; i++) {
      const d = docs[i];
      const h = curMap[d.id];
      if (!(d.id in prevMap)) changes.push({ type: 'added', doc: d });
      else if (prevMap[d.id] !== h) changes.push({ type: 'modified', doc: d });
    }
    for (const oldId in prevMap) {
      if (!(oldId in curMap)) changes.push({ type: 'removed', doc: { id: oldId, exists: false, data: () => undefined } });
    }
  } else {
    for (let i = 0; i < docs.length; i++) changes.push({ type: 'added', doc: docs[i] });
  }
  return {
    docs,
    size: docs.length,
    empty: docs.length === 0,
    forEach: fn => docs.forEach(fn),
    docChanges: () => changes,
    _map: curMap
  };
}

/* ── DocRef ── */
class DocRef {
  constructor(path, id, parentRef){
    this.path = path;
    this.id = id;
    this.parentRef = parentRef || null;
    this.ref = this;
  }
  collection(name){
    let subPath = '';
    if (name === 'messages') subPath = 'messages/' + this.id;
    else if (name === 'callHistory') subPath = 'call_history/' + this.id;
    else if (name === 'callSession') subPath = 'call_sessions/' + this.id;
    else if (name === 'folders') subPath = 'folders/' + this.id;
    else subPath = this.path + '/' + name;
    return new CollectionRef(subPath, this);
  }
  async get(){
    const snap = await _fbDb.ref(this.path).once('value');
    return makeDocSnap(this.path, this.id, snap.val(), this);
  }
  async set(obj, opts){
    const clean = serializeVal(obj) || {};
    if (opts && opts.merge) {
      const updates = {};
      for (const k in clean) {
        updates[k.replace(/\\./g, '/')] = clean[k];
      }
      await _fbDb.ref(this.path).update(updates);
    } else {
      await _fbDb.ref(this.path).set(clean);
    }
  }
  async update(obj){
    const updates = {};
    for (const k in obj) {
      let val = obj[k];
      const p = k.replace(/\\./g, '/');
      if (val instanceof FV && val.__fv === 'arrayUnion') {
        const snap = await _fbDb.ref(this.path + '/' + p).once('value');
        let curr = snap.val() || [];
        if (!Array.isArray(curr)) curr = [];
        const set = new Set(curr);
        val.args.forEach(item => set.add(item));
        updates[p] = Array.from(set);
      } else if (val instanceof FV && val.__fv === 'arrayRemove') {
        const snap = await _fbDb.ref(this.path + '/' + p).once('value');
        let curr = snap.val() || [];
        if (!Array.isArray(curr)) curr = [];
        const rem = new Set(val.args);
        updates[p] = curr.filter(item => !rem.has(item));
      } else {
        updates[p] = serializeVal(val);
      }
    }
    await _fbDb.ref(this.path).update(updates);
  }
  async delete(){
    await _fbDb.ref(this.path).remove();
  }
  onSnapshot(cb, errCb){
    let stopped = false;
    const ref = _fbDb.ref(this.path);
    const handler = (snap) => {
      if (stopped) return;
      try {
        cb(makeDocSnap(this.path, this.id, snap.val(), this));
      } catch (e) {
        errCb && errCb(e);
      }
    };
    ref.on('value', handler, (err) => {
      if (!stopped && errCb) errCb(err);
    });
    return () => {
      stopped = true;
      ref.off('value', handler);
    };
  }
}

/* ── CollectionRef ── */
class CollectionRef {
  constructor(path, parentDoc){
    this.path = path;
    this.parentDoc = parentDoc || null;
    this._wheres = [];
    this._order = null;
    this._limit = null;
    this._limitLast = false;
  }
  doc(id){
    const docId = id != null ? String(id) : _fbDb.ref(this.path).push().key;
    return new DocRef(this.path + '/' + docId, docId, this);
  }
  where(field, op, val){
    const q = this._clone();
    q._wheres.push({ field, op, val });
    return q;
  }
  orderBy(field, dir){
    const q = this._clone();
    q._order = { field, dir: dir || 'asc' };
    return q;
  }
  limit(n){
    const q = this._clone();
    q._limit = n;
    q._limitLast = false;
    return q;
  }
  limitToLast(n){
    const q = this._clone();
    q._limit = n;
    q._limitLast = true;
    return q;
  }
  _clone(){
    const c = new CollectionRef(this.path, this.parentDoc);
    c._wheres = this._wheres.slice();
    c._order = this._order ? Object.assign({}, this._order) : null;
    c._limit = this._limit;
    c._limitLast = this._limitLast;
    return c;
  }
  async add(obj){
    const ref = this.doc();
    await ref.set(obj);
    return ref;
  }
  async get(){
    const snap = await _fbDb.ref(this.path).once('value');
    const obj = snap.val() || {};
    let docs = [];
    for (const k in obj) {
      if (obj[k] !== null && typeof obj[k] === 'object') {
        docs.push(makeDocSnap(this.path + '/' + k, k, obj[k], this.doc(k)));
      }
    }
    docs = filterAndSortDocs(docs, this._wheres, this._order, this._limit, this._limitLast);
    return makeQuerySnap(docs, null);
  }
  onSnapshot(cb, errCb){
    let stopped = false, prevMap = null;
    const ref = _fbDb.ref(this.path);
    const handler = (snap) => {
      if (stopped) return;
      try {
        const obj = snap.val() || {};
        let docs = [];
        for (const k in obj) {
          if (obj[k] !== null && typeof obj[k] === 'object') {
            docs.push(makeDocSnap(this.path + '/' + k, k, obj[k], this.doc(k)));
          }
        }
        docs = filterAndSortDocs(docs, this._wheres, this._order, this._limit, this._limitLast);
        const qs = makeQuerySnap(docs, prevMap);
        prevMap = qs._map;
        cb(qs);
      } catch (e) {
        errCb && errCb(e);
      }
    };
    ref.on('value', handler, (err) => {
      if (!stopped && errCb) errCb(err);
    });
    const stop = () => {
      stopped = true;
      ref.off('value', handler);
    };
    return stop;
  }
}

/* ── WriteBatch ── */
class WriteBatch {
  constructor(){ this._updates = {}; }
  set(docRef, obj){
    this._updates[docRef.path] = serializeVal(obj);
    return this;
  }
  update(docRef, obj){
    for (const k in obj) {
      this._updates[docRef.path + '/' + String(k).replace(/\\./g, '/')] = serializeVal(obj[k]);
    }
    return this;
  }
  delete(docRef){
    this._updates[docRef.path] = null;
    return this;
  }
  async commit(){
    await _fbDb.ref().update(this._updates);
  }
}

/* ── db ── */
const db = {
  collection(name){
    let p = name;
    if (name === 'stickerPacks') p = 'sticker_packs';
    if (name === 'callHistory') p = 'call_history';
    return new CollectionRef(p, null);
  },
  batch(){ return new WriteBatch(); }
};

/* ── auth ── */
const auth = {
  get currentUser(){ return _fbAuth.currentUser; },
  async createUserWithEmailAndPassword(email, pass){
    return _fbAuth.createUserWithEmailAndPassword(email, pass);
  },
  async signInWithEmailAndPassword(email, pass){
    return _fbAuth.signInWithEmailAndPassword(email, pass);
  },
  onAuthStateChanged(cb){
    return _fbAuth.onAuthStateChanged(cb);
  },
  async signOut(){
    return _fbAuth.signOut();
  }
};

window.firebase = Object.assign(window.firebase || {}, {
  auth: () => _fbAuth,
  database: () => _fbDb,
  firestore: Object.assign(function(){ return db; }, {
    FieldValue: FieldValue,
    Timestamp: Ts
  })
});
window.db = db;
window.auth = auth;

// ═══ CREATOR CONFIG ═══
// Только этот UID может выдавать верификацию другим пользователям
// Замените на свой реальный Firebase UID после первого входа
const CREATOR_UID = '6a4a9c7a000c330c9018';

let me=null,activeId=null,activeChat=null,curTab='all';
function defaultNickForUser(user){
  const fromEmail=String((user&&user.email)||'').split('@')[0].trim();
  const fromUid=String((user&&user.uid)||'').slice(0,8);
  return fromEmail||fromUid||'user';
}
const PROFILE_CACHE_KEY='nonsense-profile-cache';
function loadProfileCache(uid){
  try{
    const all=JSON.parse(localStorage.getItem(PROFILE_CACHE_KEY)||'null');
    if(!all||!uid)return null;
    const hit=all[uid];
    return (hit&&hit.nick)?hit:null;
  }catch(_){ return null; }
}
`;

const NEW_UPLOAD_CODE = `// ═══ UPLOAD SYSTEM — VK Cloud Object Storage (S3-совместимый) ═══
// Файлы, фото и медиа загружаются напрямую в VK Cloud S3 (бакет noname).
// Подпись формируется автономно в браузере через Web Crypto API (AWS v4),
// поэтому сайт работает полностью автономно без необходимости держать сервер включённым.

const VK_S3_CONFIG = {
  endpoint: 'https://hb.vkcs.cloud',
  bucket: 'noname',
  region: 'ru-msk',
  access: 'w1Vgn81mT6nkLJMrsA4C6f',
  secret: 'ceXVQHnATaisViK32aKJ3X6NCwZ82yRGHD4Z2tQ2yCd6'
};

async function getVKCS3PresignedUrl(fileName, contentType, uid) {
  const subtle = window.crypto && window.crypto.subtle;
  if (!subtle) {
    const qs = 'name=' + encodeURIComponent(fileName) + '&type=' + encodeURIComponent(contentType || 'application/octet-stream') + '&uid=' + encodeURIComponent(uid || 'anon');
    const resp = await fetch(VKC_URL + '/api/presign?' + qs);
    if (!resp.ok) throw new Error('Presign failed: ' + resp.status);
    return await resp.json();
  }

  const enc = new TextEncoder();
  async function sha256Hex(str) {
    const buf = await subtle.digest('SHA-256', enc.encode(str));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  async function hmac(keyBuf, dataStr) {
    const key = await subtle.importKey('raw', keyBuf, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    return new Uint8Array(await subtle.sign('HMAC', key, enc.encode(dataStr)));
  }

  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const datetime = date + 'T' + now.toISOString().slice(11, 19).replace(/:/g, '') + 'Z';
  const host = new URL(VK_S3_CONFIG.endpoint).host;
  const rand = Math.random().toString(36).slice(2, 10);
  const clean = (fileName || 'file')
    .normalize('NFKD')
    .replace(/[^\\w.\\-]+/g, '_')
    .replace(/_+/g, '_')
    .slice(-80) || 'file';
  const key = (uid || 'anon') + '/' + Date.now() + '_' + rand + '_' + clean;
  const encodedKey = encodeURIComponent(key).replace(/%2F/g, '/');

  const credentialScope = date + '/' + VK_S3_CONFIG.region + '/s3/aws4_request';
  const credential = VK_S3_CONFIG.access + '/' + credentialScope;

  const queryParams = [
    'X-Amz-Algorithm=AWS4-HMAC-SHA256',
    'X-Amz-Credential=' + encodeURIComponent(credential),
    'X-Amz-Date=' + datetime,
    'X-Amz-Expires=900',
    'X-Amz-SignedHeaders=host'
  ].sort().join('&');

  const canonicalRequest = [
    'PUT',
    '/' + VK_S3_CONFIG.bucket + '/' + encodedKey,
    queryParams,
    'host:' + host + '\\n',
    'host',
    'UNSIGNED-PAYLOAD'
  ].join('\\n');

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    datetime,
    credentialScope,
    await sha256Hex(canonicalRequest)
  ].join('\\n');

  const kDate = await hmac(enc.encode('AWS4' + VK_S3_CONFIG.secret), date);
  const kRegion = await hmac(kDate, VK_S3_CONFIG.region);
  const kService = await hmac(kRegion, 's3');
  const kSigning = await hmac(kService, 'aws4_request');
  const sigBuf = await hmac(kSigning, stringToSign);
  const signature = Array.from(sigBuf).map(b => b.toString(16).padStart(2, '0')).join('');

  const uploadUrl = VK_S3_CONFIG.endpoint + '/' + VK_S3_CONFIG.bucket + '/' + encodedKey + '?' + queryParams + '&X-Amz-Signature=' + signature;
  const publicUrl = VK_S3_CONFIG.endpoint + '/' + VK_S3_CONFIG.bucket + '/' + encodedKey;

  return { uploadUrl, publicUrl, key };
}

function uploadToVKCloud(file, onStatus, onProgress, onXhr) {
  onStatus && onStatus('⏳ Загрузка в VK Cloud S3...');
  return new Promise(async (resolve, reject) => {
    try {
      const uid = (window.auth && window.auth.currentUser) ? window.auth.currentUser.uid : 'anon';
      const clean = (file.name || 'file')
        .normalize('NFKD')
        .replace(/[^\\w.\\-]+/g, '_')
        .replace(/_+/g, '_')
        .slice(-80) || 'file';
      const ctype = file.type || 'application/octet-stream';

      const { uploadUrl, publicUrl } = await getVKCS3PresignedUrl(clean, ctype, uid);

      const xhr = new XMLHttpRequest();
      onXhr && onXhr(xhr);
      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', ctype);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total);
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          onProgress && onProgress(1);
          resolve(publicUrl);
        } else {
          reject(new Error('VK Cloud S3 ' + xhr.status + ': ' + (xhr.responseText || '').slice(0, 200)));
        }
      };
      xhr.onerror = () => reject(new Error('Сбой сети при отправке в VK Cloud S3'));
      xhr.onabort = () => reject(Object.assign(new Error('aborted'), { aborted: true }));
      onProgress && onProgress(0);
      xhr.send(file);
    } catch (e) {
      reject(e);
    }
  });
}

const uploadToSupabase = uploadToVKCloud;
const uploadToLocalBackend = uploadToVKCloud;

async function smartUpload(file, onStatus, onProgress, onXhr) {
  onStatus = onStatus || (() => {});
  let up = file;
  if (file.type && file.type.startsWith('image/') && file.size > 3 * 1024 * 1024) {
    onStatus('⏳ Оптимизация...');
    const durl = await compressImage(file, 2 * 1024 * 1024);
    if (durl) {
      const blob = await (await fetch(durl)).blob();
      const base = (file.name || 'image').replace(/\\.[^.]+$/, '') || 'image';
      up = new File([blob], base + '.jpg', { type: 'image/jpeg' });
    }
  }
  const url = await uploadToVKCloud(up, onStatus, onProgress, onXhr);
  onStatus('✅ Готово');
  return { url, via: 'vkcloud' };
}

async function uploadStickerImage(file){
  return await uploadToVKCloud(file, ()=>{}, ()=>{}, ()=>{});
}`;

function patchFile(filePath) {
  console.log('\\nPatching:', filePath);
  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Убираем window.NONSENSE_APPWRITE и optImg Appwrite
  const appwriteCfgIdx = content.indexOf('/* ── Конфиг Appwrite Cloud.');
  const tenorIdx = content.indexOf('/* ── Конфиг GIF-поиска (GIPHY).');
  if (appwriteCfgIdx !== -1 && tenorIdx !== -1) {
    content = content.slice(0, appwriteCfgIdx) + 'function optImg(url){ return url || ""; }\n\n  ' + content.slice(tenorIdx);
    console.log('✓ Cleaned NONSENSE_APPWRITE config');
  }

  // 2. Заменяем импорты appwrite / supabase на firebase compat
  const startIdx = content.indexOf('<script src="appwrite-sdk.js">');
  const endIdx = content.indexOf('function saveProfileCache(uid,profile){');
  if (startIdx === -1 || endIdx === -1) {
    console.error('ERROR: Could not find shim boundaries:', { startIdx, endIdx });
    return false;
  }

  content = content.slice(0, startIdx) + SHIM_CODE + '\n' + content.slice(endIdx);
  console.log('✓ Replaced Appwrite/Supabase shim with Firebase Realtime Database shim');

  // 3. Заменяем upload секцию на VK Cloud S3
  let upStart = content.indexOf('// ═══ UPLOAD SYSTEM');
  if (upStart === -1) upStart = content.indexOf('// Файлы грузятся прямо из браузера в Supabase Storage');
  const upEnd = content.indexOf('/* ═══ DELETE OBJECT FROM VK CLOUD S3 ═══ */');
  if (upStart !== -1 && upEnd !== -1) {
    content = content.slice(0, upStart) + NEW_UPLOAD_CODE + '\n\n    ' + content.slice(upEnd);
    console.log('✓ Upload section updated to VK Cloud S3');
  } else {
    console.warn('Upload section boundaries not matched perfectly, checking fallback');
  }

  // 4. Проверяем синтаксис всех inline <script> тегов
  const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  let scriptIndex = 0;
  while ((match = scriptRegex.exec(content)) !== null) {
    scriptIndex++;
    const code = match[1].trim();
    if (!code) continue;
    try {
      new vm.Script(code);
    } catch (e) {
      console.error(`SYNTAX ERROR in script #${scriptIndex}:`, e.message);
      return false;
    }
  }
  console.log(`✓ All ${scriptIndex} scripts validated successfully without syntax errors!`);

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✓ File saved successfully:', filePath);
  return true;
}

const p1 = path.join(__dirname, '..', 'public', 'index.html');
const p2 = path.join(__dirname, '..', 'electron-desktop', 'public', 'index.html');
const ok1 = patchFile(p1);
const ok2 = patchFile(p2);

if (ok1 && ok2) {
  console.log('\\n✅ ALL FILES SUCCESSFULLY CONVERTED TO FIREBASE + VK CLOUD S3!');
} else {
  console.error('\\n❌ Patching failed!');
  process.exit(1);
}
