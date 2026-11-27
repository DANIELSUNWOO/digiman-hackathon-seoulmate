import { useState, type ReactElement } from "react";
import { Image, StyleSheet } from "react-native";
import { theme } from "../../theme";
import { Label } from "../../ui";
import type { ViewerLang } from "../translation";
import { strings } from "./strings";
import type { Album } from "./types";

export interface AlbumHeaderProps {
  album: Album;
  lang: ViewerLang;
  isMate: boolean;
}

export function AlbumHeader({
  album,
  lang,
  isMate,
}: AlbumHeaderProps): ReactElement {
  const text = strings[lang];
  const partner = isMate ? album.traveler : album.mate;
  return (
    <>
      {album.coverUrl !== null && (
        <Cover key={album.coverUrl} url={album.coverUrl} lang={lang} />
      )}
      {/* 제목의 기본값은 한국어 지도 이름이다. */}
      <Label title language="ko">
        {album.title}
      </Label>
      {partner && (
        <Label language={lang}>{text.withPartner(partner.nickname)}</Label>
      )}
      {album.map && album.map.title !== album.title && (
        <Label language="ko">{album.map.title}</Label>
      )}
      <Label language={lang}>{text.spotCount(album.items.length)}</Label>
    </>
  );
}

interface CoverProps {
  url: string;
  lang: ViewerLang;
}

/** 표지를 못 읽으면 자리를 비운다. */
function Cover({ url, lang }: CoverProps): ReactElement | null {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <Image
      source={{ uri: url }}
      accessibilityLabel={strings[lang].coverLabel}
      onError={() => setFailed(true)}
      style={styles.cover}
    />
  );
}

const styles = StyleSheet.create({
  cover: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: theme.radius.card,
    backgroundColor: theme.color.background,
  },
});
