import type { ReactElement } from "react";
import { StyleSheet, View } from "react-native";
import { theme } from "../../theme";
import { Label } from "../../ui";
import { timeLabel } from "../notifications";
import { TranslatedText, type ViewerLang } from "../translation";
import {
  CommentList,
  ReactionBar,
  ReportButton,
  VisitPhoto,
  type ReportTarget,
  type VisitRecord,
} from "../visits";

export interface AlbumEntryProps {
  visit: VisitRecord;
  lang: ViewerLang;
  isMate: boolean;
  onReport?: (target: ReportTarget) => void;
}

// 앨범은 읽기 전용이라 리액션 바가 부를 일이 없다.
const ignoreReaction = async (): Promise<void> => {};

export function AlbumEntry({
  visit,
  lang,
  isMate,
  onReport,
}: AlbumEntryProps): ReactElement {
  return (
    <View style={styles.card}>
      <Label weight="bold" language="ko">
        {visit.spot.name}
      </Label>
      <VisitPhoto key={visit.photoUrl} visit={visit} lang={lang} />
      <TranslatedText value={visit.review} viewerLang={lang} />
      <Label language={lang}>{timeLabel(visit.verifiedAt)}</Label>
      {/* 신고는 상대가 쓴 것만: 방문 기록은 메이트가, 댓글은 여행자가 한다. */}
      <ReportButton
        target={{ targetType: "VISIT", targetId: visit.visitId }}
        lang={lang}
        onReport={isMate ? onReport : undefined}
      />
      <ReactionBar
        reaction={visit.reaction}
        lang={lang}
        canReact={false}
        onReact={ignoreReaction}
      />
      <CommentList
        comments={visit.comments}
        lang={lang}
        onReport={isMate ? undefined : onReport}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: theme.space.sm,
    padding: theme.space.lg,
    borderWidth: 1,
    borderColor: theme.color.border,
    borderRadius: theme.radius.card,
    backgroundColor: theme.color.white,
  },
});
