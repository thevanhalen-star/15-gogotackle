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

## 폰트
나눔글꼴만 사용 (나눔바른고딕 400/700 + 나눔스퀘어 네오 800/900, 한글·라틴 부분 추출 woff2).
`src/assets/fonts/` 에 있으며 `theme.css` / `fonts.css` 에서 `GG` 라는 이름으로 등록. 외부 폰트 서비스(Google Fonts 등)는 쓰지 않음.

## AdSense 승인 후 설정
`tools/build.mjs` 맨 위의 `ADSENSE_PUB = ''` 에 게시자 ID(예: `pub-1234567890123456`)를 넣고 푸시하면
- 모든 페이지 head 에 AdSense 코드와 `google-adsense-account` 메타가 들어가고
- `ads.txt` (`google.com, pub-…, DIRECT, f08c47fec0942fa0`)가 자동 생성됩니다.
- EEA/영국 방문자용 동의 메시지는 AdSense → 개인정보 보호 및 메시지(Google CMP)에서 켭니다.
- 목록 2페이지 이후와 `/all-posts` 는 `noindex,follow` 이며 sitemap 에서 제외됩니다.
