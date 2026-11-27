import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import type { ReactElement } from "react";
import { AlbumScreen } from "../../../src/features/album";
import { parseMatchId } from "../../../src/features/visits";
import { useSession } from "../../../src/session";
import { nextStep } from "../../../src/users";

// T-31 / M-40. 탭 바깥 경로라 방문 기록과 같은 로그인·가입·온보딩 확인을 한다.
export default function MatchAlbum(): ReactElement | null {
  const router = useRouter();
  const matchId = parseMatchId(useLocalSearchParams().matchId);
  const { session, ready, load, busy } = useSession();
  if (!ready) return null;
  if (!session) return <Redirect href="/auth" />;
  if (busy || load.kind === "loading") return null;
  if (load.kind !== "ready" || nextStep(load.me))
    return <Redirect href="/account" />;
  if (matchId === null) return <Redirect href="/(tabs)" />;

  return (
    <AlbumScreen
      key={matchId}
      matchId={matchId}
      lang={load.me.language}
      isMate={load.me.role === "MATE"}
      onBack={() =>
        router.canGoBack() ? router.back() : router.replace("/(tabs)")
      }
      onReview={() => router.push(`/matches/${matchId}/review`)}
    />
  );
}
