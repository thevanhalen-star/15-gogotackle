관리자 API 구성 (Cloudflare Pages Functions)
- /api/ads            : 방문자용 공개 광고 설정 (KV 값 또는 /ads-default.json)
- /api/admin/*        : Cloudflare Access 로그인(JWT 검증) + 같은 출처 요청만 허용
필요 설정: Pages 변수 ACCESS_TEAM_DOMAIN, ACCESS_AUD / KV 바인딩 ADS_KV
