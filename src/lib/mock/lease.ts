// 시안 목업 — 리스·렌탈. 실데이터 연동 시 교체.

export interface LeaseCompany {
  logo: string;
  color: string;
  name: string;
  rating: number;
  reviews: number;
  bikes: string[];
  monthly: string;
  depositText: string;
  tags: string[];
}

export const LEASE_FILTERS = ["전체", "125cc", "전기이륜", "무보증", "당일출고"];

export const LEASE_COMPANIES: LeaseCompany[] = [
  {
    logo: "SM",
    color: "#4F6AF5",
    name: "스피드모터스",
    rating: 4.8,
    reviews: 312,
    bikes: ["PCX125", "NMAX125"],
    monthly: "159,000",
    depositText: "300,000",
    tags: ["보증보험", "당일출고", "정비포함"],
  },
  {
    logo: "R+",
    color: "#E8590C",
    name: "라이더플러스",
    rating: 4.6,
    reviews: 241,
    bikes: ["벤리110", "시티100"],
    monthly: "129,000",
    depositText: "무보증",
    tags: ["무보증 가능", "24시 출동", "첫달 50%"],
  },
  {
    logo: "BO",
    color: "#1E9E5A",
    name: "바이크온",
    rating: 4.7,
    reviews: 188,
    bikes: ["EM1 e:", "UNI ES"],
    monthly: "99,000",
    depositText: "200,000",
    tags: ["전기이륜", "배터리 교환", "친환경"],
  },
];
