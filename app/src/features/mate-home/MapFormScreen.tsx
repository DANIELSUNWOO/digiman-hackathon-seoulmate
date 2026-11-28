import type { ReactNode } from "react";
// M-11 지도 이름·캡션: 만들기와 수정이 같은 폼을 쓴다.
import { Label, Screen } from "../../ui";
import { mateHomeApi, type MateHomeApi } from "./api";
import { BackButton } from "./BackButton";
import { LoadError, Loading } from "./LoadStatus";
import { MapForm } from "./MapForm";
import { changedFields } from "./model";
import { strings } from "./strings";
import type { MapDetail } from "./types";
import { useIsMounted } from "./useIsMounted";
import { useMapWithLock } from "./useMapWithLock";

export function NewMapScreen({
  api = mateHomeApi,
  onBack,
  onCreated,
  header,
}: {
  api?: MateHomeApi;
  onBack: () => void;
  onCreated: (mapId: number) => void;
  header?: ReactNode;
}) {
  const mounted = useIsMounted();
  return (
    <Screen>
      <BackButton onPress={onBack} />
      {header}
      <Label title language="ko">
        {strings.newMapTitle}
      </Label>
      <MapForm
        initial={{ title: "", caption: "" }}
        onSubmit={async (input) => {
          const { mapId } = await api.createMap(input);
          if (mounted.current) onCreated(mapId);
        }}
      />
    </Screen>
  );
}

export function EditMapScreen({
  api = mateHomeApi,
  mapId,
  onBack,
  onSaved,
}: {
  api?: MateHomeApi;
  mapId: number;
  onBack: () => void;
  onSaved: () => void;
}) {
  const { state, retry } = useMapWithLock(api, mapId);

  return (
    <Screen>
      <BackButton onPress={onBack} />
      <Label title language="ko">
        {strings.editMapTitle}
      </Label>
      {state.status === "loading" && <Loading shape="form" />}
      {state.status === "error" && (
        <LoadError error={state.error} onRetry={retry} />
      )}
      {/* 주소로 바로 들어올 수 있어 상세의 버튼 숨김과 별개로 여기서도 막는다. */}
      {state.status === "ready" &&
        (state.data.locked ? (
          <Label center language="ko">
            {strings.locked}
          </Label>
        ) : (
          <EditForm api={api} map={state.data.map} onSaved={onSaved} />
        ))}
    </Screen>
  );
}

function EditForm({
  api,
  map,
  onSaved,
}: {
  api: MateHomeApi;
  map: MapDetail;
  onSaved: () => void;
}) {
  const mounted = useIsMounted();
  const initial = { title: map.title, caption: map.caption?.original ?? "" };
  return (
    <MapForm
      initial={initial}
      onSubmit={async (input) => {
        const changes = changedFields(initial, input);
        if (Object.keys(changes).length > 0)
          await api.updateMap(map.mapId, changes);
        if (mounted.current) onSaved();
      }}
    />
  );
}
