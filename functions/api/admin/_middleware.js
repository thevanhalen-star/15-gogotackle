// /api/admin/* 전체 보호: Cloudflare Access 로그인 확인 + 변경 요청은 같은 사이트에서 온 것만 허용(CSRF 방지)
import { verifyAccess } from '../../_lib/access.js';
import { json } from '../../_lib/ads.js';

export async function onRequest(context) {
  const { request, env } = context;
  const auth = await verifyAccess(request, env);
  if (!auth.ok) return json({ error: auth.error }, auth.status, { 'cache-control': 'no-store' });

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const origin = request.headers.get('Origin');
    if (!origin || origin !== new URL(request.url).origin) return json({ error: '허용되지 않은 요청 출처입니다.' }, 403);
    if (request.headers.get('X-Gogo-Admin') !== '1') return json({ error: '잘못된 요청입니다.' }, 403);
  }
  context.data.user = auth.email;
  const res = await context.next();
  const out = new Response(res.body, res);
  out.headers.set('cache-control', 'no-store');
  return out;
}
