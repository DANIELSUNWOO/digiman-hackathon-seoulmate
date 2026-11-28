import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { View, Pressable, ScrollView } from "react-native";
import {
  createBrowseController,
  createMapBrowseApi,
  type BrowseState,
  type Filters,
  type Sort,
} from "../../src/features/map-browse";
import { PinRange } from "../../src/features/map-browse/PinRange";
import { EmptyIllustration } from "../../src/features/map-browse/EmptyIllustration";
import { LoadingSkeleton } from "../../src/loading";
import { theme } from "../../src/theme";
import { useSession } from "../../src/session";
import { BottomSheet, Button, Card, Label, Screen } from "../../src/ui";

export default function Browse() {
  const { session } = useSession();
  const router = useRouter();
  const api = useMemo(() => createMapBrowseApi(), []);
  const controller = useMemo(() => createBrowseController(api), [api]);
  const [state, setState] = useState<BrowseState>(controller.getState());
  const [draft, setDraft] = useState<Filters | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [countFailed, setCountFailed] = useState(false);
  const [countRevision, setCountRevision] = useState(0);
  const generation = React.useRef(0);
  const token = session?.access_token ?? "";
  const account = session?.user.id ?? "";
  const refreshView = () => setState(controller.getState());
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      generation.current++;
      controller.setAccount(account, token);
      const pending = controller.refresh();
      refreshView();
      void pending.finally(() => {
        if (alive) refreshView();
      });
      return () => {
        alive = false;
        generation.current++;
        setSheetOpen(false);
        controller.cancel();
      };
    }, [controller, account, token]),
  );
  React.useEffect(() => {
    if (!sheetOpen || !draft || !account || !token) {
      setCount(null);
      return;
    }
    const abort = new AbortController();
    let alive = true;
    const current = generation.current;
    setCount(null);
    setCountFailed(false);
    void api
      .browse(token, { ...draft, size: 1 }, 0, abort.signal)
      .then((x) => {
        if (alive && generation.current === current) setCount(x.totalCount);
      })
      .catch(() => {
        if (alive && generation.current === current) setCountFailed(true);
      });
    return () => {
      alive = false;
      abort.abort();
    };
  }, [api, draft, account, token, countRevision, sheetOpen]);
  async function apply(filters: Filters) {
    const current = generation.current;
    setSheetOpen(false);
    const pending = controller.setFilters(filters);
    refreshView();
    await pending;
    if (generation.current === current) refreshView();
  }
  async function more() {
    const current = generation.current;
    const pending = controller.nextPage();
    refreshView();
    await pending;
    if (generation.current === current) refreshView();
  }
  const sameAccount = state.accountId === account;
  const filters = sameAccount ? state.filters : {};
  const result = sameAccount ? state.result : null;
  const stale =
    !!result && JSON.stringify(filters) !== JSON.stringify(state.resultFilters);
  const updating = state.loading && state.loadingPage === 0;
  return (
    <Screen>
      <Button
        secondary
        label="戻る"
        onPress={() =>
          router.canGoBack() ? router.back() : router.replace("/(tabs)")
        }
      />
      <Label title>地図を選ぶ</Label>
      <Label>エリア</Label>
      {filters.areaTagId !== undefined && (
        <Button
          secondary
          label="エリアを解除"
          onPress={() => void apply({ ...filters, areaTagId: undefined })}
        />
      )}
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 8,
          padding: 16,
          backgroundColor: theme.color.surface2,
          borderRadius: 16,
        }}
      >
        {!stale &&
          result?.areas.map((area) => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{
                selected: filters.areaTagId === area.tagId,
              }}
              key={area.tagId}
              onPress={() =>
                void apply({
                  ...filters,
                  areaTagId:
                    filters.areaTagId === area.tagId ? undefined : area.tagId,
                })
              }
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 20,
                backgroundColor:
                  filters.areaTagId === area.tagId
                    ? theme.color.brandTint
                    : theme.color.surface,
              }}
            >
              <Label>
                {area.name} {area.mapCount}
              </Label>
            </Pressable>
          ))}
      </View>
      <Button
        secondary
        label="絞り込みと並び順"
        onPress={() => {
          setDraft({ ...filters });
          setSheetOpen(true);
        }}
      />
      {(state.loading || !sameAccount) && !result && (
        <LoadingSkeleton label="地図を読み込み中" />
      )}
      {updating && result && (
        <Label>前の結果を表示しています。更新中です。</Label>
      )}
      {stale && !state.loading && (
        <Label>更新できませんでした。前の条件の結果を表示しています。</Label>
      )}
      {sameAccount && state.error != null && (
        <>
          <Label>読み込めませんでした</Label>
          <Button
            secondary
            label="再試行"
            onPress={() => void apply(filters)}
          />
        </>
      )}
      {result && !stale && !updating && <Label>{result.totalCount}件</Label>}
      {!stale && !updating && result?.emptyReason === "NO_MATE" && (
        <>
          <View style={{ alignItems: "center", gap: 12 }}>
            <EmptyIllustration />
            <Label title center>
              条件に合うメイトがまだいません
            </Label>
            <Label center>
              メイトの年齢層や性別の条件を広げると、選べる地図が見つかるかもしれません。
            </Label>
          </View>
          <Button
            secondary
            label="条件を変える"
            onPress={() =>
              router.push({
                pathname: "/(onboarding)/preferences",
                params: { from: "explore" },
              })
            }
          />
          <Button
            secondary
            label="ホームに戻る"
            onPress={() => router.dismissTo("/(tabs)")}
          />
        </>
      )}
      {!stale && !updating && result?.emptyReason === "NO_MAP_IN_RANGE" && (
        <View style={{ alignItems: "center", gap: 12 }}>
          <EmptyIllustration />
          <Label title center>
            条件に合う地図がありません
          </Label>
          <Label center>ピン数の範囲を広げると、見つかるかもしれません。</Label>
          <Button
            secondary
            label="条件をリセット"
            onPress={() => void apply({})}
          />
        </View>
      )}
      {result?.items.map((item) => (
        <Card
          key={item.mapId}
          selected={item.myMatchId !== null}
          onPress={
            stale || updating
              ? undefined
              : () => router.push(`/explore/${item.mapId}`)
          }
        >
          <Label weight="bold">
            {item.title.translated || item.title.original}
          </Label>
          <Label>
            {item.area?.name ?? ""} {item.pinCount}スポット
          </Label>
          <Label>
            {item.mate.nickname ?? ""}
            {item.myMatchId !== null ? " 選択中" : ""}
          </Label>
        </Card>
      ))}
      {state.loading && state.loadingPage !== 0 && (
        <Label>続きを読み込み中です</Label>
      )}
      {result?.hasNext && !stale && (
        <Button
          secondary
          label="もっと見る"
          disabled={state.loading}
          onPress={() => void more()}
        />
      )}
      <BottomSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onDismissed={() => setDraft(null)}
      >
        <ScrollView contentContainerStyle={{ gap: 8 }}>
          <Label title>絞り込み</Label>
          {draft && (
            <PinRange
              min={draft.minPins ?? 5}
              max={draft.maxPins ?? 20}
              onChange={(min, max) => {
                setCount(null);
                setDraft(
                  (d) =>
                    d && {
                      ...d,
                      minPins: min,
                      maxPins: max === 20 ? undefined : max,
                    },
                );
              }}
            />
          )}
          {(
            [
              [undefined, "おすすめ"],
              ["PINS_ASC", "ピンが少ない順"],
              ["PINS_DESC", "ピンが多い順"],
              ["RECENT", "更新順"],
              ["POPULAR", "人気順"],
            ] as [Sort | undefined, string][]
          ).map(([sort, name]) => (
            <Button
              key={name}
              secondary
              label={`${name}${draft?.sort === sort ? " ✓" : ""}`}
              onPress={() => {
                setCount(null);
                setDraft((d) => d && { ...d, sort });
              }}
            />
          ))}
          {countFailed && (
            <Button
              secondary
              label="件数を再確認"
              onPress={() => setCountRevision((x) => x + 1)}
            />
          )}
          <Button
            label={count === null ? "件数を確認中" : `${count}件を表示`}
            disabled={count === null}
            onPress={() => {
              if (draft) void apply(draft);
            }}
          />
          <Button
            secondary
            label="閉じる"
            onPress={() => setSheetOpen(false)}
          />
        </ScrollView>
      </BottomSheet>
    </Screen>
  );
}
