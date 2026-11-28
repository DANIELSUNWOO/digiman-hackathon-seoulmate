// 삭제 확인 시트. 지도와 스팟 삭제가 함께 쓴다.
import { useRef, useState, type ReactElement } from "react";
import { View } from "react-native";
import { theme } from "../../theme";
import { BottomSheet, Button, Label } from "../../ui";
import { strings } from "./strings";
import { useIsMounted } from "./useIsMounted";

export interface ConfirmDeleteProps {
  /** 시트를 여는 버튼 */
  label: string;
  title: string;
  warning: string;
  disabled?: boolean;
  onDelete: () => Promise<void>;
  onDeleted: () => void;
  errorText: (cause: unknown) => string;
}

function useConfirmDelete({
  onDelete,
  onDeleted,
  errorText,
}: ConfirmDeleteProps) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useIsMounted();
  // 버튼이 비활성으로 바뀌기 전에 연달아 눌러도 한 번만 지운다.
  const busy = useRef(false);

  const close = (): void => {
    if (deleting) return;
    setOpen(false);
    setError(null);
  };
  const remove = async (): Promise<void> => {
    if (busy.current) return;
    busy.current = true;
    setDeleting(true);
    setError(null);
    try {
      await onDelete();
      if (!mounted.current) return;
      setOpen(false);
      onDeleted();
    } catch (cause: unknown) {
      busy.current = false;
      setError(errorText(cause));
      setDeleting(false);
    }
  };

  return { open, show: () => setOpen(true), close, remove, deleting, error };
}

/** 삭제는 확인을 받은 뒤에만 실행한다. react-native-web의 Alert는 동작하지 않아 BottomSheet를 쓴다. */
export function ConfirmDelete(props: ConfirmDeleteProps): ReactElement {
  const { open, show, close, remove, deleting, error } =
    useConfirmDelete(props);
  return (
    <>
      <Button
        label={props.label}
        language="ko"
        secondary
        disabled={props.disabled}
        onPress={show}
      />
      <BottomSheet visible={open} onClose={close}>
        <View style={{ gap: theme.space.md }}>
          <Label weight="bold" center language="ko">
            {props.title}
          </Label>
          <Label center language="ko">
            {props.warning}
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
            onPress={() => void remove()}
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
