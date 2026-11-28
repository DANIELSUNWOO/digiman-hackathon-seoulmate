// API 명세 VISIT-02와 서버 VisitService.VisitView 기준. 이 화면에서 쓰는 필드만 둔다.
import type { Translated } from "../translation";

export interface VisitSpot {
  spotId: number;
  name: string;
}

export interface VisitRecord {
  visitId: number;
  spot: VisitSpot;
  photoUrl: string;
  review: Translated;
  verifiedAt: string;
}
