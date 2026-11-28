// M-20 메이트 홈: 인사말, 동시 매칭 현황, 여행자, 최근 방문.
import { useCallback, type ReactElement, type ReactNode } from "react";
import { Card } from "../../ui";
import { mateHomeApi, type MateHomeApi } from "./api";
import { CapacityCard } from "./CapacityCard";
import { UnpublishedMap, WaitingForMatch } from "./EmptyMatches";
import { EndedTrips } from "./EndedTrips";
import { HomeBand, type Greeting } from "./HomeBand";
import { HomeLayout } from "./HomeLayout";
import { LoadError, Loading } from "./LoadStatus";
import { MatchList } from "./MatchList";
import {
  closestToExposure,
  homeKind,
  MAP_MIN_SPOTS,
  MAP_PREVIEW_SPOTS,
  type HomeKind,
} from "./model";
import { RecentVisit } from "./RecentVisit";
import { strings } from "./strings";
import type { MatchItem, MateProfile, MyMap } from "./types";
import { useLoad } from "./useLoad";

export interface MateHomeScreenProps {
  api?: MateHomeApi;
  /** 로고 오른쪽에 둘 것 (알림 종) */
  headerRight?: ReactNode;
  onOpenVisits: (matchId: number) => void;
  onOpenAlbum: (matchId: number) => void;
  onOpenMap: (mapId: number) => void;
  onPickPreviews: (mapId: number) => void;
  onOpenMyMaps: () => void;
  onCreateMap: () => void;
}

interface HomeData {
  profile: MateProfile;
  matches: MatchItem[];
  maps: MyMap[];
  kind: HomeKind;
}

async function loadHome(api: MateHomeApi): Promise<HomeData> {
  const [profile, matches] = await Promise.all([
    api.getProfile(),
    api.getActiveMatches(),
  ]);
  // 지도는 매칭이 없을 때 안내를 고르는 데만 필요하다.
  const maps = matches.length === 0 ? await api.getMyMaps() : [];
  return { profile, matches, maps, kind: homeKind(matches, maps) };
}

function greetingFor({ kind, profile }: HomeData): Greeting {
  const title = strings.greeting[kind](profile.nickname);
  const subtitle = strings.greetingSub[kind](MAP_MIN_SPOTS, MAP_PREVIEW_SPOTS);
  return { title, subtitle };
}

export function MateHomeScreen({
  api = mateHomeApi,
  headerRight,
  ...actions
}: MateHomeScreenProps): ReactElement {
  const load = useCallback(() => loadHome(api), [api]);
  const { state, retry } = useLoad(load);
  const home = state.status === "ready" ? state.data : null;

  return (
    <HomeLayout
      band={
        <HomeBand greeting={home && greetingFor(home)} right={headerRight} />
      }
    >
      {state.status === "loading" && (
        <Card>
          <Loading />
        </Card>
      )}
      {state.status === "error" && (
        <Card>
          <LoadError error={state.error} onRetry={retry} />
        </Card>
      )}
      {home && (
        <>
          <HomeContent api={api} home={home} {...actions} />
          <EndedTrips api={api} onOpenAlbum={actions.onOpenAlbum} />
        </>
      )}
    </HomeLayout>
  );
}

interface HomeContentProps extends Omit<
  MateHomeScreenProps,
  "api" | "headerRight" | "onOpenAlbum"
> {
  api: MateHomeApi;
  home: HomeData;
}

function HomeContent({
  api,
  home,
  onOpenVisits,
  onOpenMap,
  onPickPreviews,
  onOpenMyMaps,
  onCreateMap,
}: HomeContentProps): ReactElement {
  if (home.kind === "unpublished")
    return (
      <UnpublishedMap
        map={closestToExposure(home.maps)}
        onOpenMap={onOpenMap}
        onPickPreviews={onPickPreviews}
        onCreateMap={onCreateMap}
      />
    );
  const capacity = home.profile.matchCapacity;
  return (
    <>
      {capacity && <CapacityCard {...capacity} />}
      {home.kind === "waiting" ? (
        <WaitingForMatch onOpenMyMaps={onOpenMyMaps} />
      ) : (
        <>
          <MatchList matches={home.matches} onOpenVisits={onOpenVisits} />
          <RecentVisit
            api={api}
            matches={home.matches}
            onOpenVisits={onOpenVisits}
          />
        </>
      )}
    </>
  );
}
