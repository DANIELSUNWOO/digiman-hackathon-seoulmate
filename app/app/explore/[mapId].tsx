import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { Image } from "react-native";
import {
  createMatchApi,
  createMatchFlow,
} from "../../src/features/map-browse/matches";
import type {
  LocalizedText,
  MapPreview,
} from "../../src/features/map-browse/model";
import { PublicSpotDiagram } from "../../src/features/map-browse/PublicSpotDiagram";
import { MatchingMotion } from "../../src/features/map-browse/MatchingMotion";
import { useSession } from "../../src/session";
import { BottomSheet, Button, Card, Label, Screen } from "../../src/ui";
const api = createMatchApi();

export default function Preview() {
  const { mapId: param } = useLocalSearchParams<{ mapId: string }>();
  const mapId = Number(param);
  const router = useRouter();
  const { session, load } = useSession();
  const account = session?.user.id ?? "";
  const token = session?.access_token ?? "";
  const [preview, setPreview] = useState<MapPreview | null>(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [matching, setMatching] = useState(false);
  const [motionAttempt, setMotionAttempt] = useState<{
    generation: number;
    account: string;
    token: string;
    mapId: number;
    matchId: number;
  } | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [original, setOriginal] = useState(false);
  const [revision, setRevision] = useState(0);
  const flow = React.useMemo(
    () => createMatchFlow(api),
    [account, token, mapId],
  );
  const generation = React.useRef(0);
  const focusAbort = React.useRef<AbortController | null>(null);
  const inFlight = React.useRef<symbol | null>(null);
  const identity = React.useRef({ account, token, mapId });
  identity.current = { account, token, mapId };
  const motion = React.useRef<{
    generation: number;
    account: string;
    token: string;
    mapId: number;
    matchId: number;
  } | null>(null);
  useFocusEffect(
    useCallback(() => {
      const current = ++generation.current;
      setBusy(false);
      setMatching(false);
      setMotionAttempt(null);
      setConfirmCancel(false);
      const abort = new AbortController();
      focusAbort.current = abort;
      setPreview(null);
      setError(false);
      void api
        .preview(token, mapId, abort.signal)
        .then((p) => {
          if (generation.current === current) setPreview(p);
        })
        .catch(() => {
          if (generation.current === current) setError(true);
        });
      return () => {
        generation.current++;
        motion.current = null;
        setMotionAttempt(null);
        inFlight.current = null;
        setMatching(false);
        abort.abort();
        if (focusAbort.current === abort) focusAbort.current = null;
      };
    }, [account, token, mapId, revision]),
  );
  const text = (value: LocalizedText | null) =>
    value
      ? original
        ? value.original
        : value.translated || value.original
      : "";
  async function change() {
    if (
      !preview ||
      inFlight.current ||
      !focusAbort.current ||
      focusAbort.current.signal.aborted
    )
      return;
    if (preview.myMatchId === null && preview.slots.used >= preview.slots.total)
      return;
    const attempt = Symbol();
    inFlight.current = attempt;
    const signal = focusAbort.current.signal;
    setBusy(true);
    setError(false);
    const current = generation.current;
    try {
      const result = await flow.change(
        token,
        mapId,
        preview.myMatchId,
        () =>
          generation.current === current &&
          identity.current.account === account &&
          identity.current.token === token &&
          identity.current.mapId === mapId,
        signal,
      );
      if (generation.current !== current) return;
      setPreview(result.preview);
      if (
        preview.myMatchId === null &&
        result.preview.myMatchId !== null &&
        result.writeSucceeded &&
        result.confirmedMatchId === result.preview.myMatchId
      ) {
        motion.current = {
          generation: current,
          account,
          token,
          mapId,
          matchId: result.confirmedMatchId!,
        };
        setMotionAttempt(motion.current);
        setMatching(true);
      }
    } catch {
      if (generation.current === current) {
        setError(true);
        setPreview(null);
      }
    } finally {
      if (inFlight.current === attempt) inFlight.current = null;
      if (generation.current === current) setBusy(false);
    }
  }
  const finishMatching = useCallback(() => {
    const m = motion.current;
    if (
      m &&
      m === motionAttempt &&
      generation.current === m.generation &&
      identity.current.account === m.account &&
      identity.current.token === m.token &&
      identity.current.mapId === m.mapId &&
      !focusAbort.current?.signal.aborted &&
      m.matchId === preview?.myMatchId
    ) {
      motion.current = null;
      router.dismissTo("/(tabs)");
    }
  }, [router, preview?.myMatchId, motionAttempt]);
  if (matching)
    return (
      <MatchingMotion
        mine={load.kind === "ready" ? load.me.profileImageUrl : null}
        mate={preview?.mate?.profileImageUrl}
        done={finishMatching}
      />
    );
  return (
    <Screen>
      <Button
        secondary
        label="戻る"
        onPress={() =>
          router.canGoBack() ? router.back() : router.replace("/explore")
        }
      />
      {error && (
        <>
          <Label>状態を確認できませんでした。もう一度確認してください。</Label>
          <Button
            secondary
            label="再読み込み"
            onPress={() => setRevision((n) => n + 1)}
          />
        </>
      )}
      {!preview && !error && <Label>読み込み中...</Label>}
      {preview && (
        <>
          <Label title>{text(preview.title)}</Label>
          <Label>{text(preview.caption)}</Label>
          <Label>{preview.mate?.nickname ?? ""}</Label>
          <Label>
            {preview.slots.used} / {preview.slots.total} 枠
          </Label>
          <Button
            secondary
            label={original ? "翻訳を見る" : "原文を見る"}
            onPress={() => setOriginal((x) => !x)}
          />
          <PublicSpotDiagram spots={preview.previewSpots} />
          {preview.previewSpots.map((spot, index) => (
            <Card key={spot.spotId}>
              <Label weight="bold">
                {index + 1}. {spot.name}
              </Label>
              <Label>{spot.address ?? ""}</Label>
              {spot.photos.map((url, i) => (
                <Image
                  key={`${i}-${url}`}
                  source={{ uri: url }}
                  style={{ width: "100%", height: 180 }}
                />
              ))}
              <Label>{text(spot.reason)}</Label>
              <Label>{text(spot.review)}</Label>
            </Card>
          ))}
          <Label>非公開スポット {preview.hiddenSpotCount}件</Label>
          {preview.myMatchId === null &&
            preview.slots.used >= preview.slots.total && (
              <Label>枠がいっぱいです</Label>
            )}
          <Button
            label={
              preview.myMatchId === null ? "この地図を選ぶ" : "この地図をやめる"
            }
            loading={busy}
            disabled={
              preview.myMatchId === null &&
              preview.slots.used >= preview.slots.total
            }
            onPress={() =>
              preview.myMatchId === null
                ? void change()
                : setConfirmCancel(true)
            }
          />
        </>
      )}
      <BottomSheet
        visible={confirmCancel}
        onClose={() => setConfirmCancel(false)}
      >
        <Label title center>
          この地図をやめますか？
        </Label>
        <Label center>マッチングを終了し、選択した枠を返します。</Label>
        <Button
          danger
          label="マッチングをやめる"
          loading={busy}
          onPress={() => {
            setConfirmCancel(false);
            void change();
          }}
        />
        <Button
          secondary
          label="続ける"
          onPress={() => setConfirmCancel(false)}
        />
      </BottomSheet>
    </Screen>
  );
}
