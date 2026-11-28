// M-13 스팟 정보 입력. 등록과 수정이 함께 쓰며 입력값과 저장 상태는 부른 쪽이 갖고 있다.
import type { ReactElement, ReactNode } from "react";
import { AppBar, Button, ErrorNotice, Label, Screen } from "../../ui";
import type { PickPhoto } from "../photo-upload";
import type { SpotLocation } from "../spot-location";
import { errorMessage } from "./errors";
import { SpotPhotos } from "./SpotPhotos";
import { SpotTextFields } from "./SpotTextFields";
import { strings } from "./strings";
import type { SpotFields } from "./useSpotFields";
import type { SpotSave } from "./useSpotSave";

export interface SpotFormScreenProps {
  title?: string;
  /** 저장 버튼 아래에 붙는 내용 */
  footer?: ReactNode;
  location: SpotLocation;
  fields: SpotFields;
  saving: SpotSave;
  pickPhoto: PickPhoto;
  onRename: (name: string) => void;
  onBack: () => void;
}

export function SpotFormScreen({
  title = strings.title,
  footer,
  location,
  fields,
  saving,
  pickPhoto,
  onRename,
  onBack,
}: SpotFormScreenProps): ReactElement {
  const { photos, reason, review } = fields;
  const busy = saving.progress !== null;
  // 서버는 이름과 사진만 요구한다. 추천 이유는 미리보기에 보여서 필수로 둔다.
  const ready = !!location.name.trim() && photos.length > 0 && !!reason.trim();
  return (
    <Screen>
      <AppBar title={title} language="ko" onBack={onBack} backDisabled={busy} />
      {location.address !== null && (
        <Label language="ko" variant="desc">
          {location.address}
        </Label>
      )}
      <SpotPhotos fields={fields} pickPhoto={pickPhoto} disabled={busy} />
      <SpotTextFields
        name={location.name}
        fields={fields}
        editable={!busy}
        onRename={onRename}
      />
      <Label language="ko" variant="caption" tone="desc">
        {strings.translated}
      </Label>
      <SaveStatus saving={saving} />
      <Button
        label={busy ? strings.saving : strings.save}
        language="ko"
        disabled={busy || !ready}
        onPress={() => void saving.save({ location, photos, reason, review })}
      />
      {footer}
    </Screen>
  );
}

function SaveStatus({ saving }: { saving: SpotSave }): ReactElement | null {
  const { progress, error } = saving;
  if (progress)
    return (
      <Label center language="ko">
        {progress.stage === "uploading"
          ? strings.uploading(progress.index, progress.total)
          : strings.savingSpot}
      </Label>
    );
  if (error === null) return null;
  return <ErrorNotice language="ko">{errorMessage(error)}</ErrorNotice>;
}
