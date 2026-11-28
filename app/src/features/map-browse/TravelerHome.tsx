import { LoadingSkeleton } from "../../loading";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { ScrollView, View, Text } from "react-native";
import { theme } from "../../theme";
import { createMatchApi, type ActiveMatch } from "../map-browse/matches";
import { useSession } from "../../session";
import { nextStep } from "../../users";
import { Button, Card, Label, Screen } from "../../ui";
import { NotificationBell } from "../notifications/NotificationBell";
import { useNavigationLock } from "../chat/useNavigationLock";
const api = createMatchApi();
export function TravelerHome() {
  const { session, load } = useSession();
  const needsTrip = load.kind === "ready" && nextStep(load.me) === "trip";
  const account = session?.user.id ?? "";
  const token = session?.access_token ?? "";
  const router = useRouter();
  const navigate = useNavigationLock();
  const [matches, setMatches] = useState<ActiveMatch[] | null>(null);
  const [slots, setSlots] = useState<{ total: number; used: number } | null>(
    null,
  );
  const [page, setPage] = useState(0);
  const [width, setWidth] = useState(0);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      const abort = new AbortController();
      setPage(0);
      setMatches(null);
      setSlots(null);
      setError(false);
      void Promise.all([
        api.active(token, abort.signal),
        api.slots(token, account, abort.signal),
      ])
        .then(([x, slots]) => {
          if (x.length !== slots.used) throw new Error("Inconsistent slots");
          if (alive) {
            setMatches(x);
            setSlots(slots);
          }
        })
        .catch(() => {
          if (alive) setError(true);
        });
      return () => {
        alive = false;
        abort.abort();
      };
    }, [account, token, revision]),
  );
  return (
    <Screen>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: theme.space.sm,
        }}
      >
        <Label title>ホーム</Label>
        <NotificationBell
          lang="ja"
          onPress={() => navigate(() => router.push("/notifications"))}
        />
      </View>
      {needsTrip && (
        <Card>
          <Label language="ja" weight="bold">
            新しい旅行には日程の登録が必要です
          </Label>
          <Label language="ja">日程を登録すると、新しい地図を選べます。</Label>
          <Button
            label="旅行日程を登録する"
            language="ja"
            onPress={() =>
              navigate(() => router.push("/(onboarding)/trip?from=account"))
            }
          />
        </Card>
      )}
      {error && (
        <>
          <Label>マッチングを確認できませんでした</Label>
          <Button
            secondary
            label="再試行"
            onPress={() => setRevision((x) => x + 1)}
          />
        </>
      )}
      {!matches && !error && <LoadingSkeleton label="ホームを読み込み中" />}
      {matches && (
        <>
          <View
            style={{
              backgroundColor: theme.color.brand,
              borderRadius: 16,
              padding: 20,
            }}
          >
            <Text
              style={{
                color: theme.color.surface,
                fontFamily: "NotoSansJP_700Bold",
                fontSize: 22,
                lineHeight: 31,
              }}
            >
              ソウルの秘密の地図
            </Text>
          </View>
          <Label>
            マッチング枠 {slots?.used} / {slots?.total}
          </Label>
          <View
            accessibilityLabel={`マッチング枠 ${slots?.used} / ${slots?.total}`}
            style={{ flexDirection: "row", gap: 8 }}
          >
            {Array.from({ length: slots?.total ?? 0 }, (_, i) => (
              <View
                key={i}
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  backgroundColor:
                    i < (slots?.used ?? 0)
                      ? theme.color.brandDeep
                      : theme.color.surface2,
                }}
              />
            ))}
          </View>
          {matches.length === 0 ? (
            <View style={{ minHeight: 220 }}>
              <Card>
                <Label weight="bold">旅したい地図を選ぶ</Label>
                <Label>公開スポットを見てから選べます。</Label>
              </Card>
            </View>
          ) : (
            <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => {
                  if (width)
                    setPage(
                      Math.min(
                        matches.length - 1,
                        Math.max(
                          0,
                          Math.round(e.nativeEvent.contentOffset.x / width),
                        ),
                      ),
                    );
                }}
              >
                {matches.map((m) => (
                  <View
                    key={m.matchId}
                    style={{ width: width || 300, minHeight: 220, padding: 2 }}
                  >
                    <Card
                      onPress={
                        m.mapId === null
                          ? undefined
                          : () =>
                              navigate(() =>
                                router.push({
                                  pathname: "/matches/[matchId]",
                                  params: { matchId: String(m.matchId) },
                                }),
                              )
                      }
                    >
                      <Label weight="bold">
                        {m.partner ? `${m.partner}さんの地図` : "選択中の地図"}
                      </Label>
                      <Label>{m.title || "選択中の地図"}</Label>
                      {m.visited !== null && m.total !== null ? (
                        <Label>
                          訪問 {m.visited} / {m.total}
                        </Label>
                      ) : (
                        <Label>訪問状況を確認できません</Label>
                      )}
                      {m.visited !== null && m.required !== null && (
                        <Label>
                          チャットまであと {Math.max(m.required - m.visited, 0)}{" "}
                          か所
                        </Label>
                      )}
                      {m.mapId === null ? (
                        <Label>地図の情報を確認できません</Label>
                      ) : (
                        <Label tone="brand">地図を見る</Label>
                      )}
                    </Card>
                    <Button
                      secondary
                      language="ja"
                      label={
                        m.chatStatus === "LOCKED"
                          ? "チャットはまだ使えません"
                          : "チャットする"
                      }
                      disabled={
                        m.chatStatus !== "READY" && m.chatStatus !== "OPEN"
                      }
                      onPress={() =>
                        router.push({
                          pathname: "/chats/[matchId]",
                          params: { matchId: String(m.matchId) },
                        })
                      }
                    />
                  </View>
                ))}
              </ScrollView>
              <View
                style={{ flexDirection: "row", alignSelf: "center", gap: 8 }}
              >
                {matches.map((m, i) => (
                  <View key={m.matchId}>
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor:
                          i === page
                            ? theme.color.brandDeep
                            : theme.color.labelAssist,
                      }}
                    />
                  </View>
                ))}
              </View>
            </View>
          )}
          <Button
            disabled={!slots || slots.used >= slots.total}
            label={matches.length ? "地図をもう1つ選ぶ" : "地図を選ぶ"}
            onPress={() => router.push("/explore")}
          />
        </>
      )}
    </Screen>
  );
}
