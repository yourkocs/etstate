/* Supabase 연결 정보. 이 두 값은 화면에 공개되는 값이라 저장소에 있어도 안전합니다.
   데이터는 로그인 허용된 멤버만 읽을 수 있게 Supabase에서 잠겨 있습니다. */
window.PLAZA_CONFIG = {
  url: '',  // 예: https://xxxx.supabase.co
  key: ''   // publishable(sb_publishable_...) 또는 anon 키
};
