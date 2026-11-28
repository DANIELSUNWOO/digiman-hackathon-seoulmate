// 개발 전용 경로(/dev/mate-home)에서 서버 없이 스팟 추가를 확인하기 위한 목.
import type { PickPhoto } from "../photo-upload";
import type { SpotFormApi } from "./api";

export const mockSpotFormApi: SpotFormApi = {
  uploadPhoto: async (uri) => uri,
  createSpot: async () => ({ spotId: 900, spotCount: 1, isPublic: false }),
  getPhotoUrls: async () => [],
};

let order = 0;

/** 고를 때마다 서로 다른 1×1 그림을 돌려준다. */
export const mockPickPhoto: PickPhoto = async () => {
  order += 1;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1" data-order="${order}"><rect width="1" height="1" fill="#477EFF"/></svg>`;
  const uri = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  return { status: "picked", photo: { uri } };
};
