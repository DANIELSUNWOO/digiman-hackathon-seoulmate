import type { ReactElement } from "react";
import { StyleSheet, View } from "react-native";
import { theme } from "../../theme";
import { Chip, Label } from "../../ui";
import type { ViewerLang } from "../translation";
import { errorText } from "./model";
import { strings } from "./strings";
import { REACTION_TYPES, type ReactionType } from "./types";
import { useSending } from "./useSending";

export interface ReactionBarProps {
  reaction: ReactionType | null;
  lang: ViewerLang;
  /** 메이트만 누를 수 있다. 여행자는 받은 리액션을 읽는다. */
  canReact: boolean;
  onReact: (next: ReactionType | null) => Promise<void>;
}

export function ReactionBar({
  reaction,
  lang,
  canReact,
  onReact,
}: ReactionBarProps): ReactElement | null {
  const { error, send } = useSending();
  const text = strings[lang];

  if (!canReact)
    return reaction === null ? null : (
      <Label language={lang}>
        {text.reactionReceived(text.reactions[reaction])}
      </Label>
    );

  return (
    <>
      <View style={styles.bar}>
        {REACTION_TYPES.map((type) => (
          <Chip
            key={type}
            label={text.reactions[type]}
            selected={reaction === type}
            // 같은 것을 다시 누르면 해제한다.
            onPress={() =>
              void send(() => onReact(reaction === type ? null : type))
            }
          />
        ))}
      </View>
      {error !== null && (
        <Label language={lang}>
          {errorText(error, text, text.errorAction)}
        </Label>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: "row", flexWrap: "wrap", gap: theme.space.sm },
});
