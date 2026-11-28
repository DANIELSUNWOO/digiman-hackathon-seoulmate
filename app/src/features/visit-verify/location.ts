import * as Location from "expo-location";
import { withTimeout } from "../photo-upload/timeout";
import type { LocationResult, ReadPosition } from "./types";

const TIMEOUT_MS = 15_000;

async function locate(): Promise<LocationResult> {
  if (!(await Location.hasServicesEnabledAsync())) return { status: "off" };
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) return { status: "denied" };
  // 제한 시간은 권한 창에 답한 뒤부터 잰다.
  const { coords } = await withTimeout(
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
    TIMEOUT_MS,
    new Error("location timeout"),
  );
  const { latitude, longitude, accuracy } = coords;
  return {
    status: "ok",
    position: { lat: latitude, lng: longitude, accuracy },
  };
}

/** 위치를 한 번만 얻는다. 백그라운드 추적과 마지막 위치 재사용은 하지 않는다. */
export const readPosition: ReadPosition = () =>
  locate().catch((): LocationResult => ({ status: "unavailable" }));
