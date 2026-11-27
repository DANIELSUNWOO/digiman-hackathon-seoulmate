import { useRouter } from "expo-router";
import { NewMapScreen, useBackOr } from "../../src/features/mate-home";

export default function NewMap() {
  const router = useRouter();
  const back = useBackOr("/map");
  return (
    <NewMapScreen
      onBack={back}
      onCreated={(mapId) => router.replace(`/maps/${mapId}`)}
    />
  );
}
