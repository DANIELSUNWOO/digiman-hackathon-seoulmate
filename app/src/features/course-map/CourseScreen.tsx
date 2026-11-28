import React, { useCallback, useState } from "react";
import {
  AppState,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import {
  BookOpenText,
  CaretRight,
  CheckCircle,
  Lightbulb,
  MapPin,
  MapTrifold,
  WarningCircle,
} from "phosphor-react-native";
import { theme } from "../../theme";
import { TranslatedText } from "../translation";
import { VisitProgress } from "../visit-verify/VisitProgress";
import {
  AppBar,
  Button,
  Card,
  ErrorNotice,
  Label,
  Screen,
  ScreenFooter,
  useFontFamily,
} from "../../ui";
import { LoadingSkeleton } from "../../loading";
import { displayText } from "../chat/model";
import { createCourseApi, type CourseApi } from "./api";
import { canWrite, type CourseData, type CourseMapPoint } from "./model";

const defaultApi = createCourseApi();

export type CourseScreenProps = {
  account: string;
  token: string;
  matchId: number;
  spotId?: number;
  api?: CourseApi;
  mapSlot?: (points: CourseMapPoint[]) => React.ReactNode;
  onBack: () => void;
  onSpot: (id: number) => void;
  onVerify: (spotId: number) => void;
  onVisits: () => void;
  onComplete: () => void;
  onChat: () => void;
};

type State = {
  identity: string;
  data: CourseData | null;
  loading: boolean;
  error: boolean;
};

export function CourseScreen({
  account,
  token,
  matchId,
  spotId,
  api = defaultApi,
  mapSlot,
  onBack,
  onSpot,
  onVerify,
  onVisits,
  onComplete,
  onChat,
}: CourseScreenProps) {
  const identity = JSON.stringify([account, token, matchId]);
  const [state, setState] = useState<State>({
    identity: "",
    data: null,
    loading: true,
    error: false,
  });
  const [revision, setRevision] = useState(0);

  const regularFont = useFontFamily("regular", "ja");
  const mediumFont = useFontFamily("medium", "ja");
  const semiboldFont = useFontFamily("semibold", "ja");
  const boldFont = useFontFamily("bold", "ja");

  useFocusEffect(
    useCallback(() => {
      let active = true;
      let seq = 0;
      let controller: AbortController | undefined;
      const refresh = () => {
        controller?.abort();
        controller = new AbortController();
        const current = ++seq;
        setState((s) => ({
          identity,
          data: s.identity === identity ? s.data : null,
          loading: true,
          error: false,
        }));
        void api
          .load(token, matchId, controller.signal)
          .then((data) => {
            if (active && current === seq)
              setState({ identity, data, loading: false, error: false });
          })
          .catch(() => {
            if (active && current === seq)
              setState({ identity, data: null, loading: false, error: true });
          });
      };
      refresh();
      const sub = AppState.addEventListener("change", (value) => {
        if (value === "active") refresh();
      });
      return () => {
        active = false;
        ++seq;
        controller?.abort();
        sub.remove();
      };
    }, [identity, token, matchId, api, revision]),
  );

  const current = state.identity === identity ? state : null;
  const data = current?.data;
  const spotIndex =
    spotId === undefined || !data
      ? -1
      : data.course.spots.findIndex((s) => s.spotId === spotId);
  const spot =
    spotIndex >= 0 && data ? data.course.spots[spotIndex] : undefined;

  return (
    <Screen>
      <AppBar
        title={spotId === undefined ? "選んだ地図" : "スポット詳細"}
        onBack={onBack}
        language="ja"
      />

      {!data && (!current || current.loading) && (
        <LoadingSkeleton shape="preview" label="地図を読み込み中" />
      )}

      {current?.error && (
        <Card surface="muted" style={styles.errorCard}>
          <View style={styles.errorIconCircle}>
            <WarningCircle size={26} color={theme.color.dangerInk} />
          </View>
          <ErrorNotice language="ja">地図を読み込めませんでした</ErrorNotice>
          <Button
            secondary
            size="small"
            language="ja"
            label="再試行"
            onPress={() => setRevision((x) => x + 1)}
          />
        </Card>
      )}

      {data && spotId !== undefined && !spot && (
        <Card surface="muted" style={styles.errorCard}>
          <Label language="ja" center tone="desc">
            この地図にスポットがありません
          </Label>
        </Card>
      )}

      {data && current?.loading ? (
        <View style={styles.updatingPill}>
          <Text style={[styles.updatingText, { fontFamily: semiboldFont }]}>
            更新中
          </Text>
        </View>
      ) : null}

      {data && spotId === undefined && (
        <>
          <View style={styles.headerBlock}>
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              accessibilityLabel={displayText(data.course.map.title, "ja")}
              style={[styles.title, { fontFamily: boldFont }]}
            >
              {displayText(data.course.map.title, "ja")}
            </Text>
            {data.course.map.caption ? (
              <Label variant="desc" tone="desc" language="ja">
                {displayText(data.course.map.caption, "ja")}
              </Label>
            ) : null}
          </View>

          {mapSlot ? (
            <View style={styles.mapFrame}>
              {mapSlot(
                data.course.spots.map(({ spotId, lat, lng, visited }) => ({
                  spotId,
                  lat,
                  lng,
                  visited,
                })),
              )}
            </View>
          ) : (
            <View
              accessibilityLabel="地図を準備中"
              style={styles.mapPlaceholder}
            >
              <View style={styles.mapPlaceholderIcon}>
                <MapTrifold size={26} color={theme.color.brandDeep} />
              </View>
              <Text
                style={[styles.mapPlaceholderTitle, { fontFamily: boldFont }]}
              >
                地図を準備中です
              </Text>
              <Text
                style={[styles.mapPlaceholderDesc, { fontFamily: regularFont }]}
              >
                スポットは下の一覧から確認できます
              </Text>
            </View>
          )}

          <Card surface="muted" style={styles.progressCard}>
            <VisitProgress progress={data.course.progress} variant="course" />
          </Card>

          <View style={styles.spotListSection}>
            <View style={styles.spotListHeader}>
              <Text style={[styles.sectionTitle, { fontFamily: boldFont }]}>
                スポット一覧
              </Text>
              <View style={styles.countPill}>
                <Text style={[styles.countPillText, { fontFamily: boldFont }]}>
                  {String(data.course.spots.length)}
                </Text>
              </View>
            </View>

            <View style={styles.spotList}>
              {data.course.spots.map((s, idx) => {
                const reasonPreview = s.reason
                  ? displayText(s.reason, "ja")
                  : "";
                return (
                  <Pressable
                    key={s.spotId}
                    accessibilityRole="button"
                    onPress={() => onSpot(s.spotId)}
                    style={({ pressed }) => [
                      styles.spotRow,
                      pressed && styles.spotRowPressed,
                    ]}
                  >
                    <View style={styles.thumbBox}>
                      {s.photos[0] ? (
                        <Image
                          source={{ uri: s.photos[0] }}
                          style={styles.thumbImg}
                          resizeMode="cover"
                        />
                      ) : (
                        <View
                          style={[
                            styles.thumbFallback,
                            s.visited && styles.thumbFallbackVisited,
                          ]}
                        >
                          {s.visited ? (
                            <CheckCircle
                              size={20}
                              color={theme.color.positive}
                              weight="fill"
                            />
                          ) : (
                            <MapPin size={18} color={theme.color.brandDeep} />
                          )}
                        </View>
                      )}
                      <View style={styles.thumbBadge}>
                        <Text
                          style={[
                            styles.thumbBadgeText,
                            { fontFamily: boldFont },
                          ]}
                        >
                          {idx + 1}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.spotMainCol}>
                      <Text
                        numberOfLines={1}
                        ellipsizeMode="tail"
                        accessibilityLabel={s.name}
                        style={[styles.spotName, { fontFamily: semiboldFont }]}
                      >
                        {s.name}
                      </Text>
                      {!s.visited && reasonPreview ? (
                        <View style={styles.reasonInlineRow}>
                          <Lightbulb size={13} color={theme.color.brandDeep} />
                          <Text
                            numberOfLines={1}
                            style={[
                              styles.reasonInlineText,
                              { fontFamily: regularFont },
                            ]}
                          >
                            {reasonPreview}
                          </Text>
                        </View>
                      ) : s.address ? (
                        <Text
                          numberOfLines={1}
                          style={[styles.spotAddr, { fontFamily: regularFont }]}
                        >
                          {s.address}
                        </Text>
                      ) : null}
                    </View>

                    <View style={styles.spotTrailing}>
                      <View
                        style={[
                          styles.visitPill,
                          s.visited
                            ? styles.visitPillDone
                            : styles.visitPillPending,
                        ]}
                      >
                        <Text
                          style={[
                            styles.visitPillText,
                            {
                              fontFamily: boldFont,
                              color: s.visited
                                ? theme.color.positive
                                : theme.color.labelAlt,
                            },
                          ]}
                        >
                          {s.visited ? "チェックイン済み" : "未訪問"}
                        </Text>
                      </View>
                      <CaretRight size={16} color={theme.color.labelAssist} />
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <ScreenFooter>
            <Button
              language="ja"
              label="旅行を完了する"
              disabled={!canWrite(data) || current?.loading}
              onPress={onComplete}
            />
            <Button
              secondary
              tone="weak"
              size="pair"
              language="ja"
              label={
                data.match.status === "COMPLETED"
                  ? "チャット履歴を見る"
                  : "チャットする"
              }
              disabled={
                current?.loading ||
                !(
                  (data.match.status === "ON_COURSE" &&
                    (data.match.chatStatus === "READY" ||
                      data.match.chatStatus === "OPEN")) ||
                  (data.match.status === "COMPLETED" &&
                    data.match.chatStatus === "OPEN")
                )
              }
              onPress={onChat}
            />
          </ScreenFooter>
        </>
      )}

      {data && spot && (
        <>
          {spot.photos.length === 1 ? (
            <Image
              source={{ uri: spot.photos[0] }}
              style={styles.detailHeroPhoto}
              resizeMode="cover"
            />
          ) : spot.photos.length > 1 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.detailPhotosRow}
            >
              {spot.photos.map((url, i) => (
                <Image
                  key={`${url}-${i}`}
                  source={{ uri: url }}
                  style={styles.detailPhotoSlide}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
          ) : null}

          <View style={styles.detailHeader}>
            <View style={styles.detailBadgesRow}>
              <View style={styles.orderPill}>
                <Text style={[styles.orderPillText, { fontFamily: boldFont }]}>
                  {`${spotIndex + 1}番目のスポット`}
                </Text>
              </View>
              <View
                style={[
                  styles.visitPill,
                  spot.visited ? styles.visitPillDone : styles.visitPillPending,
                ]}
              >
                <Text
                  style={[
                    styles.visitPillText,
                    {
                      fontFamily: boldFont,
                      color: spot.visited
                        ? theme.color.positive
                        : theme.color.labelAlt,
                    },
                  ]}
                >
                  {spot.visited ? "チェックイン済み" : "未訪問"}
                </Text>
              </View>
            </View>
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              accessibilityLabel={spot.name}
              style={[styles.title, { fontFamily: boldFont }]}
            >
              {spot.name}
            </Text>
            {spot.address ? (
              <View style={styles.addressRow}>
                <MapPin size={15} color={theme.color.labelDesc} />
                <Text style={[styles.addressText, { fontFamily: regularFont }]}>
                  {spot.address}
                </Text>
              </View>
            ) : null}
          </View>

          {spot.review && (
            <Card surface="muted" style={styles.detailCard}>
              <View style={styles.detailCardHeader}>
                <BookOpenText size={16} color={theme.color.brandDeep} />
                <Text
                  style={[styles.detailCardTitle, { fontFamily: boldFont }]}
                >
                  紹介
                </Text>
              </View>
              <TranslatedText
                key={`${spot.spotId}-review`}
                value={spot.review}
                viewerLang="ja"
              />
            </Card>
          )}

          {spot.reason && (
            <Card surface="muted" style={styles.detailCard}>
              <View style={styles.detailCardHeader}>
                <Lightbulb size={16} color={theme.color.brandDeep} />
                <Text
                  style={[styles.detailCardTitle, { fontFamily: boldFont }]}
                >
                  おすすめ理由
                </Text>
              </View>
              <TranslatedText
                key={`${spot.spotId}-reason`}
                value={spot.reason}
                viewerLang="ja"
              />
            </Card>
          )}

          <ScreenFooter>
            {spot.visited ? (
              <Button
                language="ja"
                label="チェックイン記録を見る"
                onPress={onVisits}
              />
            ) : (
              <Button
                language="ja"
                label="チェックインする"
                disabled={!canWrite(data) || current?.loading}
                onPress={() => onVerify(spot.spotId)}
              />
            )}
          </ScreenFooter>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerBlock: {
    gap: 6,
  },
  title: {
    fontSize: theme.typography.titleBig.fontSize,
    lineHeight: theme.typography.titleBig.lineHeight,
    letterSpacing: theme.typography.titleBig.letterSpacing,
    color: theme.color.labelNormal,
    includeFontPadding: false,
  },
  updatingPill: {
    alignSelf: "flex-start",
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.brandWeak,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  updatingText: {
    fontSize: 12,
    lineHeight: 16,
    color: theme.color.brandInk2,
  },
  errorCard: {
    alignItems: "center",
    gap: theme.space.md,
  },
  errorIconCircle: {
    width: 52,
    height: 52,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.dangerWeak,
    alignItems: "center",
    justifyContent: "center",
  },
  mapFrame: {
    borderRadius: theme.radius.cardSub,
    overflow: "hidden",
  },
  mapPlaceholder: {
    minHeight: 184,
    borderRadius: theme.radius.cardSub,
    backgroundColor: theme.color.fillG,
    borderWidth: 1,
    borderColor: theme.color.lineNormal,
    alignItems: "center",
    justifyContent: "center",
    padding: theme.space.lg,
    gap: 6,
  },
  mapPlaceholderIcon: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.brandTint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  mapPlaceholderTitle: {
    fontSize: 15,
    lineHeight: 21,
    color: theme.color.labelNormal,
    textAlign: "center",
  },
  mapPlaceholderDesc: {
    fontSize: 13,
    lineHeight: 19,
    color: theme.color.labelDesc,
    textAlign: "center",
  },
  progressCard: {
    padding: 16,
    gap: 12,
  },
  spotListSection: {
    gap: theme.space.md,
  },
  spotListHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space.sm,
  },
  sectionTitle: {
    fontSize: 17,
    lineHeight: 24,
    color: theme.color.labelNormal,
  },
  countPill: {
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.grey100,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countPillText: {
    fontSize: 12,
    lineHeight: 16,
    color: theme.color.labelAlt,
  },
  spotList: {
    gap: theme.space.sm,
  },
  spotRow: {
    flexWrap: "wrap",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: theme.color.fillG,
    borderRadius: theme.radius.cardSub,
    padding: 14,
  },
  spotRowPressed: {
    backgroundColor: theme.color.grey100,
  },
  thumbBox: {
    width: theme.size.thumbnail,
    height: theme.size.thumbnail,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  thumbImg: {
    width: "100%",
    height: "100%",
  },
  thumbFallback: {
    flex: 1,
    backgroundColor: theme.color.brandTint,
    alignItems: "center",
    justifyContent: "center",
  },
  thumbFallbackVisited: {
    backgroundColor: theme.color.positiveSoft,
  },
  thumbBadge: {
    position: "absolute",
    top: 3,
    left: 3,
    minWidth: 18,
    height: 18,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.surface,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  thumbBadgeText: {
    fontSize: 12,
    lineHeight: 14,
    color: theme.color.labelNormal,
  },
  spotMainCol: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  spotName: {
    fontSize: 15,
    lineHeight: 21,
    color: theme.color.labelNormal,
  },
  reasonInlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  reasonInlineText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: theme.color.brandDeep,
  },
  spotAddr: {
    fontSize: 12,
    lineHeight: 17,
    color: theme.color.labelDesc,
  },
  spotTrailing: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexShrink: 0,
  },
  visitPill: {
    borderRadius: theme.radius.xs,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  visitPillDone: {
    backgroundColor: theme.color.positiveWeak,
  },
  visitPillPending: {
    backgroundColor: theme.color.grey100,
  },
  visitPillText: {
    fontSize: 12,
    lineHeight: 15,
    includeFontPadding: false,
  },
  detailHeroPhoto: {
    width: "100%",
    height: 184,
    borderRadius: theme.radius.cardSub,
    backgroundColor: theme.color.surface2,
  },
  detailPhotosRow: {
    gap: 10,
  },
  detailPhotoSlide: {
    width: 260,
    height: 184,
    borderRadius: theme.radius.cardSub,
    backgroundColor: theme.color.surface2,
  },
  detailHeader: {
    gap: 8,
  },
  detailBadgesRow: {
    flexWrap: "wrap",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  orderPill: {
    borderRadius: theme.radius.xs,
    backgroundColor: theme.color.brandWeak,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  orderPillText: {
    fontSize: 12,
    lineHeight: 15,
    color: theme.color.brandInk2,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  addressText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: theme.color.labelDesc,
  },
  detailCard: {
    gap: 10,
  },
  detailCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  detailCardTitle: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.color.labelNeutral,
  },
});
