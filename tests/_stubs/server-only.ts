// 테스트용 빈 스텁: 프로덕션 코드의 `import 'server-only'` 가드를 노드 환경에서 통과시킨다.
// (실제 번들에서는 next 의 server-only 가 클라이언트 import 를 막는다 — 여기선 무력화만.)
export {};
