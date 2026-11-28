import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import { NotoSansKR_400Regular } from "@expo-google-fonts/noto-sans-kr/400Regular";
import { NotoSansKR_500Medium } from "@expo-google-fonts/noto-sans-kr/500Medium";
import { NotoSansKR_600SemiBold } from "@expo-google-fonts/noto-sans-kr/600SemiBold";
import { NotoSansKR_700Bold } from "@expo-google-fonts/noto-sans-kr/700Bold";
import { NotoSansJP_400Regular } from "@expo-google-fonts/noto-sans-jp/400Regular";
import { NotoSansJP_500Medium } from "@expo-google-fonts/noto-sans-jp/500Medium";
import { NotoSansJP_600SemiBold } from "@expo-google-fonts/noto-sans-jp/600SemiBold";
import { NotoSansJP_700Bold } from "@expo-google-fonts/noto-sans-jp/700Bold";
import { ZenMaruGothic_900Black } from "@expo-google-fonts/zen-maru-gothic/900Black";
import { RoleProvider } from "../src/state";
import { SessionProvider } from "../src/session";

export default function Layout() {
  const [loaded, error] = useFonts({
    NotoSansKR_400Regular,
    NotoSansKR_500Medium,
    NotoSansKR_600SemiBold,
    NotoSansKR_700Bold,
    NotoSansJP_400Regular,
    NotoSansJP_500Medium,
    NotoSansJP_600SemiBold,
    NotoSansJP_700Bold,
    ZenMaruGothic_900Black,
    Cafe24Ssurround: require("../assets/fonts/Cafe24Ssurround.ttf"),
  });
  if (!loaded && !error) return null;
  return (
    <RoleProvider>
      <SessionProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </SessionProvider>
    </RoleProvider>
  );
}
