import React, { useEffect, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import {
  ChatCircle,
  ChatCircleDots,
  Check,
  LockSimple,
} from "phosphor-react-native";
import { theme } from "../../../theme";
import { useFontFamily } from "../../../ui";
import type { ChatDisplayStatus, ChatLanguage } from "../viewTypes";
import { partnerInitial } from "./format";
import { chatStrings } from "./strings";

export function ChatAvatar({
  uri,
  name,
  size = 48,
  locked = false,
  language,
}: {
  uri: string | null;
  name: string;
  size?: number;
  locked?: boolean;
  language: ChatLanguage;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const fontFamily = useFontFamily("bold", language);

  useEffect(() => {
    setImageFailed(false);
  }, [uri]);

  const radius = size / 2;
  const cleanUri = uri?.trim() ?? "";

  if (locked) {
    return (
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[
          s.avatarBase,
          s.avatarLocked,
          { width: size, height: size, borderRadius: radius },
        ]}
      >
        <LockSimple
          size={Math.round(size * 0.4)}
          color={theme.color.labelAssist}
          weight="fill"
        />
      </View>
    );
  }

  if (cleanUri && !imageFailed) {
    return (
      <Image
        source={{ uri: cleanUri }}
        onError={() => setImageFailed(true)}
        accessibilityElementsHidden
        style={[
          s.avatarImage,
          { width: size, height: size, borderRadius: radius },
        ]}
      />
    );
  }

  const fontSize = Math.max(12, Math.round(size * 0.38));
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        s.avatarBase,
        s.avatarFallback,
        { width: size, height: size, borderRadius: radius },
      ]}
    >
      <Text
        style={[
          s.avatarInitial,
          { fontFamily, fontSize, lineHeight: fontSize + 4 },
        ]}
      >
        {partnerInitial(name)}
      </Text>
    </View>
  );
}

export function ChatStatusBadge({
  status,
  canOpen,
  language,
}: {
  status: ChatDisplayStatus;
  canOpen: boolean;
  language: ChatLanguage;
}) {
  const strings = chatStrings[language];
  const fontFamily = useFontFamily("semibold", language);

  let label = strings.statusLocked;
  let backgroundColor: string = theme.color.surface2;
  let textColor: string = theme.color.labelAlt;
  let icon: React.ReactNode = (
    <LockSimple size={12} color={theme.color.labelAlt} weight="fill" />
  );

  if (status === "OPEN") {
    label = strings.statusOpen;
    backgroundColor = theme.color.brandTint;
    textColor = theme.color.brandDeep;
    icon = (
      <ChatCircleDots size={12} color={theme.color.brandDeep} weight="fill" />
    );
  } else if (status === "READY") {
    label = canOpen ? strings.statusReadyCanOpen : strings.statusReadyWaiting;
    backgroundColor = theme.color.positiveSoft;
    textColor = theme.color.positive;
    icon = <ChatCircle size={12} color={theme.color.positive} weight="fill" />;
  } else if (status === "ENDED") {
    label = strings.statusEnded;
    backgroundColor = theme.color.surface2;
    textColor = theme.color.labelAlt;
    icon = <Check size={12} color={theme.color.labelAlt} />;
  }

  return (
    <View style={[s.statusBadge, { backgroundColor }]}>
      {icon}
      <Text
        numberOfLines={1}
        style={[s.statusText, { color: textColor, fontFamily }]}
      >
        {label}
      </Text>
    </View>
  );
}

export function ChatProgressBar({
  ratio,
  thresholdRatio,
  visited,
  total,
  accessibilityLabel,
}: {
  ratio: number;
  thresholdRatio: number | null;
  visited: number;
  total: number;
  accessibilityLabel: string;
}) {
  const fillPercent =
    `${Math.round(Math.min(1, Math.max(0, ratio)) * 100)}%` as const;
  const tickPercent =
    thresholdRatio !== null
      ? (`${Math.round(Math.min(1, Math.max(0, thresholdRatio)) * 100)}%` as const)
      : null;

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{
        min: 0,
        max: Math.max(0, total),
        now: Math.max(0, visited),
      }}
      style={s.progressTrack}
    >
      <View style={[s.progressFill, { width: fillPercent }]} />
      {tickPercent !== null ? (
        <View style={[s.progressTick, { left: tickPercent }]} />
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  avatarBase: {
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarLocked: {
    backgroundColor: theme.color.surface2,
  },
  avatarFallback: {
    backgroundColor: theme.color.brandTint,
  },
  avatarImage: {
    backgroundColor: theme.color.surface2,
    flexShrink: 0,
  },
  avatarInitial: {
    color: theme.color.brandDeep,
    includeFontPadding: false,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.status,
    flexShrink: 0,
  },
  statusText: {
    fontSize: theme.typography.status.fontSize,
    lineHeight: theme.typography.status.lineHeight,
    includeFontPadding: false,
  },
  progressTrack: {
    height: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.fillNormal,
    overflow: "hidden",
    position: "relative",
    justifyContent: "center",
  },
  progressFill: {
    height: "100%",
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.accent,
  },
  progressTick: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 2,
    marginLeft: -1,
    backgroundColor: theme.color.labelAssist,
  },
});
