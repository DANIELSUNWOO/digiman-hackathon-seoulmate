// API 명세 ALBUM-01과 서버 AlbumReviewService.AlbumView 기준. 이 화면에서 쓰는 필드만 둔다.
import type { VisitRecord } from "../visits";

export interface AlbumMember {
  userId: string;
  nickname: string;
}

export interface AlbumMap {
  mapId: number;
  /** 명세 예시는 번역 객체지만 서버는 원문 문자열을 보낸다. */
  title: string;
}

export interface Album {
  albumId: number;
  title: string;
  coverUrl: string | null;
  /** 알 수 없는 사용자면 null */
  traveler: AlbumMember | null;
  mate: AlbumMember | null;
  /** 코스를 고르지 않고 끝난 매칭은 null */
  map: AlbumMap | null;
  /** VISIT-02와 같은 형태, 최근 인증 순 */
  items: VisitRecord[];
}
