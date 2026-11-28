// API 명세 v1.7 NOTI-01. 서버 NotificationService.Item과 같은 모양이다.
export type NotificationLang = "ko" | "ja";

export interface NotificationItem {
  notificationId: number;
  /** 모르는 종류가 올 수 있어 문자열로 받는다. */
  type: string;
  matchId: number | null;
  /** 받는 사람의 언어로 서버가 만든 문장 */
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationPage {
  items: NotificationItem[];
  nextCursor: number | null;
  /** 앱에서만 쓴다. 모두 읽음 뒤에는 아직 안 불러온 알림도 읽음이다. */
  allRead?: boolean;
}
