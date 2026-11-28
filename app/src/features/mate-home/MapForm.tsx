import { useState } from "react";
import { Button, Input, Label } from "../../ui";
import { errorMessage } from "./errors";
import { MAP_CAPTION_MAX, MAP_TITLE_MAX } from "./model";
import { strings } from "./strings";
import type { MapInput } from "./types";

type Props = {
  initial: MapInput;
  onSubmit: (input: MapInput) => Promise<void>;
};

function useMapForm({ initial, onSubmit }: Props) {
  const [title, setTitle] = useState(initial.title);
  const [caption, setCaption] = useState(initial.caption);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSubmit({ title: title.trim(), caption: caption.trim() });
    } catch (cause) {
      setError(errorMessage(cause, strings.errorAction));
      setSaving(false);
    }
  };

  return { title, setTitle, caption, setCaption, saving, error, save };
}

/** 이름만 필수다. 캡션은 비워 둘 수 있다. */
export function MapForm(props: Props) {
  const { title, setTitle, caption, setCaption, saving, error, save } =
    useMapForm(props);
  return (
    <>
      <Label weight="bold" language="ko">
        {strings.titleField}
      </Label>
      <Input
        accessibilityLabel={strings.titleField}
        placeholder={strings.titlePlaceholder}
        value={title}
        onChangeText={setTitle}
        maxLength={MAP_TITLE_MAX}
        editable={!saving}
      />
      <Label weight="bold" language="ko">
        {strings.captionField}
      </Label>
      <Input
        accessibilityLabel={strings.captionField}
        placeholder={strings.captionPlaceholder}
        value={caption}
        onChangeText={setCaption}
        maxLength={MAP_CAPTION_MAX}
        editable={!saving}
        multiline
        textAlignVertical="top"
        style={{ minHeight: 120 }}
      />
      <Label language="ko">{`${caption.length} / ${MAP_CAPTION_MAX}`}</Label>
      {error && (
        <Label center language="ko">
          {error}
        </Label>
      )}
      <Button
        label={saving ? strings.saving : strings.save}
        language="ko"
        disabled={saving || !title.trim()}
        onPress={save}
      />
    </>
  );
}
