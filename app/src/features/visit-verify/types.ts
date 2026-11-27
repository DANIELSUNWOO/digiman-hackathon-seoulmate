// API 명세 MATCH-06의 스팟 중 이 화면에서 쓰는 필드만 둔다.
export interface CourseSpot {
  spotId: number;
  name: string;
  visited: boolean;
}

export type PhotoSource = "camera" | "library";

/** 크기를 줄여 JPEG로 다시 저장한 사진 */
export interface PickedPhoto {
  uri: string;
}

export type PickResult =
  | { status: "picked"; photo: PickedPhoto }
  | { status: "cancelled" }
  | { status: "denied" };

export type PickPhoto = (source: PhotoSource) => Promise<PickResult>;

/** 제출 순간의 위치. 저장하거나 로그에 남기지 않는다. */
export interface Position {
  lat: number;
  lng: number;
  /** 오차 반경(m). 알 수 없으면 null */
  accuracy: number | null;
}

export type LocationProblem = "denied" | "off" | "unavailable";

export type LocationResult =
  { status: "ok"; position: Position } | { status: LocationProblem };

export type ReadPosition = () => Promise<LocationResult>;

export type SubmitVisit = (
  draft: VisitDraft,
  position: Position,
) => Promise<void>;

export interface VisitDraft {
  photo: PickedPhoto;
  review: string;
}
