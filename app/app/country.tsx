import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  CountryMapIllustration,
  FlagJpIllustration,
  FlagKrIllustration,
} from "../src/brandAssets";
import { useRole, Role } from "../src/state";
import {
  Button,
  Card,
  ErrorNotice,
  Label,
  Screen,
  ScreenFooter,
} from "../src/ui";
import { useSession } from "../src/session";
import { theme } from "../src/theme";

export default function Country() {
  const router = useRouter();
  const { role, ready, chooseRole } = useRole();
  const { session, ready: sessionReady, load, busy } = useSession();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [choice, setChoice] = useState<Role | null>(role);

  useEffect(() => {
    if (role) setChoice(role);
  }, [role]);

  return (
    <Screen contentStyle={s.content}>
      <View style={s.illustrationWrap}>
        <CountryMapIllustration
          greeting={choice === "traveler" ? "こんにちは!" : "안녕!"}
          language={choice === "traveler" ? "ja" : "ko"}
        />
      </View>

      <View style={s.titleGroup}>
        <Label title language="ja">
          どこから来ましたか？
        </Label>
        <Label language="ko" variant="desc" tone="desc">
          어디에서 오셨나요?
        </Label>
      </View>

      <View style={s.cardsRow}>
        <View style={s.cardCol}>
          <Card
            selected={choice === "traveler"}
            style={s.choiceCard}
            onPress={() => {
              setSaveError(false);
              setChoice("traveler");
            }}
          >
            <View style={s.cardInner}>
              <FlagJpIllustration size={44} />
              <Label
                language="ja"
                weight="bold"
                center
                selected={choice === "traveler"}
              >
                日本
              </Label>
              <Label language="ja" variant="status" tone="desc" center>
                旅行者として始める
              </Label>
            </View>
          </Card>
        </View>
        <View style={s.cardCol}>
          <Card
            selected={choice === "mate"}
            style={s.choiceCard}
            onPress={() => {
              setSaveError(false);
              setChoice("mate");
            }}
          >
            <View style={s.cardInner}>
              <FlagKrIllustration size={44} />
              <Label
                language="ko"
                weight="bold"
                center
                selected={choice === "mate"}
              >
                한국
              </Label>
              <Label language="ko" variant="status" tone="desc" center>
                메이트로 시작하기
              </Label>
            </View>
          </Card>
        </View>
      </View>

      <View style={s.hintGroup}>
        <Label language="ja" variant="status" tone="desc">
          選んだ国で画面の言語が決まります
        </Label>
        <Label language="ko" variant="status" tone="desc">
          선택한 나라에 따라 화면 언어가 정해져요
        </Label>
      </View>

      {saveError && (
        <View style={s.errorWrap}>
          <ErrorNotice language={choice === "mate" ? "ko" : "ja"}>
            {choice === "mate"
              ? "다시 시도해 주세요"
              : "もう一度お試しください"}
          </ErrorNotice>
        </View>
      )}

      <ScreenFooter>
        <Button
          label={choice === "mate" ? "다음" : "次へ"}
          language={choice === "mate" ? "ko" : "ja"}
          loading={saving}
          disabled={
            !ready ||
            !sessionReady ||
            busy ||
            (session !== null && load.kind === "loading") ||
            !choice ||
            saving
          }
          onPress={async () => {
            if (choice && !saving) {
              setSaving(true);
              setSaveError(false);
              try {
                await chooseRole(choice);
                if (session) router.dismissTo("/account");
                else router.push("/auth");
              } catch {
                setSaveError(true);
              } finally {
                setSaving(false);
              }
            }
          }}
        />
      </ScreenFooter>
    </Screen>
  );
}

const s = StyleSheet.create({
  content: {
    gap: 0,
  },
  illustrationWrap: {
    marginTop: theme.space.sm,
    marginBottom: theme.space.xl,
    backgroundColor: theme.color.brandTint,
    borderRadius: theme.radius.card,
    overflow: "hidden",
  },
  titleGroup: {
    gap: theme.space.sm,
  },
  cardsRow: {
    flexDirection: "row",
    gap: theme.space.md,
    marginTop: theme.space.group,
  },
  cardCol: {
    flex: 1,
  },
  choiceCard: {
    paddingVertical: 18,
    paddingHorizontal: theme.space.md,
  },
  cardInner: {
    alignItems: "center",
    gap: theme.space.xs,
  },
  hintGroup: {
    gap: theme.space.xs,
    marginTop: theme.space.lg,
  },
  errorWrap: {
    marginTop: theme.space.md,
  },
});
