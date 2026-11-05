// GET /api/admin/ads  — 전체 설정 조회 (관리자 화면용)
// PUT /api/admin/ads  — 설정 저장 (version 이 서버와 다르면 409: 다른 창에서 먼저 저장된 것)
import { HISTORY_KEY, KV_KEY, json, loadConfig, validateConfig } from '../../_lib/ads.js';

export async function onRequestGet({ request, env, data }) {
  const cfg = await loadConfig(env, request);
  let history = [];
  if (env.ADS_KV) {
    try { history = JSON.parse((await env.ADS_KV.get(HISTORY_KEY)) || '[]'); } catch { history = []; }
  }
  return json({ config: cfg, history, user: data.user, kv: !!env.ADS_KV });
}

export async function onRequestPut({ request, env, data }) {
  if (!env.ADS_KV) return json({ error: 'KV(ADS_KV)가 연결되지 않아 저장할 수 없습니다. 설정 방법 문서를 확인하세요.' }, 503);

  const text = await request.text();
  if (text.length > 400 * 1024) return json({ error: '설정이 너무 큽니다.' }, 413);
  let body;
  try { body = JSON.parse(text); } catch { return json({ error: 'JSON 형식이 올바르지 않습니다.' }, 400); }

  const current = await loadConfig(env, request);
  if ((body.baseVersion ?? -1) !== (current.version || 0)) {
    return json({ error: '다른 곳에서 먼저 저장된 변경이 있습니다. 새로고침 후 다시 시도하세요.', current }, 409);
  }
  const v = validateConfig(body.config);
  if (!v.ok) return json({ error: '입력 내용을 확인하세요.', errors: v.errors }, 400);

  const next = { ...v.config, version: (current.version || 0) + 1, updatedAt: new Date().toISOString(), updatedBy: data.user };
  await env.ADS_KV.put(KV_KEY, JSON.stringify(next));

  // 변경 기록(최근 30건): 무엇이 켜지고 꺼졌는지 한 줄 요약
  const before = new Map((current.ads || []).map((a) => [a.id, a]));
  const notes = [];
  if ((current.enabled !== false) !== next.enabled) notes.push(`전체 광고 ${next.enabled ? '켬' : '끔'}`);
  for (const a of next.ads) {
    const b = before.get(a.id);
    if (!b) notes.push(`추가: ${a.name}`);
    else if ((b.enabled !== false) !== a.enabled) notes.push(`${a.enabled ? '켬' : '끔'}: ${a.name}`);
    else if (JSON.stringify(b) !== JSON.stringify(a)) notes.push(`수정: ${a.name}`);
    before.delete(a.id);
  }
  for (const b of before.values()) notes.push(`삭제: ${b.name}`);
  const oldSlots = new Map((current.slots || []).map((s) => [s.id, s]));
  for (const s of next.slots) {
    const o = oldSlots.get(s.id);
    if (o && (o.enabled !== false) !== s.enabled) notes.push(`자리 ${s.enabled ? '켬' : '끔'}: ${s.label}`);
  }
  let history = [];
  try { history = JSON.parse((await env.ADS_KV.get(HISTORY_KEY)) || '[]'); } catch { history = []; }
  history.unshift({ at: next.updatedAt, by: data.user, version: next.version, note: notes.join(', ').slice(0, 300) || '변경 없음' });
  await env.ADS_KV.put(HISTORY_KEY, JSON.stringify(history.slice(0, 30)));

  return json({ config: next, history: history.slice(0, 30) });
}
