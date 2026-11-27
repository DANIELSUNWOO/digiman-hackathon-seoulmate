import { useState, type ReactElement } from "react";
import { Button, Input, Label } from "../../ui";
import type { ViewerLang } from "../translation";
import { errorText } from "./errors";
import { strings } from "./strings";
import { useSending } from "./useSending";

// 서버 VisitService.CommentRequest의 제한
const COMMENT_MAX = 300;

export interface CommentFormProps {
  lang: ViewerLang;
  onSubmit: (content: string) => Promise<void>;
}

export function CommentForm({
  lang,
  onSubmit,
}: CommentFormProps): ReactElement {
  const [draft, setDraft] = useState("");
  const { sending, error, send } = useSending();
  const text = strings[lang];
  const content = draft.trim();

  // 실패하면 입력한 내용을 남긴다.
  const submit = async (): Promise<void> => {
    if (await send(() => onSubmit(content))) setDraft("");
  };

  return (
    <>
      <Input
        value={draft}
        onChangeText={setDraft}
        editable={!sending}
        multiline
        maxLength={COMMENT_MAX}
        placeholder={text.commentPlaceholder}
        accessibilityLabel={text.commentPlaceholder}
      />
      {error !== null && (
        <Label language={lang}>
          {errorText(error, text, text.errorAction)}
        </Label>
      )}
      <Button
        label={sending ? text.commentSending : text.commentSubmit}
        language={lang}
        secondary
        disabled={sending || content === ""}
        onPress={() => void submit()}
      />
    </>
  );
}
