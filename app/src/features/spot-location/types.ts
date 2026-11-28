/** SPOT-01에 그대로 넣는 위치 정보. 사진·후기 등은 스팟 폼(Q-07)에서 더한다. */
export interface SpotLocation {
  name: string;
  address: string | null;
  lat: number;
  lng: number;
}
