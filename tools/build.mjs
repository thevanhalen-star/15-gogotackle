// 고고태클 정적 사이트 빌더
//   입력 : content/raw/NNNN.html (본문 HTML) + content/categories.json (분류) + src/ (assets, admin, _headers)
//   출력 : public/  (Cloudflare Pages 출력 디렉터리)
// 사용: node tools/build.mjs
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const OUT = path.join(ROOT, 'public');
const SITE = 'https://gogotackle.com';
const NAME = '고고태클';
const TAGLINE = '낚시 장비 리뷰 & 선택 가이드';
const EMAIL = 'contact@gogotackle.com';
const PER = 24;
const UPDATED = '2026-11-06';
// Google AdSense 게시자 ID (예: 'pub-1234567890123456'). 승인 신청/승인 후 입력하면 head 코드와 ads.txt 가 자동 생성됨.
const ADSENSE_PUB = '';
const ver = (f) => crypto.createHash('md5').update(fs.readFileSync(path.join(SRC, 'assets', f))).digest('hex').slice(0, 8);
const V = { css: ver('theme.css'), js: ver('site.js'), ads: ver('ads.js'), og: ver('og-image.png') };

// 상단 메뉴 묶음 (categories.json 의 카테고리 slug 를 묶어서 보여 줌)
const GROUPS = [
  { slug: 'reel', name: '릴', desc: '베이트릴·스피닝릴·BFS·기타 릴의 구조와 세팅, 비교와 후기를 모았습니다.', cats: ['bait', 'spin', 'bfs', 'reel2'] },
  { slug: 'rod', name: '낚싯대·로드', desc: '로드의 길이·파워·액션과 모델별 비교, 실사용 후기를 모았습니다.', cats: ['rod'] },
  { slug: 'line', name: '라인·채비', desc: '합사·나일론·카본 라인과 리더, 채비 구성을 정리했습니다.', cats: ['line'] },
  { slug: 'lure', name: '루어·리그', desc: '루어와 리그의 쓰임새와 선택 기준을 모았습니다.', cats: ['lure'] },
  { slug: 'etc', name: '장비·현장', desc: '바늘·미끼·보트 등 기타 장비와 현장 전술을 모았습니다.', cats: ['gear', 'field'] },
];

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const write = (rel, data) => { const f = path.join(OUT, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, data); };
const textOf = (h) => h.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const clip = (s, n) => { if (s.length <= n) return s; const cut = s.slice(0, n); const i = Math.max(cut.lastIndexOf('다. '), cut.lastIndexOf('요. ')); return i > n * 0.5 ? cut.slice(0, i + 2) : cut.replace(/\s+\S*$/, '') + '…'; };

// ---------- 출력 폴더 준비 ----------
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
fs.cpSync(path.join(SRC, 'assets'), path.join(OUT, 'assets'), { recursive: true });
fs.cpSync(path.join(SRC, 'admin'), path.join(OUT, 'admin'), { recursive: true });
for (const f of ['_headers', 'ads-default.json']) fs.copyFileSync(path.join(SRC, f), path.join(OUT, f));
if (fs.existsSync(path.join(SRC, 'ad_image'))) fs.cpSync(path.join(SRC, 'ad_image'), path.join(OUT, 'ad_image'), { recursive: true });

// ---------- 분류·글 읽기 ----------
const tax = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/categories.json'), 'utf8'));
const CATS = tax.categories, TOPICS = tax.topics, GENRES = tax.genres;
const catBy = Object.fromEntries(CATS.map((c) => [c.slug, c]));
const topicBy = Object.fromEntries(TOPICS.map((c) => [c.slug, c]));
const genreBy = Object.fromEntries(GENRES.map((c) => [c.slug, c]));
const groupOfCat = {};
GROUPS.forEach((g) => g.cats.forEach((c) => { groupOfCat[c] = g; }));
for (const c of CATS) if (!groupOfCat[c.slug]) throw new Error('메뉴 묶음에 없는 카테고리: ' + c.slug);

function parseRaw(html) {
  const head = html.match(/^\s*<!--([\s\S]*?)-->/);
  const lines = head ? head[1].split('\n').map((s) => s.trim()).filter(Boolean) : [];
  const tags = lines.filter((l) => l.startsWith('#')).map((l) => l.slice(1).trim());
  const m = html.match(/<div class="container">([\s\S]*)<\/div>\s*<\/body>/);
  if (!m) throw new Error('container 없음');
  const heads = [];
  const sections = [];
  const re = /<div class="section">([\s\S]*?)<\/div>/g;
  let sm;
  while ((sm = re.exec(m[1]))) {
    let inner = sm[1].replace(/<!--[\s\S]*?-->/g, '');
    let h = null;
    inner = inner.replace(/<h2 class="([^"]*)">([\s\S]*?)<\/h2>/, (_, cls, t) => { h = { id: `s${heads.length + 1}`, text: textOf(t), end: /conclusion/.test(cls) }; heads.push(h); return ''; });
    const ps = [];
    for (const pm of inner.matchAll(/<p>([\s\S]*?)<\/p>/g)) {
      for (const chunk of pm[1].split(/(?:<br\s*\/?>\s*){2,}/)) {
        const t = chunk.replace(/^(\s|<br\s*\/?>)+|(\s|<br\s*\/?>)+$/g, '').replace(/\s*\n\s*/g, ' ').trim();
        if (t) ps.push(t);
      }
    }
    sections.push({ h, ps });
  }
  return { title: lines.find((l) => !l.startsWith('#')) || '', tags, sections, heads };
}

const posts = [];
let missing = 0;
for (const p of tax.posts) {
  const f = path.join(ROOT, 'content/raw', p.file);
  if (!fs.existsSync(f)) { missing++; continue; }
  if (!catBy[p.category] || !topicBy[p.topic] || !genreBy[p.genre]) throw new Error(`분류 오류: ${p.file}`);
  const n = parseInt(p.file, 10);
  const r = parseRaw(fs.readFileSync(f, 'utf8'));
  const firstP = r.sections.flatMap((s) => s.ps).slice(0, 3).join(' ');
  posts.push({
    n, id: 'G' + String(n).padStart(5, '0'), title: r.title || p.title, cat: p.category, topic: p.topic, genre: p.genre,
    group: groupOfCat[p.category], tags: r.tags, sections: r.sections, heads: r.heads,
    excerpt: clip(textOf(firstP), 120), desc: clip(textOf(firstP), 150),
    chars: r.sections.reduce((a, s) => a + s.ps.join('').length, 0),
  });
}
posts.sort((a, b) => b.n - a.n); // 번호가 클수록 최신
if (missing) console.warn(`경고: raw 파일이 없는 항목 ${missing}개 건너뜀`);

const url = (p) => `/posts/${p.id}/001`;
const by = (key) => { const m = {}; for (const p of posts) (m[key(p)] ||= []).push(p); return m; };
const byCat = by((p) => p.cat), byTopic = by((p) => p.topic), byGenre = by((p) => p.genre), byGroup = by((p) => p.group.slug);
const byCatTopic = by((p) => p.cat + '|' + p.topic);
const SINGLE = {}; GROUPS.forEach((g) => { if (g.cats.length === 1) SINGLE[g.cats[0]] = g.slug; });
const catUrl = (s) => (SINGLE[s] ? `/archive/g-${SINGLE[s]}-1` : `/archive/c-${s}-1`), groupUrl = (s) => `/archive/g-${s}-1`, topicUrl = (s) => `/archive/t-${s}-1`, genreUrl = (s) => `/archive/f-${s}-1`;

// ---------- 공통 조각 ----------
const num = (n) => n.toLocaleString('ko-KR');
const cnt = (c) => (byCat[c] || []).length;

function layout({ title, desc, path: p, body, nav = '', type = 'website', ld = [], robots = 'index,follow', scripts = '' }) {
  const canon = SITE + p;
  const ldJson = ld.length ? `<script type="application/ld+json">${JSON.stringify(ld)}</script>` : '';
  const navItems = [['전체', '/'], ...GROUPS.map((g) => [g.name, groupUrl(g.slug)])];
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="${robots}">
<meta name="theme-color" content="#05070F">
<link rel="canonical" href="${canon}">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="alternate" type="application/rss+xml" title="${NAME} RSS" href="/rss.xml">
<link rel="sitemap" type="application/xml" href="/sitemap.xml">
<meta property="og:type" content="${type}"><meta property="og:site_name" content="${NAME}"><meta property="og:locale" content="ko_KR">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${canon}"><meta property="og:image" content="${SITE}/assets/og-image.png?v=${V.og}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="고고태클 GOGO TACKLE - 낚시 장비 리뷰 & 선택 가이드">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(desc)}"><meta name="twitter:image" content="${SITE}/assets/og-image.png?v=${V.og}">
${ADSENSE_PUB ? `<meta name="google-adsense-account" content="ca-${ADSENSE_PUB}">
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-${ADSENSE_PUB}" crossorigin="anonymous"></script>
` : ''}<link rel="preload" href="/assets/fonts/NanumBarunGothic-400.woff2" as="font" type="font/woff2" crossorigin><link rel="preload" href="/assets/fonts/NanumBarunGothic-700.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/theme.css?v=${V.css}">
${ldJson}
</head>
<body>
<a class="skip" href="#main">본문으로 건너뛰기</a>
<div class="bg"><i class="glow v" aria-hidden="true"></i><i class="glow c" aria-hidden="true"></i>
<div class="wrap">
<header class="hd">
  <a class="brand" href="/" aria-label="${NAME} 홈"><span class="brand-mark" aria-hidden="true">G</span><span class="brand-t"><b>${NAME}</b><small>GOGO TACKLE</small></span></a>
  <nav class="nav g" aria-label="주요 카테고리">${navItems.map(([n, h]) => `<a href="${h}"${nav === n ? ' class="on" aria-current="page"' : ''}>${n}</a>`).join('')}</nav>
  <a class="g sbtn" href="/all-posts?focus=1">검색</a>
</header>
<main id="main">
${body}
</main>
<footer class="ft">
  <div class="ft-a"><div class="ft-n">${NAME}</div><div class="ft-e">GOGO TACKLE</div><p>낚시 장비 선택 기준을 현장의 관점에서 정리하는 개인 프로젝트입니다.</p></div>
  <nav class="ft-c" aria-label="섹션"><div class="mono">Sections</div>${GROUPS.map((g) => `<a href="${groupUrl(g.slug)}">${g.name}</a>`).join('')}</nav>
  <nav class="ft-c" aria-label="사이트 정보"><div class="mono">About</div><a href="/all-posts">전체 글 목록</a><a href="/about">사이트 소개</a><a href="/privacy">개인정보처리방침</a><a href="/terms">이용약관</a><a href="/legal">운영 및 법적 고지</a><a href="/contact">문의</a></nav>
  <div class="ft-z">© 2026 GOGO TACKLE. All rights reserved.</div>
</footer>
</div></div>
<button class="up g" id="up" type="button" aria-label="맨 위로">↑</button>
<script src="/assets/site.js?v=${V.js}" defer></script>${scripts}
</body>
</html>
`;
}

const chip = (href, name, n, on) => `<a class="g chip${on ? ' on' : ''}" href="${href}">${esc(name)}${n !== undefined ? ` ${num(n)}` : ''}</a>`;
const row = (p, ex) => `<a href="${url(p)}" class="g row"><div class="row-b"><div class="mono">${esc(catBy[p.cat].name)}</div><h3>${esc(p.title)}</h3>${ex ? `<p>${esc(p.excerpt)}</p>` : ''}</div><span class="arr" aria-hidden="true">→</span></a>`;
const sechead = (n, label, title, right = '') => `<div class="sech"><div><div class="mono">${n ? n + ' // ' : ''}${label}</div><h2>${title}</h2></div>${right}</div>`;

function pager(base, n, total) {
  if (total < 2) return '';
  const set = new Set([1, total, n - 2, n - 1, n, n + 1, n + 2].filter((x) => x >= 1 && x <= total));
  const arr = [...set].sort((a, b) => a - b);
  let html = '', prev = 0;
  if (n > 1) html += `<a class="g" href="${base(n - 1)}" rel="prev" aria-label="이전">‹</a>`;
  for (const i of arr) {
    if (i - prev > 1) html += '<span class="gap">…</span>';
    html += i === n ? `<span class="cur" aria-current="page">${i}</span>` : `<a class="g" href="${base(i)}">${i}</a>`;
    prev = i;
  }
  if (n < total) html += `<a class="g" href="${base(n + 1)}" rel="next" aria-label="다음">›</a>`;
  return `<nav class="pager" aria-label="페이지">${html}</nav>`;
}

const archiveUrls = [];
function listPages({ key, title, desc, crumb, chips = '', list, nav }) {
  const total = Math.max(1, Math.ceil(list.length / PER));
  const base = (n) => `/archive/${key}-${n}`;
  for (let n = 1; n <= total; n++) {
    const slice = list.slice((n - 1) * PER, n * PER);
    const body = `<div class="ph"><div class="mono"><a href="/">Home</a> / ${crumb}</div><h1>${esc(title)}</h1><p>${esc(desc)} <span class="cnt">총 ${num(list.length)}개</span></p>${chips}</div>
<section class="sec"><div class="rows">${slice.map((p) => row(p, true)).join('')}</div>${pager(base, n, total)}</section>`;
    write(`archive/${key}-${n}.html`, layout({ title: `${title}${n > 1 ? ` (${n}페이지)` : ''} - ${NAME}`, desc: `${desc} 총 ${num(list.length)}개의 글이 있으며, 최근 글로는 “${list[0].title}” 등이 있습니다.${n > 1 ? ` (${n}페이지)` : ''}`, path: base(n), body, nav, robots: n > 1 ? 'noindex,follow' : 'index,follow' }));
    if (n === 1) archiveUrls.push(base(n)); // 2페이지 이후는 sitemap 제외
  }
}

// ---------- 홈 ----------
function home() {
  const total = posts.length;
  const stat = (href, n, label) => `<a href="${href}" class="g stat"><div class="big">${num(n)}</div><div class="mono">${label}</div></a>`;
  const gcount = (s) => (byGroup[s] || []).length;
  const gname = (s) => GROUPS.find((g) => g.slug === s).name;
  const ccard = (c, ratio, cls, label, size) => `<a href="${catUrl(c)}" class="g ccard ${cls}"><div class="cc-b"><div class="mono">${label}</div><div class="big sm">${num(cnt(c))}</div><div class="cc-t" style="font-size:${size}px">${esc(catBy[c].name)}</div></div></a>`;
  const body = `
<section class="hero">
  <div class="hero-t">
    <div class="mono">Gear Review &amp; Buying Guide</div>
    <h1>살 때 후회하지 않게,<br><span class="hl">장비 고르는 기준</span>부터</h1>
    <p class="lead">릴·로드·라인·루어를 고르는 기준과 세팅, 비교, 실사용 후기를 ${num(total)}개의 글로 정리했습니다. 규격표 읽는 법과 현장에서 체감되는 차이를 먼저 봅니다.</p>
    <div class="btns"><a class="g btn2" href="/all-posts">전체 글 ${num(total)}개 →</a></div>
  </div>
</section>

<section class="stats" aria-label="글 수">
  ${stat('/all-posts', total, '전체 글')}${['reel', 'rod', 'lure', 'line', 'etc'].map((s) => stat(groupUrl(s), gcount(s), gname(s))).join('')}
</section>

<section id="combos" class="sec">
  <div class="sech"><div><div class="mono">01 // Categories</div><h2>카테고리</h2></div><div class="chips">${GROUPS[0].cats.map((c) => chip(catUrl(c), c === 'reel2' ? '기타 릴' : catBy[c].name, cnt(c))).join('')}</div></div>
  <div class="cgrid1">${ccard('rod', '16/10', 'wide', 'Rods', 20)}${ccard('bait', '4/3', '', 'Bait', 20)}</div>
  <div class="cgrid2">${ccard('spin', '4/3', '', 'Spinning', 18)}${ccard('bfs', '4/3', '', 'BFS', 18)}<a href="${groupUrl('etc')}" class="g ccard"><div class="cc-b"><div class="mono">Field</div><div class="big sm">${num(gcount('etc'))}</div><div class="cc-t" style="font-size:18px">장비·현장</div></div></a></div>
</section>

<section class="sec note">
  <div class="g note-i"><div class="note-t"><div class="mono">Editor's note</div><blockquote>장비는 스펙이 아니라<br>쓰임새로 고릅니다.</blockquote><p>규격표 읽는 법과 현장에서 체감되는 차이를 먼저 봅니다.</p></div></div>
</section>

<section class="sec">
  ${sechead('02', 'Latest', '최신 글', '<a class="more" href="/all-posts">더 보기 →</a>')}
  <div class="rows">${posts.slice(0, 6).map((p) => row(p, false)).join('')}</div>
</section>

<section class="sec">
  ${sechead('03', 'Browse by topic', '주제로 찾기')}
  <div class="tiles">${TOPICS.map((t) => `<a href="${topicUrl(t.slug)}" class="g tile"><div class="mono lav">${num((byTopic[t.slug] || []).length)}</div><div class="tt">${esc(t.name)}</div></a>`).join('')}</div>
</section>

<section class="sec">
  ${sechead('04', 'Browse by genre', '낚시 장르로 찾기')}
  <div class="tiles">${GENRES.map((t) => `<a href="${genreUrl(t.slug)}" class="g tile"><div class="mono lav">${num((byGenre[t.slug] || []).length)}</div><div class="tt">${esc(t.name)}</div></a>`).join('')}</div>
</section>`;
  write('index.html', layout({
    title: `${NAME} - ${TAGLINE}`,
    desc: '릴·로드·라인·루어 등 낚시 장비를 고르는 기준과 세팅, 비교, 실사용 후기를 정리한 장비 리뷰 사이트입니다.',
    path: '/', body, nav: '전체',
    ld: [{ '@context': 'https://schema.org', '@type': 'WebSite', name: NAME, url: SITE + '/', inLanguage: 'ko-KR', potentialAction: { '@type': 'SearchAction', target: SITE + '/all-posts?q={q}', 'query-input': 'required name=q' } }],
  }));
}

// ---------- 분류 페이지 ----------
function archives() {
  for (const g of GROUPS) {
    const list = byGroup[g.slug] || [];
    listPages({ key: `g-${g.slug}`, title: g.name, desc: g.desc, crumb: esc(g.name), list, nav: g.name, chips: `<div class="chips">${g.cats.map((c) => chip(catUrl(c), catBy[c].name, (byCat[c] || []).length)).join('')}</div>` });
  }
  for (const c of CATS) {
    if (SINGLE[c.slug]) continue; // 그룹 페이지와 내용이 같아 만들지 않음
    const g = groupOfCat[c.slug];
    listPages({ key: `c-${c.slug}`, title: c.name, desc: `${g.name} 중 ${c.name} 관련 글을 모았습니다.`, crumb: `<a href="${groupUrl(g.slug)}">${esc(g.name)}</a> › ${esc(c.name)}`, list: byCat[c.slug] || [], nav: g.name, chips: `<div class="chips">${g.cats.map((x) => chip(catUrl(x), catBy[x].name, (byCat[x] || []).length, x === c.slug)).join('')}</div>` });
  }
  for (const t of TOPICS) {
    listPages({ key: `t-${t.slug}`, title: `주제: ${t.name}`, desc: `${t.name} 주제의 글을 모았습니다.`, crumb: `주제 › ${esc(t.name)}`, list: byTopic[t.slug] || [], nav: '', chips: `<div class="chips">${TOPICS.map((x) => chip(topicUrl(x.slug), x.name, (byTopic[x.slug] || []).length, x.slug === t.slug)).join('')}</div>` });
  }
  for (const t of GENRES) {
    listPages({ key: `f-${t.slug}`, title: `낚시 장르: ${t.name}`, desc: `${t.name} 낚시와 관련된 장비 글을 모았습니다.`, crumb: `낚시 장르 › ${esc(t.name)}`, list: byGenre[t.slug] || [], nav: '', chips: `<div class="chips">${GENRES.map((x) => chip(genreUrl(x.slug), x.name, (byGenre[x.slug] || []).length, x.slug === t.slug)).join('')}</div>` });
  }
}

// ---------- 글 상세 ----------
const AD = (id) => `<div class="ad-photo ad-slot" data-ad-slot="${id}" style="margin:${id === 'detail-top' ? '0 0 32px 0' : '32px 0'};text-align:center;display:none"></div>`;
function postPage(p, i) {
  const bucket = byCatTopic[p.cat + '|' + p.topic];
  const pos = bucket.indexOf(p);
  const pool = [...bucket.slice(pos + 1), ...bucket.slice(0, pos), ...(byCat[p.cat] || [])];
  const related = [];
  for (const x of pool) { if (x !== p && !related.includes(x)) related.push(x); if (related.length === 3) break; }
  const secs = p.sections;
  const midA = Math.max(1, Math.floor(secs.length / 3)), midB = Math.max(midA + 1, Math.floor((secs.length * 2) / 3));
  const bodyHtml = secs.map((s, k) => `${k === midA ? AD('detail-mid-1') : ''}${k === midB ? AD('detail-mid-2') : ''}<section>${s.h ? `<h2 id="${s.h.id}"${s.h.end ? ' class="end"' : ''}>${esc(s.h.text)}</h2>` : ''}${s.ps.map((t) => `<p>${t}</p>`).join('')}</section>`).join('\n');
  const body = `<div class="post">
<article class="g art">
  <div class="mono crumb"><a href="/">Home</a> / <a href="${groupUrl(p.group.slug)}">${esc(p.group.name)}</a> / <a href="${catUrl(p.cat)}">${esc(catBy[p.cat].name)}</a></div>
  <h1>${esc(p.title)}</h1>
  <div class="byline"><a class="g" href="${topicUrl(p.topic)}">${esc(topicBy[p.topic].name)}</a><a class="g" href="${genreUrl(p.genre)}">${esc(genreBy[p.genre].name)}</a></div>
  <p class="disc">이 페이지에는 <b>광고</b>(제휴 링크 포함)가 있을 수 있으며, 광고 링크를 통해 구매하면 운영자가 수수료를 받을 수 있습니다.</p>
  ${AD('detail-top')}
  ${bodyHtml}
  ${AD('detail-end')}
  <div class="safe"><b>낚시 전 확인하세요</b><ul><li>구명조끼를 착용하고, 날씨·물때·현장 안내판을 먼저 확인하세요.</li><li>금어기·포획금지체장 등 규정을 지키고 쓰레기는 되가져오세요.</li></ul></div>
  <p class="fine">이 글은 참고 정보이며 제품·현장 상황과 다를 수 있습니다. 잘못된 내용은 <a href="/contact">문의</a>로 알려 주세요.</p>
  <div class="tags">${p.tags.map((t) => `<a class="g" href="/all-posts?q=${encodeURIComponent(t)}">#${esc(t)}</a>`).join('')}</div>
</article>
<aside class="toc g" aria-label="목차"><div class="mono">Contents</div><ol>${p.heads.map((h) => `<li><a href="#${h.id}">${esc(h.text)}</a></li>`).join('')}</ol></aside>
</div>
<section class="sec rel">${sechead('', 'Related', '같은 주제의 다른 글')}<div class="rows">${related.map((x) => row(x, false)).join('')}</div></section>`;
  write(`posts/${p.id}/001.html`, layout({
    title: `${p.title} - ${NAME}`, desc: p.desc, path: url(p), body, nav: p.group.name, type: 'article', scripts: `\n<script src="/assets/ads.js?v=${V.ads}" defer></script>`,
    ld: [
      { '@context': 'https://schema.org', '@type': 'Article', headline: p.title, description: p.desc, inLanguage: 'ko-KR', articleSection: `${p.group.name} › ${catBy[p.cat].name}`, keywords: p.tags.join(', '), mainEntityOfPage: SITE + url(p), isAccessibleForFree: true, author: { '@type': 'Organization', name: NAME, url: SITE + '/' }, publisher: { '@type': 'Organization', name: NAME, url: SITE + '/' } },
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [[NAME, '/'], [p.group.name, groupUrl(p.group.slug)], [catBy[p.cat].name, catUrl(p.cat)], [p.title, url(p)]].map(([name, u], k) => ({ '@type': 'ListItem', position: k + 1, name, item: SITE + u })) },
    ],
  }));
}

// ---------- 전체 글 / 정적 페이지 ----------
const ALL_PER = 50;
function allPosts() {
  const first = posts.slice(0, ALL_PER);
  const body = `<div class="ph"><div class="mono"><a href="/">Home</a> / All posts</div><h1>전체 글 목록</h1><p id="all-count">총 ${num(posts.length)}개</p>
<form class="sform" action="/all-posts" role="search"><input class="g" type="search" name="q" placeholder="예: 시마노 스피닝릴" aria-label="검색어"><button class="btn" type="submit">검색</button></form></div>
<section class="sec"><div class="sortbar" role="group" aria-label="정렬"><button type="button" class="g on" data-sort="new">최신순</button><button type="button" class="g" data-sort="old">오래된순</button><button type="button" class="g" data-sort="title">제목순</button></div>
<ul class="g list" id="all-list">${first.map((p) => `<li><span class="label">${esc(catBy[p.cat].name)}</span><a href="${url(p)}">${esc(p.title)}</a></li>`).join('')}</ul>
<p class="empty" id="all-empty" hidden>검색 결과가 없습니다. 다른 검색어를 입력해 보세요.</p>
<div class="pager" id="all-pager"></div>
<noscript><p class="fine">전체 목록은 <a href="${groupUrl('reel')}">카테고리 페이지</a>에서도 볼 수 있습니다.</p></noscript></section>`;
  write('all-posts.html', layout({ title: `전체 글 목록 - ${NAME}`, desc: `${NAME}의 모든 글을 검색하고 최신순·제목순으로 찾아볼 수 있습니다.`, path: '/all-posts', body, robots: 'noindex,follow' }));
}

function staticPage(file, title, desc, html) {
  const body = `<div class="ph"><div class="mono"><a href="/">Home</a> / ${esc(title)}</div><h1>${esc(title)}</h1></div><div class="g doc">${html}</div>`;
  write(`${file}.html`, layout({ title: `${title} - ${NAME}`, desc, path: '/' + file, body }));
}

function statics() {
  const N = num(posts.length);
  const AD_NOTE = '이 사이트에는 광고와 제휴(어필리에이트) 링크가 있을 수 있으며, 광고 링크를 통해 구매가 이루어지면 운영자가 수수료를 받을 수 있습니다.';
  staticPage('about', '사이트 소개', `${NAME}은 낚시 장비를 고르는 기준을 정리하는 무료 정보 사이트입니다.`, `
<p class="upd">최종 수정 ${UPDATED}</p>
<h2>무엇을 다루나요</h2><p>${NAME}은 베이트릴·스피닝릴·낚싯대·라인·루어 같은 낚시 장비를 어떻게 고르고, 세팅하고, 정비하면 좋은지 정리하는 무료 정보 사이트입니다. 현재 ${N}개의 글이 있으며 릴, 낚싯대·로드, 라인·채비, 루어·리그, 장비·현장 카테고리와 주제(정비·세팅·비교·후기·입문), 낚시 장르(배스, 연안, 지깅, 라이트게임 등)로 나누어 볼 수 있습니다.</p>
<h2>글을 쓰는 기준</h2><ul><li>제품 이름보다 <b>고르는 기준</b>(규격표 읽는 법, 장비 조합, 현장에서 체감되는 차이)을 먼저 설명합니다.</li><li>제조사·판매자와 무관하게 운영하며, 광고나 수수료 때문에 평가 내용을 바꾸지 않습니다.</li><li>제품 사양과 가격은 자주 바뀌므로, 구매 전에는 제조사와 판매처의 최신 정보를 꼭 확인해 주세요.</li><li>모든 글은 참고 정보이며 조과나 제품 성능을 보장하지 않습니다.</li></ul>
<h2>정정과 업데이트</h2><p>잘못된 내용이나 오래된 정보를 발견하면 <a href="/contact">문의</a>로 알려 주세요. 확인 후 글을 고치고, 근거가 부족한 내용은 삭제하거나 수정합니다. 내용이 얇거나 중복되는 글은 정리합니다.</p>
<h2>안전과 규정</h2><p>낚시는 날씨·물때·장소에 따라 위험할 수 있습니다. 구명조끼 착용, 금어기·포획금지체장 준수, 현장 안내판과 관련 법령 확인을 항상 우선해 주세요.</p>
<h2>수익과 광고</h2><p>${AD_NOTE} 광고는 본문과 구분해 <b>광고</b>로 표시합니다. 자세한 내용은 <a href="/legal">운영 및 법적 고지</a>를 확인해 주세요.</p>
<h2>운영자와 연락처</h2><p>${NAME}은 개인이 운영합니다. 문의는 <a href="mailto:${EMAIL}">${EMAIL}</a> 또는 <a href="/contact">문의 페이지</a>로 보내 주세요.</p>`);

  staticPage('contact', '문의', `${NAME} 정보 정정, 권리 침해 신고, 개인정보, 광고·제휴 문의 안내입니다.`, `
<p class="upd">최종 수정 ${UPDATED}</p>
<p>아래 이메일로 문의해 주세요. 개인이 운영하는 사이트라 답변까지 며칠 걸릴 수 있으며, 개인정보 관련 요청은 10일 이내, 권리 침해 신고는 우선해서 처리합니다.</p>
<p><b>이메일</b> · <a href="mailto:${EMAIL}">${EMAIL}</a></p>
<h2>접수하는 문의</h2><ul><li>정보 정정·삭제 요청</li><li>저작권 등 권리 침해 신고(게시중단 요청)</li><li>개인정보 열람·정정·삭제·처리정지 요청</li><li>광고·제휴 문의</li></ul>
<h2>문의할 때 알려 주세요</h2><p>해당 페이지 주소(URL), 고쳐야 할 내용, 근거 자료를 함께 보내 주시면 빠르게 확인할 수 있습니다. 권리 침해 신고는 <a href="/legal">운영 및 법적 고지</a>의 신고 방법을 참고해 주세요.</p>
<p>이 사이트에는 회원가입이나 댓글 기능이 없으며, 이메일에 포함된 개인정보는 문의 처리 목적으로만 사용합니다.</p>`);

  staticPage('privacy', '개인정보처리방침', `${NAME}의 개인정보 처리 방침과 광고·쿠키(행태정보) 이용 안내입니다.`, `
<p class="upd">시행일 ${UPDATED}</p>
<p>${NAME}(gogotackle.com, 이하 “사이트”)은 「개인정보 보호법」 등 관련 법령을 지키며, 이용자의 개인정보를 안전하게 처리하기 위해 다음과 같이 개인정보처리방침을 둡니다.</p>
<h2>1. 처리하는 개인정보 항목과 수집 방법</h2><ul><li><b>직접 입력 정보 없음:</b> 사이트에는 회원가입, 로그인, 댓글, 입력 양식이 없으며 이용자에게 개인정보를 요구하지 않습니다.</li><li><b>자동 수집 정보:</b> 사이트를 이용하는 과정에서 IP 주소, 접속 일시, 브라우저·기기 정보, 방문한 페이지, 쿠키가 호스팅 사업자(Cloudflare)의 서버 로그 등으로 자동 생성·수집될 수 있습니다.</li><li><b>문의 이메일:</b> 이용자가 이메일로 문의하는 경우 이메일 주소와 문의 내용이 이용자의 제공으로 처리됩니다.</li></ul>
<h2>2. 개인정보의 처리 목적</h2><p>사이트 제공과 보안(부정 이용 방지), 문의 응대, 이용 통계 분석, 광고 게재와 광고 효과 측정에만 사용합니다.</p>
<h2>3. 보유 및 이용 기간</h2><ul><li>서버 접속 기록: 호스팅 사업자의 정책에 따라 보관되며 사이트가 별도로 저장하지 않습니다.</li><li>문의 이메일: 문의 처리를 마친 뒤 1년간 보관하고 파기합니다. 다만 관계 법령에 따라 보존해야 하는 경우에는 그 기간 동안 보관합니다.</li></ul>
<h2>4. 쿠키 등 자동 수집 장치의 사용과 거부</h2><p>사이트와 광고·통계 서비스는 쿠키를 사용할 수 있습니다. 이용자는 웹 브라우저 설정(예: Chrome 설정 → 개인정보 및 보안 → 쿠키)에서 쿠키 저장을 거부하거나 삭제할 수 있습니다. 쿠키를 거부하면 일부 광고 기능이나 서비스 이용이 제한될 수 있습니다.</p>
<h2>5. 광고와 행태정보(맞춤형 광고)</h2><ul><li><b>광고 서비스:</b> 사이트는 Google AdSense 등 제3자 광고 서비스와 제휴 광고를 이용해 광고를 게재할 수 있습니다.</li><li><b>제3자 쿠키:</b> Google을 포함한 제3자 광고 사업자는 쿠키(DoubleClick 쿠키 등)를 사용하여 이용자의 이 사이트 및 다른 웹사이트 방문 기록을 바탕으로 광고를 게재할 수 있습니다.</li><li><b>수집하는 행태정보:</b> 웹사이트 방문 이력, 광고 노출·클릭 이력, 기기·브라우저 정보.</li><li><b>수집 방법·목적:</b> 웹 브라우저의 쿠키 등을 통해 자동으로 수집하며, 이용자 관심사에 맞는 광고 제공과 광고 효과 측정에 사용합니다.</li><li><b>보유 기간:</b> 쿠키 유효기간 또는 해당 광고 사업자의 정책에 따릅니다.</li><li><b>거부 방법:</b> Google 광고 설정(<a href="https://adssettings.google.com" rel="noopener noreferrer" target="_blank">adssettings.google.com</a>)에서 맞춤 광고를 끄거나, <a href="https://www.aboutads.info/choices" rel="noopener noreferrer" target="_blank">aboutads.info/choices</a>에서 광고 사업자별로 거부할 수 있고, 브라우저에서 쿠키를 차단할 수 있습니다. Google의 광고 쿠키 이용 방식은 <a href="https://policies.google.com/technologies/ads" rel="noopener noreferrer" target="_blank">policies.google.com/technologies/ads</a>와 <a href="https://policies.google.com/technologies/partner-sites" rel="noopener noreferrer" target="_blank">partner-sites</a> 안내에서 확인할 수 있습니다.</li><li><b>제휴 링크:</b> 네이버 쇼핑 등 외부 판매처로 이동하면 해당 사업자의 쿠키와 개인정보처리방침이 적용됩니다.</li><li><b>이용 통계:</b> 쿠키를 사용하지 않는 방식의 Cloudflare Web Analytics 등을 사용할 수 있습니다.</li></ul>
<h2>6. 개인정보 처리 위탁과 국외 이전</h2><ul><li><b>Cloudflare, Inc.(미국):</b> 웹사이트 호스팅·CDN·보안·이메일 전달·이용 통계. 처리 항목은 IP 주소, 접속 기록, 문의 이메일이며 서비스 이용 중 네트워크를 통해 전송됩니다.</li><li><b>Google LLC(미국):</b> 이메일 수신(Gmail) 및 광고 서비스(AdSense). 처리 항목은 이메일, 쿠키·광고 관련 행태정보이며 서비스 이용 중 네트워크를 통해 전송됩니다.</li><li>보유·이용 기간은 각 사업자의 정책에 따르며, 이용자는 아래 12번 항목의 연락처로 이전 거부 의사를 밝힐 수 있습니다. 다만 거부하면 서비스 이용이 어려울 수 있습니다.</li></ul>
<h2>7. 제3자 제공</h2><p>이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만 법령에 근거가 있거나 수사기관이 적법한 절차로 요청하는 경우는 예외입니다.</p>
<h2>8. 정보주체의 권리와 행사 방법</h2><p>이용자는 언제든지 개인정보 열람, 정정, 삭제, 처리정지를 요청할 수 있습니다. <a href="/contact">문의</a>의 이메일로 요청하면 본인 확인 후 10일 이내에 조치하고 결과를 알려 드립니다.</p>
<h2>9. 개인정보의 파기</h2><p>보유 기간이 지났거나 처리 목적이 끝난 개인정보는 지체 없이 복구할 수 없는 방법으로 파기합니다.</p>
<h2>10. 안전성 확보 조치</h2><p>HTTPS 암호화 통신을 사용하고, 관리자 화면은 로그인 인증(Cloudflare Access)으로 접근을 제한하며, 개인정보 처리를 최소한으로 합니다.</p>
<h2>11. 만 14세 미만 아동</h2><p>사이트는 만 14세 미만 아동을 대상으로 하지 않으며, 아동의 개인정보와 행태정보를 알면서 수집하거나 맞춤형 광고에 사용하지 않습니다.</p>
<h2>12. 개인정보 보호책임자</h2><p>사이트 운영자가 개인정보 보호책임자를 겸하며 연락처는 <a href="mailto:${EMAIL}">${EMAIL}</a>입니다.</p>
<h2>13. 권익침해 구제 방법</h2><ul><li>개인정보침해신고센터(KISA): 국번 없이 118 · privacy.kisa.or.kr</li><li>개인정보분쟁조정위원회: 1833-6972 · kopico.go.kr</li><li>대검찰청 사이버범죄수사단: 국번 없이 1301 · spo.go.kr</li><li>경찰청 사이버범죄 신고시스템: 국번 없이 182 · ecrm.police.go.kr</li></ul>
<h2>14. 처리방침의 변경</h2><p>내용이 바뀌면 시행 7일 전에 이 페이지에 공지합니다. 중요한 변경은 더 일찍 알립니다.</p>`);

  staticPage('terms', '이용약관', `${NAME} 이용약관 안내입니다.`, `
<p class="upd">시행일 ${UPDATED}</p>
<h2>제1조 (목적)</h2><p>이 약관은 ${NAME}(이하 “사이트”)이 제공하는 정보 서비스의 이용 조건과 운영자·이용자의 권리와 의무를 정합니다.</p>
<h2>제2조 (정보의 성격)</h2><p>사이트의 글은 낚시 장비를 고르고 사용하는 데 참고하는 정보이며, 조과나 제품 성능을 보장하지 않습니다. 제품의 사양·가격·재고는 변경될 수 있으므로 구매 전에 판매처와 제조사의 최신 정보를 확인해야 합니다.</p>
<h2>제3조 (안전과 법령 준수)</h2><p>낚시 시 현장 안내와 관련 법령이 사이트 정보보다 우선합니다. 이용자는 구명조끼 등 안전 장비를 착용하고 금어기·포획금지체장·출입 제한 등 관련 규정을 지켜야 합니다. 안전사고와 법령 위반에 대한 책임은 이용자에게 있습니다.</p>
<h2>제4조 (광고와 제휴 링크)</h2><p>일부 페이지에는 광고와 제휴 링크가 포함될 수 있고 이는 <b>광고</b>로 표시합니다. 링크를 통한 구매에서 운영자가 수수료를 받을 수 있으며, 이용자의 구매 가격에는 영향이 없습니다.</p>
<h2>제5조 (외부 사이트 링크)</h2><p>사이트에서 연결되는 외부 사이트의 내용과 서비스는 해당 사업자의 책임이며, 운영자는 그에 대해 책임지지 않습니다.</p>
<h2>제6조 (저작권)</h2><p>사이트의 글, 편집, 디자인에 대한 권리는 운영자에게 있습니다. 개인적·비영리 목적의 인용은 출처를 밝히면 허용하지만, 무단 복제·배포·상업적 이용을 금지합니다.</p>
<h2>제7조 (권리 침해 신고와 게시중단)</h2><p>사이트의 내용이 권리를 침해한다고 판단되면 <a href="/legal">운영 및 법적 고지</a>의 방법으로 신고할 수 있으며, 운영자는 확인 후 필요한 조치(수정, 임시 비공개, 삭제)를 합니다.</p>
<h2>제8조 (금지 행위)</h2><p>대량 자동 수집(크롤링), 서버에 과부하를 주는 행위, 광고를 부정하게 클릭하는 행위, 사이트 운영을 방해하는 행위를 금지합니다.</p>
<h2>제9조 (서비스의 변경과 중단)</h2><p>운영상 필요한 경우 서비스의 전부 또는 일부를 변경하거나 중단할 수 있으며, 중요한 변경은 사이트에 미리 알립니다.</p>
<h2>제10조 (책임의 제한)</h2><p>사이트는 정보를 있는 그대로 제공합니다. 운영자는 고의 또는 중대한 과실이 없는 한 사이트 정보를 이용해 발생한 손해에 대해 책임지지 않습니다.</p>
<h2>제11조 (준거법과 관할)</h2><p>이 약관은 대한민국 법령에 따르며, 분쟁이 생기면 민사소송법에 따른 관할 법원에서 해결합니다.</p>
<h2>제12조 (약관의 변경)</h2><p>약관을 바꾸는 경우 시행 7일 전에 이 페이지에 공지합니다.</p>`);

  staticPage('legal', '운영 및 법적 고지', `${NAME} 운영자 정보와 광고·제휴 고지, 권리 침해 신고 방법 등 법적 고지입니다.`, `
<p class="upd">최종 수정 ${UPDATED}</p>
<h2>운영자 및 연락처</h2><p>${NAME}은 개인이 운영하는 무료 낚시 장비 정보 사이트입니다. 연락처는 <a href="mailto:${EMAIL}">${EMAIL}</a>입니다.</p>
<h2>광고 및 제휴 표시</h2><p>${AD_NOTE} 이는 「표시·광고의 공정화에 관한 법률」과 공정거래위원회의 「추천·보증 등에 관한 표시·광고 심사지침」에 따라 글 상단과 광고 위치에 <b>광고</b>로 알립니다. 광고 수익은 사이트 운영에 사용되며, 수수료 여부가 글의 평가나 내용에 영향을 주지 않도록 합니다. Google AdSense 등 광고 서비스를 이용하거나 이용할 수 있으며, 이에 따른 쿠키 사용은 <a href="/privacy">개인정보처리방침</a>에서 안내합니다.</p>
<h2>콘텐츠의 성격</h2><p>사이트의 글은 공개된 제품 사양과 자료, 일반적인 사용 지식을 바탕으로 정리한 참고 정보입니다. 제조사·판매자와 무관하게 운영하며, 어떤 제품도 보증하지 않습니다. 제품 사양·가격·재고는 수시로 바뀌므로 구매 전에 판매처와 제조사의 최신 정보를 확인해 주세요.</p>
<h2>안전 고지</h2><p>낚시와 장비 정비에는 위험이 따릅니다. 구명조끼 착용, 날씨·물때 확인, 금어기·포획금지체장 등 규정 준수가 우선이며, 장비를 분해·개조하다가 생긴 고장이나 보증 상실은 이용자의 책임입니다.</p>
<h2>제3자 상표 고지</h2><p>글에 언급되는 제품명과 상표(예: 시마노, 다이와, 아부가르시아 등)는 각 권리자의 소유이며, 제품을 식별·설명하기 위해서만 사용합니다. 사이트와 해당 제조사 사이에 제휴·후원 관계가 있다는 뜻이 아닙니다.</p>
<h2>사업자 정보 표시</h2><p>사이트는 상품을 직접 판매하지 않으며(통신판매 아님), 판매자 정보는 이동한 판매처 페이지에서 확인할 수 있습니다.</p>
<h2>권리 침해 신고와 게시중단 요청</h2><p>저작권, 상표권, 명예 등 권리가 침해되었다고 생각하면 <a href="mailto:${EMAIL}">${EMAIL}</a>로 다음 내용을 보내 주세요: ① 신고인 이름과 연락처 ② 권리자임을 알 수 있는 자료 ③ 침해되었다고 주장하는 페이지 주소(URL) ④ 침해 사유와 요청 내용. 운영자는 접수 후 지체 없이 내용을 확인하고, 「정보통신망 이용촉진 및 정보보호 등에 관한 법률」 제44조의2에 따라 필요한 경우 해당 글을 임시로 비공개하는 등의 조치를 한 뒤 결과를 알려 드립니다.</p>
<h2>관련 정책</h2><p><a href="/about">사이트 소개</a> · <a href="/privacy">개인정보처리방침</a> · <a href="/terms">이용약관</a> · <a href="/contact">문의</a></p>`);
  write('404.html', layout({ title: `페이지를 찾을 수 없습니다 - ${NAME}`, desc: '요청한 페이지를 찾을 수 없습니다.', path: '/404', robots: 'noindex', body: `<div class="wrap"><div class="ph"><h1>페이지를 찾을 수 없습니다</h1><p>주소가 바뀌었거나 삭제된 글일 수 있습니다.</p></div><section class="sec"><p><a class="chip" href="/">홈으로</a> <a class="chip" href="/all-posts">전체 글 보기</a></p></section></div>` }));
}

// ---------- 메타 파일 ----------
function meta() {
  const entries = [['/', 1.0], ...['about', 'privacy', 'terms', 'legal', 'contact'].map((x) => ['/' + x, 0.3]), ...archiveUrls.map((u) => [u, 0.5]), ...posts.map((p) => [url(p), 0.8])];
  write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.map(([u, pr]) => `  <url><loc>${SITE}${u}</loc><priority>${pr.toFixed(1)}</priority></url>`).join('\n')}\n</urlset>\n`);
  write('robots.txt', `User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/\n\nSitemap: ${SITE}/sitemap.xml\n`);
  const day = new Date('2026-11-06T09:00:00+09:00').toUTCString();
  write('rss.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>${NAME}</title><link>${SITE}/</link><description>${TAGLINE}</description><language>ko-KR</language>\n${posts.slice(0, 50).map((p) => `<item><title>${esc(p.title)}</title><link>${SITE}${url(p)}</link><guid>${SITE}${url(p)}</guid><pubDate>${day}</pubDate><description>${esc(p.desc)}</description></item>`).join('\n')}\n</channel></rss>\n`);
  // 검색용: [id, 제목, 카테고리, 주제, 장르, 해시태그]
  write('posts.json', JSON.stringify({ posts: posts.map((p) => [p.id, p.title, catBy[p.cat].name, topicBy[p.topic].name, genreBy[p.genre].name, p.tags.join(' ')]) }));
  if (ADSENSE_PUB) write('ads.txt', `google.com, ${ADSENSE_PUB}, DIRECT, f08c47fec0942fa0
`);
  write('manifest.webmanifest', JSON.stringify({ name: `${NAME} - ${TAGLINE}`, short_name: NAME, description: '낚시 장비를 고르는 기준과 세팅·비교·후기', id: '/', start_url: '/?source=pwa', scope: '/', display: 'standalone', background_color: '#05070F', theme_color: '#05070F', lang: 'ko', icons: [{ src: '/assets/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }] }, null, 2));
}

home(); archives(); posts.forEach(postPage); allPosts(); statics(); meta();
console.log(`완료: 글 ${posts.length}개, 목록 페이지 ${archiveUrls.length}개 → public/`);
