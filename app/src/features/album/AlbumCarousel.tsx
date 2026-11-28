// 방문 카드를 한 장씩 넘겨 본다. 다음 장이 살짝 보인다.
import { useState, type ReactElement } from "react";
import {
  FlatList,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { theme } from "../../theme";
import { PageDots } from "./PageDots";
import type { ViewerLang } from "../translation";
import type { AlbumPage } from "./albumModel";

const CARD_RATIO = 0.86;
const GAP = theme.space.md;

export interface AlbumCarouselProps {
  pages: AlbumPage[];
  lang: ViewerLang;
  renderPage: (page: AlbumPage, width: number) => ReactElement;
}

export function AlbumCarousel({
  pages,
  lang,
  renderPage,
}: AlbumCarouselProps): ReactElement {
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const cardWidth = Math.round((width - theme.space.screen * 2) * CARD_RATIO);
  const onLayout = (event: LayoutChangeEvent) =>
    setWidth(event.nativeEvent.layout.width);
  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const page = Math.round(
      event.nativeEvent.contentOffset.x / (cardWidth + GAP),
    );
    setIndex(Math.max(0, Math.min(pages.length - 1, page)));
  };

  return (
    <View style={styles.root} onLayout={onLayout}>
      {/* 너비를 알기 전에는 카드 폭을 정할 수 없다. */}
      {width > 0 && (
        <FlatList
          horizontal
          data={pages}
          keyExtractor={(page) =>
            page.kind === "visit" ? String(page.visit.visitId) : page.kind
          }
          renderItem={({ item }) => renderPage(item, cardWidth)}
          snapToInterval={cardWidth + GAP}
          decelerationRate="fast"
          disableIntervalMomentum
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          // 사진이 많아 가까운 장만 올려 둔다.
          initialNumToRender={2}
          windowSize={5}
          contentContainerStyle={styles.content}
        />
      )}
      <PageDots count={pages.length} index={index} lang={lang} />
    </View>
  );
}

const styles = StyleSheet.create({
  // 화면 여백 밖까지 넓혀 다음 장이 가장자리에 걸치게 한다.
  root: { marginHorizontal: -theme.space.screen, gap: theme.space.md },
  content: { paddingHorizontal: theme.space.screen, gap: GAP },
});
