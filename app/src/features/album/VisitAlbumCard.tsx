// 방문 한 곳의 카드: 블루 띠, 한마디, 사진, 메이트 댓글.
import { PencilSimple } from "phosphor-react-native";
import type { ReactElement } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { theme } from "../../theme";
import { Label } from "../../ui";
import { TranslatedText, type ViewerLang } from "../translation";
import {
  ReportButton,
  VisitPhoto,
  type ReportTarget,
  type VisitRecord,
} from "../visits";
import { CardBanner } from "./CardBanner";
import { CommentBubble } from "./CommentBubble";
import { strings } from "./strings";
import type { AlbumMember } from "./types";

const PHOTO_HEIGHT = 220;

export interface VisitAlbumCardProps {
  visit: VisitRecord;
  lang: ViewerLang;
  isMate: boolean;
  mate: AlbumMember | null;
  onReport?: (target: ReportTarget) => void;
  style?: StyleProp<ViewStyle>;
}

export function VisitAlbumCard({
  visit,
  lang,
  isMate,
  mate,
  onReport,
  style,
}: VisitAlbumCardProps): ReactElement {
  return (
    <View style={[styles.card, style]}>
      <CardBanner
        spotName={visit.spot.name}
        verifiedAt={visit.verifiedAt}
        lang={lang}
      />
      <View style={styles.body}>
        <View style={styles.reviewLabel}>
          <PencilSimple size={14} color={theme.color.labelDesc} />
          <Label language={lang} variant="caption" tone="desc">
            {strings[lang].reviewLabel}
          </Label>
        </View>
        <TranslatedText value={visit.review} viewerLang={lang} />
        <VisitPhoto
          key={visit.photoUrl}
          visit={visit}
          lang={lang}
          height={PHOTO_HEIGHT}
        />
        {/* 신고는 상대가 쓴 것만: 방문 기록은 메이트가, 댓글은 여행자가 한다. */}
        <ReportButton
          target={{ targetType: "VISIT", targetId: visit.visitId }}
          lang={lang}
          onReport={isMate ? onReport : undefined}
        />
        {visit.comments.map((comment) => (
          <CommentBubble
            key={comment.commentId}
            comment={comment}
            lang={lang}
            isMine={isMate}
            author={mate}
            onReport={onReport}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: "hidden",
    borderWidth: 1,
    borderColor: theme.color.lineAlt,
    borderRadius: theme.radius.sheet,
    backgroundColor: theme.color.surface,
  },
  body: { padding: theme.space.lg, gap: theme.space.sm },
  reviewLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space.xs,
  },
});
