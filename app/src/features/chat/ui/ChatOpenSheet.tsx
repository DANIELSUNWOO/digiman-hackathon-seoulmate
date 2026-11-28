import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ChatCircle, MapTrifold, ShieldWarning } from "phosphor-react-native";
import { theme } from "../../../theme";
import {
  BottomSheet,
  Button,
  ErrorNotice,
  Label,
  Notice,
  useFontFamily,
} from "../../../ui";
import type { ChatMatchView, ChatOpenSheetProps } from "../viewTypes";
import { ChatIllustration } from "./ChatIllustration";
import { ChatProgressBar } from "./ChatPrimitives";
import {
  getProgressMetrics,
  resolveMapTitle,
  resolvePartnerName,
} from "./format";
import { chatStrings } from "./strings";

export function ChatOpenSheet({
  language,
  visible,
  match,
  opening,
  openUncertain,
  error,
  onOpenChat,
  onDismiss,
  onDismissed,
}: ChatOpenSheetProps) {
  const strings = chatStrings[language];
  const mapFont = useFontFamily("medium", language);
  const visibleRef = useRef(visible);
  visibleRef.current = visible;
  const [displayMatch, setDisplayMatch] = useState<ChatMatchView | null>(match);

  useEffect(() => {
    if (visible && match) {
      setDisplayMatch(match);
    }
  }, [visible, match]);

  const activeMatch = visible && match ? match : displayMatch;
  const partnerName = activeMatch
    ? resolvePartnerName(activeMatch.partner, language)
    : strings.fallbackPartner;
  const mapTitle = activeMatch
    ? resolveMapTitle(activeMatch.map, language)
    : null;
  const metrics = activeMatch ? getProgressMetrics(activeMatch.progress) : null;

  function handleDismiss() {
    if (opening) return;
    onDismiss();
  }

  function handleDismissed() {
    if (!visibleRef.current) {
      setDisplayMatch(null);
    }
    onDismissed?.();
  }

  function handlePrimaryAction() {
    if (opening) return;
    if (openUncertain || activeMatch?.canOpen) {
      onOpenChat();
    }
  }

  let title = strings.openTitleCanOpen(partnerName);
  let description = strings.openDescCanOpen;
  let primaryLabel = strings.openAction;
  let primaryDisabled = false;
  let showChatIcon = true;

  if (openUncertain) {
    title = strings.openTitleUncertain;
    description = strings.openDescUncertain;
    primaryLabel = opening
      ? strings.openCheckingStatus
      : strings.openCheckStatus;
    primaryDisabled = opening;
    showChatIcon = false;
  } else if (activeMatch?.canOpen) {
    title = strings.openTitleCanOpen(partnerName);
    description = strings.openDescCanOpen;
    primaryLabel = opening ? strings.openOpening : strings.openAction;
    primaryDisabled = opening;
    showChatIcon = true;
  } else if (activeMatch?.status === "LOCKED") {
    title = strings.openTitleLocked;
    if (metrics && metrics.remaining !== null && metrics.remaining > 0) {
      description = strings.openDescLocked(metrics.remaining);
      primaryLabel = strings.openDisabledNeedMore(metrics.remaining);
    } else {
      description = strings.openDescLockedNoReq;
      primaryLabel = strings.openDisabledLocked;
    }
    primaryDisabled = true;
    showChatIcon = false;
  } else if (activeMatch?.status === "OPEN") {
    title = strings.openTitleAlreadyOpen;
    description = strings.openDescAlreadyOpen;
    primaryLabel = strings.openDisabledAlreadyOpen;
    primaryDisabled = true;
    showChatIcon = false;
  } else {
    title = strings.openTitleEnded;
    description = strings.openDescEnded;
    primaryLabel =
      activeMatch?.status === "ENDED"
        ? strings.openDisabledEnded
        : strings.openDisabledUnavailable;
    primaryDisabled = true;
    showChatIcon = false;
  }

  const secondaryLabel =
    activeMatch?.canOpen && !openUncertain ? strings.later : strings.close;

  return (
    <BottomSheet
      visible={visible}
      onClose={handleDismiss}
      onDismissed={handleDismissed}
    >
      <View style={s.sheetBody}>
        <View style={s.centerHeader}>
          <ChatIllustration size={76} />
          <Label variant="sheetTitle" center language={language}>
            {title}
          </Label>
          <Label variant="desc" tone="desc" center language={language}>
            {description}
          </Label>
          {mapTitle ? (
            <View style={s.mapTag}>
              <MapTrifold size={14} color={theme.color.brandDeep} />
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={[s.mapTagText, { fontFamily: mapFont }]}
              >
                {mapTitle}
              </Text>
            </View>
          ) : null}
        </View>

        {metrics ? (
          <View style={s.progressCard}>
            <ChatProgressBar
              ratio={metrics.ratio}
              thresholdRatio={metrics.thresholdRatio}
              visited={metrics.visited}
              total={metrics.total}
              accessibilityLabel={strings.progressSheetLabel(
                metrics.visited,
                metrics.total,
                metrics.required,
              )}
            />
            <Label variant="caption" tone="desc" center language={language}>
              {strings.progressSheetLabel(
                metrics.visited,
                metrics.total,
                metrics.required,
              )}
            </Label>
          </View>
        ) : null}

        <Notice
          language={language}
          icon={<ShieldWarning size={20} color={theme.color.brandDeep} />}
        >
          {strings.openSafetyNotice}
        </Notice>

        {openUncertain ? (
          <ErrorNotice language={language}>
            {strings.openUncertainBody}
          </ErrorNotice>
        ) : null}

        {error ? <ErrorNotice language={language}>{error}</ErrorNotice> : null}

        <View style={s.actions}>
          <Button
            label={primaryLabel}
            language={language}
            loading={opening}
            disabled={primaryDisabled}
            icon={
              showChatIcon ? (
                <ChatCircle size={20} color={theme.color.surface} />
              ) : undefined
            }
            onPress={handlePrimaryAction}
          />
          <Button
            label={secondaryLabel}
            language={language}
            secondary
            disabled={opening}
            onPress={handleDismiss}
          />
        </View>
      </View>
    </BottomSheet>
  );
}

const s = StyleSheet.create({
  sheetBody: {
    gap: theme.space.md,
  },
  centerHeader: {
    alignItems: "center",
    gap: theme.space.sm,
  },
  mapTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    maxWidth: "100%",
    paddingHorizontal: theme.space.md,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.brandTint,
  },
  mapTagText: {
    flexShrink: 1,
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    color: theme.color.brandInk,
    includeFontPadding: false,
  },
  progressCard: {
    backgroundColor: theme.color.surface2,
    borderRadius: theme.radius.input,
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.md,
    gap: theme.space.xs,
  },
  actions: {
    gap: theme.space.sm,
    marginTop: theme.space.xs,
  },
});
