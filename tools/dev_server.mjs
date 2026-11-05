// 로컬 미리보기: Cloudflare Pages처럼 확장자 없는 주소(/posts/G00001/001, /about)를 .html로 연결
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT || 8790);
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.webmanifest': 'application/manifest+json' };

http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.startsWith('/_preview/')) { // 로컬 전용 시안 미리보기 (배포되지 않음)
    const pf = path.join(ROOT, 'design-preview', p.slice('/_preview/'.length));
    if (pf.startsWith(path.join(ROOT, 'design-preview')) && fs.existsSync(pf) && fs.statSync(pf).isFile()) { res.writeHead(200, { 'Content-Type': TYPES[path.extname(pf)] || 'application/octet-stream' }); return fs.createReadStream(pf).pipe(res); }
  }
  const tries = [p, p + '.html', path.posix.join(p, 'index.html')];
  for (const t of tries) {
    const f = path.join(ROOT, 'public', t);
    if (f.startsWith(path.join(ROOT, 'public')) && fs.existsSync(f) && fs.statSync(f).isFile()) {
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
      return fs.createReadStream(f).pipe(res);
    }
  }
  res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
  fs.createReadStream(path.join(ROOT, 'public', '404.html')).pipe(res);
}).listen(PORT, () => console.log('http://localhost:' + PORT));
