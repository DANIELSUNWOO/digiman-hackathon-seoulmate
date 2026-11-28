import { useState } from "react";
import {
  usePhotoPicker,
  type PhotoPicker,
  type PickedPhoto,
  type PickPhoto,
} from "../photo-upload";

export interface PhotoPicking extends PhotoPicker {
  photo: PickedPhoto | null;
}

/** 방문 인증은 사진 한 장이라 새로 고르면 바꾼다. */
export function usePhoto(pick: PickPhoto): PhotoPicking {
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  return { photo, ...usePhotoPicker(pick, setPhoto) };
}
