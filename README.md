# 고고태클 (gogotackle.com)

낚시 장비 리뷰 정적 사이트. Cloudflare Pages 가 push 때마다 `node tools/build.mjs` 를 실행해 `public/` 을 배포한다.

## 글 추가
1. `content/raw/NNNN.html` 에 본문 HTML 추가 (맨 위 주석: 제목, `#해시태그`)
2. `content/categories.json` 의 `posts` 에 `{file,title,category,topic,genre}` 추가 (카테고리 slug 는 파일 상단 정의 참고)
3. `node tools/build.mjs` 로 확인 → `node tools/dev_server.mjs` (http://localhost:8790) → push

## 구성
- `src/` : 스타일/스크립트(assets), 관리자 화면(admin), `_headers`, 기본 광고 설정
- `functions/` : Pages Functions — `/api/ads`(공개), `/api/admin/*`(Cloudflare Access 로그인 필요)
- 관리자: https://gogotackle.com/admin/  (광고 자리·광고 on/off 관리)
  - Pages 변수 `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD`, KV 바인딩 `ADS_KV` 필요
