/* 사이트 공통: 로그인 화면, 상단 막대, 멤버 관리. 각 페이지는 Site.start(그리기 함수)만 부릅니다. */
(function(){
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  const root = () => document.body.dataset.root || './';
  const S = { acc: null, allow: null };

  function bar(){
    const a = S.acc;
    return '<header class="bar"><a class="home" href="' + root() + '">부동산 스터디</a>' +
      (a ? '<div class="who"><span>' + esc(a.email) + '</span><button class="link" data-act="out">로그아웃</button></div>' : '') + '</header>';
  }
  function page(html){ $('#page').innerHTML = bar() + html; }

  /* ---------- 로그인 ---------- */
  let mode = 'in';
  function loginView(msg, bad){
    const T = { in: ['로그인', '멤버로 등록된 이메일과 비밀번호로 들어옵니다.'], up: ['처음 가입', '관리자가 등록해 준 이메일로 비밀번호를 정합니다. 등록 전이라면 가입은 되지만 내용은 보이지 않습니다.'], reset: ['비밀번호 다시 정하기', '가입한 이메일로 비밀번호를 다시 정하는 링크를 보냅니다.'], newpw: ['새 비밀번호', '앞으로 쓸 비밀번호를 입력해 주세요.'] }[mode];
    page('<h1>' + T[0] + '</h1><p class="lead">' + T[1] + '</p>' +
      '<form class="form" data-form="auth">' +
      (mode !== 'newpw' ? '<label>이메일<input id="a-email" type="email" autocomplete="email" required></label>' : '') +
      (mode !== 'reset' ? '<label>비밀번호' + (mode === 'in' ? '' : ' (8자 이상)') + '<input id="a-pw" type="password" minlength="' + (mode === 'in' ? 1 : 8) + '" autocomplete="' + (mode === 'in' ? 'current-password' : 'new-password') + '" required></label>' : '') +
      (mode === 'up' || mode === 'newpw' ? '<label>비밀번호 확인<input id="a-pw2" type="password" autocomplete="new-password" required></label>' : '') +
      '<button class="btn" type="submit">' + ({ in: '로그인', up: '가입하기', reset: '링크 보내기', newpw: '저장' }[mode]) + '</button>' +
      '<p class="msg' + (bad ? ' bad' : '') + '" id="a-msg" role="status">' + esc(msg || '') + '</p>' +
      '<div class="alt">' + (mode === 'in' ? '<button type="button" class="link" data-mode="up">처음이면 가입하기</button><button type="button" class="link" data-mode="reset">비밀번호를 잊었어요</button>' : mode === 'newpw' ? '' : '<button type="button" class="link" data-mode="in">로그인으로 돌아가기</button>') + '</div></form>');
  }
  async function onAuthSubmit(){
    const m = $('#a-msg'), v = id => ($(id) || {}).value || '';
    const say = (t, bad) => { m.textContent = t; m.className = 'msg' + (bad ? ' bad' : ''); };
    try {
      if ((mode === 'up' || mode === 'newpw') && v('#a-pw') !== v('#a-pw2')) return say('두 비밀번호가 다릅니다.', true);
      say('잠시만요...');
      if (mode === 'in') { await PlazaDB.signIn(v('#a-email'), v('#a-pw')); return boot(); }
      if (mode === 'up') { const ok = await PlazaDB.signUp(v('#a-email'), v('#a-pw')); if (ok) return boot(); mode = 'in'; return loginView('가입했습니다. 메일함에 온 확인 링크를 누른 뒤 로그인해 주세요.'); }
      if (mode === 'reset') { await PlazaDB.resetPassword(v('#a-email')); return say('메일을 보냈습니다. 링크를 누르면 이 화면에서 새 비밀번호를 정할 수 있습니다.'); }
      if (mode === 'newpw') { await PlazaDB.setPassword(v('#a-pw')); mode = 'in'; return boot(); }
    } catch (e) {
      const t = String((e && e.message) || '');
      say(/Invalid login/i.test(t) ? '이메일이나 비밀번호가 맞지 않습니다.' : /already registered/i.test(t) ? '이미 가입한 이메일입니다. 로그인해 주세요.' : /rate limit/i.test(t) ? '메일 발송 한도에 걸렸습니다. 한 시간쯤 뒤 다시 시도해 주세요.' : /not confirmed/i.test(t) ? '이메일 확인이 아직 안 됐습니다. 메일함의 확인 링크를 눌러 주세요.' : '처리하지 못했습니다. ' + t, true);
    }
  }

  /* ---------- 멤버 관리 (관리자만) ---------- */
  async function loadAllow(){ try { S.allow = await PlazaDB.allowList(); } catch (_) { S.allow = []; } const put = n => { const el = $('#members'); if (el) el.outerHTML = membersBox(); else if (n) setTimeout(() => put(n - 1), 150); }; put(20); }
  function membersBox(){
    if (!S.acc || !S.acc.admin) return '';
    if (!S.allow) { S.allow = Object.assign([], { perms: true }); loadAllow(); }
    const P = S.allow.perms, tick = (a, k, label) => '<label class="perm"><input type="checkbox" data-perm="' + k + '" data-email="' + esc(a.email) + '"' + (a.admin || a[k] !== false ? ' checked' : '') + (a.admin ? ' disabled' : '') + '>' + label + '</label>';
    return '<section id="members"><h2>멤버 관리 · ' + S.allow.length + '명</h2><p class="lead" style="font-size:14px">여기 등록한 이메일만 내용을 볼 수 있습니다. 멤버마다 스터디 통합본과 부동산광장을 볼 수 있는지 따로 정합니다. 이메일을 추가한 뒤 사이트 주소를 보내 주고, "처음이면 가입하기"로 비밀번호를 정하라고 알려 주세요.</p>' +
      (P ? '' : '<div class="box" style="margin-top:12px">멤버별 권한 설정은 Supabase에서 설정 SQL을 한 번 더 실행한 뒤부터 쓸 수 있습니다. 그 전에는 등록된 멤버 모두가 둘 다 볼 수 있습니다.</div>') +
      '<ul class="members" style="margin-top:12px">' + S.allow.map(a => '<li><span>' + esc(a.email) + (a.admin ? '<small>관리자</small>' : '') + '</span>' +
        (P ? '<span class="perms">' + tick(a, 'study', '스터디') + tick(a, 'plaza', '광장') + '</span>' : '') +
        (a.email === S.acc.email ? '' : '<button class="link" data-del="' + esc(a.email) + '">삭제</button>') + '</li>').join('') + '</ul>' +
      '<div class="addrow"><input id="m-add" type="email" placeholder="추가할 이메일" autocomplete="off">' +
      (P ? '<span class="perms"><label class="perm"><input type="checkbox" id="m-study" checked>스터디</label><label class="perm"><input type="checkbox" id="m-plaza" checked>광장</label></span>' : '') +
      '<button class="btn ghost" data-act="add">추가</button></div><p class="msg" id="m-msg"></p></section>';
  }

  document.addEventListener('submit', e => { if (e.target.dataset.form === 'auth') { e.preventDefault(); onAuthSubmit(); } });
  document.addEventListener('click', async e => {
    const md = e.target.closest('[data-mode]'); if (md) { mode = md.dataset.mode; return loginView(); }
    const a = e.target.closest('[data-act]'), d = e.target.closest('[data-del]');
    if (a && a.dataset.act === 'out') { await PlazaDB.signOut(); S.acc = null; mode = 'in'; return loginView(); }
    if (a && a.dataset.act === 'add') { const i = $('#m-add'), v = i && i.value.trim(); if (!v) return; try { const sc = $('#m-study'), pc = $('#m-plaza'); await PlazaDB.allowAdd(v, sc ? { study: sc.checked, plaza: pc.checked } : null); loadAllow(); } catch (err) { $('#m-msg').textContent = '추가하지 못했습니다. ' + ((err && err.message) || ''); } }
    if (d) { if (d.dataset.sure !== '1') { d.dataset.sure = '1'; d.textContent = '한 번 더 누르면 삭제'; return; } try { await PlazaDB.allowRemove(d.dataset.del); loadAllow(); } catch (_) {} }
  });

  document.addEventListener('change', async e => {
    const t = e.target; if (!t.dataset || !t.dataset.perm) return;
    const m = $('#m-msg');
    try { await PlazaDB.allowSet(t.dataset.email, { [t.dataset.perm]: t.checked }); if (m) m.textContent = '저장했습니다. 그 멤버가 화면을 새로 열면 적용됩니다.'; }
    catch (err) { t.checked = !t.checked; if (m) m.textContent = '저장하지 못했습니다. ' + ((err && err.message) || ''); }
  });
  /* 권한이 없는 영역을 열었을 때 보여 줄 화면 */
  function denied(what){ return '<p class="crumb"><a href="' + root() + '">처음</a></p><h1>열람 권한이 없습니다</h1><p class="lead">이 계정은 ' + what + '을 볼 수 있는 권한이 없습니다. 필요하면 관리자에게 요청해 주세요.</p>'; }

  /* ---------- 시작 ---------- */
  let draw = null;
  async function boot(){
    if (!window.PlazaDB) { page('<div class="box bad">아직 연결 설정 전입니다. 관리자가 Supabase 주소와 키를 넣으면 로그인 화면이 나옵니다.</div>'); return; }
    if (/type=recovery/.test(location.hash)) { mode = 'newpw'; history.replaceState(null, '', location.pathname + location.search); return loginView(); }
    let ses = null; try { ses = await PlazaDB.session(); } catch (_) {}
    if (!ses) return loginView();
    try { S.acc = await PlazaDB.access(); } catch (e) { return page('<div class="box bad">연결하지 못했습니다. 잠시 뒤 다시 열어 주세요. ' + esc((e && e.message) || '') + '</div>'); }
    if (!S.acc.member) return page('<h1>등록 대기 중</h1><p class="lead">' + esc(S.acc.email) + ' 계정은 아직 멤버로 등록되지 않았습니다. 관리자에게 이 이메일을 등록해 달라고 한 뒤 다시 열어 주세요.</p>');
    page(await draw(S.acc, PlazaDB.db));
  }
  window.Site = { denied, start(fn){ draw = fn; if (window.PlazaDB) PlazaDB.onAuth(ev => { if (ev === 'PASSWORD_RECOVERY') { mode = 'newpw'; loginView(); } }); boot(); }, esc, page, membersBox, acc: () => S.acc };
})();
