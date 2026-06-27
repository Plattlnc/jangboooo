# 02 · 로그인 / 본인인증 화면

목표: 카카오 간편로그인 → 휴대폰 본인인증 → 관리시스템 명단 매칭 → `admin_rider_id` 바인딩.
**불안 해소가 1순위.** "왜 번호가 필요한가"를 먼저 안심시킨다(cmo 보이스: 신뢰 > 친근 > 동기).

카피는 `docs/copy/auth.md` 가 SSOT — 여기 인용은 배치/상태 매핑용. 토큰/상태는 [01-component-library.md] 참조.

레이아웃: 전 단계 `app-container`(max 480) 중앙, `min-h-dvh` 세로 중앙 정렬, `px-5`(20). 배경 `bg-bg`.
스텝 전환: 슬라이드(translateX 16px + fade) 250ms emphasized. 뒤로가기 가능(스텝 1 제외).

---

## 플로우 개요

```
[S1 카카오 로그인] ──카카오 OAuth──▶ [S2 본인인증 안내]
        │ "카카오로 시작하기"                  │ "휴대폰 인증하기"
        ▼                                      ▼
                                       [S3 휴대폰번호 입력] ──문자발송──▶ [S4 인증번호 입력]
                                                                              │ 검증
                                              ┌───────────────────────────────┤
                                              ▼ 매칭성공                       ▼ 매칭실패
                                       [S5a 연결완료] →대시보드        [S5b 연결실패] 재시도/문의
```

---

## S1 · 카카오 로그인 (첫 진입)

구성(위→아래):
1. 브랜드/로고 영역 — 서비스명 **"배달장부2"**(확정 2026-06-28. 코드네임 jangboooo 는 내부용). 로고 미정 시 워드마크.
2. 히어로 `text-h1` `text-fg`: **"내 배달 성적표, 내 손안에."**
3. 보조 `text-body text-muted`: "완료·수락률·취소까지, 내 실적을 오늘·주·월로 한눈에 봐요."
4. (여백, flex-1 로 CTA 를 하단 가까이)
5. **KakaoLoginButton** (Button `lg` `w-full` kakao 변형): "카카오로 시작하기" — 좌측 카카오 심볼.
6. 안심 문구 `text-caption text-muted` 중앙: "카카오 계정으로 안전하게 로그인해요. 친구 목록이나 메시지는 가져오지 않아요."
7. 약관 라인 `text-caption text-subtle`: "시작하면 [이용약관]과 [개인정보 처리방침]에 동의하게 돼요." — 링크 2개 `text-primary underline`.

KakaoLoginButton 상태:

| 상태 | 스타일 |
|------|--------|
| default | `bg-kakao text-kakao-fg` `rounded-md` h-13, 심볼+라벨 `gap-2` 중앙 |
| hover | 밝기 약간 down (kakao 고정색 유지 — 명도만) |
| active | `scale-[.97]` |
| focus-visible | 전역 ring |
| loading | 라벨→Spinner(`text-kakao-fg`), "잠깐만요…" 폭 유지, 클릭 차단, `aria-busy`. (카카오 리다이렉트 대기) |
| disabled | `opacity-50` (네트워크 차단 등 예외) |
| error | 버튼 하단 인라인 `text-caption text-danger` "로그인을 못 했어요. 다시 시도해 주세요" + 자동 재활성 |

> ⚠️ Kakao 색(`#fee500`)·심볼은 카카오 디자인 가이드 고정 자산 — 변형 금지. `--kakao-bg/-fg` 외 값 사용 불가.

---

## S2 · 본인인증 안내

목적 설명으로 안심시키고 인증을 시작.

구성:
- 아이콘/일러스트(중립 `text-subtle`, 휴대폰/연결 모티프).
- 제목 `text-h2 text-fg`: "휴대폰으로 내 기록을 찾을게요"
- 본문 `text-body text-muted` (2줄): "등록된 휴대폰 번호로 내 배달 기록을 안전하게 연결해요." / "번호는 본인 확인과 기록 연결에만 쓰이고, 따로 저장해 마케팅에 쓰지 않아요."
- **안심 카드** (`bg-primary-subtle` `rounded-md` `p-4`, 좌측 방패/체크 아이콘 `text-primary`): "이 점수와 기록은 평가가 아니라 내 기록이에요. 정산이나 배차에 영향을 주지 않아요."
- 하단 CTA Button `lg primary w-full`: "휴대폰 인증하기".

상태: 정적 화면. CTA 는 Button 표준 상태. 안심 카드는 항상 노출(첫 신뢰 형성 핵심).

---

## S3 · 휴대폰 번호 입력

구성:
- 제목 `text-h2`: (auth.md 의 안내 톤 유지) "휴대폰 번호를 입력해 주세요"
- **Field**(phone): label "휴대폰 번호", input `inputmode="numeric"` `autocomplete="tel"` placeholder "010-0000-0000", 입력 시 자동 하이픈 포맷.
- helper `text-caption text-muted`: "문자로 인증번호를 보내드려요."
- CTA Button `lg primary w-full`: "인증번호 받기".

Field/CTA 상태:

| 상태 | 동작 |
|------|------|
| default | CTA disabled (유효 번호 전) |
| typing | 형식 유효(010 + 10~11자리) 되면 CTA 활성 |
| focus | Field `border-primary` + `shadow-focus` |
| error(형식) | Field `border-danger` + "휴대폰 번호 형식을 확인해 주세요" |
| loading(발송중) | CTA loading(Spinner), Field 잠금 |
| error(발송실패) | Toast danger "문자를 보내지 못했어요. 잠시 후 다시 시도해 주세요" + CTA 재활성 |
| success | S4 로 전환(발송 완료) |

---

## S4 · 인증번호 입력

구성:
- 제목 `text-h2`: "문자로 받은 6자리 숫자를 입력해 주세요"
- 보조 `text-sm text-muted`: "{표시번호} 로 보냈어요" (입력 번호 마스킹 표시).
- **인증번호 Field**: 6자리. 단일 input(`inputmode="numeric"` `autocomplete="one-time-code"` `maxlength=6`, `tabular-nums`, 자간 넓게) 또는 6칸 OTP. placeholder "인증번호 6자리".
- 우측/하단 **타이머** `text-caption`: "{초}초 후에 다시 받을 수 있어요" → 만료 시 `text-danger`.
- **재전송** 텍스트버튼(ghost sm): "인증번호 다시 받기" — 타이머 동안 disabled.
- CTA Button `lg primary w-full`: "인증 완료하기".
- 하단 **안심 문구** `text-caption text-muted`: "이 점수와 기록은 평가가 아니라 내 기록이에요. 정산이나 배차에 영향을 주지 않아요."

상태:

| 상태 | 스타일/동작 |
|------|------------|
| default | CTA disabled(6자리 미만), 타이머 카운트다운 |
| typing | 6자리 채우면 CTA 활성, (옵션) 자동 제출 |
| focus | Field/각 칸 `border-primary` + ring |
| verifying | CTA loading(Spinner) "확인 중…", Field 잠금 |
| error(불일치) | Field `border-danger` + "인증번호가 맞지 않아요. 다시 확인해 주세요", 입력값 유지/포커스 |
| error(만료) | 타이머 0 → `text-danger` "인증번호가 만료됐어요" + "인증번호 다시 받기" 강조 |
| resend-loading | 재전송 버튼 Spinner, 완료 시 타이머 리셋 + Toast info "인증번호를 다시 보냈어요" |
| success | 검증 통과 → 매칭 처리(S5) |

a11y: OTP 각 칸 `aria-label`("인증번호 N번째 자리"), 에러 `role="alert"`, 타이머 `aria-live="polite"` 과도 알림 방지(분 단위만 읽기).

---

## S5a · 연결 성공

- 성공 아이콘(`text-success`, 체크) — 과한 컨페티 지양(도구형 신뢰).
- 제목 `text-h2`: "내 기록을 찾았어요"
- 본문 `text-body text-muted`: "{라이더명}님의 배달 기록이 연결됐어요. 지금 바로 확인해 봐요."
- CTA Button `lg primary w-full`: "내 대시보드 보기" → 대시보드.
- 진입 모션: 체크 scale-in 250ms emphasized(reduced-motion 시 즉시).

## S5b · 연결 실패 (명단에 번호 없음)

EmptyState 패턴(에러 아님 — 사용자 잘못 단정 금지):
- 중립 아이콘 `text-subtle`.
- 제목 `text-h2`: "연결할 기록을 못 찾았어요"
- 본문 `text-body text-muted`: "이 번호로 등록된 라이더 기록이 없어요. 관리 담당자에게 등록된 번호가 맞는지 확인해 주세요."
- 보조 `text-sm text-subtle`: "번호를 바꿔 다시 시도할 수도 있어요."
- CTA(주) Button `lg primary w-full`: "다른 번호로 인증하기" → S3.
- CTA(보조) Button `md ghost`: "문의하기".

> 톤 주의: 실패 화면에 빨강/경고 강조 금지(cmo 금지표현 — 책임 추궁/불안 조장). 중립 + 해결 경로 제시.

---

## 반응형 / 접근성 (로그인 공통)

- 375 기준 단일 컬럼. `md:`/`xl:` 에서도 `app-container`(480) 유지 — 폼이 넓게 퍼지지 않게.
- 모든 CTA `lg`(h-13=52) 풀폭, 하단 thumb-zone 배치. 입력 필드 h-12(48) ≥ 44 충족.
- 키보드 등장 시 CTA 가림 방지: 폼 영역 스크롤 가능, CTA 는 `sticky bottom` 옵션(키보드 위 노출).
- 대비 검증 조합: 카카오 `#191600` on `#fee500`(AA 충족), `text-muted` on `bg`, `text-primary` 링크 on `bg`.
- 단계 진행 표시(선택): 상단 진행 도트 3개 — 색 + 위치로 현재 단계.
