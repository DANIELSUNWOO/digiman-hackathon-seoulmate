// API 명세 VISIT-02와 서버 VisitService.VisitView 기준. 이 화면에서 쓰는 필드만 둔다.
import type { Translated } from "../translation";

export interface VisitSpot {
  spotId: number;
  name: string;
}

/** 메이트 리액션 3종 (VISIT-03). 방문 기록 하나에 하나만 있다. */
export const REACTION_TYPES = ["LIKE", "LAUGH", "CHEER"] as const;
export type ReactionType = (typeof REACTION_TYPES)[number];

export interface VisitComment {
  commentId: number;
  content: Translated;
  createdAt: string;
}

export interface VisitRecord {
  visitId: number;
  spot: VisitSpot;
  photoUrl: string;
  review: Translated;
  verifiedAt: string;
  reaction: ReactionType | null;
  /** 쓴 순서 */
  comments: VisitComment[];
}

/** 신고(REPORT-01) 대상. 상대가 쓴 것만 신고할 수 있다. */
export interface ReportTarget {
  targetType: "VISIT" | "COMMENT";
  targetId: number;
}
