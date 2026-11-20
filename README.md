# 부동산 스터디

10명 안팎이 함께 쓰는 웹사이트입니다. 처음 화면에서 **스터디 통합본**과 **부동산광장**으로 들어갑니다.

- 화면: `docs/` (GitHub Pages). 저장소는 공개라서 화면 코드만 두고, 강의 노트·물건·사진 같은 내용은 두지 않습니다.
- 내용·사진·로그인: Supabase. `supabase/setup.sql`을 SQL Editor에서 한 번 실행합니다.
- 연결 정보: `docs/assets/config.js` (공개용 URL·publishable 키만)
- 로그인: 이메일 + 비밀번호. 처음 로그인한 사람이 관리자가 되고, 관리자가 처음 화면 아래 "멤버 관리"에 등록한 이메일만 내용을 봅니다.
- 부동산광장 화면 갱신: Claude 아티팩트 HTML을 받아 `python3 tools/port-plaza.py <받은 html> docs/plaza/index.html`
- 스터디 내용은 Supabase `docs` 표의 `study/<아이디>` 문서(title, desc, order, html)로 올립니다.
