// C-01 알림 목록. 홈의 진입 버튼과 안 읽음 배지는 Q-16에서 붙인다.
import type { ReactElement } from "react";
import { ActivityIndicator } from "react-native";
import { theme } from "../../theme";
import { Button, Label, Screen } from "../../ui";
import { notificationsApi, type NotificationsApi } from "./api";
import { errorText } from "./errors";
import { mayHaveUnread } from "./model";
import { NotificationRow } from "./NotificationRow";
import { strings } from "./strings";
import type {
  NotificationItem,
  NotificationLang,
  NotificationPage,
} from "./types";
import {
  useNotificationFeed,
  type NotificationFeed,
} from "./useNotificationFeed";

export interface NotificationsScreenProps {
  api?: NotificationsApi;
  lang: NotificationLang;
  onOpen: (item: NotificationItem) => void;
  onBack: () => void;
}

interface FeedListProps {
  feed: NotificationFeed;
  page: NotificationPage;
  lang: NotificationLang;
  onOpen: (item: NotificationItem) => void;
}

export function NotificationsScreen({
  api = notificationsApi,
  lang,
  onOpen,
  onBack,
}: NotificationsScreenProps): ReactElement {
  const feed = useNotificationFeed(api);
  const { state } = feed;
  const text = strings[lang];

  return (
    <Screen>
      <Button label={text.back} language={lang} secondary onPress={onBack} />
      <Label title language={lang}>
        {text.title}
      </Label>
      {state.status === "loading" && (
        <ActivityIndicator
          accessibilityLabel={text.loading}
          color={theme.color.mainInk}
        />
      )}
      {state.status === "error" && (
        <>
          <Label center language={lang}>
            {errorText(state.error, text, text.errorLoad)}
          </Label>
          <Button
            label={text.retry}
            language={lang}
            secondary
            onPress={feed.retry}
          />
        </>
      )}
      {state.status === "ready" && (
        <FeedList feed={feed} page={state.page} lang={lang} onOpen={onOpen} />
      )}
    </Screen>
  );
}

function FeedList({ feed, page, lang, onOpen }: FeedListProps): ReactElement {
  const text = strings[lang];
  const open = (item: NotificationItem): void => {
    feed.markRead(item);
    onOpen(item);
  };
  return (
    <>
      {feed.actionError !== null && (
        <Label center language={lang}>
          {errorText(feed.actionError, text, text.errorAction)}
        </Label>
      )}
      {mayHaveUnread(page) && (
        <Button
          label={text.readAll}
          language={lang}
          secondary
          disabled={feed.markingAll}
          onPress={feed.markAllRead}
        />
      )}
      {page.items.length === 0 && (
        <Label center language={lang}>
          {text.empty}
        </Label>
      )}
      {page.items.map((item) => (
        <NotificationRow
          key={item.notificationId}
          item={item}
          lang={lang}
          onPress={open}
        />
      ))}
      {page.nextCursor !== null && (
        <Button
          label={feed.loadingMore ? text.loading : text.more}
          language={lang}
          secondary
          disabled={feed.loadingMore}
          onPress={feed.loadMore}
        />
      )}
    </>
  );
}
