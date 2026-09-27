// server/fix-timestamp-bug.js
const fs = require('fs');
const path = require('path');

const files = [
  path.join(__dirname, '..', 'public', 'index.html'),
  path.join(__dirname, '..', 'electron-desktop', 'public', 'index.html')
];

for (const f of files) {
  if (!fs.existsSync(f)) continue;
  let c = fs.readFileSync(f, 'utf8');

  // 1. Fix serializeVal: serverNow -> { ".sv": "timestamp" }, increment -> { ".sv": { increment: ... } }
  const oldSerialize = `function serializeVal(v){
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
}`;

  const newSerialize = `function serializeVal(v){
  if (v instanceof FV) {
    if (v.__fv === 'serverNow') return { ".sv": "timestamp" };
    if (v.__fv === 'increment') return { ".sv": { "increment": (v.args && v.args[0]) || 1 } };
    if (v.__fv === 'delete') return null;
    return null;
  }
  if (v instanceof Date) return v.getTime();
  if (v instanceof Ts) return v.toMillis();
  if (v === undefined) return null;
  if (Array.isArray(v)) return v.map(item => serializeVal(item));
  if (v && typeof v === 'object') {
    if (v['.sv']) return v;
    const o = {};
    for (const k in v) {
      if (v[k] !== undefined) o[k] = serializeVal(v[k]);
    }
    return o;
  }
  return v;
}

function rehydrate(v, key){
  if (v === null || typeof v !== 'object') {
    if ((key === 'at' || key === 'lastSeen' || key === 'lastMsgAt' || key === 'createdAt' || key === 'endedAt') && (typeof v === 'number' || typeof v === 'string')) {
      return new Ts(v);
    }
    return v;
  }
  if (Array.isArray(v)) return v.map(item => rehydrate(item));
  if (typeof v.__ts__ === 'string' && Object.keys(v).length === 1) return new Ts(v.__ts__);
  const o = {};
  for (const k in v) o[k] = rehydrate(v[k], k);
  return o;
}`;

  if (c.includes(oldSerialize)) {
    c = c.replace(oldSerialize, newSerialize);
    console.log('Fixed serializeVal & rehydrate in:', f);
  } else {
    console.warn('oldSerialize not found in:', f);
  }

  // 2. Fix window.firebase.database to preserve ServerValue
  const oldFirebaseInit = `window.firebase = Object.assign(window.firebase || {}, {
  auth: () => _fbAuth,
  database: () => _fbDb,
  firestore: Object.assign(function(){ return db; }, {
    FieldValue: FieldValue,
    Timestamp: Ts
  })
});`;

  const newFirebaseInit = `const _fbServerValue = {
  TIMESTAMP: { ".sv": "timestamp" },
  increment: (delta) => ({ ".sv": { "increment": delta || 1 } })
};

const _firestoreFn = Object.assign(function(){ return db; }, {
  FieldValue: FieldValue,
  Timestamp: Ts,
  ServerValue: _fbServerValue
});

const _databaseFn = Object.assign(function(){ return _fbDb; }, {
  ServerValue: _fbServerValue
});

window.firebase = Object.assign(window.firebase || {}, {
  auth: () => _fbAuth,
  database: _databaseFn,
  firestore: _firestoreFn
});`;

  if (c.includes(oldFirebaseInit)) {
    c = c.replace(oldFirebaseInit, newFirebaseInit);
    console.log('Fixed window.firebase.database & ServerValue in:', f);
  } else {
    console.warn('oldFirebaseInit not found in:', f);
  }

  fs.writeFileSync(f, c, 'utf8');
}
console.log('Done fixing timestamp bug!');
