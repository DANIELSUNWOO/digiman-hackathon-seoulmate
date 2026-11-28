// 메이트 댓글 말풍선. 메이트가 볼 때는 내 글이라 오른쪽에 둔다.
import type { ReactElement } from "react";
import { StyleSheet, View } from "react-native";
import { theme } from "../../theme";
import { Label } from "../../ui";
import { TranslatedText, type ViewerLang } from "../translation";
import { ReportButton, type ReportTarget, type VisitComment } from "../visits";
import { Avatar } from "./Avatar";
import type { AlbumMember } from "./types";

export interface CommentBubbleProps {
  comment: VisitComment;
  lang: ViewerLang;
  isMine: boolean;
  /** 알 수 없는 사용자면 null */
  author: AlbumMember | null;
  onReport?: (target: ReportTarget) => void;
}

export function CommentBubble({
  comment,
  lang,
  isMine,
  author,
  onReport,
}: CommentBubbleProps): ReactElement {
  if (isMine)
    return (
      <View style={[styles.row, styles.mineRow]}>
        <View style={[styles.bubble, styles.mine]}>
          <TranslatedText value={comment.content} viewerLang={lang} />
        </View>
      </View>
    );
  return (
    <View style={styles.row}>
      <Avatar
        url={author?.profileImageUrl ?? null}
        name={author?.nickname ?? ""}
      />
      <View style={[styles.bubble, styles.theirs]}>
        {author && (
          <Label language="ko" variant="caption" tone="desc">
            {author.nickname}
          </Label>
        )}
        <TranslatedText value={comment.content} viewerLang={lang} />
        <ReportButton
          target={{ targetType: "COMMENT", targetId: comment.commentId }}
          lang={lang}
          onReport={onReport}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", gap: theme.space.sm },
  mineRow: { justifyContent: "flex-end" },
  bubble: {
    flexShrink: 1,
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.sm,
    borderRadius: theme.radius.card,
  },
  theirs: {
    flex: 1,
    borderTopLeftRadius: theme.space.xs,
    backgroundColor: theme.color.surface2,
  },
  mine: {
    maxWidth: "85%",
    borderTopRightRadius: theme.space.xs,
    backgroundColor: theme.color.brandTint,
  },
});
