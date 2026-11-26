import { Redirect, useRouter } from "expo-router";
import { Pressable, View } from "react-native";
import { CaretLeft } from "phosphor-react-native";
import { theme } from "../src/theme";
import { useRole } from "../src/state";
import { Button, Label, Screen } from "../src/ui";
export default function Auth() {
  const router = useRouter();
  const { role, ready } = useRole();
  if (!ready) return null;
  if (!role) return <Redirect href="/country" />;
  const ko = role === "mate";
  return (
    <Screen>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={ko ? "뒤로" : "戻る"}
        onPress={() => router.dismissTo("/country")}
        style={{ width: 44, height: 44, justifyContent: "center" }}
      >
        <CaretLeft size={24} color={theme.color.text} />
      </Pressable>
      <View style={{ flex: 1, justifyContent: "center", gap: 16 }}>
        <Label title center logo={ko}>
          {ko ? "서울메이트" : "ソウルメイト"}
        </Label>
        <Label center>
          {ko
            ? "나만 아는 서울을, 일본에서 온 여행자에게"
            : "ソウルに住む人の「秘密の地図」で旅しよう"}
        </Label>
      </View>
      <Button
        label={ko ? "카카오로 계속하기" : "Appleで続ける"}
        secondary
        disabled
      />
      <Button
        label={ko ? "Apple로 계속하기" : "Googleで続ける"}
        secondary
        disabled
      />
      {!ko && <Button label="LINEで続ける" secondary disabled />}
      <Button label={ko ? "이메일로 시작하기" : "メールで始める"} disabled />
      <Label center>{ko ? "인증은 준비 중입니다" : "認証は準備中です"}</Label>
    </Screen>
  );
}
