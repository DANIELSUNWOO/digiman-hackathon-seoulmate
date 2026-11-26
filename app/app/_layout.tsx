import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import { NotoSansKR_400Regular } from "@expo-google-fonts/noto-sans-kr/400Regular";
import { NotoSansKR_500Medium } from "@expo-google-fonts/noto-sans-kr/500Medium";
import { NotoSansJP_500Medium } from "@expo-google-fonts/noto-sans-jp/500Medium";
import { NotoSansKR_700Bold } from "@expo-google-fonts/noto-sans-kr/700Bold";
import { NotoSansJP_400Regular } from "@expo-google-fonts/noto-sans-jp/400Regular";
import { NotoSansJP_700Bold } from "@expo-google-fonts/noto-sans-jp/700Bold";
import { RoleProvider } from "../src/state";
import { SessionProvider } from "../src/session";
export default function Layout() {
  const [loaded, error] = useFonts({
    NotoSansKR_400Regular,
    NotoSansKR_700Bold,
    NotoSansKR_500Medium,
    NotoSansJP_500Medium,
    NotoSansJP_400Regular,
    NotoSansJP_700Bold,
    LineSeedKR: require("../assets/fonts/LINESeedKR-Bd.ttf"),
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
