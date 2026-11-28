import type { ReactElement } from "react";
import { StyleSheet, View } from "react-native";
import { theme } from "../../theme";
import { Label } from "../../ui";
import { timeLabel } from "../notifications";
import { TranslatedText, type ViewerLang } from "../translation";
import { ReportButton, type ReportButtonProps } from "./ReportButton";
import type { VisitComment } from "./types";

export interface CommentListProps {
  comments: VisitComment[];
  lang: ViewerLang;
  /** 댓글은 메이트가 쓰므로 여행자에게만 넘긴다. */
  onReport?: ReportButtonProps["onReport"];
}

export function CommentList({
  comments,
  lang,
  onReport,
}: CommentListProps): ReactElement | null {
  if (comments.length === 0) return null;
  return (
    <View style={styles.list}>
      {comments.map((comment) => (
        <View key={comment.commentId}>
          <TranslatedText value={comment.content} viewerLang={lang} />
          <Label language={lang}>{timeLabel(comment.createdAt)}</Label>
          <ReportButton
            target={{ targetType: "COMMENT", targetId: comment.commentId }}
            lang={lang}
            onReport={onReport}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: theme.space.md,
    paddingTop: theme.space.md,
    borderTopWidth: 1,
    borderTopColor: theme.color.border,
  },
});
