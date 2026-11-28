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
