import { useRouter } from "expo-router";

/** 경로의 mapId는 양의 정수만 받는다. */
export function parseMapId(value: string | string[] | undefined) {
  return typeof value === "string" && /^[1-9]\d*$/.test(value)
    ? Number(value)
    : null;
}

/** 주소로 바로 들어와 이전 화면이 없으면 fallback으로 간다. */
export function useBackOr(fallback: "/map" | `/maps/${number}`) {
  const router = useRouter();
  return () => (router.canGoBack() ? router.back() : router.replace(fallback));
}
