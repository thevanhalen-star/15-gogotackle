/* 고고태클 공통 스크립트: 맨 위로 버튼 / 목차 강조 / 전체 글 검색·정렬 */
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
    var q = new URLSearchParams(location.search).get('q') || '';
    var input = document.querySelector('.search input[name=q]');
    if (input) input.value = q;
    fetch('/posts.json').then(function (r) { return r.json(); }).then(function (data) {
      var posts = data.posts, sort = 'new';
      var empty = document.getElementById('all-empty'), count = document.getElementById('all-count');
      function render() {
        var kw = q.trim().toLowerCase();
        var rows = posts.filter(function (p) { return !kw || (p.t + ' ' + p.c + ' ' + p.s + ' ' + p.g.join(' ')).toLowerCase().indexOf(kw) > -1; });
        rows.sort(function (a, b) { return sort === 'title' ? a.t.localeCompare(b.t, 'ko') : sort === 'old' ? a.d.localeCompare(b.d) || a.id.localeCompare(b.id) : b.d.localeCompare(a.d) || b.id.localeCompare(a.id); });
        list.replaceChildren();
        rows.forEach(function (p) {
          var li = document.createElement('li'), l = document.createElement('span'), a = document.createElement('a'), t = document.createElement('time');
          l.className = 'label'; l.textContent = p.s; a.href = '/posts/' + p.id + '/001'; a.textContent = p.t; t.textContent = p.d;
          li.append(l, a, t); list.append(li);
        });
        count.textContent = '총 ' + rows.length + '개' + (kw ? ' · “' + q + '” 검색 결과' : '');
        empty.hidden = rows.length > 0; list.hidden = rows.length === 0;
      }
      document.querySelectorAll('.sortbar button').forEach(function (b) {
        b.addEventListener('click', function () {
          sort = b.dataset.sort;
          document.querySelectorAll('.sortbar button').forEach(function (x) { x.classList.toggle('on', x === b); });
          render();
        });
      });
      render();
    }).catch(function () { document.getElementById('all-count').textContent = '목록을 불러오지 못했습니다.'; });
  }
})();
