# 03 · 대시보드 화면

> ⛔ **SUPERSEDED (2026-06-28).** 이 SLA-점수 안은 Figma 개편으로 폐기되었다.
> 현행 SSOT: **[06-dashboard-redesign.md](./06-dashboard-redesign.md)** (메인 = 오늘 수락률 원형 게이지).
> 아래 내용은 히스토리 참고용.

라이더가 폰으로 "오늘 나 잘하고 있나?"에 **3초 안에** 답하는 화면. 숫자가 주인공, 색은 보조.
데이터: backend `get_rider_summary`(기간 요약) · `get_rider_hourly`(시간대) — `src/types/database.ts`.
카피 SSOT: `docs/copy/dashboard.md`. 토큰/상태: [01-component-library.md], 기준: [00-foundations.md].

레이아웃: `app-container`(max 480) 중앙, 세로 단일 스크롤. 좌우 `px-4 md:px-6`. 배경 `bg-bg`.

---

## 화면 구조 (위 → 아래)

```
┌─ DashboardHeader ─────────────┐  인사 + 마지막 갱신
├─ PeriodTabs (sticky) ─────────┤  오늘 / 이번 주 / 이번 달
├─ SlaScore (대형) ─────────────┤  메인 SLA 점수 + 게이지 + 등급
├─ (조건부) MotivationBanner ───┤  과거의 나 대비 격려
├─ StatGrid ────────────────────┤  완료·거절·배차취소·배달취소·수락률
├─ PeakHourChart ───────────────┤  시간대별 실적
└─ FooterActions ───────────────┘  새로고침 · 도움
```

데이터 매핑 (`RiderSummaryRow`):
`sla_score`→SlaScore · `completed`/`rejected`/`dispatch_canceled`/`delivery_canceled`→StatCard · `acceptance_rate`→수락률 카드 · `assigned`→수락률 보조(받은/전체) · `active_days`/`last_captured_at`→헤더·비교.

---

## A. DashboardHeader

- 인사 `text-h3 text-fg`: "{라이더명}님, 오늘도 안전 운행해요" (시간대 반영 가능 — 카피는 dashboard.md).
- 마지막 갱신 `text-caption text-muted` + 작은 점(`bg-success` pulse): "방금 업데이트됨" / "{n}분 전 업데이트" (`last_captured_at` 기준).
- 갱신 주기 안내(아주 작게, 선택) `text-caption text-subtle`: "기록은 1분마다 자동으로 새로워져요".
- 우상단: IconButton 설정(추후) / 새로고침(옵션).

상태: 갱신 시각 stale(>3분) 이면 점 `bg-warning`. 데이터 로딩 중엔 인사만 노출, 갱신문구 skeleton.

---

## B. PeriodTabs (오늘 / 이번 주 / 이번 달)

- SegmentedTabs(컴포넌트 B). 값 `today|week|month` = `SlaPeriod`. **sticky** `top-0 z-[100]` + `bg-bg/90 backdrop-blur`.
- 라벨: "오늘 / 이번 주 / 이번 달" (협소 시 "오늘 / 주 / 월").
- 탭 변경 → 전체 데이터 리패치. 전환 중 하위 영역 **레이아웃 유지한 채** loading(skeleton), 탭 인디케이터는 즉시 이동(200ms).
- 빈 기간이어도 탭 비활성화 금지 — 누르면 각 영역 empty 표시.

---

## C. SlaScore (메인 지표)

화면 1순위. 컴포넌트 D 규격. `sla_score`(0–100), 단위 **"점"** 표기(라벨이 "점수"라 % 아님 — 수락률만 %).

- 상단 라벨 `text-caption text-muted`: **첫 노출 시** "SLA 점수 (배달 신뢰도 점수)" — 영문약어 첫 등장 한글 괄호풀이(cmo 브랜딩 §8.8). 같은 세션 재노출부터는 "SLA 점수"만. + i 아이콘(탭 시 툴팁 "배달을 약속대로 잘 해낸 정도를 나타내는 종합 신뢰 점수예요.").
- 점수 `text-score tabular-nums`, 상태색(임계값 00-foundations §1) + "점" 접미는 `text-h2 text-muted`.
- 게이지: 원형 링 0→값 600ms out, 진행색=상태색, 트랙=`border`.
- 등급 Badge: 우수(success)/주의(warning)/위험(danger) — **색+텍스트 병행**.
- 첫 등장 안심 한 줄(선택) `text-caption text-muted`: "이 숫자는 평가가 아니라 내 기록이에요." (cmo 신뢰 메시지).

상태: default/loading/error/empty 는 컴포넌트 D 매트릭스. empty(기간 기록 없음): 게이지 0% 회색 + "아직 {기간} 기록이 없어요. 첫 콜 받으면 여기 채워져요".

---

## D. MotivationBanner (조건부)

과거의 나 대비. **다른 라이더와 비교 금지**(cmo §8). 과하지 않게 — 조건 충족 시에만 1개.

- 호조: `bg-success-subtle` `rounded-md` `p-3` `text-sm`, 좌측 ↗ 아이콘 `text-success`: "이번 주, 어제의 나보다 한 걸음 더 갔어요".
- 회복 여지(부진): `bg-warning-subtle` `text-warning` 톤: "이번 {기간}은 조금 낮지만, 아직 {n}일 남았어요" (질책 아님, 여지 제시).
- 표시 규칙: 둘 중 우선순위 1개만, 매 갱신마다 깜빡이지 않게(세션 동안 안정). 데이터 없으면 미표시.

---

## E. StatGrid + StatCard

지표 5종. **반응형 그리드**: base 2열(`grid-cols-2 gap-3`), `md:` 3열, 수락률은 강조 위해 base 에서 가로 1열 풀폭 옵션.

| 카드 | 값 필드 | 단위 | 델타(지난 기간 대비) 좋은 방향 | 빈/0 처리 |
|------|---------|------|-------------------------------|-----------|
| 완료 | `completed` | 건 | 증가=good(success) | 0건=유효(회색 0) |
| 거절 | `rejected` | 건 | **감소=good** (증가 시 warning) | 0건=good 톤 |
| 배차취소 | `dispatch_canceled` | 건 | **감소=good** | 0건=good 톤 |
| 배달취소 | `delivery_canceled` | 건 | **감소=good** | 0건=good 톤 |
| 수락률 | `acceptance_rate` | % | 증가=good, 임계값 색 적용 | null=`—` |

StatCard 구성: 라벨(`text-caption text-muted`, i 툴팁) · 값(`text-h1 tabular-nums text-fg`, 단위 접미 `text-sm text-muted`) · 델타 Badge(↑/↓ + 값).

**델타 색 방향(중요 — frontend 자의 금지):**
- 긍정지표(완료/수락률/SLA): 증가=success, 감소=warning(레드 지양).
- 부정지표(거절/배차취소/배달취소): **감소=success, 증가=warning**. 방향 화살표는 실제 증감 그대로, **색만 의미 기준**.
- 변화 없음: neutral Badge "비슷해요".
- 카피: "지난 {기간}보다 {n} 올랐어요/내렸어요/비슷해요" (dashboard.md §5).

보조 문구(값 조건, dashboard.md §3): 수락률 ≥90% "콜을 잘 잡고 있어요" / <70% "이번 {기간}엔 조금 낮아요" / 완료 호조 "잘 달리고 있어요" / 취소 발생 "{유형} {n}건이 잡혔어요"(책임추궁 금지).

상태(컴포넌트 C 매트릭스): loading=동일 레이아웃 skeleton, error=값 `—`+인라인 재시도, empty(미수집)=`—`+"데이터 없음" vs 0건은 정상.

> 취소/거절 카드를 **빨간 블록으로 칠하지 않는다.** 값·델타에만 점적 색. 0건일 때 오히려 "0건, 깔끔해요" 같은 긍정 톤 가능.

---

## F. PeakHourChart (시간대별 실적)

컴포넌트 F 규격. 데이터 `get_rider_hourly` → `{hour, completed}[]`.

- 섹션 제목 `text-h3`: "시간대별 실적" + 보조 `text-caption text-muted`.
- 막대(기본): x=시간(24h, `18시` 표기, 혼잡 시 격시), y=완료 건수. 피크 막대 강조(`bg-primary` 진하게 + 값 라벨 굵게), 그 외 `bg-primary/70`.
- 하이라이트 문구 `text-sm`: "{시작}~{끝}시에 가장 많이 달렸어요" (피크 구간, dashboard.md §4).
- 막대 탭 → 툴팁(시간·건수).
- 빈 구간 안내: "이 시간대는 아직 기록이 없어요".

상태: 진입 stagger(scaleY, 30ms 간격) · loading=막대 skeleton 12개 · error=인라인 ErrorState+재시도 · empty(전체)=축 유지+중앙 "이 기간 실적이 없어요". 시간 많을 때 가로 스크롤 허용(컨테이너 내).

---

## G. FooterActions

- 새로고침 Button(`md secondary` 또는 IconButton): "새로고침" — 누르면 전체 리패치, 헤더 갱신시각 업데이트, 버튼 loading.
- 도움 Button(`md ghost`): "도움이 필요해요" → 문의/도움.
- (선택) "자세히 보기" — 상세 화면 추후.
- 하단 safe-area 여백 확보(`pb-[env(safe-area-inset-bottom)]` 는 body 처리, 추가 `pb-8`).

---

## 화면 레벨 상태

| 레벨 | 처리 |
|------|------|
| 최초 로딩 | 헤더 텍스트 + 전 영역 skeleton(레이아웃 동일, 시프트 0). 탭은 즉시 인터랙션 가능 |
| 부분 에러 | 실패한 영역만 인라인 에러(다른 카드는 정상). 전체 차단 지양 |
| 전체 조회 실패 | SlaScore 영역에 ErrorState + "새로고침"(secondary). 헤더 유지 |
| 빈 데이터(신규/미바인딩) | 각 영역 empty 카피 + 첫 안내 "첫 콜 받으면 여기 채워져요" |
| 백그라운드 갱신(1분) | 무중단 — 값만 부드럽게 교체(숫자 200ms 페이드/카운트), 스피너로 화면 가리지 않음. 갱신시각 업데이트 |
| 오프라인 | 상단 Toast/배너 info "지금은 오프라인이에요. 마지막 기록을 보여드려요" + 마지막 데이터 유지 |

## 반응형

- base(375): 단일 컬럼, StatGrid 2열, SlaScore 풀폭.
- `md:`(768): StatGrid 3열, 좌우 패딩↑, SlaScore 좌측 점수 + 우측 게이지 가로 배치 옵션.
- `xl:`(1280): `app-container`(480) 가운데 고정 — 폰 너비 유지, 양옆 여백. 멀티컬럼 대시보드로 퍼뜨리지 않음(라이더 앱 정체성).

## 접근성 체크

- SlaScore `aria-label`("SLA 점수 87점, 주의"), 갱신 `aria-live="polite"`.
- 탭 `role="tablist"`/`tab`/`aria-selected`, 패널 `role="tabpanel"`.
- 지표 색-단독 금지: 값+화살표+라벨 병행. 차트 피크는 라벨/값으로도 식별.
- 모든 인터랙티브 ≥44px, 카드 간 `gap-3`(12)+ 충분한 탭 간격.
- 숫자 `tabular-nums` 로 갱신 시 떨림 방지.
