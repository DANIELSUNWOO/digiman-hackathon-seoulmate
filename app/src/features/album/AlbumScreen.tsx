// T-31 / M-40 앨범 보기
import type { ReactElement } from "react";
import { Button } from "../../ui";
import type { ViewerLang } from "../translation";
import type { ReportTarget } from "../visits";
import { AlbumList } from "./AlbumList";
import { AlbumStatus } from "./AlbumStatus";
import { albumApi, type AlbumApi } from "./api";
import { strings } from "./strings";
import { useAlbum } from "./useAlbum";

export interface AlbumScreenProps {
  api?: AlbumApi;
  matchId: number;
  lang: ViewerLang;
  isMate: boolean;
  onBack: () => void;
  /** 신고 화면(클라 P)이 연결되기 전에는 없다. */
  onReport?: (target: ReportTarget) => void;
}

export function AlbumScreen({
  api = albumApi,
  matchId,
  onBack,
  ...list
}: AlbumScreenProps): ReactElement {
  const { state, retry } = useAlbum(api, matchId);
  const { lang } = list;
  const back = (
    <Button
      label={strings[lang].back}
      language={lang}
      secondary
      onPress={onBack}
    />
  );

  if (state.status === "ready")
    return <AlbumList album={state.album} top={back} {...list} />;
  return <AlbumStatus state={state} lang={lang} top={back} onRetry={retry} />;
}
