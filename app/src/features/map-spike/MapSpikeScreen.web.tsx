// 네이버 지도는 네이티브 모듈이라 웹에서 불러오지 않는다. Metro가 웹 번들에 이 파일을 쓴다.
import { Button, Label, Screen } from "../../ui";

export function MapSpikeScreen({ onBack }: { onBack: () => void }) {
  return (
    <Screen>
      <Label language="ko">지도 검증은 개발용 빌드에서만 할 수 있습니다.</Label>
      <Button label="뒤로" language="ko" secondary onPress={onBack} />
    </Screen>
  );
}
