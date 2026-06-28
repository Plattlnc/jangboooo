// 시안 목업 — 내 정보(계정/차량/정산 계좌). 실데이터 연동 시 교체.

export interface InfoRow {
  label: string;
  value: string;
  /** 값 강조색(선택) */
  valueColor?: string;
}
export interface InfoSection {
  title: string;
  rows: InfoRow[];
}

export const MYINFO_SECTIONS: InfoSection[] = [
  {
    title: "기본 정보",
    rows: [
      { label: "연락처", value: "010-8504-2666" },
      { label: "이메일", value: "taeseong@rider.kr" },
      { label: "소속 협력사", value: "생각대로 역삼센터" },
      { label: "가입일", value: "2024.03.18" },
    ],
  },
  {
    title: "차량 정보",
    rows: [
      { label: "차종", value: "혼다 PCX125" },
      { label: "번호판", value: "서울 강남 자1234" },
      { label: "이용 형태", value: "리스 (스피드모터스)", valueColor: "#E8590C" },
      { label: "보험 만료", value: "2026.11.30" },
    ],
  },
  {
    title: "정산 계좌",
    rows: [
      { label: "입금 은행", value: "국민은행" },
      { label: "계좌번호", value: "1234-**-****567" },
    ],
  },
];
