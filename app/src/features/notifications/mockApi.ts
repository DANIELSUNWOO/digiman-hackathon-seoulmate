// 개발 전용 목. 서버의 알림 종류 전부와 모르는 종류 하나를 만든다.
import { ApiError } from "../../api";
import type { NotificationsApi } from "./api";
import type { NotificationItem, NotificationLang } from "./types";

export type MockScenario = "data" | "empty" | "error" | "actionError";

const SAMPLES: { type: string; ko: string; ja: string }[] = [
  {
    type: "VISIT",
    ko: "はるか님이 「카페 어니언 성수」을(를) 방문했어요.",
    ja: "ソウルさんが「카페 어니언 성수」を訪問しました。",
  },
  {
    type: "MATCHED",
    ko: "ゆうと님과 매칭되었어요. 여행자가 지도를 살펴보고 있어요.",
    ja: "ソウルさんとマッチングしました。",
  },
  {
    type: "REACTION",
    ko: "はるか님이 방문 기록에 반응을 남겼어요.",
    ja: "ソウルさんが訪問記録にリアクションしました。",
  },
  {
    type: "CHAT_REQUEST",
    ko: "はるか님과 채팅을 열 수 있어요. 수락해 주세요.",
    ja: "ソウルさんとチャットを開けます。承認してください。",
  },
  {
    type: "CHAT_READY",
    ko: "はるか님과 채팅을 열 수 있어요.",
    ja: "ソウルさんとチャットを開けます。",
  },
  {
    type: "CHAT_OPEN",
    ko: "はるか님과의 채팅이 열렸어요.",
    ja: "ソウルさんとのチャットが開きました。",
  },
  {
    type: "CANCELED",
    ko: "ゆうと님과의 매칭이 종료되었어요.",
    ja: "ソウルさんとのマッチングが終了しました。",
  },
  {
    type: "EXPIRED",
    ko: "여행 기간이 끝나 みお님과의 매칭이 종료되었어요.",
    ja: "旅行期間が終了し、ソウルさんとのマッチングが終了しました。",
  },
  {
    type: "COMPLETED",
    ko: "そら님이 여행을 완료했어요. 앨범을 확인해 보세요.",
    ja: "ソウルさんとの旅が完了しました。アルバムを見てみましょう。",
  },
  {
    type: "SOMETHING_NEW",
    ko: "앱이 아직 모르는 종류의 알림이에요.",
    ja: "アプリがまだ知らない種類のお知らせです。",
  },
];

const TOTAL = 24;
const PAGE_SIZE = 20;

function mockItems(lang: NotificationLang): NotificationItem[] {
  return Array.from({ length: TOTAL }, (_, index) => {
    const sample = SAMPLES[index % SAMPLES.length];
    return {
      notificationId: TOTAL - index,
      type: sample.type,
      matchId: 101,
      message: sample[lang],
      isRead: index >= 3,
      createdAt: "2026-11-29T14:03:00+09:00",
    };
  });
}

function networkError(): ApiError {
  return new ApiError("NETWORK", "Network request failed");
}

export function createMockNotificationsApi(
  scenario: MockScenario,
  lang: NotificationLang,
): NotificationsApi {
  let items = scenario === "empty" ? [] : mockItems(lang);
  const failAction = (): void => {
    if (scenario === "actionError") throw networkError();
  };
  return {
    list: async (cursor) => {
      if (scenario === "error") throw networkError();
      const rest = items.filter(
        (item) => cursor === null || item.notificationId < cursor,
      );
      const page = rest.slice(0, PAGE_SIZE);
      return {
        items: page,
        nextCursor:
          rest.length > page.length
            ? page[page.length - 1].notificationId
            : null,
      };
    },
    unreadCount: async () => {
      if (scenario === "error") throw networkError();
      return items.filter((item) => !item.isRead).length;
    },
    markRead: async (notificationId) => {
      failAction();
      items = items.map((item) =>
        item.notificationId === notificationId
          ? { ...item, isRead: true }
          : item,
      );
    },
    markAllRead: async () => {
      failAction();
      items = items.map((item) => ({ ...item, isRead: true }));
    },
  };
}
