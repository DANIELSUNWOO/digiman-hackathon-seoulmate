import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { CalendarBlank, Check, FlagCheckered } from "phosphor-react-native";
import {
  AppBar,
  BottomSheet,
  Button,
  Card,
  ErrorNotice,
  Input,
  Label,
  Notice,
  Screen,
  ScreenFooter,
  useFontFamily,
  useReducedMotion,
} from "../../ui";
import { LoadingSkeleton } from "../../loading";
import { theme } from "../../theme";
import { SvgXml } from "react-native-svg";
import { house, airplane, photo_album } from "./art";
import { ApiError } from "../../api";
import {
  beginCompletion,
  beginCompletionRetry,
  canResolveCompletion,
  completionConfirmed,
  completionKey,
  completionPhase,
  completionSettled,
  editMatches,
} from "./pending";
import {
  createCompletionApi,
  type Album,
  type CompletionApi,
  type Detail,
} from "./api";

const defaultApi = createCompletionApi();

type Props = {
  account: string;
  token: string;
  matchId: number;
  api?: CompletionApi;
  onBack: () => void;
  onAlbum: () => void;
};

export function SessionCompletionScreen({
  account,
  token,
  matchId,
  api = defaultApi,
  onBack,
  onAlbum,
}: Props) {
  const identity = JSON.stringify([account, token, matchId]);
  const key = completionKey(account, matchId);
  const editKey = `${key}:album-edit`;
  const font = useFontFamily("regular", "ja");
  const semibold = useFontFamily("semibold", "ja");
  const bold = useFontFamily("bold", "ja");
  const reducedMotion = useReducedMotion();
  const pulse = useRef(new Animated.Value(0.45)).current;
  const journey = useRef(new Animated.Value(0)).current;
  const [preparing, setPreparing] = useState(false);
  const [trackWidth, setTrackWidth] = useState(0);

  useEffect(() => {
    if (!preparing || reducedMotion) {
      journey.setValue(0);
      pulse.setValue(1);
      return;
    }
    const useNative = Platform.OS !== "web";
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 500,
          useNativeDriver: useNative,
        }),
        Animated.timing(pulse, {
          toValue: 0.45,
          duration: 500,
          useNativeDriver: useNative,
        }),
      ]),
    );
    const travel = Animated.loop(
      Animated.sequence([
        Animated.timing(journey, {
          toValue: 1,
          duration: 2200,
          useNativeDriver: useNative,
        }),
        Animated.timing(journey, {
          toValue: 0,
          duration: 2200,
          useNativeDriver: useNative,
        }),
      ]),
    );
    animation.start();
    travel.start();
    return () => {
      animation.stop();
      travel.stop();
    };
  }, [preparing, reducedMotion, pulse, journey]);

  const pendingConfirm = useRef(false);
  const live = useRef({ identity, active: false, generation: 0 });
  live.current.identity = identity;
  const renderedGeneration = live.current.generation;
  const draft = useRef({ identity, dirty: false });
  if (draft.current.identity !== identity)
    draft.current = { identity, dirty: false };
  const busy = useRef(false),
    needsCheck = useRef(false);
  const [detail, setDetail] = useState<Detail | null>(null),
    [album, setAlbum] = useState<Album | null>(null);
  const timelinePhotos = album?.photos.slice(0, 3) ?? [];
  const timelineGap = 4;
  const timelineMotion = 8;
  const timelineStationWidth = 52;
  const photoWidth = timelinePhotos.length
    ? Math.max(
        0,
        Math.min(
          42,
          (trackWidth -
            timelineMotion * 2 -
            timelineStationWidth * 3 -
            timelineGap * (timelinePhotos.length + 2)) /
            timelinePhotos.length,
        ),
      )
    : 0;
  const [title, setTitle] = useState(""),
    [cover, setCover] = useState<string | null>(null);
  const [working, setWorking] = useState(false),
    [sheet, setSheet] = useState(false),
    [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [retryReady, setRetryReady] = useState(false);
  const explicitRecheck = useRef(false);

  useFocusEffect(
    useCallback(() => {
      live.current.active = true;
      live.current.generation += 1;
      let alive = true;
      const requested = explicitRecheck.current;
      explicitRecheck.current = false;
      setRetryReady(false);
      const controller = new AbortController();
      const valid = () =>
        alive && live.current.active && live.current.identity === identity;
      setDetail(null);
      setAlbum(null);
      setError("");
      setWorking(true);
      busy.current = true;
      void Promise.all([
        api.detail(token, matchId, controller.signal),
        api.slots(token, account, controller.signal),
      ])
        .then(async ([d]) => {
          const a =
            (d.status === "COMPLETED" || d.status === "EXPIRED") && d.albumId
              ? await api.album(token, matchId, d.albumId, controller.signal)
              : null;
          if (!valid()) return;
          if ((d.status === "COMPLETED" || d.status === "EXPIRED") && !a)
            throw new Error("Album unavailable");
          setDetail(d);
          setAlbum(a);
          if (a && !draft.current.dirty) {
            setTitle(a.title);
            setCover(a.coverUrl);
          }
          if (canResolveCompletion(completionPhase(key), d.status, !!a))
            completionConfirmed(key);
          if (
            a &&
            completionPhase(editKey) === "uncertain" &&
            editMatches(editKey, a)
          )
            completionConfirmed(editKey);
          needsCheck.current =
            completionPhase(key) !== null || completionPhase(editKey) !== null;
          if (needsCheck.current) {
            if (
              requested &&
              d.status === "ON_COURSE" &&
              completionPhase(key) === "uncertain" &&
              completionPhase(editKey) === null
            ) {
              setRetryReady(true);
              setError("旅行を続けています。もう一度完了できます。");
            } else {
              setError(
                "処理結果を確認中です。時間をおいて再確認してください。",
              );
            }
          }
        })
        .catch(() => {
          if (valid())
            setError("状態を確認できませんでした。もう一度確認してください。");
        })
        .finally(() => {
          if (valid()) {
            busy.current = false;
            setWorking(false);
          }
        });
      return () => {
        alive = false;
        pendingConfirm.current = false;
        live.current.active = false;
        live.current.generation += 1;
        controller.abort();
      };
    }, [account, api, identity, matchId, revision, token]),
  );

  useEffect(() => {
    setSheet(false);
    needsCheck.current =
      completionPhase(key) !== null || completionPhase(editKey) !== null;
    pendingConfirm.current = false;
    explicitRecheck.current = false;
    setRetryReady(false);
    setTitle("");
    setCover(null);
  }, [identity, key, editKey]);

  const refresh = () => {
    if (!busy.current) {
      explicitRecheck.current = true;
      setRevision((n) => n + 1);
    }
  };

  const complete = async () => {
    const retry = retryReady && completionPhase(key) === "uncertain";
    if (
      busy.current ||
      (needsCheck.current && !retry) ||
      !live.current.active ||
      live.current.identity !== identity ||
      live.current.generation !== renderedGeneration ||
      !detail ||
      detail.status !== "ON_COURSE" ||
      !(retry ? beginCompletionRetry(key) : beginCompletion(key))
    )
      return;
    setRetryReady(false);
    busy.current = true;
    needsCheck.current = true;
    setSheet(false);
    setWorking(true);
    setError("");
    const generation = live.current.generation;
    const current = () =>
      live.current.active &&
      live.current.identity === identity &&
      live.current.generation === generation;
    let responseId: number | null = null;
    let authExpired = false;
    try {
      responseId = (await api.complete(token, matchId)).albumId;
    } catch (error) {
      authExpired =
        error instanceof ApiError && error.code === "SESSION_EXPIRED";
      if (
        error instanceof ApiError &&
        (error.code === "CONFIG_MISSING" ||
          (error.code === "SESSION_EXPIRED" && error.status === undefined))
      ) {
        completionConfirmed(key);
        if (current()) {
          needsCheck.current = false;
          busy.current = false;
          setWorking(false);
          setError(
            error.code === "SESSION_EXPIRED"
              ? "セッションが切れました。もう一度ログインしてください。"
              : "接続設定を確認してください。",
          );
        }
        return;
      }
      if (
        error instanceof ApiError &&
        error.code === "HTTP" &&
        error.status &&
        error.status >= 400 &&
        error.status < 500 &&
        ![408, 409, 429].includes(error.status) &&
        error.serverError?.code !== "MATCH_NOT_ON_COURSE"
      ) {
        completionConfirmed(key);
        if (current()) {
          needsCheck.current = false;
          busy.current = false;
          setWorking(false);
          setError("旅行を完了できませんでした。状態を確認してください。");
        }
        return;
      }
    }
    completionSettled(key);
    if (!current()) return;
    try {
      const [d] = await Promise.all([
        api.detail(token, matchId),
        api.slots(token, account),
      ]);
      if (!current()) return;
      if (
        d.status !== "COMPLETED" ||
        !d.albumId ||
        (responseId !== null && responseId !== d.albumId)
      )
        throw new Error("Unconfirmed completion");
      const a = await api.album(token, matchId, d.albumId);
      if (!current()) return;
      setDetail(d);
      setAlbum(a);
      setTitle(a.title);
      setCover(a.coverUrl);
      completionConfirmed(key);
      needsCheck.current = false;
    } catch {
      if (current())
        setError(
          authExpired
            ? "セッションが切れました。ログイン後に完了結果を確認してください。"
            : "完了結果を確認できません。再確認してください。",
        );
    } finally {
      if (current()) {
        busy.current = false;
        setWorking(false);
      }
    }
  };

  const openAlbum = async () => {
    if (
      busy.current ||
      !album ||
      !detail ||
      !detail.albumId ||
      needsCheck.current ||
      completionPhase(editKey) !== null
    )
      return;
    const changed = title.trim() !== album.title || cover !== album.coverUrl;
    if (
      !title.trim() ||
      title.trim().length > 100 ||
      (cover !== null &&
        !album.photos.includes(cover) &&
        cover !== album.coverUrl)
    ) {
      setError("タイトルまたは表紙を確認してください。");
      return;
    }
    busy.current = true;
    setWorking(true);
    setPreparing(true);
    setError("");
    const generation = live.current.generation;
    const current = () =>
      live.current.active &&
      live.current.identity === identity &&
      live.current.generation === generation;
    try {
      if (changed) {
        if (
          !beginCompletion(editKey, {
            albumId: album.albumId,
            title: title.trim(),
            coverUrl: cover,
          })
        )
          throw new Error("Album edit pending");
        try {
          await api.edit(token, matchId, title.trim(), cover);
        } catch (error) {
          if (
            error instanceof ApiError &&
            error.code === "HTTP" &&
            error.status &&
            error.status >= 400 &&
            error.status < 500 &&
            ![408, 409, 429].includes(error.status)
          ) {
            completionConfirmed(editKey);
            throw error;
          }
        } finally {
          completionSettled(editKey);
        }
      }
      if (!current()) return;
      const d = await api.detail(token, matchId);
      if (
        !current() ||
        d.albumId !== album.albumId ||
        (d.status !== "COMPLETED" && d.status !== "EXPIRED")
      )
        throw new Error("Album changed");
      const saved = await api.album(token, matchId, album.albumId);
      if (changed && !editMatches(editKey, saved))
        throw new Error("Album edit not confirmed");
      if (changed) completionConfirmed(editKey);
      if (current()) onAlbum();
    } catch {
      if (current()) {
        needsCheck.current = completionPhase(editKey) !== null;
        setError("アルバムを確認できませんでした。もう一度お試しください。");
      }
    } finally {
      if (current()) {
        busy.current = false;
        setWorking(false);
        setPreparing(false);
      }
    }
  };

  if (preparing)
    return (
      <Screen>
        <View style={styles.preparingStage}>
          <View
            style={styles.trackBox}
            onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
          >
            <View style={styles.dashedTrack} />
            <Animated.View
              style={[
                styles.trackRow,
                { opacity: trackWidth > 0 ? 1 : 0, gap: timelineGap },
                {
                  transform: [
                    {
                      translateX: journey.interpolate({
                        inputRange: [0, 1],
                        outputRange: [timelineMotion, -timelineMotion],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.stationCol}>
                <View style={styles.stationCircle}>
                  <SvgXml xml={house} width={26} height={26} />
                </View>
                <Text style={[styles.stationCaption, { fontFamily: font }]}>
                  出発
                </Text>
              </View>
              <View style={styles.stationCol}>
                <View style={styles.stationCircle}>
                  <SvgXml xml={airplane} width={26} height={26} />
                </View>
                <Text style={[styles.stationCaption, { fontFamily: font }]}>
                  ソウルへ
                </Text>
              </View>
              {timelinePhotos.map((uri, i) => (
                <Image
                  key={`${i}-${uri}`}
                  source={{ uri }}
                  style={[
                    styles.timelinePhoto,
                    { width: photoWidth, height: (photoWidth * 52) / 42 },
                  ]}
                  resizeMode="cover"
                />
              ))}
              <View style={styles.stationCol}>
                <View style={styles.albumEndCircle}>
                  <SvgXml xml={photo_album} width={28} height={28} />
                </View>
                <Text style={[styles.stationCaption, { fontFamily: semibold }]}>
                  アルバム
                </Text>
              </View>
            </Animated.View>
          </View>
          <Animated.Text
            style={[
              styles.preparingTitle,
              { fontFamily: bold, opacity: pulse },
            ]}
          >
            ソウルの旅を{"\n"}アルバムにしています
          </Animated.Text>
          <Text style={[styles.preparingDesc, { fontFamily: font }]}>
            ここまでの道のりをまとめています
          </Text>
          <ActivityIndicator color={theme.color.brand} />
        </View>
      </Screen>
    );

  return (
    <Screen contentStyle={styles.screenContent}>
      <AppBar title="旅行を完了" onBack={onBack} language="ja" />

      {working && !detail && (
        <LoadingSkeleton shape="preview" label="状態を確認しています" />
      )}

      {working && detail && (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={theme.color.brand} />
          <Text style={[styles.loadingRowText, { fontFamily: font }]}>
            状態を確認しています
          </Text>
        </View>
      )}

      {!!error && (
        <Card surface="muted" style={styles.errorCard}>
          <ErrorNotice language="ja">{error}</ErrorNotice>
          <Button
            secondary
            size="small"
            language="ja"
            label="再確認"
            onPress={refresh}
          />
        </Card>
      )}

      {detail?.status === "ON_COURSE" && (!error || retryReady) && (
        <Card surface="muted" style={styles.onCourseCard}>
          <View style={styles.heroCircle}>
            <FlagCheckered size={26} color={theme.color.brandDeep} />
          </View>
          <Label variant="titleBig" language="ja">
            この地図の旅を完了する
          </Label>
          <Label variant="desc" tone="desc" language="ja">
            旅行を完了すると、マッチング枠が戻ります。
          </Label>
          <Button
            language="ja"
            label={retryReady ? "もう一度完了する" : "旅行を完了する"}
            onPress={() => setSheet(true)}
            disabled={working || (needsCheck.current && !retryReady)}
          />
        </Card>
      )}

      {detail &&
        ["CANCELED", "BLOCKED", "ENDED", "MATCHED"].includes(detail.status) && (
          <Card surface="muted">
            <Label language="ja" tone="desc">
              この旅行は完了できません。
            </Label>
          </Card>
        )}

      {detail?.status === "EXPIRED" && (
        <View style={styles.expiredWrap}>
          <View style={styles.expiredHero}>
            <View style={styles.expiredCircle}>
              <CalendarBlank size={28} color={theme.color.brandDeep} />
            </View>
            <Label variant="titleBig" center language="ja">
              旅行期間が終わりました
            </Label>
            <Label variant="desc" tone="desc" center language="ja">
              旅行期間が終了しました。マッチング枠が戻りました。
            </Label>
          </View>
          <Notice language="ja">これまでの記録はアルバムで見られます</Notice>
        </View>
      )}

      {album && detail?.status === "COMPLETED" && (
        <View style={styles.completedHero}>
          <Text style={[styles.heroTitle, { fontFamily: bold }]}>
            ソウルの旅、{"\n"}おつかれさまでした
          </Text>
          <Text style={[styles.heroDesc, { fontFamily: font }]}>
            チェックインした写真とひとこと、メイトのコメントで1冊のアルバムを作ります。
          </Text>
          {album.photos.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.photoPreviewStrip}
            >
              {album.photos.slice(0, 4).map((uri, idx) => (
                <Image
                  key={`strip-${idx}-${uri}`}
                  source={{ uri }}
                  style={styles.stripPhoto}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
          ) : null}
          <Notice language="ja">マッチング枠が戻りました。</Notice>
        </View>
      )}

      {album && (
        <>
          <Card surface="muted" style={styles.albumCard}>
            <View style={styles.fieldGroup}>
              <View style={styles.fieldHeaderRow}>
                <Text style={[styles.fieldLabel, { fontFamily: semibold }]}>
                  アルバムのタイトル
                </Text>
                <Text style={[styles.counterText, { fontFamily: font }]}>
                  {`${title.trim().length}/100`}
                </Text>
              </View>
              <Input
                language="ja"
                value={title}
                onChangeText={(value) => {
                  draft.current.dirty = true;
                  setTitle(value);
                }}
                maxLength={100}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { fontFamily: semibold }]}>
                表紙を選ぶ
              </Text>
              <View style={styles.coverGrid}>
                {album.photos.map((url, index) => {
                  const active = cover === url;
                  return (
                    <Pressable
                      key={`${index}-${url}`}
                      onPress={() => {
                        draft.current.dirty = true;
                        setCover(url);
                      }}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      accessibilityLabel={`表紙 ${index + 1}`}
                      style={[
                        styles.coverTile,
                        active && styles.coverTileSelected,
                      ]}
                    >
                      <Image
                        source={{ uri: url }}
                        style={styles.coverImage}
                        resizeMode="cover"
                      />
                      {active ? (
                        <View style={styles.coverCheckBadge}>
                          <Check
                            size={12}
                            color={theme.color.surface}
                            weight="bold"
                          />
                        </View>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </Card>

          <ScreenFooter>
            <Button
              language="ja"
              label={
                detail?.status === "EXPIRED"
                  ? "アルバムを見る"
                  : "アルバムを作る"
              }
              onPress={() => void openAlbum()}
              disabled={working || needsCheck.current}
            />
          </ScreenFooter>
        </>
      )}

      <BottomSheet
        visible={sheet}
        onClose={() => {
          pendingConfirm.current = false;
          setSheet(false);
        }}
        onDismissed={() => {
          if (pendingConfirm.current) {
            pendingConfirm.current = false;
            void complete();
          }
        }}
      >
        <View style={styles.sheetBody}>
          <Text style={[styles.sheetTitle, { fontFamily: bold }]}>
            旅行を完了しますか？
          </Text>
          <Text style={[styles.sheetDesc, { fontFamily: font }]}>
            完了するとこの地図の旅は終わり、マッチング枠が1つ戻ります。チェックインした写真でアルバムを作れます。
          </Text>
          <View style={styles.sheetActions}>
            <Button
              language="ja"
              label="完了する"
              onPress={() => {
                if (
                  pendingConfirm.current ||
                  busy.current ||
                  !live.current.active ||
                  live.current.identity !== identity ||
                  live.current.generation !== renderedGeneration ||
                  (completionPhase(key) !== null &&
                    !(retryReady && completionPhase(key) === "uncertain"))
                )
                  return;
                pendingConfirm.current = true;
                setSheet(false);
              }}
              disabled={working || (needsCheck.current && !retryReady)}
            />
            <Button
              label="まだ続ける"
              secondary
              size="pair"
              language="ja"
              onPress={() => {
                pendingConfirm.current = false;
                setSheet(false);
              }}
              disabled={working}
            />
          </View>
        </View>
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    paddingHorizontal: theme.space.screen,
    gap: theme.space.lg,
  },
  preparingStage: {
    flex: 1,
    minHeight: 420,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.space.lg,
    backgroundColor: theme.color.surface,
  },
  trackBox: {
    width: "100%",
    height: 150,
    overflow: "hidden",
    justifyContent: "center",
    position: "relative",
  },
  dashedTrack: {
    position: "absolute",
    left: 24,
    right: 24,
    top: "44%",
    height: 1,
    borderBottomWidth: 2,
    borderStyle: "dashed",
    borderColor: theme.color.grey200,
  },
  trackRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  stationCol: {
    width: 52,
    alignItems: "center",
    gap: 5,
  },
  stationCircle: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.brandTint,
    alignItems: "center",
    justifyContent: "center",
  },
  albumEndCircle: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.brandWeak,
    alignItems: "center",
    justifyContent: "center",
  },
  stationCaption: {
    fontSize: 12,
    lineHeight: 16,
    color: theme.color.labelDesc,
  },
  timelinePhoto: {
    borderRadius: theme.radius.sm,
    borderWidth: 2,
    borderColor: theme.color.surface,
    backgroundColor: theme.color.surface2,
  },
  preparingTitle: {
    ...theme.typography.titleBig,
    color: theme.color.labelNormal,
    textAlign: "center",
  },
  preparingDesc: {
    ...theme.typography.body1,
    color: theme.color.labelDesc,
    textAlign: "center",
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space.sm,
  },
  loadingRowText: {
    fontSize: 13,
    lineHeight: 18,
    color: theme.color.labelDesc,
  },
  errorCard: {
    gap: theme.space.md,
  },
  onCourseCard: {
    gap: 14,
  },
  heroCircle: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.brandTint,
    alignItems: "center",
    justifyContent: "center",
  },
  expiredWrap: {
    gap: theme.space.lg,
  },
  expiredHero: {
    alignItems: "center",
    gap: theme.space.sm,
    paddingVertical: theme.space.md,
  },
  expiredCircle: {
    width: 64,
    height: 64,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.brandTint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  completedHero: {
    gap: theme.space.md,
  },
  heroTitle: {
    ...theme.typography.titleBig,
    color: theme.color.labelNormal,
  },
  heroDesc: {
    ...theme.typography.body1,
    color: theme.color.labelDesc,
  },
  photoPreviewStrip: {
    gap: 10,
  },
  stripPhoto: {
    width: 112,
    height: 112,
    borderRadius: 14,
    backgroundColor: theme.color.grey100,
  },
  albumCard: {
    gap: theme.space.lg,
  },
  fieldGroup: {
    gap: theme.space.sm,
  },
  fieldHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  fieldLabel: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.color.labelNeutral,
  },
  counterText: {
    fontSize: 12,
    lineHeight: 16,
    color: theme.color.labelDesc,
  },
  coverGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  coverTile: {
    width: 82,
    height: 82,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
    position: "relative",
  },
  coverTileSelected: {
    borderColor: theme.color.brand,
  },
  coverImage: {
    width: "100%",
    height: "100%",
  },
  coverCheckBadge: {
    position: "absolute",
    top: 5,
    right: 5,
    width: 22,
    height: 22,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.brandDeep,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetBody: {
    gap: theme.space.md,
  },
  sheetTitle: {
    ...theme.typography.sheetTitle,
    color: theme.color.labelNormal,
  },
  sheetDesc: {
    ...theme.typography.body1,
    color: theme.color.labelDesc,
  },
  sheetActions: {
    gap: theme.space.sm,
    marginTop: theme.space.xs,
  },
});
