/* 고고태클 공통 스크립트: 맨 위로 버튼 / 목차 강조 / 전체 글 검색·정렬·페이지 */
(function () {
  'use strict';
  var up = document.getElementById('up');
  if (up) {
    window.addEventListener('scroll', function () { up.classList.toggle('on', window.scrollY > 600); }, { passive: true });
    up.addEventListener('click', function () { window.scrollTo({ top: 0 }); });
  }

  var tocLinks = [].slice.call(document.querySelectorAll('.toc a'));
  if (tocLinks.length && 'IntersectionObserver' in window) {
    var map = {};
    tocLinks.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { tocLinks.forEach(function (a) { a.classList.remove('on'); }); var a = map[e.target.id]; if (a) a.classList.add('on'); }
      });
    }, { rootMargin: '-80px 0px -70% 0px' });
    document.querySelectorAll('.art h2[id]').forEach(function (h) { io.observe(h); });
  }

  var list = document.getElementById('all-list');
  if (list) {
    var PER = 50;
    var params = new URLSearchParams(location.search);
    var q = params.get('q') || '';
    var input = document.querySelector('main .search input[name=q]') || document.querySelector('.search input[name=q]');
    if (input) input.value = q;
    fetch('/posts.json').then(function (r) { return r.json(); }).then(function (data) {
      // 항목: [id, 제목, 카테고리, 주제, 장르, 해시태그] — 번호가 클수록 최신
      var posts = data.posts, sort = 'new', page = 1;
      var empty = document.getElementById('all-empty'), count = document.getElementById('all-count'), pager = document.getElementById('all-pager');
      var kw = q.trim().toLowerCase();
      var rows = posts.filter(function (p) { return !kw || p.join(' ').toLowerCase().indexOf(kw) > -1; });
      function sorted() {
        var r = rows.slice();
        if (sort === 'title') r.sort(function (a, b) { return a[1].localeCompare(b[1], 'ko'); });
        else if (sort === 'old') r.sort(function (a, b) { return a[0] < b[0] ? -1 : 1; });
        else r.sort(function (a, b) { return a[0] < b[0] ? 1 : -1; });
        return r;
      }
      function btn(label, p, cls) {
        var b = document.createElement(cls === 'cur' ? 'span' : 'a');
        b.textContent = label;
        if (cls === 'cur') b.className = 'cur'; else { b.href = '#'; b.addEventListener('click', function (e) { e.preventDefault(); page = p; render(true); }); }
        return b;
      }
      function render(scroll) {
        var r = sorted(), total = Math.max(1, Math.ceil(r.length / PER));
        if (page > total) page = total;
        list.replaceChildren();
        r.slice((page - 1) * PER, page * PER).forEach(function (p) {
          var li = document.createElement('li'), l = document.createElement('span'), a = document.createElement('a');
          l.className = 'label'; l.textContent = p[2]; a.href = '/posts/' + p[0] + '/001'; a.textContent = p[1];
          li.append(l, a); list.append(li);
        });
        count.textContent = '총 ' + rows.length.toLocaleString('ko-KR') + '개' + (kw ? ' · “' + q + '” 검색 결과' : '');
        empty.hidden = rows.length > 0; list.hidden = rows.length === 0;
        pager.replaceChildren();
        if (total > 1) {
          var set = {}, arr = [];
          [1, total, page - 2, page - 1, page, page + 1, page + 2].forEach(function (x) { if (x >= 1 && x <= total && !set[x]) { set[x] = 1; arr.push(x); } });
          arr.sort(function (a, b) { return a - b; });
          if (page > 1) pager.append(btn('‹', page - 1));
          var prev = 0;
          arr.forEach(function (i) {
            if (i - prev > 1) { var g = document.createElement('span'); g.className = 'gap'; g.textContent = '…'; pager.append(g); }
            pager.append(i === page ? btn(String(i), i, 'cur') : btn(String(i), i)); prev = i;
          });
          if (page < total) pager.append(btn('›', page + 1));
        }
        if (scroll) window.scrollTo({ top: 0 });
      }
      document.querySelectorAll('.sortbar button').forEach(function (b) {
        b.addEventListener('click', function () {
          sort = b.dataset.sort; page = 1;
          document.querySelectorAll('.sortbar button').forEach(function (x) { x.classList.toggle('on', x === b); });
          render();
        });
      });
      render();
    }).catch(function () { document.getElementById('all-count').textContent = '목록을 불러오지 못했습니다.'; });
  }
})();
