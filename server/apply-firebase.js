// server/apply-firebase.js — установка Firebase Realtime Database адаптера
const fs = require('fs');
const path = require('path');

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

function patchFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Заменяем импорты appwrite / supabase на firebase compat
  const startIdx = content.indexOf('<script src="appwrite-sdk.js">');
  if (startIdx === -1) {
    console.error('startIdx not found in', filePath);
    return;
  }

  // 2. Находим конец блока: до function saveProfileCache
  const endIdx = content.indexOf('function saveProfileCache(uid,profile){');
  if (endIdx === -1) {
    console.error('endIdx not found in', filePath);
    return;
  }

  let newContent = content.slice(0, startIdx) + SHIM_CODE + '\n' + content.slice(endIdx);

  // 3. Обновляем uploadToVKCloud: передаем auth.currentUser.uid
  newContent = newContent.replace(
    /headers:\s*\{\s*Authorization:\s*'Bearer '\s*\+\s*_vkcToken\.v\s*\}/g,
    `headers: { Authorization: 'Bearer ' + (auth.currentUser ? auth.currentUser.uid : 'anon') }`
  );

  fs.writeFileSync(filePath, newContent, 'utf8');
  console.log('Successfully patched', filePath);
}

patchFile(path.join(__dirname, '..', 'public', 'index.html'));
patchFile(path.join(__dirname, '..', 'electron-desktop', 'public', 'index.html'));
