"""부동산광장 아티팩트 HTML을 별도 사이트용(docs/plaza/index.html)으로 바꿉니다.

사용: python3 tools/port-plaza.py <아티팩트에서 받은 html> docs/plaza/index.html
아티팩트 화면이 바뀌면 같은 명령으로 다시 만들면 됩니다. 바꿀 자리를 못 찾으면 멈춥니다.
"""
import sys

src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf8').read()


def sub(old, new, count=1):
    global s
    if old not in s:
        sys.exit('찾지 못함: ' + old[:80])
    s = s.replace(old, new, count)


HEAD = '''<script src="../assets/kakao-out.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js"></script>
<script src="../assets/config.js"></script>
<script src="../assets/plaza-db.js"></script>
<meta name="robots" content="noindex,nofollow">
<div class="wrap">'''
sub('<div class="wrap">', HEAD)
sub('<button class="helpbtn" data-guide="open">사용법</button>',
    '<button class="helpbtn" data-guide="open">사용법</button><a class="helpbtn" href="../" style="text-decoration:none">처음</a>')
sub('input[type=text],input[type=number]', 'input[type=text],input[type=email],input[type=number]')

# 시작 부분: 아티팩트 저장소 대신 사이트 로그인과 Supabase
start_from = "  try{ db=await window.claude?.use('db');"
start_to = "  S.live=true; names([S.me]);"
i, j = s.index(start_from), s.index(start_to)
s = s[:i] + '''  let acc=null;
  if(!window.PlazaDB){ db=null; S.me='me'; S.members=['me']; S.ready=true; clearTimeout(timer); return render(true); }
  try{ const ses=await PlazaDB.session(); if(!ses){ location.replace('../'); S.gate=true; return; } acc=await PlazaDB.access(); }catch(e){ clearTimeout(timer); return loginView('연결하지 못했습니다. '+((e&&e.message)||'')); }
  if(!acc.member){ clearTimeout(timer); return loginView('이 이메일('+acc.email+')은 아직 멤버로 등록되지 않았습니다. 관리자에게 이메일 등록을 요청한 뒤 다시 열어 주세요.'); }
  db=PlazaDB.db; S.admin=!!acc.admin; S.email=acc.email;
  try{ S.me=await whoAmI(acc); }catch(e){ clearTimeout(timer); return loginView('멤버 정보를 읽지 못했습니다. '+((e&&e.message)||'')); }
  if(!S.me){ clearTimeout(timer); return; }
''' + s[j:]
sub("  db.doc('members/'+S.me).get().then(s=>{ if(!s.exists) return db.doc('members/'+S.me).set({joinedAt:Date.now()}); }).catch(()=>{});\n", '')

HELPERS = r'''
/* ---------- 사이트 로그인과 멤버 연결 ---------- */
function loginView(msg){ S.ready=true; S.gate=true; gstep=-1; drawGuide(); $('nav').innerHTML=''; $('who').innerHTML='';
  $('app').innerHTML='<section class="card"><h2>부동산광장</h2><div class="alert">'+esc(msg||'')+'</div><div class="row"><a class="btn" href="../">처음 화면으로</a><button class="btn" data-login="out">로그아웃</button></div></section>'; }
document.addEventListener('click',async e=>{ const b=e.target.closest('[data-login]'); if(!b) return; const a=b.dataset.login; e.stopImmediatePropagation();
  if(a==='out'){ await PlazaDB.signOut(); return location.replace('../'); }
  if(a==='claim'||a==='new'){ const id=a==='new'?('u_'+String(S.authUid).replace(/-/g,'').slice(0,16)):b.dataset.id;
    const cur=await db.doc('members/'+id).get(); const au=((cur.exists&&cur.data().auth)||[]).filter(x=>x!==S.authUid).concat([S.authUid]);
    await db.doc('members/'+id).update(Object.assign({auth:au,email:S.email},cur.exists?{}:{joinedAt:Date.now()})); location.reload(); }
},true);
async function whoAmI(acc){ S.authUid=acc.uid; const s=await new Promise((res,rej)=>{ const un=db.collection('members').onSnapshot(x=>{ un(); res(x); },rej); });
  const all=s.docs.map(d=>Object.assign({id:d.id},d.data()||{})); const mine=all.find(m=>(m.auth||[]).includes(acc.uid)); if(mine) return mine.id;
  const free=all.filter(m=>!(m.auth||[]).length);
  if(!free.length){ const id='u_'+String(acc.uid).replace(/-/g,'').slice(0,16); await db.doc('members/'+id).update({auth:[acc.uid],email:acc.email,joinedAt:Date.now()}); return id; }
  S.ready=true; S.gate=true; gstep=-1; drawGuide(); $('nav').innerHTML='';
  $('app').innerHTML='<section class="card"><h2>처음 오셨네요</h2><p class="sub">예전 부동산광장(Claude 화면)에서 쓰던 멤버라면 내 이름을 눌러 주세요. 그동안 남긴 의견·투표·조건이 그대로 이어집니다.</p>'+
    free.map(m=>'<button class="rq" data-login="claim" data-id="'+esc(m.id)+'"><span><b>'+esc(m.name||'이름 없는 멤버')+'</b>'+(m.regions?' · '+esc(m.regions):'')+'</span><span class="go">나예요</span></button>').join('')+
    '<button class="btn" data-login="new">목록에 없어요, 새로 시작</button></section>'; return null; }
function accountBox(){ if(!window.PlazaDB||!S.live) return '';
  return '<section class="card"><div class="row between"><h3>내 계정</h3><button class="btn" data-login="out">로그아웃</button></div><p class="sub">'+esc(S.email||'')+(S.admin?' · 관리자 (멤버 추가·삭제는 처음 화면 아래에서)':'')+'</p></section>'; }
'''
sub('/* ---------- 시작 ---------- */', HELPERS + '\n/* ---------- 시작 ---------- */')
sub('''<div class="row"><button class="btn pri" type="submit">조건 저장</button></div></form>'; }''',
    '''<div class="row"><button class="btn pri" type="submit">조건 저장</button></div></form>'+accountBox(); }''')
sub('function render(force){\n', 'function render(force){\n  if(S.gate) return;\n')
sub('render(true); start(); if(!guideSeen()) guideGo(0);',
    'render(true); start().then(()=>{ if(!S.gate&&!guideSeen()) guideGo(0); });')
# 앱 안 사진 선택 실패 안내는 브라우저에서는 필요 없음
s = s.replace("이 앱에서는 사진 선택 창이 열리지 않는 것 같습니다. 폰의 크롬이나 사파리 브라우저에서 이 화면을 열어 올리거나, Claude 채팅에 사진과 물건 이름을 보내 주세요.",
              "사진 선택 창이 열리지 않았습니다. 다시 눌러 주세요.")

open(out, 'w', encoding='utf8').write(s)
print('완료:', out, len(s), 'bytes')
