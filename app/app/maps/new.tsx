import { useLocalSearchParams, useRouter } from "expo-router";
import { ProgressTracker } from "../../src/ui";
import { NewMapScreen, useBackOr } from "../../src/features/mate-home";
import {
  previousOnboardingRoute,
  useOnboardingBackHandler,
  useOnboardingDismiss,
} from "../../src/features/onboarding/navigation";

export default function NewMap() {
  const router = useRouter();
  const dismiss = useOnboardingDismiss();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const isOnboarding = from === "onboarding";
  const back = useBackOr("/map");
  const handleOnboardingBack = () => {
    dismiss(previousOnboardingRoute("MATE", "first-map", "onboarding"));
  };

  useOnboardingBackHandler(() => {
    if (!isOnboarding) return false;
    handleOnboardingBack();
    return true;
  });

  return (
    <NewMapScreen
      header={
        isOnboarding ? (
          <ProgressTracker
            steps={["프로필", "취향", "지도"]}
            currentIndex={2}
            language="ko"
          />
        ) : undefined
      }
      onBack={isOnboarding ? handleOnboardingBack : back}
      onCreated={(mapId) => router.replace(`/maps/${mapId}`)}
    />
  );
}
