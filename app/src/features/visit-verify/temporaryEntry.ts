// 임시 진입점의 조회. 코스 지도(클라 P)에서 인증으로 들어오게 되면
// TemporaryVisitEntry.tsx와 함께 지운다.
import { apiRequest } from "../../api";
import type { CourseSpot, Progress } from "./types";

export interface EntryCourse {
  matchId: number;
  mateNickname: string | null;
  progress: Progress;
  spots: CourseSpot[];
}

// API 명세 MATCH-02에서 쓰는 필드만 둔다.
interface ActiveMatchItem {
  matchId: number;
  partner: { nickname?: string } | null;
  courseMap: { mapId: number } | null;
}

interface CourseResponse {
  progress: Progress;
  spots: CourseSpot[];
}

/** 여행 중인 매칭의 코스 지도 스팟(MATCH-02 + MATCH-06) */
export async function loadEntryCourses(): Promise<EntryCourse[]> {
  const matches = await apiRequest<ActiveMatchItem[]>("matches?state=active");
  return Promise.all(
    matches
      .filter((match) => match.courseMap !== null)
      .map(async ({ matchId, partner }) => {
        const { progress, spots } = await apiRequest<CourseResponse>(
          `matches/${matchId}/course`,
        );
        const mateNickname = partner?.nickname ?? null;
        return { matchId, mateNickname, progress, spots };
      }),
  );
}
