import { useRouter } from "expo-router";
import { MateHomeScreen } from "../../src/features/mate-home";
import { TravelerHome } from "../../src/features/map-browse/TravelerHome";
import { NotificationBell } from "../../src/features/notifications";
import { useRole } from "../../src/state";

export default function Home() {
  const { role } = useRole();
  const router = useRouter();
  if (role === "mate")
    return (
      <MateHomeScreen
        onOpenMap={(mapId) => router.push(`/maps/${mapId}`)}
        onCreateMap={() => router.push("/maps/new")}
        onPickPreviews={(mapId) => router.push(`/maps/${mapId}/previews`)}
        onOpenMyMaps={() => router.push("/map")}
        headerRight={
          <NotificationBell
            lang="ko"
            onPress={() => router.push("/notifications")}
          />
        }
        onOpenVisits={(matchId) => router.push(`/matches/${matchId}/visits`)}
        onOpenAlbum={(matchId) => router.push(`/matches/${matchId}/album`)}
      />
    );
  return <TravelerHome />;
}
