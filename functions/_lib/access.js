// Cloudflare Access 가 붙여 주는 JWT(Cf-Access-Jwt-Assertion)를 직접 검증한다.
// Access 정책만 믿지 않고 한 번 더 확인하므로, 정책 설정이 빠져도 관리자 API 는 열리지 않는다.
//
// 필요한 환경 변수 (Pages → Settings → Environment variables)
//   ACCESS_TEAM_DOMAIN : 예) myteam.cloudflareaccess.com
//   ACCESS_AUD         : Access 애플리케이션의 Audience(AUD) 태그
// 로컬 개발에서만 DEV_ACCESS_BYPASS=1 (localhost 접속일 때만 인정)

let certCache = { at: 0, keys: null, team: '' };

function b64urlToBytes(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

function decodeJson(part) {
  return JSON.parse(new TextDecoder().decode(b64urlToBytes(part)));
}

async function getKeys(team) {
  if (certCache.keys && certCache.team === team && Date.now() - certCache.at < 3600 * 1000) return certCache.keys;
  const res = await fetch(`https://${team}/cdn-cgi/access/certs`);
  if (!res.ok) throw new Error('Access 인증서를 가져오지 못했습니다.');
  const { keys } = await res.json();
  certCache = { at: Date.now(), keys, team };
  return keys;
}

/** 반환: { ok:true, email } 또는 { ok:false, status, error } */
export async function verifyAccess(request, env) {
  const host = new URL(request.url).hostname;
  if (env.DEV_ACCESS_BYPASS === '1' && (host === 'localhost' || host === '127.0.0.1')) {
    return { ok: true, email: 'dev@localhost' };
  }
  const team = env.ACCESS_TEAM_DOMAIN, aud = env.ACCESS_AUD;
  if (!team || !aud) return { ok: false, status: 503, error: '관리자 인증 설정(ACCESS_TEAM_DOMAIN, ACCESS_AUD)이 없어 접근을 막았습니다.' };

  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!token) return { ok: false, status: 401, error: '로그인이 필요합니다.' };
  const parts = token.split('.');
  if (parts.length !== 3) return { ok: false, status: 401, error: '인증 토큰 형식 오류' };
  try {
    const header = decodeJson(parts[0]);
    const payload = decodeJson(parts[1]);
    if (header.alg !== 'RS256') return { ok: false, status: 401, error: '지원하지 않는 서명 방식' };
    const jwk = (await getKeys(team)).find((k) => k.kid === header.kid);
    if (!jwk) return { ok: false, status: 401, error: '서명 키를 찾지 못했습니다.' };
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    const okSig = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64urlToBytes(parts[2]), new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
    if (!okSig) return { ok: false, status: 401, error: '서명이 올바르지 않습니다.' };
    const audList = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!audList.includes(aud)) return { ok: false, status: 403, error: '허용되지 않은 애플리케이션입니다.' };
    if (payload.iss !== `https://${team}`) return { ok: false, status: 403, error: '발급자가 올바르지 않습니다.' };
    if (!payload.exp || payload.exp * 1000 < Date.now()) return { ok: false, status: 401, error: '로그인이 만료되었습니다.' };
    if (!payload.email) return { ok: false, status: 403, error: '이메일 정보가 없습니다.' };
    return { ok: true, email: payload.email };
  } catch (e) {
    return { ok: false, status: 401, error: '인증 확인 중 오류가 발생했습니다.' };
  }
}
