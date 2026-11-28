// API 명세 v1.7(USER-01, MAP-02, MATCH-02)과 서버 DTO 기준. 이 화면에서 쓰는 필드만 둔다.

export type LocalizedText = {
  original: string;
  translated: string | null;
  sourceLang: "ko" | "ja";
};

/** GET /maps/me 항목. 메이트 본인 화면이라 title은 한국어 문자열이다. */
export type MyMap = {
  mapId: number;
  title: string;
  caption: LocalizedText | null;
  spotCount: number;
  previewCount: number;
  isPublic: boolean;
  inUse: boolean;
  // 명세 v1.7에 추가됐다. 서버가 반영하기 전에는 오지 않는다.
  selectedCount?: number;
  travelingCount?: number;
};

/** GET /maps/{mapId}의 스팟 중 지도 상세에서 쓰는 부분 */
export type MapSpot = {
  spotId: number;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  photos: string[];
  reason: LocalizedText | null;
  review: LocalizedText | null;
  isPreview: boolean;
};

/** GET /maps/{mapId}. inUse는 오지 않아 GET /maps/me에서 확인한다. */
export type MapDetail = {
  mapId: number;
  title: string;
  caption: LocalizedText | null;
  isPublic: boolean;
  spots: MapSpot[];
};

/** POST /maps, PATCH /maps/{mapId} 요청. title 1~30자, caption 0~300자 */
export type MapInput = { title: string; caption: string };

/** GET /users/me 중 메이트 홈에서 쓰는 부분 */
export type MateProfile = {
  // 서버는 메이트 계정에만 내려준다. 기기에 저장된 역할과 계정이 다르면 없다.
  matchCapacity?: { active: number; max: number };
};

/** GET /matches 항목. 메이트가 부르면 partner는 여행자다. */
export type MatchItem = {
  matchId: number;
  chatStatus: "LOCKED" | "READY" | "OPEN";
  partner: { nickname: string };
  courseMap: { mapId: number; title: string } | null;
  progress: {
    visited: number;
    required: number | null;
    total: number;
  } | null;
  lastVisitAt: string | null;
};

export type TripRange = { startDate: string; endDate: string };

/** GET /matches?state=ended 항목. 차단당한 쪽에는 status가 ENDED로 온다. */
export type EndedMatch = {
  matchId: number;
  status: "COMPLETED" | "CANCELED" | "EXPIRED" | "BLOCKED" | "ENDED";
  partner: { nickname: string };
  courseMap: { mapId: number; title: string } | null;
  trip: TripRange | null;
};
