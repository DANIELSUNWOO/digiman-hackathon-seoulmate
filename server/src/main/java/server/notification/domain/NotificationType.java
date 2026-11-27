package server.notification.domain;

/**
 * 알림 종류와 받는 사람 언어별 문장 틀. {0} = 상대 닉네임, {1} = 스팟 이름 등 추가 값.
 * 문장은 기획·디자인과 맞춰 바꾸면 된다.
 */
public enum NotificationType {
    MATCHED("{0}님이 내 지도를 골랐어요. 함께 여행을 시작해요!", "{0}さんとマッチングしました。"),
    CANCELED("{0}님과의 매칭이 종료되었어요.", "{0}さんとのマッチングが終了しました。"),
    VISIT("{0}님이 「{1}」을(를) 방문했어요.", "{0}さんが「{1}」を訪問しました。"),
    REACTION("{0}님이 방문 기록에 반응을 남겼어요.", "{0}さんが訪問記録にリアクションしました。"),
    CHAT_READY("{0}님과 채팅을 열 수 있어요.", "{0}さんとチャットを開けるようになりました。"),
    CHAT_OPEN("{0}님과의 채팅이 열렸어요.", "{0}さんとのチャットが開きました。"),
    EXPIRED("여행 기간이 끝나 {0}님과의 매칭이 종료되었어요.", "旅行期間が終了し、{0}さんとのマッチングが終了しました。"),
    COMPLETED("{0}님이 여행을 완료했어요. 앨범을 확인해 보세요.", "{0}さんとの旅が完了しました。アルバムを見てみましょう。");

    private final String ko;
    private final String ja;

    NotificationType(String ko, String ja) {
        this.ko = ko;
        this.ja = ja;
    }

    public String format(String language, Object... args) {
        String template = "ja".equals(language) ? ja : ko;
        // MessageFormat 은 작은따옴표를 특수문자로 다뤄서, 단순 치환으로 처리
        String out = template;
        for (int i = 0; i < args.length; i++) {
            out = out.replace("{" + i + "}", String.valueOf(args[i]));
        }
        return out;
    }
}
