import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { useRole, Role } from "../src/state";
import { Button, Card, Label, Screen } from "../src/ui";
export default function Country() {
  const router = useRouter();
  const { role, ready, chooseRole } = useRole();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [choice, setChoice] = useState<Role | null>(role);
  useEffect(() => {
    if (role) setChoice(role);
  }, [role]);
  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: "center", gap: 20 }}>
        <Label title center logo>
          서울메이트
        </Label>
        <Label center language="ja">
          ソウルメイト
        </Label>
      </View>
      <Label title center language="ja">
        どこから来ましたか？
      </Label>
      <Label center language="ko">
        어디에서 오셨나요?
      </Label>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Card
            selected={choice === "traveler"}
            onPress={() => {
              setSaveError(false);
              setChoice("traveler");
            }}
          >
            <Label title center language="ja" selected={choice === "traveler"}>
              日本
            </Label>
            <Label center language="ja" selected={choice === "traveler"}>
              旅行者として始める
            </Label>
          </Card>
        </View>
        <View style={{ flex: 1 }}>
          <Card
            selected={choice === "mate"}
            onPress={() => {
              setSaveError(false);
              setChoice("mate");
            }}
          >
            <Label title center language="ko" selected={choice === "mate"}>
              한국
            </Label>
            <Label center language="ko" selected={choice === "mate"}>
              메이트로 시작하기
            </Label>
          </Card>
        </View>
      </View>
      <View>
        <Label center language="ja">
          選んだ国で画面の言語が決まります
        </Label>
        <Label center language="ko">
          선택한 나라에 따라 화면 언어가 정해져요
        </Label>
      </View>
      {saveError && (
        <Label center language={choice === "mate" ? "ko" : "ja"}>
          {choice === "mate" ? "다시 시도해 주세요" : "もう一度お試しください"}
        </Label>
      )}
      <Button
        label={choice === "mate" ? "다음" : "次へ"}
        language={choice === "mate" ? "ko" : "ja"}
        disabled={!ready || !choice || saving}
        onPress={async () => {
          if (choice && !saving) {
            setSaving(true);
            setSaveError(false);
            try {
              await chooseRole(choice);
              router.push("/auth");
            } catch {
              setSaveError(true);
            } finally {
              setSaving(false);
            }
          }
        }}
      />
    </Screen>
  );
}
