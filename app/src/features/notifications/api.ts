import { apiRequest } from "../../api";
import type { NotificationPage } from "./types";

export interface NotificationsApi {
  /** NOTI-01. cursor가 null이면 첫 페이지 */
  list: (cursor: number | null) => Promise<NotificationPage>;
  /** NOTI-03 */
  markRead: (notificationId: number) => Promise<void>;
  /** NOTI-04 */
  markAllRead: () => Promise<void>;
}

const PAGE_SIZE = 20;

export const notificationsApi: NotificationsApi = {
  list: (cursor) =>
    apiRequest<NotificationPage>(
      `notifications?size=${PAGE_SIZE}${cursor === null ? "" : `&cursor=${cursor}`}`,
    ),
  markRead: (notificationId) =>
    apiRequest<void>(`notifications/${notificationId}/read`, {
      method: "PATCH",
    }),
  markAllRead: () =>
    apiRequest<void>("notifications/read-all", { method: "PATCH" }),
};
