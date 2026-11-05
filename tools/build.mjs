// 고고태클 정적 사이트 빌더: content/posts-*.json → HTML/sitemap/rss/posts.json 생성
// 사용: node tools/build.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://gogotackle.com';
const NAME = '고고태클';
const TAGLINE = '낚시 장비 리뷰 & 선택 가이드';
const EMAIL = 'contact@gogotackle.com';
const PER = 12;
const UPDATED = '2026-11-05';

const GROUPS = [
  { name: '장비 리뷰', desc: '릴·로드·라인·루어를 고르는 기준과 사용 후기를 정리합니다.', subs: ['스피닝릴', '베이트릴', '낚싯대', '라인·합사', '루어·소품'] },
  { name: '비교·순위', desc: '제품과 방식을 나란히 놓고 무엇이 나에게 맞는지 비교합니다.', subs: ['예산 배분', '가성비 선택'] },
  { name: '구매 가이드', desc: '처음 사는 사람과 중고로 사는 사람을 위한 구매 체크리스트입니다.', subs: ['입문 세트', '중고 거래'] },
  { name: '관리·안전', desc: '장비를 오래 쓰고 안전하게 출조하는 방법입니다.', subs: ['장비 관리', '출조 안전'] },
];

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const rich = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
const strip = (s) => s.replace(/\*\*/g, '');
const write = (rel, data) => { const f = path.join(ROOT, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, data); };

// ---------- 데이터 ----------
const posts = fs.readdirSync(path.join(ROOT, 'content')).filter((f) => /^posts-.*\.json$/.test(f))
  .flatMap((f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'content', f), 'utf8')));
const ids = new Set();
for (const p of posts) {
  if (ids.has(p.id)) throw new Error('중복 id: ' + p.id);
  ids.add(p.id);
  const g = GROUPS.findIndex((x) => x.name === p.cat);
  if (g < 0 || !GROUPS[g].subs.includes(p.sub)) throw new Error(`분류 오류: ${p.id} ${p.cat}/${p.sub}`);
  p.g = g; p.s = GROUPS[g].subs.indexOf(p.sub);
}
posts.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
const count = (g, s) => posts.filter((p) => p.g === g && (s === undefined || p.s === s)).length;
const url = (p) => `/posts/${p.id}/001`;
const archiveUrl = (g, s, n = 1) => `/archive/${g}-${s ?? 0}-${n}`;
// 분류 페이지는 sub 단위(0-0-1) — s가 없으면 대분류 전체를 보여 주는 g-all-1
const groupUrl = (g) => `/archive/${g}-all-1`;

// ---------- 공통 조각 ----------
const logo = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F4B400" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v11a4 4 0 1 1-8 0"/><circle cx="12" cy="3" r="1"/><path d="M4 14l-2-2M4 14l2-2"/></svg>`;

function layout({ title, desc, path: p, body, nav = '', type = 'website', ld = [], robots = 'index,follow' }) {
  const canon = SITE + p;
  const ldJson = ld.length ? `<script type="application/ld+json">${JSON.stringify(ld)}</script>` : '';
  const navItems = [['전체', '/'], ...GROUPS.map((g, i) => [g.name, groupUrl(i)])];
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="${robots}">
<meta name="theme-color" content="#12332A">
<link rel="canonical" href="${canon}">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="alternate" type="application/rss+xml" title="${NAME} RSS" href="/rss.xml">
<link rel="sitemap" type="application/xml" href="/sitemap.xml">
<meta property="og:type" content="${type}"><meta property="og:site_name" content="${NAME}"><meta property="og:locale" content="ko_KR">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${canon}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;700&family=Noto+Sans+KR:wght@400;500;700;900&display=swap">
<link rel="stylesheet" href="/assets/theme.css">
${ldJson}
</head>
<body>
<a class="skip" href="#main">본문으로 건너뛰기</a>
<header class="hd"><div class="wrap hd-in">
  <a class="brand" href="/" aria-label="${NAME} 홈"><span class="brand-mark">${logo}</span><span><b>${NAME}</b><small>GOGO TACKLE</small></span></a>
  <nav class="nav" aria-label="주요 카테고리">${navItems.map(([n, h]) => `<a href="${h}"${nav === n ? ' class="on" aria-current="page"' : ''}>${n}</a>`).join('')}</nav>
  <form class="search" action="/all-posts" role="search"><input type="search" name="q" placeholder="릴, 합사, 구명조끼…" aria-label="검색어"><button type="submit">검색</button></form>
</div></header>
<main id="main">
${body}
</main>
<footer class="ft"><div class="wrap ft-in">
  <div><b>${NAME}</b><p>${TAGLINE}. 장비를 고르는 기준을 현장 감각으로 정리하는 개인 운영 정보 사이트입니다.</p></div>
  <nav aria-label="사이트 정보"><a href="/all-posts">전체 글 목록</a><a href="/about">사이트 소개</a><a href="/privacy">개인정보처리방침</a><a href="/terms">이용약관</a><a href="/legal">운영 및 법적 고지</a><a href="/contact">문의</a></nav>
  <div class="copy">© 2026 ${NAME} · ${TAGLINE} · gogotackle.com</div>
</div></footer>
<button class="up" id="up" type="button" aria-label="맨 위로">↑</button>
<script src="/assets/site.js" defer></script>
</body>
</html>
`;
}

const card = (p) => `<article class="pc"><span class="label">${esc(p.cat)} / ${esc(p.sub)}</span><h3><a href="${url(p)}">${esc(p.title)}</a></h3><p>${esc(strip(p.sum))}</p><div class="meta"><span>${p.date}</span><span>읽기 ${Math.max(2, Math.round(p.sections.reduce((n, s) => n + s.p.join('').length, 0) / 450))}분</span></div></article>`;

function chipsFor(g, activeS) {
  return `<div class="chips">${GROUPS[g].subs.map((s, i) => count(g, i) ? `<a class="chip${activeS === i ? ' on' : ''}" href="${archiveUrl(g, i)}">${esc(s)} <i>${count(g, i)}</i></a>` : '').join('')}</div>`;
}

// ---------- 홈 ----------
function home() {
  const latest = posts.slice(0, 9);
  const body = `<div class="wrap">
<section class="hero">
  <div>
    <p class="eyebrow">GEAR REVIEW &amp; BUYING GUIDE</p>
    <h1>살 때 후회하지 않게,<br><mark>장비 고르는 기준</mark>부터</h1>
    <p class="lead">릴·로드·라인·루어를 고르는 기준과 관리·안전 정보를 정리했습니다. 광고 문구 대신 규격표 읽는 법과 현장에서 체감하는 차이를 먼저 봅니다.</p>
    <form class="search" action="/all-posts" role="search"><input type="search" name="q" placeholder="예: 스피닝릴 3000번" aria-label="검색어"><button type="submit">검색</button></form>
  </div>
  <aside class="tag-card" aria-label="고르는 순서">
    <h2>HOW TO PICK</h2>
    <ol>
      <li><div>대상어·장소 정하기<span>만능 장비는 없습니다</span></div></li>
      <li><div>로드·릴·라인 맞추기<span>적정 루어 무게와 권사량</span></div></li>
      <li><div>규격표로 후보 줄이기<span>자중·드랙·기어비</span></div></li>
      <li><div>안전·관리 챙기기<span>구명조끼와 세척 습관</span></div></li>
    </ol>
  </aside>
</section>

<section class="sec" aria-labelledby="h-cat">
  <div class="sec-h"><h2 id="h-cat">카테고리</h2><a href="/all-posts">전체 글 ${posts.length}개 →</a></div>
  <div class="cats">${GROUPS.map((g, i) => `<div class="cat"><span class="label">0${i + 1}</span><h3><a href="${groupUrl(i)}">${esc(g.name)}</a></h3><span class="n">${count(i)} POSTS</span>${chipsFor(i)}</div>`).join('')}</div>
</section>

<section class="sec" aria-labelledby="h-new">
  <div class="sec-h"><h2 id="h-new">최신 글</h2><a href="/all-posts">더 보기 →</a></div>
  <div class="grid">${latest.map(card).join('')}</div>
</section>
</div>`;
  write('index.html', layout({
    title: `${NAME} - ${TAGLINE}`,
    desc: '릴·로드·라인·루어 등 낚시 장비를 고르는 기준과 구매 체크리스트, 관리·안전 정보를 정리한 장비 리뷰 사이트입니다.',
    path: '/', body, nav: '전체',
    ld: [{ '@context': 'https://schema.org', '@type': 'WebSite', name: NAME, url: SITE + '/', inLanguage: 'ko-KR', potentialAction: { '@type': 'SearchAction', target: SITE + '/all-posts?q={q}', 'query-input': 'required name=q' } }],
  }));
}

// ---------- 분류(아카이브) ----------
function pagesOf(list, base, head, nav, crumb, chips) {
  const total = Math.max(1, Math.ceil(list.length / PER));
  for (let n = 1; n <= total; n++) {
    const slice = list.slice((n - 1) * PER, n * PER);
    const pager = total > 1 ? `<nav class="pager" aria-label="페이지">${Array.from({ length: total }, (_, i) => i + 1 === n ? `<span class="cur" aria-current="page">${i + 1}</span>` : `<a href="${base(i + 1)}">${i + 1}</a>`).join('')}</nav>` : '';
    const body = `<div class="wrap"><div class="ph"><div class="crumb"><a href="/">홈</a> › ${crumb}</div><h1>${esc(head.title)}</h1><p>${esc(head.desc)}</p>${chips}</div>
<section class="sec"><div class="grid">${slice.map(card).join('')}</div>${pager}</section></div>`;
    write(`archive/${base(n).split('/').pop()}.html`, layout({ title: `${head.title}${n > 1 ? ` (${n}페이지)` : ''} - ${NAME}`, desc: head.desc, path: base(n), body, nav }));
  }
  return total;
}
const archiveUrls = [];
function archives() {
  GROUPS.forEach((g, gi) => {
    const list = posts.filter((p) => p.g === gi);
    const t = pagesOf(list, (n) => `/archive/${gi}-all-${n}`, { title: g.name, desc: g.desc }, g.name, esc(g.name), chipsFor(gi));
    for (let n = 1; n <= t; n++) archiveUrls.push(`/archive/${gi}-all-${n}`);
    g.subs.forEach((s, si) => {
      const sl = list.filter((p) => p.s === si);
      if (!sl.length) return;
      const st = pagesOf(sl, (n) => `/archive/${gi}-${si}-${n}`, { title: `${s} (${g.name})`, desc: `${g.name} 중 ${s} 관련 글 ${sl.length}개를 모았습니다.` }, g.name, `<a href="${groupUrl(gi)}">${esc(g.name)}</a> › ${esc(s)}`, chipsFor(gi, si));
      for (let n = 1; n <= st; n++) archiveUrls.push(`/archive/${gi}-${si}-${n}`);
    });
  });
}

// ---------- 글 상세 ----------
function postPage(p) {
  const heads = p.sections.map((s, i) => ({ id: `s${i + 1}`, h: s.h }));
  const related = [...posts.filter((x) => x.id !== p.id && x.g === p.g && x.s === p.s), ...posts.filter((x) => x.id !== p.id && x.g === p.g && x.s !== p.s), ...posts.filter((x) => x.id !== p.id && x.g !== p.g)].slice(0, 3);
  const table = (t) => `<div class="tbl"><table><thead><tr>${t.head.map((h) => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${t.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  const body = `<div class="wrap"><div class="post">
<article class="art">
  <div class="crumb"><a href="/">홈</a> › <a href="${groupUrl(p.g)}">${esc(p.cat)}</a> › <a href="${archiveUrl(p.g, p.s)}">${esc(p.sub)}</a></div>
  <h1>${esc(p.title)}</h1>
  <div class="byline"><span>${p.date}</span><span>${esc(p.cat)} / ${esc(p.sub)}</span><span>${NAME} 편집부</span></div>
  <p class="disc">이 페이지에는 <b>광고</b>(제휴 링크 포함)가 있을 수 있으며, 광고 링크를 통해 구매하면 운영자가 수수료를 받을 수 있습니다.</p>
  <div class="verdict"><span class="label">ONE-LINE VERDICT · 한 줄 결론</span><p>${rich(p.sum)}</p></div>
  ${p.sections.map((s, i) => `<h2 id="${heads[i].id}">${esc(s.h)}</h2>${s.p.map((t) => `<p>${rich(t)}</p>`).join('')}${s.table ? table(s.table) : ''}`).join('\n  ')}
  ${(p.pros?.length || p.cons?.length) ? `<div class="pc2"><div class="pro"><h3>고르기 좋은 점</h3><ul>${(p.pros || []).map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div><div class="con"><h3>주의할 점</h3><ul>${(p.cons || []).map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div></div>` : ''}
  <div class="safe"><b>낚시 전 확인하세요</b><ul><li>구명조끼를 착용하고, 날씨·물때·현장 안내판을 먼저 확인하세요.</li><li>금어기·포획금지체장 등 규정을 지키고 쓰레기는 되가져오세요.</li></ul></div>
  <p class="fine">이 글은 참고 정보이며 제품·현장 상황과 다를 수 있습니다. 잘못된 내용은 <a href="/contact">문의</a>로 알려 주세요.</p>
  <div class="tags">${p.tags.map((t) => `<a href="/all-posts?q=${encodeURIComponent(t)}">#${esc(t)}</a>`).join('')}</div>
</article>
<aside class="toc" aria-label="목차"><h2>CONTENTS</h2><ol>${heads.map((h) => `<li><a href="#${h.id}">${esc(h.h)}</a></li>`).join('')}</ol></aside>
</div>
<section class="rel"><h2>같은 주제의 다른 글</h2><div class="grid">${related.map(card).join('')}</div></section></div>`;
  const desc = strip(p.sum);
  write(`posts/${p.id}/001.html`, layout({
    title: `${p.title} - ${NAME}`, desc, path: url(p), body, nav: p.cat, type: 'article',
    ld: [
      { '@context': 'https://schema.org', '@type': 'Article', headline: p.title, description: desc, inLanguage: 'ko-KR', datePublished: p.date, dateModified: p.date, articleSection: `${p.cat} › ${p.sub}`, keywords: p.tags.join(', '), mainEntityOfPage: SITE + url(p), isAccessibleForFree: true, author: { '@type': 'Organization', name: NAME, url: SITE + '/' }, publisher: { '@type': 'Organization', name: NAME, url: SITE + '/' } },
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [[NAME, '/'], [p.cat, groupUrl(p.g)], [p.sub, archiveUrl(p.g, p.s)], [p.title, url(p)]].map(([name, u], i) => ({ '@type': 'ListItem', position: i + 1, name, item: SITE + u })) },
    ],
  }));
}

// ---------- 전체 글 / 정적 페이지 ----------
function allPosts() {
  const body = `<div class="wrap"><div class="ph"><div class="crumb"><a href="/">홈</a> › 전체 글</div><h1>전체 글 목록</h1><p id="all-count">총 ${posts.length}개</p></div>
<section class="sec"><div class="sortbar" role="group" aria-label="정렬"><button type="button" data-sort="new" class="on">최신순</button><button type="button" data-sort="old">오래된순</button><button type="button" data-sort="title">제목순</button></div>
<ul class="list" id="all-list">${posts.map((p) => `<li><span class="label">${esc(p.sub)}</span><a href="${url(p)}">${esc(p.title)}</a><time>${p.date}</time></li>`).join('')}</ul>
<p class="empty" id="all-empty" hidden>검색 결과가 없습니다. 다른 검색어를 입력해 보세요.</p></section></div>`;
  write('all-posts.html', layout({ title: `전체 글 목록 - ${NAME}`, desc: `${NAME}의 모든 글을 최신순·제목순으로 찾아볼 수 있습니다.`, path: '/all-posts', body }));
}

function staticPage(file, title, desc, html, prio = 0.3) {
  const body = `<div class="wrap"><div class="ph"><div class="crumb"><a href="/">홈</a> › ${esc(title)}</div><h1>${esc(title)}</h1></div><div class="doc">${html}</div></div>`;
  write(`${file}.html`, layout({ title: `${title} - ${NAME}`, desc, path: '/' + file, body }));
}
function statics() {
  staticPage('about', '사이트 소개', `${NAME}은 낚시 장비를 고르는 기준을 정리하는 무료 정보 사이트입니다.`, `
<h2>무엇을 볼 수 있나요</h2><p>${NAME}은 릴·로드·라인·루어 같은 낚시 장비를 어떻게 고르고 관리하면 좋은지 정리하는 무료 정보 사이트입니다. 현재 ${posts.length}개의 글이 있습니다.</p>
<h2>글은 이렇게 만듭니다</h2><p>제품 사양표를 읽는 법, 장비 조합의 원리, 현장에서 체감되는 차이를 기준으로 글을 씁니다. 특정 제품을 사도록 유도하기보다 <b>고르는 기준</b>을 먼저 설명합니다. 모든 글은 참고 정보이며 조과를 보장하지 않습니다.</p>
<h2>콘텐츠 운영 원칙</h2><ul><li>광고와 본문을 구분해 표시합니다.</li><li>잘못된 정보는 문의를 통해 확인한 뒤 바로 고칩니다.</li><li>안전과 규정을 항상 먼저 안내합니다.</li><li>내용이 얇거나 중복되는 글은 정리합니다.</li></ul>
<h2>광고 안내</h2><p>일부 페이지에는 광고와 제휴 링크가 포함될 수 있으며, 이 경우 <b>광고</b>로 표시합니다.</p>
<h2>정보 정정 요청</h2><p>잘못된 내용은 <a href="/contact">문의</a> 페이지의 이메일로 알려 주세요.</p>`);
  staticPage('contact', '문의', `${NAME} 정보 정정, 권리 침해 신고, 개인정보, 광고·제휴 문의 안내입니다.`, `
<p>아래 이메일로 문의해 주세요. 개인이 운영하는 사이트라 답변까지 며칠 걸릴 수 있습니다.</p>
<p><b>이메일</b> · <a href="mailto:${EMAIL}">${EMAIL}</a></p>
<h2>접수하는 문의</h2><ul><li>정보 정정 요청</li><li>권리 침해 신고</li><li>개인정보 관련 문의</li><li>광고·제휴 문의</li></ul>
<h2>문의할 때 알려 주세요</h2><p>해당 페이지 주소(URL), 고쳐야 할 내용, 근거 자료를 함께 보내 주시면 빠르게 확인할 수 있습니다. 권리 침해 신고는 우선 처리합니다.</p>`);
  staticPage('privacy', '개인정보처리방침', `${NAME}의 개인정보 처리 방침 안내입니다.`, `
<p class="upd">시행일 ${UPDATED}</p>
<h2>1. 처리하는 정보</h2><p>${NAME}은 회원가입, 댓글, 입력 양식이 없으며 이용자의 개인정보를 직접 수집하지 않습니다. 호스팅 사업자(Cloudflare)의 서버 로그, 이메일 문의 내용, 광고·통계 도구가 처리하는 정보가 있을 수 있습니다.</p>
<h2>2. 이용 목적</h2><p>사이트 운영과 보안, 문의 응대, 이용 통계 개선에만 사용합니다.</p>
<h2>3. 보유 기간</h2><p>이메일 문의는 처리 완료 후 1년간 보관하고 파기합니다.</p>
<h2>4. 쿠키와 분석 도구</h2><p>Cloudflare 보안 쿠키와 쿠키를 쓰지 않는 방식의 Cloudflare Web Analytics를 사용할 수 있습니다. 향후 Google AdSense 등 광고를 게재하는 경우 광고 쿠키가 사용될 수 있으며, 이 경우 본 방침에 안내하고 이용자가 거부할 수 있는 방법을 제공합니다.</p>
<h2>5. 외부 사이트와 광고 링크</h2><p>광고·제휴 링크로 이동한 외부 사이트의 개인정보 처리는 해당 사이트의 방침을 따릅니다.</p>
<h2>6. 제3자 제공과 위탁</h2><p>이용자 정보를 제3자에게 제공하지 않습니다. 호스팅(Cloudflare), 이메일(Google Gmail) 등 서비스 운영에 필요한 범위에서 처리가 위탁될 수 있고 해외 서버가 포함될 수 있습니다.</p>
<h2>7. 이용자의 권리</h2><p>개인정보 열람·정정·삭제 요청은 <a href="/contact">문의</a>로 접수하면 10일 이내에 답변드립니다.</p>
<h2>8. 안전성 확보</h2><p>HTTPS 암호화 통신을 사용합니다.</p>
<h2>9. 만 14세 미만 아동</h2><p>만 14세 미만 아동의 개인정보를 수집하지 않습니다.</p>
<h2>10. 책임자와 구제 기관</h2><p>개인정보 보호 책임자는 사이트 운영자이며 연락처는 ${EMAIL}입니다. 침해 신고는 개인정보침해신고센터(KISA), 개인정보분쟁조정위원회, 대검찰청, 경찰청 등에 할 수 있습니다.</p>
<h2>11. 방침 변경</h2><p>내용이 바뀌면 시행 7일 전에 이 페이지에 공지합니다.</p>`);
  staticPage('terms', '이용약관', `${NAME} 이용약관 안내입니다.`, `
<p class="upd">시행일 ${UPDATED}</p>
<h2>제1조 (목적)</h2><p>이 약관은 ${NAME}(이하 “사이트”)이 제공하는 정보 서비스의 이용 조건을 정합니다.</p>
<h2>제2조 (정보의 성격)</h2><p>사이트의 글은 참고 정보이며 조과나 제품 성능을 보장하지 않습니다.</p>
<h2>제3조 (안전과 법령 준수)</h2><p>낚시 시 현장 안내와 관련 법령이 사이트 정보보다 우선합니다. 이용자는 안전 장비를 착용하고 금어기·포획금지체장 등 관련 규정을 지켜야 합니다.</p>
<h2>제4조 (광고와 제휴 링크)</h2><p>일부 페이지에는 광고와 제휴 링크가 포함될 수 있고 이는 <b>광고</b>로 표시합니다.</p>
<h2>제5조 (저작권)</h2><p>사이트의 글, 편집, 디자인에 대한 권리는 운영자에게 있으며 무단 복제·배포를 금지합니다.</p>
<h2>제6조 (권리 침해 신고)</h2><p>권리 침해가 의심되면 <a href="/contact">문의</a>로 알려 주세요. 확인 후 필요한 조치를 합니다.</p>
<h2>제7조 (금지 행위)</h2><p>대량 자동 수집, 서버에 과부하를 주는 행위, 사이트 운영을 방해하는 행위를 금지합니다.</p>
<h2>제8조 (변경과 중단)</h2><p>운영상 필요한 경우 서비스를 변경하거나 중단할 수 있습니다.</p>
<h2>제9조 (책임의 제한)</h2><p>사이트 정보를 이용해 발생한 손해에 대해 운영자는 고의 또는 중대한 과실이 없는 한 책임지지 않습니다.</p>
<h2>제10조 (준거법)</h2><p>이 약관은 대한민국 법령에 따릅니다.</p>
<h2>제11조 (약관의 변경)</h2><p>약관을 바꾸는 경우 시행 7일 전에 공지합니다.</p>`);
  staticPage('legal', '운영 및 법적 고지', `${NAME} 운영자 정보와 광고·제휴, 권리 침해 신고 등 법적 고지입니다.`, `
<p class="upd">최종 수정 ${UPDATED}</p>
<h2>운영자 및 연락처</h2><p>${NAME}은 개인이 운영하는 무료 낚시 장비 정보 사이트입니다. 연락처는 <a href="mailto:${EMAIL}">${EMAIL}</a>입니다.</p>
<h2>광고 및 제휴 표시</h2><p>일부 페이지에는 광고와 제휴 링크가 있으며, 링크를 통해 구매가 이루어지면 운영자가 수수료를 받을 수 있습니다. 해당 부분은 <b>광고</b>로 표시하며, 수수료 여부가 글의 평가에 영향을 주지 않도록 합니다. 향후 Google AdSense 등 광고 서비스를 도입할 수 있습니다.</p>
<h2>정보의 정확성과 안전</h2><p>제품 사양과 가격은 수시로 바뀝니다. 구매 전에는 판매처와 제조사의 최신 정보를 확인해 주세요.</p>
<h2>제3자 상표 고지</h2><p>글에 언급되는 상표와 제품명은 각 권리자의 것이며 사이트와 제조사 간 제휴 관계를 뜻하지 않습니다.</p>
<h2>사업자 정보 표시</h2><p>사이트는 상품을 직접 판매하지 않으며 판매자 정보는 이동한 판매처 페이지에서 확인할 수 있습니다.</p>
<h2>권리 침해 신고</h2><p><a href="/contact">문의</a> 페이지의 이메일로 신고해 주시면 확인 후 신속히 조치합니다.</p>
<h2>관련 정책</h2><p><a href="/privacy">개인정보처리방침</a> · <a href="/terms">이용약관</a></p>`);
  write('404.html', layout({ title: `페이지를 찾을 수 없습니다 - ${NAME}`, desc: '요청한 페이지를 찾을 수 없습니다.', path: '/404', robots: 'noindex', body: `<div class="wrap"><div class="ph"><h1>페이지를 찾을 수 없습니다</h1><p>주소가 바뀌었거나 삭제된 글일 수 있습니다.</p></div><section class="sec"><p><a class="chip" href="/">홈으로</a> <a class="chip" href="/all-posts">전체 글 보기</a></p></section></div>` }));
}

// ---------- 메타 파일 ----------
function meta() {
  // 직접 올린 리뷰 HTML(posts/<폴더>/001.html 중 content에 없는 것)도 sitemap에 포함
  const extra = fs.readdirSync(path.join(ROOT, 'posts'), { withFileTypes: true })
    .filter((d) => d.isDirectory() && !ids.has(d.name) && fs.existsSync(path.join(ROOT, 'posts', d.name, '001.html')))
    .map((d) => [`/posts/${d.name}/001`, 0.8]);
  const entries = [['/', 1.0], ['/all-posts', 0.6], ...['about', 'privacy', 'terms', 'legal', 'contact'].map((x) => ['/' + x, 0.3]), ...archiveUrls.map((u) => [u, 0.7]), ...posts.map((p) => [url(p), 0.8]), ...extra];
  write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.map(([u, pr]) => `  <url><loc>${SITE}${u}</loc><priority>${pr.toFixed(1)}</priority></url>`).join('\n')}\n</urlset>\n`);
  write('robots.txt', `User-agent: *\nAllow: /\nDisallow: /tools/\nDisallow: /admin/\nDisallow: /content/\n\nSitemap: ${SITE}/sitemap.xml\n`);
  write('rss.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>${NAME}</title><link>${SITE}/</link><description>${TAGLINE}</description><language>ko-KR</language>\n${posts.slice(0, 50).map((p) => `<item><title>${esc(p.title)}</title><link>${SITE}${url(p)}</link><guid>${SITE}${url(p)}</guid><pubDate>${new Date(p.date + 'T09:00:00+09:00').toUTCString()}</pubDate><description>${esc(strip(p.sum))}</description></item>`).join('\n')}\n</channel></rss>\n`);
  write('posts.json', JSON.stringify({ posts: posts.map((p) => ({ id: p.id, t: p.title, c: p.cat, s: p.sub, d: p.date, g: p.tags })) }));
  write('manifest.webmanifest', JSON.stringify({ name: `${NAME} - ${TAGLINE}`, short_name: NAME, description: '낚시 장비를 고르는 기준과 구매·관리·안전 정보', id: '/', start_url: '/?source=pwa', scope: '/', display: 'standalone', background_color: '#F5F2EA', theme_color: '#12332A', lang: 'ko', icons: [{ src: '/assets/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }] }, null, 2));
}

home(); archives(); posts.forEach(postPage); allPosts(); statics(); meta();
console.log(`완료: 글 ${posts.length}개, 분류 페이지 ${archiveUrls.length}개`);
