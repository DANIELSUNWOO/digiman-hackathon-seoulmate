// M-12a 장소 검색. 화면 틀 없이 검색창과 결과만 둔다. 고른 뒤의 확인 시트와 저장은 Q-06·Q-07.
import type { ReactElement } from "react";
import { Input } from "../../ui";
import { placeSearchApi, type PlaceSearchApi } from "./api";
import { PlaceResults } from "./PlaceResults";
import { strings } from "./strings";
import type { PlaceResult } from "./types";
import { QUERY_MAX, usePlaceSearch } from "./usePlaceSearch";

export interface PlaceSearchProps {
  api?: PlaceSearchApi;
  onSelect: (place: PlaceResult) => void;
}

export function PlaceSearch({
  api = placeSearchApi,
  onSelect,
}: PlaceSearchProps): ReactElement {
  const { text, setText, state, submit } = usePlaceSearch(api);
  return (
    <>
      <Input
        language="ko"
        accessibilityLabel={strings.inputLabel}
        placeholder={strings.placeholder}
        value={text}
        onChangeText={setText}
        maxLength={QUERY_MAX}
        returnKeyType="search"
        onSubmitEditing={submit}
        autoCorrect={false}
        autoFocus
      />
      <PlaceResults state={state} onSelect={onSelect} onRetry={submit} />
    </>
  );
}
