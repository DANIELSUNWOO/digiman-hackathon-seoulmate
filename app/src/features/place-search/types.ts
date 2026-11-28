// API 명세 PLACE-01과 서버 PlaceSearchService.Place 기준.

/** 고른 결과의 name·address·lat·lng를 그대로 SPOT-01에 넣는다. */
export interface PlaceResult {
  name: string;
  /** 도로명 주소, 없으면 지번 주소. 둘 다 없으면 null */
  address: string | null;
  lat: number;
  lng: number;
  /** 네이버 분류의 마지막 단계 */
  category: string | null;
}
