import type { ReactElement, ReactNode } from "react";
import { FlatList, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "../../theme";
import { Button, Label } from "../../ui";
import type { ViewerLang } from "../translation";
import type { ReportTarget } from "../visits";
import { AlbumEntry } from "./AlbumEntry";
import { AlbumHeader } from "./AlbumHeader";
import { strings } from "./strings";
import type { Album } from "./types";

export interface AlbumListProps {
  album: Album;
  lang: ViewerLang;
  isMate: boolean;
  /** 목록 위에 함께 스크롤되는 요소 */
  top: ReactNode;
  onReview?: () => void;
  onReport?: (target: ReportTarget) => void;
}

/** 사진이 많아 ui의 Screen(ScrollView) 대신 보이는 항목만 그리는 목록을 쓴다. */
export function AlbumList({
  album,
  lang,
  isMate,
  top,
  onReview,
  onReport,
}: AlbumListProps): ReactElement {
  const text = strings[lang];
  // 서버는 최근 순으로 준다. 앨범은 여행한 순서로 보여 준다.
  const items = [...album.items].reverse();
  return (
    <SafeAreaView style={styles.screen}>
      <FlatList
        data={items}
        keyExtractor={(visit) => String(visit.visitId)}
        renderItem={({ item }) => (
          <AlbumEntry
            visit={item}
            lang={lang}
            isMate={isMate}
            onReport={onReport}
          />
        )}
        initialNumToRender={3}
        // 기본값(21)이면 앨범 전체가 한꺼번에 올라가 사진이 모두 메모리에 남는다.
        windowSize={5}
        contentContainerStyle={styles.content}
        ListHeaderComponentStyle={styles.header}
        ListHeaderComponent={
          <>
            {top}
            <AlbumHeader album={album} lang={lang} isMate={isMate} />
          </>
        }
        ListEmptyComponent={
          <Label center language={lang}>
            {text.empty}
          </Label>
        }
        ListFooterComponent={
          onReview && (
            <Button label={text.review} language={lang} onPress={onReview} />
          )
        }
      />
    </SafeAreaView>
  );
}

// ui의 Screen과 같은 바탕과 여백
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.color.white },
  content: { padding: theme.space.screen, gap: theme.space.lg },
  header: { gap: theme.space.lg },
});
