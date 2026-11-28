import type { Href } from "expo-router";
import type { NotificationItem, NotificationPage } from "./types";

/**
 * 알림을 눌렀을 때 이동할 곳 (API 명세 알림 표). 화면이 없는 type은 홈이다.
 */
export function destinationFor({ type, matchId }: NotificationItem): Href {
  const aboutVisit = type === "VISIT" || type === "REACTION";
  if (aboutVisit && matchId !== null) return `/matches/${matchId}/visits`;
  return "/(tabs)";
}

/** 다음 페이지를 붙인다. 그사이 새 알림이 생겨 겹쳐 온 항목은 버린다. */
export function appendPage(
  current: NotificationPage,
  next: NotificationPage,
): NotificationPage {
  const seen = new Set(current.items.map((item) => item.notificationId));
  return {
    items: [
      ...current.items,
      ...next.items.filter((item) => !seen.has(item.notificationId)),
    ],
    nextCursor: next.nextCursor,
    allRead: current.allRead,
  };
}

export function withReadFlag(
  page: NotificationPage,
  notificationId: number,
  isRead: boolean,
): NotificationPage {
  return {
    ...page,
    items: page.items.map((item) =>
      item.notificationId === notificationId ? { ...item, isRead } : item,
    ),
  };
}

export function withAllRead(page: NotificationPage): NotificationPage {
  return {
    ...page,
    items: page.items.map((item) => ({ ...item, isRead: true })),
    allRead: true,
  };
}

/** 아직 불러오지 않은 페이지에도 안 읽은 알림이 있을 수 있다. */
export function mayHaveUnread({
  items,
  nextCursor,
  allRead,
}: NotificationPage): boolean {
  if (items.some((item) => !item.isRead)) return true;
  return !allRead && nextCursor !== null;
}

/** 배지에 쓸 숫자. 안 읽은 알림이 없으면 null */
export function badgeLabel(count: number): string | null {
  if (count <= 0) return null;
  return count > 99 ? "99+" : String(count);
}

/** 서버가 KST(+09:00)로 내려주므로 문자열에서 잘라 쓴다. */
export function timeLabel(createdAt: string): string {
  const month = createdAt.slice(5, 7);
  const day = createdAt.slice(8, 10);
  return `${month}/${day} ${createdAt.slice(11, 16)}`;
}
