import React from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  ArrowClockwise,
  CaretRight,
  MapTrifold,
  WarningCircle,
} from "phosphor-react-native";
import { LoadingSkeleton } from "../../../loading";
import { theme } from "../../../theme";
import {
  AppBar,
  Button,
  Chip,
  ErrorNotice,
  Label,
  Notice,
  Screen,
  useFontFamily,
} from "../../../ui";
import type { ChatListViewProps, ChatMatchView } from "../viewTypes";
import { ChatIllustration } from "./ChatIllustration";
import { ChatAvatar, ChatProgressBar, ChatStatusBadge } from "./ChatPrimitives";
import {
  getProgressMetrics,
  resolveMapTitle,
  resolvePartnerName,
} from "./format";
import { chatStrings } from "./strings";

function getRowDetailText(
  item: ChatMatchView,
  language: ChatListViewProps["language"],
): string {
  const strings = chatStrings[language];
  const metrics = getProgressMetrics(item.progress);

  if (item.status === "LOCKED") {
    if (metrics && metrics.remaining !== null && metrics.remaining > 0) {
      return `${strings.progressSummary(metrics.visited, metrics.total)}  ${strings.progressRemaining(metrics.remaining)}`;
    }
    if (metrics) {
      return `${strings.progressSummary(metrics.visited, metrics.total)}  ${strings.listRowHintLockedNoReq}`;
    }
    return strings.listRowHintLockedNoReq;
  }

  if (item.status === "READY" || item.canOpen) {
    const hint = item.canOpen
      ? strings.listRowHintReadyCanOpen
      : strings.listRowHintReadyWaiting;
    if (metrics) {
      return `${strings.progressSummary(metrics.visited, metrics.total)}  ${hint}`;
    }
    return hint;
  }

  if (item.status === "OPEN") {
    if (metrics) {
      return `${strings.progressSummary(metrics.visited, metrics.total)}  ${strings.listRowHintOpen}`;
    }
    return strings.listRowHintOpen;
  }

  const endedHint = item.canMessage
    ? strings.listRowHintEndedCanMessage
    : strings.listRowHintEndedClosed;
  if (metrics) {
    return `${strings.progressSummary(metrics.visited, metrics.total)}  ${endedHint}`;
  }
  return endedHint;
}

function ChatListRow({
  item,
  language,
  isLast,
  onSelect,
}: {
  item: ChatMatchView;
  language: ChatListViewProps["language"];
  isLast: boolean;
  onSelect: (matchId: number) => void;
}) {
  const partnerName = resolvePartnerName(item.partner, language);
  const mapTitle = resolveMapTitle(item.map, language);
  const metrics = getProgressMetrics(item.progress);
  const detailText = getRowDetailText(item, language);
  const nameFont = useFontFamily("semibold", language);
  const mapFont = useFontFamily("medium", language);
  const captionFont = useFontFamily("regular", language);
  const strings = chatStrings[language];
  const progressA11y = metrics
    ? strings.progressSheetLabel(
        metrics.visited,
        metrics.total,
        metrics.required,
      )
    : detailText;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${partnerName}, ${mapTitle}, ${detailText}`}
      onPress={() => onSelect(item.matchId)}
      style={({ pressed }) => [
        s.row,
        !isLast && s.rowDivider,
        pressed && s.rowPressed,
      ]}
    >
      <ChatAvatar
        uri={item.partner.profileImageUrl}
        name={partnerName}
        size={48}
        locked={item.status === "LOCKED"}
        language={language}
      />

      <View style={s.rowBody}>
        <View style={s.rowHeader}>
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={[s.partnerName, { fontFamily: nameFont }]}
          >
            {partnerName}
          </Text>
          <ChatStatusBadge
            status={item.status}
            canOpen={item.canOpen}
            language={language}
          />
        </View>
        <View style={s.mapLine}>
          <MapTrifold size={14} color={theme.color.iconMuted} />
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={[s.mapTitle, { fontFamily: mapFont }]}
          >
            {mapTitle}
          </Text>
        </View>
        {metrics ? (
          <ChatProgressBar
            ratio={metrics.ratio}
            thresholdRatio={metrics.thresholdRatio}
            visited={metrics.visited}
            total={metrics.total}
            accessibilityLabel={progressA11y}
          />
        ) : null}
        <Text
          numberOfLines={2}
          ellipsizeMode="tail"
          style={[s.detailCaption, { fontFamily: captionFont }]}
        >
          {detailText}
        </Text>
      </View>
      <CaretRight size={16} color={theme.color.iconChevron} />
    </Pressable>
  );
}

export function ChatListView({
  language,
  state,
  items,
  refreshing,
  error,
  notice,
  onBack,
  onRefresh,
  onSelect,
  mapTabs,
  selectedMapId,
  onSelectMap,
}: ChatListViewProps) {
  const strings = chatStrings[language];
  const isInitialLoading = state === "loading" && items.length === 0;
  const isRefreshingWithItems =
    (refreshing || state === "loading") && items.length > 0;
  const isEmpty =
    state === "ready" && items.length === 0 && !refreshing && !error;
  const isFullError =
    (state === "error" || Boolean(error)) &&
    items.length === 0 &&
    !isInitialLoading;

  const refreshButton = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={strings.refresh}
      accessibilityState={{
        disabled: refreshing || isInitialLoading,
        busy: refreshing || isInitialLoading,
      }}
      disabled={refreshing || isInitialLoading}
      onPress={onRefresh}
      style={({ pressed }) => [s.refreshBtn, pressed && s.refreshBtnPressed]}
    >
      {refreshing ? (
        <ActivityIndicator size="small" color={theme.color.brandDeep} />
      ) : (
        <ArrowClockwise
          size={theme.size.iconSmall}
          color={theme.color.labelNeutral}
        />
      )}
    </Pressable>
  );

  return (
    <Screen contentStyle={s.screenContent}>
      <AppBar
        title={strings.listTitle}
        onBack={onBack}
        language={language}
        right={refreshButton}
      />
      {mapTabs && onSelectMap ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.mapTabs}
          contentContainerStyle={s.mapTabsContent}
        >
          <Chip
            language={language}
            label={strings.mapAll}
            selected={selectedMapId == null}
            onPress={() => onSelectMap(null)}
          />
          {mapTabs.map((map) => (
            <Chip
              key={map.mapId}
              language={language}
              label={map.title}
              selected={selectedMapId === map.mapId}
              onPress={() => onSelectMap(map.mapId)}
            />
          ))}
        </ScrollView>
      ) : null}

      {notice ? <Notice language={language}>{notice}</Notice> : null}

      {isInitialLoading ? (
        <LoadingSkeleton shape="rows" label={strings.listLoading} />
      ) : null}

      {isFullError ? (
        <View style={s.centerState}>
          <View style={s.errorIconWrap}>
            <WarningCircle size={28} color={theme.color.dangerPress} />
          </View>
          <Label variant="body1" weight="bold" center language={language}>
            {strings.listErrorTitle}
          </Label>
          <Label variant="desc" tone="desc" center language={language}>
            {error ?? strings.listErrorFallback}
          </Label>
          <View style={s.centerAction}>
            <Button
              label={strings.retry}
              secondary
              language={language}
              onPress={onRefresh}
            />
          </View>
        </View>
      ) : null}

      {isEmpty ? (
        <View style={s.centerState}>
          <ChatIllustration size={96} />
          <Label title center language={language}>
            {strings.listEmptyTitle}
          </Label>
          <Label variant="desc" tone="desc" center language={language}>
            {strings.listEmptyDesc}
          </Label>
          <View style={s.centerAction}>
            <Button
              label={strings.refresh}
              secondary
              language={language}
              onPress={onRefresh}
            />
          </View>
        </View>
      ) : null}

      {items.length > 0 ? (
        <View style={s.listSection}>
          {isRefreshingWithItems ? (
            <View style={s.refreshBanner} accessibilityLiveRegion="polite">
              <ActivityIndicator size="small" color={theme.color.brandDeep} />
              <Label variant="caption" tone="brand" language={language}>
                {strings.listRefreshing}
              </Label>
            </View>
          ) : null}

          {error || state === "error" ? (
            <View style={s.inlineErrorWrap}>
              <ErrorNotice language={language}>
                {error ?? strings.listErrorFallback}
              </ErrorNotice>
              <Button
                label={strings.retry}
                secondary
                language={language}
                onPress={onRefresh}
              />
            </View>
          ) : null}

          <View style={s.listContainer}>
            {items.map((item, idx) => (
              <ChatListRow
                key={String(item.matchId)}
                item={item}
                language={language}
                isLast={idx === items.length - 1}
                onSelect={onSelect}
              />
            ))}
          </View>
        </View>
      ) : null}
    </Screen>
  );
}

const s = StyleSheet.create({
  mapTabs: { flexGrow: 0, flexShrink: 0, alignSelf: "stretch" },
  mapTabsContent: { gap: 8, alignItems: "center" },
  screenContent: {
    gap: theme.space.md,
  },
  refreshBtn: {
    width: theme.size.touchMin,
    height: theme.size.touchMin,
    borderRadius: theme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  refreshBtnPressed: {
    backgroundColor: theme.color.surface2,
  },
  centerState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: theme.space.xxl,
    gap: theme.space.sm,
  },
  errorIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.color.dangerSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.space.xs,
  },
  centerAction: {
    width: "100%",
    marginTop: theme.space.md,
  },
  listSection: {
    gap: theme.space.md,
  },
  refreshBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space.sm,
    paddingHorizontal: theme.space.md,
    paddingVertical: 10,
    borderRadius: theme.radius.input,
    backgroundColor: theme.color.brandTint,
  },
  inlineErrorWrap: {
    gap: theme.space.sm,
  },
  listContainer: {
    backgroundColor: theme.color.surface,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space.md,
    paddingVertical: 14,
    paddingHorizontal: theme.space.xs,
    minHeight: 76,
    borderRadius: theme.radius.input,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: theme.color.lineAlt,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  rowPressed: {
    backgroundColor: theme.color.surface2,
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },
  rowHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.space.sm,
  },
  partnerName: {
    flexShrink: 1,
    minWidth: 0,
    fontSize: theme.typography.body2.fontSize,
    lineHeight: theme.typography.body2.lineHeight,
    color: theme.color.labelNormal,
    includeFontPadding: false,
  },
  mapLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minWidth: 0,
  },
  mapTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    color: theme.color.labelNeutral,
    includeFontPadding: false,
  },
  detailCaption: {
    fontSize: theme.typography.status.fontSize,
    lineHeight: theme.typography.status.lineHeight,
    color: theme.color.labelDesc,
    includeFontPadding: false,
  },
});
