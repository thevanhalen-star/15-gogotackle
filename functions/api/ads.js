// GET /api/ads — 방문자용: 지금 노출해도 되는 광고만 돌려준다 (관리용 정보 없음)
import { loadConfig, publicView, json } from '../_lib/ads.js';

export async function onRequestGet({ request, env }) {
  try {
    const cfg = await loadConfig(env, request);
    return json(publicView(cfg), 200, {
      // 광고를 끄면 길어도 1~2분 안에 모든 방문자에게 반영
      'cache-control': 'public, max-age=30, s-maxage=60',
    });
  } catch (e) {
    // 설정을 못 읽으면 광고를 숨기는 쪽(끈 광고가 실수로 보이는 일 방지)
    return json({ v: 0, enabled: false, ads: [] }, 200, { 'cache-control': 'no-store' });
  }
}
