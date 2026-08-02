(function(){
  const API_BASE = localStorage.getItem('nonsense-backend-url') || window.location.origin;
  const SESSION_KEY = 'nonsense-local-session';
  let session = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
  const authListeners = new Set();
  const rtListeners = {};
  let eventsStarted = false;
  let eventsStarting = false;

  function token(){ return session && session.access_token; }
  async function api(path, opts){
    opts = opts || {};
    const headers = Object.assign({'Content-Type':'application/json'}, opts.headers || {});
    if(token()) headers.Authorization = 'Bearer ' + token();
    const res = await fetch(API_BASE + path, Object.assign({}, opts, { headers }));
    const json = await res.json().catch(()=>({}));
    if(!res.ok) throw new Error(json.error || ('HTTP ' + res.status));
    return json;
  }
  function emitAuth(){
    const payload = session ? { user: session.user, access_token: session.access_token } : null;
    authListeners.forEach(fn=>fn('SIGNED_IN', payload));
  }
  async function localBackendReady(){
    try{
      const res = await fetch(API_BASE + '/api/health', { headers: { Accept: 'application/json' } });
      const type = res.headers.get('content-type') || '';
      if(!res.ok || !type.includes('application/json')) return false;
      const json = await res.json().catch(()=>null);
      return !!(json && json.ok);
    }catch(_){
      return false;
    }
  }
  function startEvents(){
    if(eventsStarted || eventsStarting) return;
    eventsStarting = true;
    localBackendReady().then((ready)=>{
      eventsStarting = false;
      if(!ready){
        console.warn('Local realtime endpoint is unavailable. Start the app with npm run server and open http://127.0.0.1:8787/?backend=local.');
        return;
      }
      eventsStarted = true;
      const es = new EventSource(API_BASE + '/api/events');
      es.onmessage = (event)=>{
        let msg; try{ msg = JSON.parse(event.data); }catch(e){ return; }
        (rtListeners[msg.table] || []).forEach(fn=>fn({new:{id:msg.id}, old:{id:msg.id}}));
      };
      es.onerror = () => {
        try { es.close(); } catch (_) {}
        eventsStarted = false;
        setTimeout(startEvents, 1200);
      };
    });
  }
  function makeQuery(table){
    const state = { table, wheres:[], order:null, limit:null, single:false };
    const q = {
      select(){ return q; },
      eq(col,val){ state.wheres.push({op:'eq', col, val}); return q; },
      contains(col,val){ state.wheres.push({op:'contains', col, val}); return q; },
      order(col,opts){ state.order={col, ascending:!(opts&&opts.ascending===false)}; return q; },
      limit(n){ state.limit=n; return q; },
      maybeSingle(){ state.single=true; return q; },
      then(resolve,reject){
        api('/api/query',{method:'POST',body:JSON.stringify(state)})
          .then(r=>resolve({data:state.single?(r.data[0]||null):r.data,error:null}))
          .catch(e=>resolve({data:state.single?null:[],error:{message:e.message}}));
      }
    };
    return q;
  }
  const client = {
    auth:{
      async signUp({email,password}){
        try{
          const r = await api('/api/auth/signup',{method:'POST',body:JSON.stringify({email,password})});
          session = r.data.session;
          localStorage.setItem(SESSION_KEY, JSON.stringify(session));
          emitAuth();
          return {data:{session,user:session.user},error:null};
        }catch(e){ return {data:{},error:{message:e.message}}; }
      },
      async signInWithPassword({email,password}){
        try{
          const r = await api('/api/auth/signin',{method:'POST',body:JSON.stringify({email,password})});
          session = r.data.session;
          localStorage.setItem(SESSION_KEY, JSON.stringify(session));
          emitAuth();
          return {data:{session,user:session.user},error:null};
        }catch(e){ return {data:{},error:{message:e.message}}; }
      },
      async getSession(){ return {data:{session},error:null}; },
      onAuthStateChange(cb){ authListeners.add(cb); setTimeout(()=>cb('INITIAL_SESSION', session),0); return {data:{subscription:{unsubscribe(){authListeners.delete(cb);}}}}; },
      async signOut(){ session=null; localStorage.removeItem(SESSION_KEY); emitAuth(); return {error:null}; }
    },
    realtime:{ setAuth(){} },
    from: makeQuery,
    channel(){
      let table = null, handler = null;
      return {
        on(_kind, cfg, cb){ table=cfg.table; handler=cb; return this; },
        subscribe(){
          if(table && handler){
            rtListeners[table] = rtListeners[table] || [];
            rtListeners[table].push(handler);
            startEvents();
          }
          return this;
        }
      };
    },
    async rpc(name,args){
      try{
        if(name==='doc_apply'){
          await api('/api/doc/apply',{method:'POST',body:JSON.stringify({table:args._table,id:args._id,ops:args._ops})});
          return {data:null,error:null};
        }
        if(name==='doc_delete'){
          await api('/api/doc/delete',{method:'POST',body:JSON.stringify({table:args._table,id:args._id})});
          return {data:null,error:null};
        }
        if(name==='doc_apply_batch'){
          await api('/api/doc/apply-batch',{method:'POST',body:JSON.stringify({items:args._items})});
          return {data:null,error:null};
        }
        return {data:null,error:{message:'Unknown RPC '+name}};
      }catch(e){ return {data:null,error:{message:e.message}}; }
    }
  };
  window.NonsenseLocalBackend = {
    apiBase: API_BASE,
    upload(file,onProgress,onXhr){
      return new Promise((resolve,reject)=>{
        const xhr = new XMLHttpRequest();
        onXhr && onXhr(xhr);
        xhr.open('PUT', API_BASE + '/api/upload?name=' + encodeURIComponent(file.name || 'file'));
        if(token()) xhr.setRequestHeader('Authorization','Bearer '+token());
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
        xhr.upload.onprogress = (e)=>{ if(e.lengthComputable && onProgress) onProgress(e.loaded/e.total); };
        xhr.onload = ()=>{ try{
          const json = JSON.parse(xhr.responseText || '{}');
          if(xhr.status>=200 && xhr.status<300 && json.url) resolve(new URL(json.url, API_BASE).toString());
          else reject(new Error(json.error || ('HTTP '+xhr.status)));
        }catch(e){ reject(e); } };
        xhr.onerror = ()=>reject(new Error('Network error'));
        xhr.onabort = ()=>reject(Object.assign(new Error('aborted'), {aborted:true}));
        onProgress && onProgress(0);
        xhr.send(file);
      });
    }
  };
  window.supabase = { createClient(){ return client; } };
})();
