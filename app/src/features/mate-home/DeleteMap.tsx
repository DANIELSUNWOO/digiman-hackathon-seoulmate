import { useState } from "react";
import { View } from "react-native";
import { theme } from "../../theme";
import { BottomSheet, Button, Label } from "../../ui";
import type { MateHomeApi } from "./api";
import { errorMessage } from "./errors";
import { strings } from "./strings";
import { useIsMounted } from "./useIsMounted";

type Props = { api: MateHomeApi; mapId: number; onDeleted: () => void };

function useDeleteMap({ api, mapId, onDeleted }: Props) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useIsMounted();

  const close = () => {
    if (deleting) return;
    setOpen(false);
    setError(null);
  };
  const remove = async () => {
    setDeleting(true);
    setError(null);
    try {
      await api.deleteMap(mapId);
      if (!mounted.current) return;
      setOpen(false);
      onDeleted();
    } catch (cause) {
      setError(errorMessage(cause, strings.errorAction));
      setDeleting(false);
    }
  };

  return { open, show: () => setOpen(true), close, remove, deleting, error };
}

/** 삭제는 확인을 받은 뒤에만 실행한다. react-native-web의 Alert는 동작하지 않아 BottomSheet를 쓴다. */
export function DeleteMap(props: Props) {
  const { open, show, close, remove, deleting, error } = useDeleteMap(props);
  return (
    <>
      <Button label={strings.remove} language="ko" secondary onPress={show} />
      <BottomSheet visible={open} onClose={close}>
        <View style={{ gap: theme.space.md }}>
          <Label weight="bold" center language="ko">
            {strings.removeConfirm}
          </Label>
          <Label center language="ko">
            {strings.removeWarning}
          </Label>
          {error && (
            <Label center language="ko">
              {error}
            </Label>
          )}
          <Button
            label={deleting ? strings.removing : strings.removeAction}
            language="ko"
            disabled={deleting}
            onPress={remove}
          />
          <Button
            label={strings.cancel}
            language="ko"
            secondary
            disabled={deleting}
            onPress={close}
          />
        </View>
      </BottomSheet>
    </>
  );
}
