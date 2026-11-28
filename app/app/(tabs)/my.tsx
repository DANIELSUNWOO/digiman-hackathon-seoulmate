import { useRouter, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import {
  CaretRight,
  ChatCircle,
  Gear,
  GenderFemale,
  GenderMale,
  IdentificationCard,
  MapTrifold,
} from "phosphor-react-native";
import { useSession } from "../../src/session";
import { chatIdentityFromFlow } from "../../src/features/chat/identity";
import { createStatsApi, type Stats } from "../../src/features/my-page/stats";
import { createChatApi } from "../../src/features/chat/api";
import { displayText, type Match } from "../../src/features/chat/model";
import { getMe, type Me } from "../../src/users";
import {
  Button,
  Card,
  ErrorNotice,
  Label,
  Screen,
  useFontFamily,
} from "../../src/ui";
import { LoadingSkeleton } from "../../src/loading";
import { theme } from "../../src/theme";

const loadStats = createStatsApi();
const matchApi = createChatApi();

export default function My() {
  const router = useRouter();
  const flow = useSession();
  const identity = chatIdentityFromFlow(flow);
  const scope = identity
    ? JSON.stringify([
        identity.accountId,
        identity.token,
        identity.role,
        identity.language,
      ])
    : "";
  const [result, setResult] = useState<{
    scope: string;
    stats: Stats | null;
    error: boolean;
  } | null>(null);
  const [revision, setRevision] = useState(0);
  const [history, setHistory] = useState<{
    scope: string;
    rows: Match[];
    error: boolean;
  } | null>(null);
  const [profile, setProfile] = useState<{
    scope: string;
    me: Me | null;
    error: boolean;
  } | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!identity) return;
      const abort = new AbortController();
      let current = true;
      setResult(null);
      setHistory(null);
      setProfile(null);
      getMe(identity.token, identity.accountId, abort.signal)
        .then((me) => {
          if (
            current &&
            me.role === (identity.role === "mate" ? "MATE" : "TRAVELER") &&
            me.language === identity.language
          )
            setProfile({ scope, me, error: false });
          else if (current) setProfile({ scope, me: null, error: true });
        })
        .catch(() => {
          if (current) setProfile({ scope, me: null, error: true });
        });
      loadStats(identity.token, identity.role, abort.signal).then(
        (stats) => {
          if (current) setResult({ scope, stats, error: false });
        },
        () => {
          if (current) setResult({ scope, stats: null, error: true });
        },
      );
      matchApi
        .list(identity.token, identity.role, undefined, abort.signal)
        .then(
          (rows) => {
            if (current) setHistory({ scope, rows, error: false });
          },
          () => {
            if (current) setHistory({ scope, rows: [], error: true });
          },
        );
      return () => {
        current = false;
        abort.abort();
      };
    }, [scope, revision]),
  );

  const lang = identity?.language ?? "ko";
  const regularFont = useFontFamily("regular", lang);
  const mediumFont = useFontFamily("medium", lang);
  const semiboldFont = useFontFamily("semibold", lang);
  const boldFont = useFontFamily("bold", lang);

  if (!identity || flow.load.kind !== "ready") return null;

  const ko = identity.language === "ko";
  const me = profile?.scope === scope && profile.me ? profile.me : flow.load.me;
  const stats = result?.scope === scope ? result.stats : null;
  const rows: { label: string; value: number | null; unit: string }[] =
    stats?.role === "traveler"
      ? [
          {
            label: ko ? "여행 며칠째" : "旅行日数",
            value: stats.tripDay,
            unit: ko ? "일" : "日",
          },
          {
            label: ko ? "만난 메이트" : "出会った\nメイト",
            value: stats.matesMet,
            unit: ko ? "명" : "人",
          },
          {
            label: ko ? "방문한 스팟" : "訪問した\nスポット",
            value: stats.visitedSpots,
            unit: ko ? "곳" : "か所",
          },
        ]
      : stats
        ? [
            {
              label: ko ? "활동 일수" : "活動日数",
              value: stats.activeDays,
              unit: ko ? "일" : "日",
            },
            {
              label: ko ? "만난 여행자" : "出会った\n旅行者",
              value: stats.travelersMet,
              unit: ko ? "명" : "人",
            },
            {
              label: ko ? "공개 지도" : "公開マップ",
              value: stats.completedMaps,
              unit: ko ? "개" : "件",
            },
          ]
        : [];

  const displayName = me.nickname || (ko ? "프로필" : "プロフィール");
  const avatarInitial = displayName.trim().slice(0, 1) || "S";
  const countryText =
    me.country === "KR" ? (ko ? "한국" : "韓国") : ko ? "일본" : "日本";
  const genderText =
    me.gender === "MALE"
      ? ko
        ? "남성"
        : "男性"
      : me.gender === "FEMALE"
        ? ko
          ? "여성"
          : "女性"
        : null;
  const verified = me.verifyStatus === "VERIFIED";

  return (
    <Screen
      contentStyle={styles.screenContent}
      backgroundColor={theme.color.pageG}
    >
      <Text style={[styles.pageTitle, { fontFamily: boldFont }]}>
        {ko ? "마이" : "マイ"}
      </Text>

      <Card style={styles.sectionCard}>
        <View style={styles.profileTopRow}>
          {me.profileImageUrl ? (
            <Image
              source={{ uri: me.profileImageUrl }}
              style={styles.avatarImage}
            />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={[styles.avatarInitial, { fontFamily: boldFont }]}>
                {avatarInitial}
              </Text>
            </View>
          )}
          <View style={styles.profileInfoCol}>
            <View style={styles.profileNameRow}>
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={[styles.profileName, { fontFamily: boldFont }]}
              >
                {displayName}
              </Text>
              {me.verifyStatus ? (
                <View
                  style={[
                    styles.verifyPill,
                    verified ? styles.verifyPillDone : styles.verifyPillPending,
                  ]}
                >
                  <IdentificationCard
                    size={12}
                    color={
                      verified ? theme.color.positive : theme.color.labelAlt
                    }
                  />
                  <Text
                    style={[
                      styles.verifyPillText,
                      {
                        fontFamily: boldFont,
                        color: verified
                          ? theme.color.positive
                          : theme.color.labelAlt,
                      },
                    ]}
                  >
                    {verified
                      ? ko
                        ? "본인 인증 완료"
                        : "本人認証済み"
                      : ko
                        ? "본인 인증 전"
                        : "本人認証前"}
                  </Text>
                </View>
              ) : null}
            </View>
            <View style={styles.metaLine}>
              <Text style={[styles.metaText, { fontFamily: regularFont }]}>
                {countryText}
              </Text>
              {genderText ? (
                <>
                  <View
                    style={styles.genderBadge}
                    accessibilityLabel={genderText}
                  >
                    {me.gender === "MALE" ? (
                      <GenderMale size={14} color={theme.color.brandDeep} />
                    ) : (
                      <GenderFemale size={14} color={theme.color.like} />
                    )}
                    <Text
                      style={[styles.metaText, { fontFamily: regularFont }]}
                    >
                      {genderText}
                    </Text>
                  </View>
                </>
              ) : null}
              {me.ageGroup !== undefined ? (
                <>
                  <Text style={[styles.metaText, { fontFamily: regularFont }]}>
                    {`${me.ageGroup}${ko ? "대" : "代"}`}
                  </Text>
                </>
              ) : null}
            </View>
          </View>
        </View>

        {profile?.scope !== scope ? (
          <Text style={[styles.statusHint, { fontFamily: regularFont }]}>
            {ko
              ? "프로필을 불러오는 중입니다"
              : "プロフィールを読み込んでいます"}
          </Text>
        ) : profile.error ? (
          <View style={styles.errorStack}>
            <ErrorNotice language={identity.language}>
              {ko
                ? "프로필 갱신에 실패해 이전 정보를 표시합니다"
                : "プロフィールを更新できず、以前の情報を表示しています"}
            </ErrorNotice>
            <Button
              secondary
              size="small"
              language={identity.language}
              label={ko ? "다시 시도" : "再試行"}
              onPress={() => setRevision((x) => x + 1)}
            />
          </View>
        ) : null}

        <Button
          secondary
          size="small"
          language={identity.language}
          label={ko ? "프로필 수정" : "プロフィールを編集"}
          onPress={() => router.push("/(onboarding)/profile?from=account")}
        />

        <View style={styles.statsSection}>
          {result?.scope !== scope ? (
            <View style={styles.statsLoadingWrap}>
              <View style={styles.statsRow}>
                {[0, 1, 2].map((idx) => (
                  <View
                    key={idx}
                    style={[styles.statCol, idx > 0 && styles.statColDivider]}
                  >
                    <View style={styles.statSkeletonVal} />
                    <View style={styles.statSkeletonLbl} />
                  </View>
                ))}
              </View>
              <Text
                style={[styles.statusHintCenter, { fontFamily: regularFont }]}
              >
                {ko
                  ? "활동 정보를 불러오는 중입니다"
                  : "活動情報を読み込んでいます"}
              </Text>
            </View>
          ) : result.error ? (
            <View style={styles.errorStack}>
              <ErrorNotice language={identity.language}>
                {ko
                  ? "활동 정보를 불러오지 못했습니다"
                  : "活動情報を読み込めませんでした"}
              </ErrorNotice>
              <Button
                secondary
                size="small"
                language={identity.language}
                label={ko ? "다시 시도" : "再試行"}
                onPress={() => setRevision((x) => x + 1)}
              />
            </View>
          ) : (
            <View style={styles.statsRow}>
              {rows.map((item, idx) => (
                <View
                  key={item.label}
                  style={[styles.statCol, idx > 0 && styles.statColDivider]}
                >
                  <View style={styles.statValueRow}>
                    <Text
                      style={[
                        styles.statValue,
                        { fontFamily: boldFont, fontVariant: ["tabular-nums"] },
                      ]}
                    >
                      {item.value === null ? "-" : String(item.value)}
                    </Text>
                    {item.value !== null ? (
                      <Text
                        style={[styles.statUnit, { fontFamily: regularFont }]}
                      >
                        {item.unit}
                      </Text>
                    ) : null}
                  </View>
                  <Text
                    numberOfLines={2}
                    style={[styles.statLabel, { fontFamily: regularFont }]}
                  >
                    {item.label}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </Card>

      <Text style={[styles.groupLabel, { fontFamily: semiboldFont }]}>
        {ko ? "나의 취향" : "わたしの好み"}
      </Text>
      <Card style={styles.listCard}>
        <View style={styles.prefRow}>
          <View style={styles.prefTextCol}>
            <Text style={[styles.prefTitle, { fontFamily: semiboldFont }]}>
              {ko ? "취향" : "旅の好み"}
            </Text>
            <Text
              numberOfLines={3}
              style={[styles.prefDesc, { fontFamily: regularFont }]}
            >
              {me.tags?.length
                ? me.tags.map((tag) => tag.name).join(", ")
                : me.tags
                  ? ko
                    ? "선택한 취향이 없습니다"
                    : "選択した好みはありません"
                  : ko
                    ? "취향 정보를 확인할 수 없습니다"
                    : "好みの情報を確認できません"}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/(onboarding)/tags?from=account")}
            style={styles.inlineEditBtn}
          >
            <Text style={[styles.inlineEditText, { fontFamily: semiboldFont }]}>
              {ko ? "취향 수정" : "好みを編集"}
            </Text>
          </Pressable>
        </View>

        {identity.role === "traveler" ? (
          <>
            <View style={styles.rowDivider} />
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                router.push("/(onboarding)/preferences?from=account")
              }
              style={styles.menuRow}
            >
              <Text style={[styles.menuRowText, { fontFamily: mediumFont }]}>
                {ko ? "매칭 조건" : "マッチング条件"}
              </Text>
              <CaretRight size={16} color={theme.color.labelAssist} />
            </Pressable>
            <View style={styles.rowDivider} />
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/(onboarding)/trip?from=account")}
              style={styles.menuRow}
            >
              <Text style={[styles.menuRowText, { fontFamily: mediumFont }]}>
                {ko ? "여행 일정" : "旅行日程"}
              </Text>
              <CaretRight size={16} color={theme.color.labelAssist} />
            </Pressable>
          </>
        ) : null}
      </Card>

      <Text style={[styles.groupLabel, { fontFamily: semiboldFont }]}>
        {ko ? "여행 기록" : "旅の記録"}
      </Text>
      <Card style={styles.sectionCard}>
        {history?.scope !== scope ? (
          <View style={styles.errorStack}>
            <LoadingSkeleton
              shape="rows"
              label={
                ko
                  ? "여행 기록을 불러오는 중입니다"
                  : "旅の記録を読み込んでいます"
              }
            />
            <Text style={[styles.statusHint, { fontFamily: regularFont }]}>
              {ko
                ? "여행 기록을 불러오는 중입니다"
                : "旅の記録を読み込んでいます"}
            </Text>
          </View>
        ) : history.error ? (
          <View style={styles.errorStack}>
            <ErrorNotice language={identity.language}>
              {ko
                ? "여행 기록을 불러오지 못했습니다"
                : "旅の記録を読み込めませんでした"}
            </ErrorNotice>
            <Button
              secondary
              size="small"
              language={identity.language}
              label={ko ? "다시 시도" : "再試行"}
              onPress={() => setRevision((x) => x + 1)}
            />
          </View>
        ) : !history.rows.length ? (
          <View style={styles.emptyBox}>
            <View style={styles.emptyIconCircle}>
              <MapTrifold size={22} color={theme.color.brandDeep} />
            </View>
            <Label
              center
              tone="desc"
              variant="desc"
              language={identity.language}
            >
              {ko ? "아직 여행 기록이 없습니다" : "まだ旅の記録がありません"}
            </Label>
          </View>
        ) : (
          <View style={styles.historyList}>
            {history.rows.map((item) => {
              const title = item.courseMap
                ? typeof item.courseMap.title === "string"
                  ? item.courseMap.title
                  : displayText(item.courseMap.title, identity.language)
                : ko
                  ? "지도 정보 없음"
                  : "マップ情報なし";
              const endedAlbum =
                item.status === "COMPLETED" || item.status === "EXPIRED";
              const stateText =
                item.status === "COMPLETED"
                  ? ko
                    ? "여행 완료"
                    : "旅行完了"
                  : item.status === "EXPIRED"
                    ? ko
                      ? "기간 종료"
                      : "期間終了"
                    : item.status === "ON_COURSE" || item.status === "MATCHED"
                      ? ko
                        ? "진행 중"
                        : "進行中"
                      : ko
                        ? "매칭 종료"
                        : "マッチング終了";
              const isCompleted = item.status === "COMPLETED";
              const isActive =
                item.status === "ON_COURSE" || item.status === "MATCHED";

              return (
                <View key={item.matchId} style={styles.historyCard}>
                  <View style={styles.historyHeader}>
                    <Text
                      numberOfLines={1}
                      ellipsizeMode="tail"
                      style={[
                        styles.historyTitle,
                        { fontFamily: semiboldFont },
                      ]}
                    >
                      {title}
                    </Text>
                    <View
                      style={[
                        styles.statusBadge,
                        isCompleted
                          ? styles.statusBadgePositive
                          : isActive
                            ? styles.statusBadgeBrand
                            : styles.statusBadgeNeutral,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          {
                            fontFamily: boldFont,
                            color: isCompleted
                              ? theme.color.positive
                              : isActive
                                ? theme.color.brandInk2
                                : theme.color.labelAlt,
                          },
                        ]}
                      >
                        {stateText}
                      </Text>
                    </View>
                  </View>
                  {endedAlbum || item.status === "ON_COURSE" ? (
                    <View style={styles.historyActions}>
                      {endedAlbum ? (
                        <View style={styles.flexAction}>
                          <Button
                            secondary
                            tone="weak"
                            size="small"
                            language={identity.language}
                            label={ko ? "앨범 보기" : "アルバムを見る"}
                            onPress={() =>
                              router.push({
                                pathname: "/matches/[matchId]/album",
                                params: { matchId: String(item.matchId) },
                              })
                            }
                          />
                        </View>
                      ) : null}
                      {item.status === "ON_COURSE" || endedAlbum ? (
                        <View style={styles.flexAction}>
                          <Button
                            secondary
                            size="small"
                            language={identity.language}
                            label={ko ? "방문 기록" : "訪問の記録"}
                            onPress={() =>
                              router.push({
                                pathname: "/matches/[matchId]/visits",
                                params: { matchId: String(item.matchId) },
                              })
                            }
                          />
                        </View>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        )}
      </Card>

      <Text style={[styles.groupLabel, { fontFamily: semiboldFont }]}>
        {ko ? "메뉴 및 계정" : "メニューとアカウント"}
      </Text>
      <Card style={styles.listCard}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.navigate("/chats")}
          style={styles.menuRow}
        >
          <ChatCircle size={20} color={theme.color.grey500} />
          <Text style={[styles.menuRowText, { fontFamily: mediumFont }]}>
            {ko ? "대화 목록" : "チャット一覧"}
          </Text>
          <CaretRight size={16} color={theme.color.labelAssist} />
        </Pressable>
        <View style={styles.rowDivider} />
        <Pressable
          accessibilityRole="button"
          onPress={() => router.navigate("/account")}
          style={styles.menuRow}
        >
          <Gear size={20} color={theme.color.grey500} />
          <Text style={[styles.menuRowText, { fontFamily: mediumFont }]}>
            {ko ? "프로필 및 계정 관리" : "プロフィールとアカウント管理"}
          </Text>
          <CaretRight size={16} color={theme.color.labelAssist} />
        </Pressable>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    backgroundColor: theme.color.pageG,
    paddingHorizontal: theme.space.screen,
    paddingTop: theme.space.md,
    paddingBottom: theme.space.xxl,
    gap: 0,
  },
  pageTitle: {
    fontSize: theme.typography.tabTitle.fontSize,
    lineHeight: theme.typography.tabTitle.lineHeight,
    letterSpacing: theme.typography.tabTitle.letterSpacing,
    color: theme.color.labelNormal,
    marginLeft: 4,
    marginBottom: 14,
  },
  sectionCard: {
    padding: theme.space.screen,
    borderRadius: theme.radius.card,
    gap: 14,
  },
  listCard: {
    paddingVertical: 4,
    paddingHorizontal: theme.space.screen,
    borderRadius: theme.radius.card,
  },
  profileTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: theme.radius.pill,
  },
  avatarFallback: {
    width: 56,
    height: 56,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.brandTint,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontSize: 22,
    lineHeight: 28,
    color: theme.color.brandDeep,
  },
  profileInfoCol: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  profileNameRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  profileName: {
    fontSize: 19,
    lineHeight: 26,
    color: theme.color.labelNormal,
    flexShrink: 1,
  },
  verifyPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: theme.radius.xs,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  verifyPillDone: {
    backgroundColor: theme.color.positiveWeak,
  },
  verifyPillPending: {
    backgroundColor: theme.color.grey100,
  },
  verifyPillText: {
    fontSize: 12,
    lineHeight: 18,
    includeFontPadding: false,
  },
  metaLine: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  genderBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  metaText: {
    fontSize: 13,
    lineHeight: 18,
    color: theme.color.labelDesc,
    includeFontPadding: false,
  },
  statusHint: {
    fontSize: 13,
    lineHeight: 18,
    color: theme.color.labelDesc,
  },
  statusHintCenter: {
    fontSize: 13,
    lineHeight: 18,
    color: theme.color.labelDesc,
    textAlign: "center",
  },
  errorStack: {
    gap: theme.space.sm,
  },
  statsSection: {
    marginTop: 4,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.color.grey100,
  },
  statsLoadingWrap: {
    gap: theme.space.sm,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  statCol: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
    gap: 2,
  },
  statColDivider: {
    borderLeftWidth: 1,
    borderLeftColor: theme.color.dividerStat,
  },
  statValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
  },
  statValue: {
    fontSize: 22,
    lineHeight: 28,
    color: theme.color.labelNormal,
  },
  statUnit: {
    fontSize: 12,
    lineHeight: 16,
    color: theme.color.labelDesc,
  },
  statLabel: {
    fontSize: 12,
    lineHeight: 18,
    color: theme.color.labelDesc,
    textAlign: "center",
  },
  statSkeletonVal: {
    width: 34,
    height: 24,
    borderRadius: 6,
    backgroundColor: theme.color.skeleton,
  },
  statSkeletonLbl: {
    width: 52,
    height: 14,
    borderRadius: 6,
    backgroundColor: theme.color.skeleton,
  },
  groupLabel: {
    fontSize: 13,
    lineHeight: 18,
    color: theme.color.labelAlt,
    marginTop: 22,
    marginBottom: 8,
    marginLeft: 4,
  },
  prefRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 14,
  },
  prefTextCol: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  prefTitle: {
    fontSize: 16,
    lineHeight: 22,
    color: theme.color.labelNormal,
  },
  prefDesc: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.color.labelDesc,
  },
  inlineEditBtn: {
    minHeight: 36,
    borderRadius: 10,
    backgroundColor: theme.color.grey100,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  inlineEditText: {
    fontSize: 13,
    lineHeight: 18,
    color: theme.color.labelNeutral,
  },
  rowDivider: {
    height: 1,
    backgroundColor: theme.color.grey100,
  },
  menuRow: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
  },
  menuRowText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    color: theme.color.labelNeutral,
  },
  emptyBox: {
    backgroundColor: theme.color.fillG,
    borderRadius: theme.radius.cardSub,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: "center",
    gap: 10,
  },
  emptyIconCircle: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.brandTint,
    alignItems: "center",
    justifyContent: "center",
  },
  historyList: {
    gap: 10,
  },
  historyCard: {
    backgroundColor: theme.color.fillG,
    borderRadius: theme.radius.cardSub,
    padding: 14,
    gap: 10,
  },
  historyHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  historyTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    lineHeight: 21,
    color: theme.color.labelNormal,
  },
  statusBadge: {
    borderRadius: theme.radius.xs,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexShrink: 0,
  },
  statusBadgePositive: {
    backgroundColor: theme.color.positiveWeak,
  },
  statusBadgeBrand: {
    backgroundColor: theme.color.brandWeak,
  },
  statusBadgeNeutral: {
    backgroundColor: theme.color.grey100,
  },
  statusBadgeText: {
    fontSize: 12,
    lineHeight: 16,
    includeFontPadding: false,
  },
  historyActions: {
    flexDirection: "row",
    gap: 8,
  },
  flexAction: {
    flex: 1,
  },
});
