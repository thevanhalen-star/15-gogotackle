/* 광고 자리 렌더러.
   페이지에는 <div class="point-media ad-photo ad-slot" data-ad-slot="자리ID"></div> 만 있고,
   어떤 광고를 보여줄지는 /api/ads (관리자 페이지에서 켜고 끈 설정)가 정한다.
   - 설정을 못 불러오거나 전체 스위치가 꺼져 있으면 모든 광고 자리를 숨긴다.
   - 같은 자리에 켜진 광고가 여러 개면 가중치(weight)대로 랜덤, 이미지도 랜덤.
   - 모든 광고에 'AD 광고' 표시를 코드에서 자동으로 붙인다. */
(function () {
  'use strict';
  var slots = [].slice.call(document.querySelectorAll('[data-ad-slot]'));
  if (!slots.length) return;

  function hideAll() {
    slots.forEach(function (s) { s.style.display = 'none'; });
    toggleNote(false);
  }
  // '광고 안내' 문구(.ad-note)는 광고가 실제로 보일 때만 노출
  function toggleNote(on) {
    [].forEach.call(document.querySelectorAll('.ad-note'), function (n) { n.style.display = on ? '' : 'none'; });
  }
  function pick(list) {
    var total = list.reduce(function (a, x) { return a + (x.weight || 1); }, 0), r = Math.random() * total;
    for (var i = 0; i < list.length; i++) { r -= list[i].weight || 1; if (r < 0) return list[i]; }
    return list[list.length - 1];
  }
  // 광고의 이미지 항목은 {src, link}(이미지마다 링크가 다를 수 있음). 예전 형식(문자열 + 광고 공통 link)도 허용.
  function pickImage(ad) {
    var it = ad.images[Math.floor(Math.random() * ad.images.length)];
    return typeof it === 'string' ? { src: it, link: ad.link } : it;
  }
  function render(slot, ad) {
    var it = pickImage(ad);
    if (!it || !it.link) { slot.style.display = 'none'; return false; }
    var a = document.createElement('a');
    a.href = it.link; a.target = '_blank'; a.rel = 'sponsored noopener noreferrer';
    var label = document.createElement('span'); label.className = 'ad-label'; label.textContent = 'AD 광고';
    var img = document.createElement('img');
    img.src = it.src;
    img.alt = '광고 이미지'; img.loading = 'lazy';
    img.style.cssText = 'display:block;width:100%;height:auto;';
    a.appendChild(label); a.appendChild(img);
    slot.replaceChildren(a);
    slot.style.display = '';
    return true;
  }

  fetch('/api/ads', { credentials: 'omit' })
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function (cfg) {
      if (!cfg || cfg.enabled === false || !Array.isArray(cfg.ads)) return hideAll();
      var shown = 0;
      slots.forEach(function (slot) {
        var cands = cfg.ads.filter(function (a) { return a.slot === slot.getAttribute('data-ad-slot') && a.images && a.images.length; });
        if (!cands.length) { slot.style.display = 'none'; return; }
        if (render(slot, pick(cands))) shown++;
      });
      toggleNote(shown > 0);
    })
    .catch(hideAll);
})();
