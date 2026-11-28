import { ApiError } from "../../api";
import type { VisitRecord } from "../visits";
import type { AlbumApi } from "./api";
import type { Album } from "./types";

export type MockAlbum = "data" | "long" | "empty" | "notFound" | "error";

// 1×1 회색 PNG. 네트워크 없이 사진 자리를 채운다.
const PHOTO =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mO8d+/efwAIvAN9pVxJRwAAAABJRU5ErkJggg==";

/** index가 클수록 먼저 인증한 곳이다. */
function visit(index: number): VisitRecord {
  const hour = String(20 - (index % 8)).padStart(2, "0");
  // 최근 순이라 index가 클수록 이른 날이다. 같은 날 두 곳도 섞인다.
  const date = `2026-12-0${8 - Math.min(5, Math.ceil(index / 2))}`;
  return {
    visitId: 900 - index,
    spot: { spotId: 40 - index, name: `성수 골목 스팟 ${12 - index}` },
    photoUrl: PHOTO,
    review: {
      original: "窓際の席が本当に落ち着きました",
      translated: "창가 자리가 정말 편안했어요",
      sourceLang: "ja",
    },
    verifiedAt: `${date}T${hour}:00:00+09:00`,
    reaction: index % 2 === 0 ? "LIKE" : null,
    // 댓글이 없는 항목도 섞는다.
    comments:
      index % 2 === 0
        ? [
            {
              commentId: 9000 + index,
              content: {
                original: "거기 창가 최고죠!",
                translated: "あの窓際は最高ですよね！",
                sourceLang: "ko",
              },
              createdAt: `${date}T${hour}:30:00+09:00`,
            },
          ]
        : [],
  };
}

const COUNTS: Partial<Record<MockAlbum, number>> = { data: 3, long: 12 };

function album(count: number): Album {
  return {
    albumId: 55,
    title: "성수 골목 카페 지도",
    coverUrl: count === 0 ? null : PHOTO,
    traveler: { userId: "traveler", nickname: "ゆき", profileImageUrl: null },
    mate: { userId: "mate", nickname: "민지", profileImageUrl: PHOTO },
    map: { mapId: 5, title: "성수 골목 카페 지도" },
    items: Array.from({ length: count }, (_, index) => visit(index)),
  };
}

export function createMockAlbumApi(scenario: MockAlbum): AlbumApi {
  return {
    get: async () => {
      if (scenario === "error")
        throw new ApiError("NETWORK", "mock network error");
      if (scenario === "notFound")
        throw new ApiError("HTTP", "mock", 404, { code: "ALBUM_NOT_FOUND" });
      return album(COUNTS[scenario] ?? 0);
    },
    getTrip: async () => ({ startDate: "2026-12-03", endDate: "2026-12-08" }),
  };
}
