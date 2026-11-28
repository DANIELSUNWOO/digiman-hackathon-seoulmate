import type { ChatLanguage } from "../viewTypes";

export const CHAT_MAX_MESSAGE_LENGTH = 500;

export type ChatStringSet = {
  fallbackPartner: string;
  fallbackMap: string;
  refresh: string;
  retry: string;
  close: string;
  later: string;
  statusLocked: string;
  statusReadyCanOpen: string;
  statusReadyWaiting: string;
  statusOpen: string;
  statusEnded: string;
  listTitle: string;
  listLoading: string;
  listRefreshing: string;
  listEmptyTitle: string;
  listEmptyDesc: string;
  listErrorTitle: string;
  listErrorFallback: string;
  listRowHintOpen: string;
  listRowHintReadyCanOpen: string;
  listRowHintReadyWaiting: string;
  listRowHintEndedCanMessage: string;
  listRowHintEndedClosed: string;
  listRowHintLockedNoReq: string;
  progressSummary: (visited: number, total: number) => string;
  progressRemaining: (remaining: number) => string;
  progressRequiredMet: string;
  roomTitleFallback: string;
  roomLoading: string;
  roomRefreshing: string;
  roomLoadingMore: string;
  roomErrorTitle: string;
  roomErrorFallback: string;
  roomEmptyTitle: string;
  roomEmptyDesc: string;
  roomLockedTitle: string;
  roomLockedDescNoReq: string;
  roomLockedDesc: (remaining: number) => string;
  roomReadyTitle: string;
  roomReadyCanOpenDesc: string;
  roomReadyWaitingDesc: string;
  roomEndedClosedTitle: string;
  roomEndedClosedDesc: string;
  autoTranslateNotice: string;
  read: string;
  sent: string;
  originalOnlyCaption: string;
  inputPlaceholder: string;
  inputLabel: string;
  send: string;
  sending: string;
  maxLengthError: (max: number) => string;
  sendUncertainTitle: string;
  sendUncertainBody: string;
  sendUncertainComposerHint: string;
  checkHistory: string;
  retryConfirm: string;
  mapAll: string;
  endedCanMessageHint: string;
  cannotMessageFooter: string;
  openTitleCanOpen: (partnerName: string) => string;
  openDescCanOpen: string;
  openTitleUncertain: string;
  openDescUncertain: string;
  openUncertainBody: string;
  openTitleLocked: string;
  openDescLocked: (remaining: number) => string;
  openDescLockedNoReq: string;
  openTitleAlreadyOpen: string;
  openDescAlreadyOpen: string;
  openTitleEnded: string;
  openDescEnded: string;
  openSafetyNotice: string;
  openAction: string;
  openOpening: string;
  openCheckStatus: string;
  openCheckingStatus: string;
  openDisabledNeedMore: (remaining: number) => string;
  openDisabledLocked: string;
  openDisabledAlreadyOpen: string;
  openDisabledEnded: string;
  openDisabledUnavailable: string;
  progressSheetLabel: (
    visited: number,
    total: number,
    required: number | null,
  ) => string;
};

export const chatStrings: Record<ChatLanguage, ChatStringSet> = {
  ko: {
    fallbackPartner: "대화 상대",
    fallbackMap: "연결된 지도 정보 없음",
    refresh: "새로고침",
    retry: "다시 시도",
    close: "닫기",
    later: "나중에",
    statusLocked: "잠김",
    statusReadyCanOpen: "열기 가능",
    statusReadyWaiting: "열림 대기",
    statusOpen: "대화 중",
    statusEnded: "종료",
    listTitle: "대화 목록",
    listLoading: "대화 목록을 불러오는 중이에요",
    listRefreshing: "대화 목록을 새로 확인하고 있어요",
    listEmptyTitle: "아직 대화가 없어요",
    listEmptyDesc: "매칭된 여행자가 조건을 채우고 대화를 열면 이곳에 표시돼요.",
    listErrorTitle: "대화 목록을 불러오지 못했어요",
    listErrorFallback: "잠시 후 다시 시도해 주세요.",
    listRowHintOpen: "대화방으로 이동해 메시지를 확인하세요.",
    listRowHintReadyCanOpen: "지금 바로 대화를 열 수 있어요.",
    listRowHintReadyWaiting: "상대가 대화를 열면 메시지를 주고받을 수 있어요.",
    listRowHintEndedCanMessage: "종료된 매칭이지만 대화를 계속할 수 있어요.",
    listRowHintEndedClosed: "대화가 종료되었어요.",
    listRowHintLockedNoReq: "인증 조건을 충족하면 대화가 열려요.",
    progressSummary: (visited, total) => `인증 ${visited} / ${total}`,
    progressRemaining: (remaining) => `${remaining}곳 더 인증하면 열려요`,
    progressRequiredMet: "열림 조건을 충족했어요",
    roomTitleFallback: "쪽지 대화",
    roomLoading: "대화 내용을 불러오는 중이에요",
    roomRefreshing: "최신 대화를 확인하고 있어요",
    roomLoadingMore: "이전 메시지를 더 불러오고 있어요",
    roomErrorTitle: "대화를 불러오지 못했어요",
    roomErrorFallback: "네트워크 상태를 확인한 뒤 다시 시도해 주세요.",
    roomEmptyTitle: "첫 인사를 건네 보세요",
    roomEmptyDesc:
      "한국어와 일본어는 자동으로 번역돼요. 가벼운 안부부터 시작해 보세요.",
    roomLockedTitle: "아직 대화가 열리지 않았어요",
    roomLockedDescNoReq: "필요한 방문 인증을 마치면 대화가 열려요.",
    roomLockedDesc: (remaining) =>
      `${remaining}곳 더 방문 인증을 완료하면 채팅이 열려요.`,
    roomReadyTitle: "채팅이 열리기를 기다리고 있어요",
    roomReadyCanOpenDesc:
      "열기 조건을 충족했어요. 채팅을 열면 상대와 바로 대화할 수 있어요.",
    roomReadyWaitingDesc:
      "열기 조건을 충족했어요. 여행자가 채팅을 열면 대화가 바로 시작돼요.",
    roomEndedClosedTitle: "대화가 종료되었어요",
    roomEndedClosedDesc: "이 대화방에서는 더 이상 메시지를 보낼 수 없어요.",
    autoTranslateNotice: "메시지는 자동으로 번역돼요",
    read: "읽음",
    sent: "전송됨",
    originalOnlyCaption: "원문으로 표시됨",
    inputPlaceholder: "메시지를 입력하세요",
    inputLabel: "메시지 입력",
    send: "보내기",
    sending: "전송 중",
    maxLengthError: (max) => `메시지는 최대 ${max}자까지 보낼 수 있어요.`,
    sendUncertainTitle: "전송 결과를 확인하지 못했어요",
    sendUncertainBody:
      "중복 전송을 막기 위해 자동으로 다시 보내지 않았어요. 아래 버튼으로 대화 이력을 먼저 확인해 주세요.",
    sendUncertainComposerHint: "대화 이력을 확인한 뒤 다시 보낼 수 있어요.",
    checkHistory: "대화 이력 확인",
    retryConfirm: "재전송 확인",
    mapAll: "전체",
    endedCanMessageHint:
      "종료된 매칭이지만 현재 대화방에서는 메시지를 보낼 수 있어요.",
    cannotMessageFooter: "현재 상태에서는 메시지를 보낼 수 없어요.",
    openTitleCanOpen: (partnerName) => `${partnerName}님과\n채팅을 열까요?`,
    openDescCanOpen:
      "채팅을 열면 메이트 수락 없이 바로 열리고, 한국어와 일본어는 자동으로 번역돼요.",
    openTitleUncertain: "채팅이 열렸는지\n확인이 필요해요",
    openDescUncertain:
      "결과 확인이 끝날 때까지 새로 열기 요청을 반복하지 마세요.",
    openUncertainBody:
      "요청 결과를 바로 확인하지 못했어요. 새로 열어 중복 요청하지 않고 현재 상태를 먼저 다시 조회합니다.",
    openTitleLocked: "아직 채팅을 열 수 없어요",
    openDescLocked: (remaining) =>
      `${remaining}곳 더 방문 인증하면 메이트와 채팅을 열 수 있어요.`,
    openDescLockedNoReq: "필요한 방문 인증을 완료하면 채팅을 열 수 있어요.",
    openTitleAlreadyOpen: "이미 채팅이 열려 있어요",
    openDescAlreadyOpen: "대화 화면에서 메시지를 바로 확인하고 보낼 수 있어요.",
    openTitleEnded: "지금은 채팅을 열 수 없어요",
    openDescEnded: "진행 상태가 바뀌어 새로 채팅을 열 수 없는 상태예요.",
    openSafetyNotice: "서로를 존중하며 여행 이야기를 나눠 주세요.",
    openAction: "채팅 열기",
    openOpening: "여는 중...",
    openCheckStatus: "열림 상태 확인",
    openCheckingStatus: "상태 확인 중...",
    openDisabledNeedMore: (remaining) => `${remaining}곳 더 인증하면 열려요`,
    openDisabledLocked: "인증 조건이 필요해요",
    openDisabledAlreadyOpen: "이미 채팅이 열려 있어요",
    openDisabledEnded: "지금은 열 수 없어요",
    openDisabledUnavailable: "채팅을 열 수 없어요",
    progressSheetLabel: (visited, total, required) =>
      required === null
        ? `방문 인증 ${visited} / ${total}`
        : `방문 인증 ${visited} / ${total} (열림 기준 ${required}곳)`,
  },
  ja: {
    fallbackPartner: "チャット相手",
    fallbackMap: "地図情報なし",
    refresh: "更新",
    retry: "再試行",
    close: "閉じる",
    later: "あとで",
    statusLocked: "ロック中",
    statusReadyCanOpen: "開始できます",
    statusReadyWaiting: "開始待ち",
    statusOpen: "チャット中",
    statusEnded: "終了",
    listTitle: "チャット一覧",
    listLoading: "チャット一覧を読み込んでいます",
    listRefreshing: "最新のチャット状況を確認しています",
    listEmptyTitle: "まだチャットがありません",
    listEmptyDesc:
      "マッチングした相手が条件を満たしてチャットを開くと、ここに表示されます。",
    listErrorTitle: "チャット一覧を読み込めませんでした",
    listErrorFallback: "時間をおいてもう一度お試しください。",
    listRowHintOpen: "チャット画面を開いてメッセージを確認できます。",
    listRowHintReadyCanOpen: "今すぐチャットを開くことができます。",
    listRowHintReadyWaiting: "チャットが開かれるとやり取りできます。",
    listRowHintEndedCanMessage:
      "マッチングは終了していますが、メッセージは送信できます。",
    listRowHintEndedClosed: "このチャットは終了しました。",
    listRowHintLockedNoReq: "認証条件を満たすとチャットが開きます。",
    progressSummary: (visited, total) => `認証 ${visited} / ${total}`,
    progressRemaining: (remaining) => `あと${remaining}か所で開きます`,
    progressRequiredMet: "チャット開始条件を達成しました",
    roomTitleFallback: "メッセージ",
    roomLoading: "チャット履歴を読み込んでいます",
    roomRefreshing: "最新のメッセージを確認しています",
    roomLoadingMore: "以前のメッセージを読み込んでいます",
    roomErrorTitle: "チャットを読み込めませんでした",
    roomErrorFallback: "通信状況をご確認のうえ、再試行してください。",
    roomEmptyTitle: "最初のあいさつを送りましょう",
    roomEmptyDesc:
      "日本語と韓国語は自動で翻訳されます。気軽にメッセージを送ってみましょう。",
    roomLockedTitle: "まだチャットが開いていません",
    roomLockedDescNoReq: "必要なスポット認証を終えるとチャットが開きます。",
    roomLockedDesc: (remaining) =>
      `あと${remaining}か所スポットを認証するとチャットを開けます。`,
    roomReadyTitle: "チャットの開始待ちです",
    roomReadyCanOpenDesc:
      "開始条件を達成しました。チャットを開くとすぐにメッセージを送れます。",
    roomReadyWaitingDesc:
      "開始条件を達成しました。旅行者がチャットを開くとすぐに始まります。",
    roomEndedClosedTitle: "チャットは終了しました",
    roomEndedClosedDesc: "このルームでは新しいメッセージを送信できません。",
    autoTranslateNotice: "メッセージは自動で翻訳されます",
    read: "既読",
    sent: "送信済み",
    originalOnlyCaption: "原文を表示中",
    inputPlaceholder: "メッセージを入力",
    inputLabel: "メッセージ入力",
    send: "送信",
    sending: "送信中",
    maxLengthError: (max) => `メッセージは${max}文字以内で入力してください。`,
    sendUncertainTitle: "送信結果を確認できませんでした",
    sendUncertainBody:
      "重複送信を防ぐため自動では再送していません。先にチャット履歴を確認してください。",
    sendUncertainComposerHint: "履歴を確認してから再度送信してください。",
    checkHistory: "履歴を確認",
    retryConfirm: "再送を確認",
    mapAll: "すべて",
    endedCanMessageHint:
      "終了したマッチングですが、このルームでは引き続き送信できます。",
    cannotMessageFooter: "現在の状態ではメッセージを送信できません。",
    openTitleCanOpen: (partnerName) =>
      `${partnerName}さんと\nチャットを開きますか？`,
    openDescCanOpen:
      "開くとメイトの承認なしですぐに始まり、韓国語と日本語は自動で翻訳されます。",
    openTitleUncertain: "チャットが開いたか\n確認が必要です",
    openDescUncertain:
      "確認が終わるまで、もう一度開く操作は行わないでください。",
    openUncertainBody:
      "通信結果を確定できませんでした。重複して開かず、まず現在の状態をもう一度確認します。",
    openTitleLocked: "まだチャットを開けません",
    openDescLocked: (remaining) =>
      `あと${remaining}か所認証するとメイトとチャットを開けます。`,
    openDescLockedNoReq: "必要な認証を終えるとチャットを開けます。",
    openTitleAlreadyOpen: "すでにチャットは開いています",
    openDescAlreadyOpen: "チャット画面からメッセージを確認して送信できます。",
    openTitleEnded: "現在はチャットを開けません",
    openDescEnded: "状態が更新されたため、新しくチャットを開けません。",
    openSafetyNotice: "お互いを尊重しながら旅の話を楽しみましょう。",
    openAction: "チャットを開く",
    openOpening: "開始しています...",
    openCheckStatus: "状態を確認",
    openCheckingStatus: "確認中...",
    openDisabledNeedMore: (remaining) =>
      `あと${remaining}か所認証すると開けます`,
    openDisabledLocked: "認証条件を満たしていません",
    openDisabledAlreadyOpen: "すでにチャットは開いています",
    openDisabledEnded: "現在は開けません",
    openDisabledUnavailable: "チャットを開けません",
    progressSheetLabel: (visited, total, required) =>
      required === null
        ? `認証 ${visited} / ${total}`
        : `認証 ${visited} / ${total}（開始条件 ${required}か所）`,
  },
};
