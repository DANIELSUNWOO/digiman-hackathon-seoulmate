// T-31 / M-40 앨범 보기
import type { ReactElement } from "react";
import type { ViewerLang } from "../translation";
import type { ReportTarget } from "../visits";
import { AlbumStatus } from "./AlbumStatus";
import { AlbumView } from "./AlbumView";
import { albumApi, type AlbumApi } from "./api";
import { useAlbum } from "./useAlbum";

export interface AlbumScreenProps {
  api?: AlbumApi;
  matchId: number;
  lang: ViewerLang;
  isMate: boolean;
  onBack: () => void;
  onHome: () => void;
  /** 요약 카드의 "자세히 보기" */
  onOpenVisits: () => void;
  /** 신고 화면(클라 P)이 연결되기 전에는 없다. */
  onReport?: (target: ReportTarget) => void;
}

export function AlbumScreen({
  api = albumApi,
  matchId,
  ...view
}: AlbumScreenProps): ReactElement {
  const { state, retry } = useAlbum(api, matchId);

  if (state.status === "ready")
    return <AlbumView album={state.album} trip={state.trip} {...view} />;
  return (
    <AlbumStatus
      state={state}
      lang={view.lang}
      onBack={view.onBack}
      onRetry={retry}
    />
  );
}
