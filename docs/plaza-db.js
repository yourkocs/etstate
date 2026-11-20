/* 부동산광장 저장소 연결: Supabase의 docs 표 하나를 문서 저장소처럼 씁니다.
   화면 코드는 db.doc(경로) / db.collection(경로) 모양 그대로 사용합니다. */
(function(){
  const cfg = window.PLAZA_CONFIG || {};
  const sb = window.supabase.createClient(cfg.url, cfg.key, { auth: { persistSession: true, detectSessionInUrl: true, flowType: 'implicit' } });
  const parentOf = p => p.split('/').slice(0, -1).join('/');
  const snapDoc = (path, row) => ({ id: path.split('/').pop(), exists: !!row, data: () => (row ? row.data : undefined) });
  const chk = r => { if (r.error) throw r.error; return r.data; };
  const rid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  function doc(path){
    return {
      id: path.split('/').pop(),
      async get(){ const rows = chk(await sb.from('docs').select('data').eq('path', path).limit(1)); return snapDoc(path, rows[0]); },
      async set(data){ chk(await sb.from('docs').upsert({ path, coll: parentOf(path), data, updated_at: new Date().toISOString() })); },
      async update(patch){ chk(await sb.rpc('doc_merge', { p: path, patch })); },
      async delete(){ chk(await sb.from('docs').delete().eq('path', path)); }
    };
  }
  let chanN = 0;
  function collection(coll){
    return {
      async add(data){ const d = doc(coll + '/' + rid()); await d.set(data); return d; },
      onSnapshot(cb, onErr){
        let alive = true, timer = null;
        const load = async () => {
          try {
            const rows = chk(await sb.from('docs').select('path,data').eq('coll', coll));
            if (alive) cb({ docs: rows.map(r => snapDoc(r.path, r)) });
          } catch (e) { if (alive && onErr) onErr(e); }
        };
        load();
        const ch = sb.channel('c' + (++chanN) + '-' + rid())
          .on('postgres_changes', { event: '*', schema: 'public', table: 'docs', filter: 'coll=eq.' + coll },
              () => { clearTimeout(timer); timer = setTimeout(load, 250); })
          .subscribe();
        /* 실시간 연결이 끊긴 사이 바뀐 내용을 놓치지 않도록, 화면으로 돌아올 때 다시 읽습니다. */
        const vis = () => { if (document.visibilityState === 'visible') load(); };
        document.addEventListener('visibilitychange', vis);
        return () => { alive = false; clearTimeout(timer); sb.removeChannel(ch); document.removeEventListener('visibilitychange', vis); };
      }
    };
  }

  /* ---------- 로그인 ---------- */
  async function session(){ const { data } = await sb.auth.getSession(); return data.session; }
  async function sendLink(email){
    const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname, shouldCreateUser: true } });
    if (error) throw error;
  }
  async function signOut(){ await sb.auth.signOut(); location.reload(); }
  /* 허용 목록이 비어 있으면 처음 로그인한 사람이 관리자가 됩니다. */
  async function access(){ const r = await sb.rpc('plaza_access'); if (r.error) throw r.error; return r.data; }
  async function allowList(){ return chk(await sb.from('allowed_emails').select('email,admin').order('email')); }
  async function allowAdd(email){ chk(await sb.from('allowed_emails').insert({ email: email.trim().toLowerCase() })); }
  async function allowRemove(email){ chk(await sb.from('allowed_emails').delete().eq('email', email)); }

  window.PlazaDB = { sb, db: { doc, collection }, session, sendLink, signOut, access, allowList, allowAdd, allowRemove };
})();
