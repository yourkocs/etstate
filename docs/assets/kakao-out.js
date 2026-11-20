/* 카카오톡 안 브라우저로 열리면 폰의 기본 브라우저(크롬·사파리)로 다시 엽니다. */
(function(){
  if (!/KAKAOTALK/i.test(navigator.userAgent)) return;
  var url = location.href;
  location.href = 'kakaotalk://web/openExternal?url=' + encodeURIComponent(url);
  /* 열리지 않는 경우를 위한 안내 */
  setTimeout(function(){
    var d = document.createElement('div');
    d.style.cssText = 'position:fixed;inset:0;z-index:99;background:#f6f5f2;color:#191917;display:flex;flex-direction:column;justify-content:center;gap:14px;padding:24px;font:16px/1.6 -apple-system,sans-serif';
    d.innerHTML = '<b style="font-size:20px">다른 브라우저로 열어 주세요</b><p style="margin:0">카카오톡 안에서는 로그인과 사진 올리기가 잘 안 됩니다. 오른쪽 아래(아이폰은 오른쪽 위) 메뉴에서 "다른 브라우저로 열기"를 눌러 주세요.</p>';
    if (document.body) document.body.appendChild(d);
  }, 1500);
})();
