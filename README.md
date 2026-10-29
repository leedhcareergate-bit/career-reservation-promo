# 취업 자료 예약 프로모션 · Cursor 전달본

편입학 합격생 대상 취업 자료 예약 프로모션의 정적 HTML 시안입니다. 별도의 빌드 과정이나 패키지 설치 없이 실행할 수 있습니다.

## 파일 구성

- `index.html` — 최종 PC·모바일 반응형 페이지. 삽입 시 `.career-promo` 블록만 사용
- `styles.css` — 레이아웃·컬러·폼·팝업 스타일. 선택자는 `.career-promo` 아래로 묶음
- `base.css` — 이전 공통 스타일. `styles.css`로 합침
- `app.js` — 카드 이동, 전공 선택, 폼 검증, 동의 팝업, 완료 상태, 연동 훅
- `mobile-preview.html` — 390 × 844px 모바일 확인용 프레임
- `CURSOR_REVIEW_BRIEF.md` — 코드 점검 범위와 개발 연동 메모

## 실행 방법

파일을 직접 열어도 대부분 동작하지만, 브라우저 보안 정책 차이를 피하려면 폴더에서 정적 서버를 실행해 주세요.

```bash
python3 -m http.server 4173
```

브라우저에서 다음 주소를 엽니다.

- PC·반응형 페이지: `http://localhost:4173/index.html`
- 모바일 프레임: `http://localhost:4173/mobile-preview.html`

## 현재 구현 범위

- 자료 카드 좌우 이동
- 전공 계열 선택 및 선택값 화면 반영
- 로그인 회원·비회원 폼 전환
- 로그인 회원 전화번호 입력 및 형식 확인
- 개인정보·광고성 정보 상세 팝업
- 필수 항목 검증과 완료 화면
- PC·태블릿·모바일 반응형 레이아웃

## 실제 개발 시 연결할 부분

주소가 비어 있으면 폼 제출은 서버로 보내지 않고 완료 화면만 엽니다.

```js
CareerPromo.setMember({ name: "김민수", phone: "010-1234-5678", email: "minsoo@example.com" });
CareerPromo.setEndpoints({
  reservation: "/api/career-reservations",
  consent: "/api/consent-history",
});
CareerPromo.setLinks({
  loginUrl: "/login",
  privacyPolicyUrl: "/privacy",
});
```

- 전공 계열 값: `humanities_social`, `business_economics`, `arts_sports`, `natural_science`, `engineering_it`, `other_convergence`
- 예약 응답 `status`: `reserved`, `already_reserved`, `cancelled`
- 수신 채널: `email`, `sms`
- 광고성 정보 동의는 `marketingConsent`와 `marketingConsentAt`으로 나뉩니다.
