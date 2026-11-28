// T-31 / M-40 앨범 본문.
import type { ReactElement } from "react";
import { AppBar, Button, Label, Screen, ScreenFooter } from "../../ui";
import type { ViewerLang } from "../translation";
import type { ReportTarget } from "../visits";
import { AlbumCarousel } from "./AlbumCarousel";
import { albumPages, tripDays, tripPeriod, type AlbumPage } from "./albumModel";
import { strings } from "./strings";
import { SummaryCard } from "./SummaryCard";
import { TripStats } from "./TripStats";
import type { Album, TripRange } from "./types";
import { VisitAlbumCard } from "./VisitAlbumCard";

export interface AlbumViewProps {
  album: Album;
  trip: TripRange | null;
  lang: ViewerLang;
  isMate: boolean;
  onBack: () => void;
  onHome: () => void;
  onOpenVisits: () => void;
  onReport?: (target: ReportTarget) => void;
}

export function AlbumView({
  album,
  trip,
  lang,
  isMate,
  onBack,
  onHome,
  onOpenVisits,
  onReport,
}: AlbumViewProps): ReactElement {
  const text = strings[lang];
  const partner = isMate ? album.traveler : album.mate;
  const period = trip && tripPeriod(trip);
  const days = trip && tripDays(trip);
  const spotCount = album.items.length;
  return (
    <Screen>
      {/* 제목의 기본값은 한국어 지도 이름이다. */}
      <AppBar
        title={album.title}
        language="ko"
        backLabel={text.back}
        onBack={onBack}
      />
      {period && (
        <Label language={lang} variant="caption" tone="desc">
          {period}
        </Label>
      )}
      <TripStats
        lang={lang}
        days={days}
        spotCount={spotCount}
        partner={partner}
      />
      <AlbumCarousel
        pages={albumPages(album.items)}
        lang={lang}
        renderPage={(page, width) => (
          <PageCard
            page={page}
            width={width}
            lang={lang}
            isMate={isMate}
            album={album}
            trip={trip}
            onReport={onReport}
            onOpenVisits={onOpenVisits}
          />
        )}
      />
      <ScreenFooter>
        <Button label={text.home} language={lang} onPress={onHome} />
      </ScreenFooter>
    </Screen>
  );
}

interface PageCardProps extends Pick<
  AlbumViewProps,
  "album" | "trip" | "lang" | "isMate" | "onReport" | "onOpenVisits"
> {
  page: AlbumPage;
  width: number;
}

function PageCard({
  page,
  width,
  album,
  trip,
  lang,
  isMate,
  onReport,
  onOpenVisits,
}: PageCardProps): ReactElement {
  if (page.kind === "visit")
    return (
      <VisitAlbumCard
        visit={page.visit}
        lang={lang}
        isMate={isMate}
        mate={album.mate}
        onReport={onReport}
        style={{ width }}
      />
    );
  const partner = isMate ? album.traveler : album.mate;
  return (
    <SummaryCard
      lang={lang}
      period={trip && tripPeriod(trip)}
      partnerName={partner?.nickname ?? null}
      days={trip && tripDays(trip)}
      spotCount={album.items.length}
      onOpenVisits={onOpenVisits}
      style={{ width }}
    />
  );
}
