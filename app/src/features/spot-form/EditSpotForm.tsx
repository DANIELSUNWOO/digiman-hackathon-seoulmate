import { useState, type ReactElement } from "react";
import { ConfirmDelete, type MapSpot } from "../mate-home";
import type { PickPhoto } from "../photo-upload";
import type { SpotFormApi } from "./api";
import { createSpotEdit, removeSpot } from "./edit";
import { errorMessage } from "./errors";
import { SpotFormScreen } from "./SpotFormScreen";
import { strings } from "./strings";
import { useSpotFields } from "./useSpotFields";
import { useSpotSave } from "./useSpotSave";

export interface EditSpotFormProps {
  api: SpotFormApi;
  spot: MapSpot;
  pickPhoto: PickPhoto;
  onBack: () => void;
  /** 저장하거나 삭제한 뒤 */
  onDone: () => void;
}

/** 저장된 값으로 시작하는 M-13. 장소(주소·좌표)는 바꾸지 않는다. */
export function EditSpotForm({
  api,
  spot,
  pickPhoto,
  onBack,
  onDone,
}: EditSpotFormProps): ReactElement {
  const [name, setName] = useState(spot.name);
  const fields = useSpotFields({
    photos: spot.photos.map((uri) => ({ uri })),
    reason: spot.reason?.original ?? "",
    review: spot.review?.original ?? "",
  });
  const [submit] = useState(() => createSpotEdit(api, spot));
  const saving = useSpotSave(submit, onDone);
  const { address, lat, lng } = spot;

  return (
    <SpotFormScreen
      title={strings.editTitle}
      location={{ name, address, lat, lng }}
      fields={fields}
      saving={saving}
      pickPhoto={pickPhoto}
      onRename={setName}
      onBack={onBack}
      footer={
        <ConfirmDelete
          label={strings.remove}
          title={strings.removeConfirm}
          warning={strings.removeWarning}
          disabled={saving.progress !== null}
          onDelete={() => removeSpot(api, spot.spotId)}
          onDeleted={onDone}
          errorText={(cause) => errorMessage(cause, strings.errorRemove)}
        />
      }
    />
  );
}
