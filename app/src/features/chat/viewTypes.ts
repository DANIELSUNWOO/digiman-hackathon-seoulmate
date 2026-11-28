/** UI-only contract. Values are prepared by the container; callbacks do not call APIs. */
export type ChatLanguage = "ko" | "ja";
export type ChatLoadState = "loading" | "ready" | "error";
export type ChatDisplayStatus = "LOCKED" | "READY" | "OPEN" | "ENDED";
export type ChatLocalizedText = {
  original: string;
  translated: string | null;
  sourceLang: ChatLanguage;
};
export type ChatPartnerView = {
  userId: string;
  nickname: string | null;
  profileImageUrl: string | null;
};
export type ChatProgressView = {
  visited: number;
  required: number | null;
  total: number;
};
export type ChatMatchView = {
  matchId: number;
  partner: ChatPartnerView;
  map: { mapId: number; title: string | ChatLocalizedText } | null;
  progress: ChatProgressView | null;
  status: ChatDisplayStatus;
  /** Display policy prevents messaging after a match is completed. */
  canMessage: boolean;
  canOpen: boolean;
};
export type ChatMessageView = {
  messageId: number;
  senderId: string;
  mine: boolean;
  content: ChatLocalizedText;
  createdAt: string;
  readAt: string | null;
};
export type ChatListViewProps = {
  mapTabs?: { mapId: number; title: string }[];
  selectedMapId?: number | null;
  onSelectMap?: (mapId: number | null) => void;
  language: ChatLanguage;
  state: ChatLoadState;
  items: ChatMatchView[];
  refreshing: boolean;
  error: string | null;
  notice: string | null;
  onBack: () => void;
  onRefresh: () => void;
  onSelect: (matchId: number) => void;
};
export type ChatRoomViewProps = {
  onSafetyMenu?: () => void;
  onReportMessage?: (message: ChatMessageView) => void;
  onRequestOpenChat?: () => void;
  language: ChatLanguage;
  state: ChatLoadState;
  match: ChatMatchView | null;
  messages: ChatMessageView[];
  refreshing: boolean;
  loadingMore: boolean;
  error: string | null;
  notice: string | null;
  draft: string;
  sending: boolean;
  /** An uncertain send must not be presented as success or automatically retried. */
  sendUncertain: boolean;
  onBack: () => void;
  onRefresh: () => void;
  onChangeDraft: (text: string) => void;
  onSend: () => void;
};
export type ChatOpenSheetProps = {
  onDismissed?: () => void;
  language: ChatLanguage;
  visible: boolean;
  match: ChatMatchView | null;
  opening: boolean;
  openUncertain: boolean;
  error: string | null;
  onOpenChat: () => void;
  onDismiss: () => void;
};
