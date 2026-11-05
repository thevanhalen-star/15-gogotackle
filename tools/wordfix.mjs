// content/raw/*.html 단어 일괄 변경 + 조사 맞춤 + 흔한 맞춤법 오류 교정
//   node tools/wordfix.mjs --dry   : 바꾸지 않고 건수만 보고
//   node tools/wordfix.mjs         : 실제로 파일 수정
// 규칙: tools/wordmaps/01-1st.ps1.txt → 02-2nd.ps1.txt 순서로 적용 (PowerShell 스크립트와 같은 방식:
//        긴 단어부터, 파일 안에서 한 번에 치환(자리표시자 방식)). 그 뒤 조사/표기 교정.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RAW = process.env.RAW_DIR || path.join(ROOT, 'content/raw');
const DRY = process.argv.includes('--dry');

function parseMap(file) {
  const map = new Map();
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*"(.*)"\s*=\s*"(.*)"\s*$/);
    if (m) map.set(m[1], m[2]);
  }
  return map;
}
const maps = [parseMap(path.join(ROOT, 'tools/wordmaps/01-1st.ps1.txt')), parseMap(path.join(ROOT, 'tools/wordmaps/02-2nd.ps1.txt'))];

// 변경 규칙이 정상 단어까지 망가뜨리는 경우(예: '스테'→'슷테' 가 '스테인리스'를 '슷테인리스'로)를 막는 보호 목록
const PROTECT = ['스테인', '스테르', '스테이', '스테빌', '스테디', '스테레', '구조도', '개조도', '직조도', '단조도', '활어조도', '조심스레', '부유물', '부유식', '부유형', '전자석', '바치누키', '콤배트', '스테스트', '에스테란', '웨이트리스', '노웨이트', '플라이웨이트', '한가운데라', '군데라', '파워마다'];
const maskAll = (text) => { const tags = []; let t = text; PROTECT.forEach((w, i) => { const tag = `__PROT_${i}__`; if (t.includes(w)) { t = t.split(w).join(tag); tags.push([tag, w]); } }); return [t, tags]; };
const unmask = (t, tags) => { for (const [tag, w] of tags) t = t.split(tag).join(w); return t; };

function applyMap(text, map, stat) {
  const keys = [...map.keys()].sort((a, b) => b.length - a.length);
  let working = text, idx = 0;
  const ph = [];
  for (const old of keys) {
    if (!old) continue;
    const n = working.split(old).length - 1;
    if (n > 0) {
      let tag = `__OAI_PLACEHOLDER_${idx}__`;
      while (working.includes(tag) || text.includes(tag)) { idx++; tag = `__OAI_PLACEHOLDER_${idx}__`; }
      working = working.split(old).join(tag);
      ph.push([tag, map.get(old)]);
      stat[old] = (stat[old] || 0) + n;
      idx++;
    }
  }
  for (const [tag, v] of ph) working = working.split(tag).join(v);
  return working;
}

// ---- 조사 맞춤: 바뀐 단어(목표어) 뒤의 은/는, 이/가, 을/를, 과/와, 으로/로, 이란/란 ----
const targets = new Set();
for (const m of maps) for (const v of m.values()) { if (/[가-힣]$/.test(v) && /^[가-힣 ]+$/.test(v) && v.replace(/ /g, '').length >= 2) targets.add(v); }
const bat = (w) => { const c = w.charCodeAt(w.length - 1) - 0xac00; return c % 28 === 0 ? 0 : c % 28 === 8 ? 2 : 1; }; // 0 받침없음, 1 받침, 2 ㄹ받침
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const AFTER = '(?=$|[^가-힣]|서|써|부터|도|만|까지)';
const josaRules = []; // [regex, replacement(fn)]
for (const w of [...targets].sort((a, b) => b.length - a.length)) {
  const b = bat(w), e = esc(w);
  // [잘못된 조사, 올바른 조사]
  let pairs;
  const ext0 = [['이나', '나'], ['이라면', '라면'], ['이라서', '라서'], ['이라는', '라는'], ['이라고', '라고'], ['이라', '라']];
  const ext1 = [['나', '이나'], ['라면', '이라면'], ['라서', '이라서'], ['라는', '이라는'], ['라고', '이라고'], ['라', '이라']];
  if (b === 0) pairs = [['은', '는'], ['이', '가'], ['을', '를'], ['과', '와'], ['으로', '로'], ['이란', '란'], ...ext0];
  else if (b === 1) pairs = [['는', '은'], ['가', '이'], ['를', '을'], ['와', '과'], ['로', '으로'], ['란', '이란'], ...ext1];
  else pairs = [['는', '은'], ['가', '이'], ['를', '을'], ['와', '과'], ['으로', '로'], ['란', '이란'], ...ext1];
  for (const [bad, good] of pairs) {
    // '이/은/과' 처럼 다른 낱말 첫 글자가 될 수 있는 경우는 바로 뒤가 한글이면 건드리지 않음(AFTER)
    josaRules.push([new RegExp(`(${e})${esc(bad)}${AFTER}`, 'g'), `$1${good}`, `${w}${bad}→${w}${good}`]);
  }
}

// ---- 흔한 맞춤법 오류(모호하지 않은 것만) ----
const TYPOS = [['몇일', '며칠'], ['금새', '금세'], ['어떻해', '어떡해'], ['왠만', '웬만'], ['웬지', '왠지'], ['되요', '돼요'], ['할려고', '하려고'], ['갈려고', '가려고'], ['설레임', '설렘'], ['역활', '역할'], ['희안', '희한'], ['일일히', '일일이'], ['깨끗히', '깨끗이'], ['오랫만', '오랜만'], ['어의없', '어이없'], ['않되', '안 되'], ['할께', '할게'], ['갈께', '갈게'], ['줄께', '줄게'], ['볼께', '볼게'], ['하구요', '하고요'], ['됬', '됐'], ['됫', '됐'], ['뵈요', '봬요'], ['되가지고', '돼 가지고']];

const stat1 = {}, stat2 = {}, josaStat = {}, typoStat = {}, dupStat = { n: 0 };
const changed = new Set();
const files = fs.readdirSync(RAW).filter((f) => f.endsWith('.html')).sort();
for (const f of files) {
  const p = path.join(RAW, f);
  const orig = fs.readFileSync(p, 'utf8');
  let [t, tags] = maskAll(orig);
  t = applyMap(t, maps[0], stat1);
  t = applyMap(t, maps[1], stat2);
  t = unmask(t, tags);
  for (const [re, rep, label] of josaRules) {
    t = t.replace(re, (...a) => { josaStat[label] = (josaStat[label] || 0) + 1; return rep.replace('$1', a[1]); });
  }
  // 'A(A)' 중복 표기 정리
  t = t.replace(/([가-힣]{2,})\(\1\)/g, (m, a) => { dupStat.n++; return a; });
  for (const [bad, good] of TYPOS) {
    const n = t.split(bad).length - 1;
    if (n) { typoStat[bad + '→' + good] = (typoStat[bad + '→' + good] || 0) + n; t = t.split(bad).join(good); }
  }
  if (t !== orig) { changed.add(f); if (!DRY) fs.writeFileSync(p, t); }
}
const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
const top = (o, n = 25) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n);
const report = { mode: DRY ? 'dry' : 'apply', files: files.length, changedFiles: changed.size, pass1: { kinds: Object.keys(stat1).length, total: sum(stat1), top: top(stat1) }, pass2: { kinds: Object.keys(stat2).length, total: sum(stat2), top: top(stat2) }, josa: { kinds: Object.keys(josaStat).length, total: sum(josaStat), top: top(josaStat, 40) }, dup: dupStat.n, typos: typoStat };
fs.writeFileSync(path.join(process.env.WORDFIX_OUT || ROOT, 'wordfix-report.json'), JSON.stringify(report, null, 1));
console.log(JSON.stringify({ ...report, pass1: { ...report.pass1, top: report.pass1.top.slice(0, 8) }, pass2: { ...report.pass2, top: report.pass2.top.slice(0, 8) }, josa: { ...report.josa, top: report.josa.top.slice(0, 12) } }, null, 1));
