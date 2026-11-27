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

export interface VisitDraft {
  photo: PickedPhoto;
  review: string;
}
