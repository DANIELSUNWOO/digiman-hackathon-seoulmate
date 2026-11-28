import React, { type ComponentRef, useEffect, useRef } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowClockwise,
  Check,
  Checks,
  LockSimple,
  MapTrifold,
  PaperPlaneRight,
  Translate,
  WarningCircle,
} from "phosphor-react-native";
import { LoadingSkeleton } from "../../../loading";
import { theme } from "../../../theme";
import {
  AppBar,
  Button,
  ErrorNotice,
  Input,
  Label,
  Notice,
  useFontFamily,
  useReducedMotion,
} from "../../../ui";
import { TranslatedText } from "../../translation/TranslatedText";
import type { ChatMessageView, ChatRoomViewProps } from "../viewTypes";
import { ChatIllustration } from "./ChatIllustration";
import { ChatAvatar, ChatProgressBar, ChatStatusBadge } from "./ChatPrimitives";
import {
  formatMessageDateHeading,
  formatMessageDateKey,
  formatMessageTime,
  getProgressMetrics,
  getTrimmedLength,
  resolveMapTitle,
  resolvePartnerName,
} from "./format";
import { CHAT_MAX_MESSAGE_LENGTH, chatStrings } from "./strings";

function MessageBubble({
  message,
  language,
  partnerName,
  partnerAvatarUri,
  onReport,
}: {
  message: ChatMessageView;
  language: ChatRoomViewProps["language"];
  partnerName: string;
  partnerAvatarUri: string | null;
  onReport?: () => void;
}) {
  const strings = chatStrings[language];
  const captionFont = useFontFamily("regular", language);
  const readFont = useFontFamily("semibold", language);
  const timeText = formatMessageTime(message.createdAt);

  if (message.mine) {
    const isRead = Boolean(message.readAt);
    return (
      <View style={s.mineRow}>
        <View style={s.mineMeta}>
          <View style={s.readRow}>
            {isRead ? (
              <Checks size={12} color={theme.color.brandDeep} />
            ) : (
              <Check size={12} color={theme.color.labelDesc} />
            )}
            <Text
              style={[
                s.metaText,
                {
                  fontFamily: isRead ? readFont : captionFont,
                  color: isRead ? theme.color.brandDeep : theme.color.labelDesc,
                },
              ]}
            >
              {isRead ? strings.read : strings.sent}
            </Text>
          </View>
          {timeText ? (
            <Text style={[s.metaText, { fontFamily: captionFont }]}>
              {timeText}
            </Text>
          ) : null}
        </View>
        <View style={s.mineBubble}>
          <Label language={message.content.sourceLang} variant="body2">
            {message.content.original}
          </Label>
        </View>
      </View>
    );
  }

  const missingTranslation =
    message.content.sourceLang !== language &&
    !message.content.translated?.trim();

  return (
    <View style={s.partnerRow}>
      <ChatAvatar
        uri={partnerAvatarUri}
        name={partnerName}
        size={32}
        language={language}
      />
      <View style={s.partnerBubbleCol}>
        <View style={s.partnerBubble}>
          <TranslatedText value={message.content} viewerLang={language} />
          {missingTranslation ? (
            <Text style={[s.originalOnlyCaption, { fontFamily: captionFont }]}>
              {strings.originalOnlyCaption}
            </Text>
          ) : null}
        </View>
        {timeText ? (
          <Text style={[s.partnerTime, { fontFamily: captionFont }]}>
            {timeText}
          </Text>
        ) : null}
        {onReport ? (
          <Pressable accessibilityRole="button" onPress={onReport}>
            <Label variant="caption" language={language}>
              {language === "ko" ? "이 메시지 신고" : "このメッセージを通報"}
            </Label>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function ChatRoomView({
  language,
  state,
  match,
  messages,
  refreshing,
  loadingMore,
  error,
  notice,
  draft,
  sending,
  sendUncertain,
  onBack,
  onRefresh,
  onChangeDraft,
  onSend,
  onRequestOpenChat,
  onSafetyMenu,
  onReportMessage,
}: ChatRoomViewProps) {
  const strings = chatStrings[language];
  const reducedMotion = useReducedMotion();
  const mapFont = useFontFamily("medium", language);
  const captionFont = useFontFamily("regular", language);
  const scrollRef = useRef<ComponentRef<typeof ScrollView> | null>(null);
  const prevCountRef = useRef(0);

  const partnerName = match
    ? resolvePartnerName(match.partner, language)
    : strings.roomTitleFallback;
  const mapTitle = match ? resolveMapTitle(match.map, language) : null;
  const progressMetrics = match ? getProgressMetrics(match.progress) : null;

  const trimmedLen = getTrimmedLength(draft);
  const overLimit = trimmedLen > CHAT_MAX_MESSAGE_LENGTH;
  const canCompose = Boolean(match?.canMessage);
  const sendDisabled =
    !canCompose || sending || sendUncertain || trimmedLen === 0 || overLimit;

  const isInitialLoading =
    state === "loading" && messages.length === 0 && match === null;
  const isFullError =
    (state === "error" || Boolean(error)) &&
    messages.length === 0 &&
    match === null &&
    !isInitialLoading;
  const isRefreshingWithContent =
    (refreshing || state === "loading") &&
    (messages.length > 0 || match !== null);

  useEffect(() => {
    if (messages.length > prevCountRef.current) {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollToEnd?.({ animated: !reducedMotion });
      });
    }
    prevCountRef.current = messages.length;
  }, [messages.length, reducedMotion]);

  function handlePressSend() {
    if (sendDisabled) return;
    onSend();
  }

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
    <SafeAreaView style={s.screen} edges={["top", "bottom", "left", "right"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={s.flex}
      >
        <View style={s.headerWrap}>
          <AppBar
            title={partnerName}
            onBack={onBack}
            language={language}
            right={
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                {refreshButton}
                {onSafetyMenu ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={
                      language === "ko" ? "안전 메뉴" : "安全メニュー"
                    }
                    onPress={onSafetyMenu}
                    style={{ padding: 12 }}
                  >
                    <Label language={language}>⋯</Label>
                  </Pressable>
                ) : null}
              </View>
            }
          />
          {match ? (
            <View style={s.contextBar}>
              <ChatAvatar
                uri={match.partner.profileImageUrl}
                name={partnerName}
                size={26}
                locked={match.status === "LOCKED"}
                language={language}
              />
              <View style={s.contextMapWrap}>
                <MapTrifold size={13} color={theme.color.iconMuted} />
                <Text
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  style={[s.contextMapText, { fontFamily: mapFont }]}
                >
                  {mapTitle}
                </Text>
                {progressMetrics ? (
                  <Text style={[s.contextCount, { fontFamily: captionFont }]}>
                    {progressMetrics.visited}/{progressMetrics.total}
                  </Text>
                ) : null}
              </View>
              <ChatStatusBadge
                status={match.status}
                canOpen={match.canOpen}
                language={language}
              />
            </View>
          ) : null}
        </View>

        <View style={s.statusStrip}>
          {isRefreshingWithContent ? (
            <View style={s.statusBanner} accessibilityLiveRegion="polite">
              <ActivityIndicator size="small" color={theme.color.brandDeep} />
              <Label variant="caption" tone="brand" language={language}>
                {strings.roomRefreshing}
              </Label>
            </View>
          ) : null}

          {loadingMore ? (
            <View style={s.statusBanner} accessibilityLiveRegion="polite">
              <ActivityIndicator size="small" color={theme.color.brandDeep} />
              <Label variant="caption" tone="brand" language={language}>
                {strings.roomLoadingMore}
              </Label>
            </View>
          ) : null}

          {notice ? <Notice language={language}>{notice}</Notice> : null}

          {error && (messages.length > 0 || match !== null) ? (
            <View style={s.inlineFeedback}>
              <ErrorNotice language={language}>{error}</ErrorNotice>
              <Button
                label={strings.retry}
                secondary
                language={language}
                onPress={onRefresh}
              />
            </View>
          ) : null}

          {sendUncertain ? (
            <View style={s.inlineFeedback}>
              <ErrorNotice language={language}>
                {`${strings.sendUncertainTitle}. ${strings.sendUncertainBody}`}
              </ErrorNotice>
              <Button
                label={strings.checkHistory}
                secondary
                loading={refreshing}
                disabled={refreshing}
                language={language}
                onPress={onRefresh}
              />
              <Button
                label={strings.retryConfirm}
                language={language}
                secondary
                disabled={
                  !canCompose || sending || trimmedLen === 0 || overLimit
                }
                onPress={onSend}
              />
            </View>
          ) : null}
        </View>

        <View style={s.flex}>
          {isInitialLoading ? (
            <View style={s.loadingWrap}>
              <LoadingSkeleton shape="rows" label={strings.roomLoading} />
            </View>
          ) : isFullError ? (
            <View style={s.centerState}>
              <View style={s.errorIconWrap}>
                <WarningCircle size={28} color={theme.color.dangerPress} />
              </View>
              <Label variant="body1" weight="bold" center language={language}>
                {strings.roomErrorTitle}
              </Label>
              <Label variant="desc" tone="desc" center language={language}>
                {error ?? strings.roomErrorFallback}
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
          ) : messages.length > 0 ? (
            <ScrollView
              ref={scrollRef}
              style={s.flex}
              contentContainerStyle={s.messageList}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={
                Platform.OS === "ios" ? "interactive" : "on-drag"
              }
            >
              <Notice
                language={language}
                icon={<Translate size={18} color={theme.color.brandDeep} />}
              >
                {strings.autoTranslateNotice}
              </Notice>
              {messages.map((msg, idx) => {
                const currentDateKey = formatMessageDateKey(msg.createdAt);
                const prevDateKey =
                  idx > 0
                    ? formatMessageDateKey(messages[idx - 1].createdAt)
                    : "";
                const showDate =
                  Boolean(currentDateKey) && currentDateKey !== prevDateKey;
                const dateLabel = showDate
                  ? formatMessageDateHeading(msg.createdAt, language)
                  : "";

                return (
                  <React.Fragment key={String(msg.messageId)}>
                    {dateLabel ? (
                      <View style={s.dateDivider}>
                        <Text style={[s.dateText, { fontFamily: captionFont }]}>
                          {dateLabel}
                        </Text>
                      </View>
                    ) : null}
                    <MessageBubble
                      message={msg}
                      language={language}
                      partnerName={partnerName}
                      partnerAvatarUri={match?.partner.profileImageUrl ?? null}
                      onReport={
                        !msg.mine && onReportMessage
                          ? () => onReportMessage(msg)
                          : undefined
                      }
                    />
                  </React.Fragment>
                );
              })}
            </ScrollView>
          ) : (
            <ScrollView
              style={s.flex}
              contentContainerStyle={s.emptyScrollContent}
              keyboardShouldPersistTaps="handled"
            >
              {match && !match.canMessage ? (
                <View style={s.centerState}>
                  {match.status === "LOCKED" ? (
                    <>
                      <View style={s.lockedCircle}>
                        <LockSimple
                          size={30}
                          color={theme.color.labelAssist}
                          weight="fill"
                        />
                      </View>
                      <Label title center language={language}>
                        {strings.roomLockedTitle}
                      </Label>
                      <Label
                        variant="desc"
                        tone="desc"
                        center
                        language={language}
                      >
                        {progressMetrics &&
                        progressMetrics.remaining !== null &&
                        progressMetrics.remaining > 0
                          ? strings.roomLockedDesc(progressMetrics.remaining)
                          : strings.roomLockedDescNoReq}
                      </Label>
                      {progressMetrics ? (
                        <View style={s.lockedProgressBox}>
                          <ChatProgressBar
                            ratio={progressMetrics.ratio}
                            thresholdRatio={progressMetrics.thresholdRatio}
                            visited={progressMetrics.visited}
                            total={progressMetrics.total}
                            accessibilityLabel={strings.progressSheetLabel(
                              progressMetrics.visited,
                              progressMetrics.total,
                              progressMetrics.required,
                            )}
                          />
                          <Label
                            variant="caption"
                            tone="desc"
                            center
                            language={language}
                          >
                            {strings.progressSheetLabel(
                              progressMetrics.visited,
                              progressMetrics.total,
                              progressMetrics.required,
                            )}
                          </Label>
                        </View>
                      ) : null}
                    </>
                  ) : match.status === "READY" || match.canOpen ? (
                    <>
                      <ChatIllustration size={84} />
                      <Label title center language={language}>
                        {strings.roomReadyTitle}
                      </Label>
                      <Label
                        variant="desc"
                        tone="desc"
                        center
                        language={language}
                      >
                        {match.canOpen
                          ? strings.roomReadyCanOpenDesc
                          : strings.roomReadyWaitingDesc}
                      </Label>
                      {match.canOpen && onRequestOpenChat ? (
                        <Button
                          label={strings.openAction}
                          language={language}
                          secondary
                          onPress={onRequestOpenChat}
                        />
                      ) : null}
                    </>
                  ) : (
                    <>
                      <ChatIllustration size={84} />
                      <Label title center language={language}>
                        {strings.roomEndedClosedTitle}
                      </Label>
                      <Label
                        variant="desc"
                        tone="desc"
                        center
                        language={language}
                      >
                        {strings.roomEndedClosedDesc}
                      </Label>
                    </>
                  )}
                </View>
              ) : (
                <View style={s.emptyWelcomeWrap}>
                  <Notice
                    language={language}
                    icon={<Translate size={18} color={theme.color.brandDeep} />}
                  >
                    {strings.autoTranslateNotice}
                  </Notice>
                  <View style={s.centerState}>
                    <ChatIllustration size={84} />
                    <Label title center language={language}>
                      {strings.roomEmptyTitle}
                    </Label>
                    <Label
                      variant="desc"
                      tone="desc"
                      center
                      language={language}
                    >
                      {strings.roomEmptyDesc}
                    </Label>
                  </View>
                </View>
              )}
            </ScrollView>
          )}
        </View>

        {canCompose ? (
          <View style={s.composerContainer}>
            {match?.status === "ENDED" ? (
              <Label variant="caption" tone="desc" language={language}>
                {strings.endedCanMessageHint}
              </Label>
            ) : null}
            <View style={s.composerRow}>
              <View style={s.inputHolder}>
                <Input
                  multiline
                  language={language}
                  value={draft}
                  onChangeText={onChangeDraft}
                  editable={!sending}
                  error={overLimit}
                  placeholder={strings.inputPlaceholder}
                  accessibilityLabel={strings.inputLabel}
                  style={s.composerInput}
                />
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={sending ? strings.sending : strings.send}
                accessibilityState={{ disabled: sendDisabled, busy: sending }}
                disabled={sendDisabled}
                onPress={handlePressSend}
                style={({ pressed }) => [
                  s.sendBtn,
                  sendDisabled && s.sendBtnDisabled,
                  !sendDisabled && pressed && s.sendBtnPressed,
                ]}
              >
                {sending ? (
                  <ActivityIndicator size="small" color={theme.color.surface} />
                ) : (
                  <PaperPlaneRight
                    size={20}
                    color={theme.color.surface}
                    weight="fill"
                  />
                )}
              </Pressable>
            </View>
            {draft.length > 0 || overLimit || sendUncertain ? (
              <View style={s.composerMetaRow}>
                <View style={s.composerErrorCol}>
                  {overLimit ? (
                    <Text
                      style={[s.composerError, { fontFamily: captionFont }]}
                    >
                      {strings.maxLengthError(CHAT_MAX_MESSAGE_LENGTH)}
                    </Text>
                  ) : sendUncertain ? (
                    <Text
                      style={[s.composerError, { fontFamily: captionFont }]}
                    >
                      {strings.sendUncertainComposerHint}
                    </Text>
                  ) : null}
                </View>
                <Text
                  style={[
                    s.charCount,
                    { fontFamily: captionFont },
                    overLimit && s.charCountError,
                  ]}
                >
                  {`${trimmedLen} / ${CHAT_MAX_MESSAGE_LENGTH}`}
                </Text>
              </View>
            ) : null}
          </View>
        ) : match ? (
          <View style={s.readOnlyFooter}>
            <Label variant="caption" tone="desc" center language={language}>
              {strings.cannotMessageFooter}
            </Label>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.color.surface,
  },
  flex: {
    flex: 1,
  },
  headerWrap: {
    paddingHorizontal: theme.space.screen,
    paddingTop: theme.space.xs,
    paddingBottom: theme.space.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.lineAlt,
    gap: theme.space.xs,
    backgroundColor: theme.color.surface,
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
  contextBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space.sm,
    paddingVertical: 4,
    minWidth: 0,
  },
  contextMapWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minWidth: 0,
  },
  contextMapText: {
    flexShrink: 1,
    minWidth: 0,
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    color: theme.color.labelNeutral,
    includeFontPadding: false,
  },
  contextCount: {
    fontSize: theme.typography.status.fontSize,
    lineHeight: theme.typography.status.lineHeight,
    color: theme.color.labelDesc,
    flexShrink: 0,
    includeFontPadding: false,
  },
  statusStrip: {
    paddingHorizontal: theme.space.screen,
    gap: theme.space.sm,
  },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space.sm,
    marginTop: theme.space.sm,
    paddingHorizontal: theme.space.md,
    paddingVertical: 8,
    borderRadius: theme.radius.input,
    backgroundColor: theme.color.brandTint,
  },
  inlineFeedback: {
    marginTop: theme.space.sm,
    gap: theme.space.sm,
  },
  loadingWrap: {
    padding: theme.space.screen,
  },
  emptyScrollContent: {
    flexGrow: 1,
    padding: theme.space.screen,
  },
  emptyWelcomeWrap: {
    flex: 1,
    gap: theme.space.md,
  },
  centerState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.xl,
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
  lockedCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: theme.color.surface2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.space.xs,
  },
  lockedProgressBox: {
    width: "100%",
    maxWidth: 280,
    marginTop: theme.space.sm,
    gap: theme.space.xs,
  },
  centerAction: {
    width: "100%",
    marginTop: theme.space.md,
  },
  messageList: {
    paddingHorizontal: theme.space.screen,
    paddingTop: theme.space.md,
    paddingBottom: theme.space.lg,
    gap: theme.space.md,
    flexGrow: 1,
  },
  dateDivider: {
    alignSelf: "center",
    paddingHorizontal: theme.space.md,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.surface2,
    marginVertical: theme.space.xs,
  },
  dateText: {
    fontSize: theme.typography.status.fontSize,
    lineHeight: theme.typography.status.lineHeight,
    color: theme.color.labelDesc,
    includeFontPadding: false,
  },
  mineRow: {
    alignSelf: "flex-end",
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "flex-end",
    gap: 6,
    maxWidth: "88%",
  },
  mineMeta: {
    alignItems: "flex-end",
    gap: 2,
    flexShrink: 0,
    paddingBottom: 2,
  },
  readRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  metaText: {
    fontSize: theme.typography.status.fontSize,
    lineHeight: 16,
    color: theme.color.labelDesc,
    includeFontPadding: false,
  },
  mineBubble: {
    backgroundColor: theme.color.brandSoft,
    borderRadius: theme.radius.sheet,
    borderBottomRightRadius: 4,
    paddingHorizontal: 15,
    paddingVertical: 11,
    flexShrink: 1,
    minWidth: 0,
  },
  partnerRow: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.space.sm,
    maxWidth: "92%",
  },
  partnerBubbleCol: {
    flexShrink: 1,
    minWidth: 0,
    alignItems: "flex-start",
    gap: 4,
  },
  partnerBubble: {
    backgroundColor: theme.color.fillNormal,
    borderRadius: theme.radius.sheet,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 15,
    paddingVertical: 11,
    flexShrink: 1,
    minWidth: 0,
    gap: 4,
  },
  originalOnlyCaption: {
    fontSize: theme.typography.status.fontSize,
    lineHeight: 16,
    color: theme.color.labelDesc,
    includeFontPadding: false,
  },
  partnerTime: {
    fontSize: theme.typography.status.fontSize,
    lineHeight: 16,
    color: theme.color.labelDesc,
    paddingHorizontal: 4,
    includeFontPadding: false,
  },
  composerContainer: {
    borderTopWidth: 1,
    borderTopColor: theme.color.lineAlt,
    backgroundColor: theme.color.surface,
    paddingHorizontal: theme.space.lg,
    paddingTop: theme.space.sm,
    paddingBottom: theme.space.sm,
    gap: 6,
  },
  composerRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: theme.space.sm,
  },
  inputHolder: {
    flex: 1,
    minWidth: 0,
  },
  composerInput: {
    maxHeight: 112,
    minHeight: theme.size.touchMin,
    paddingVertical: 10,
  },
  sendBtn: {
    width: theme.size.touchMin,
    height: theme.size.touchMin,
    borderRadius: theme.size.touchMin / 2,
    backgroundColor: theme.color.brand,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  sendBtnPressed: {
    backgroundColor: theme.color.brandPress,
  },
  sendBtnDisabled: {
    backgroundColor: theme.color.brandDis,
  },
  composerMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.space.sm,
    paddingHorizontal: 2,
  },
  composerErrorCol: {
    flex: 1,
    minWidth: 0,
  },
  composerError: {
    fontSize: theme.typography.status.fontSize,
    lineHeight: 16,
    color: theme.color.dangerPress,
    includeFontPadding: false,
  },
  charCount: {
    fontSize: theme.typography.status.fontSize,
    lineHeight: 16,
    color: theme.color.labelDesc,
    flexShrink: 0,
    includeFontPadding: false,
  },
  charCountError: {
    color: theme.color.dangerPress,
  },
  readOnlyFooter: {
    borderTopWidth: 1,
    borderTopColor: theme.color.lineAlt,
    backgroundColor: theme.color.surface2,
    paddingHorizontal: theme.space.screen,
    paddingVertical: 14,
  },
});
