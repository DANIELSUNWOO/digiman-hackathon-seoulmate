import type { MateHomeApi } from "./api";
import { ConfirmDelete } from "./ConfirmDelete";
import { errorMessage } from "./errors";
import { strings } from "./strings";

type Props = { api: MateHomeApi; mapId: number; onDeleted: () => void };

export function DeleteMap({ api, mapId, onDeleted }: Props) {
  return (
    <ConfirmDelete
      label={strings.remove}
      link
      title={strings.removeConfirm}
      warning={strings.removeWarning}
      onDelete={() => api.deleteMap(mapId)}
      onDeleted={onDeleted}
      errorText={(cause) => errorMessage(cause, strings.errorAction)}
    />
  );
}
