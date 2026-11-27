package server.match.domain;

/**
 * MATCH-07 매칭 끊기 사유 (API v1.7, 선택 사항). 사유는 상대에게 보여 주지 않는다.
 *  FEW_SPOTS     行きたいスポットが少なかった
 *  PLAN_CHANGED  旅行の予定が変わった
 *  NOT_A_MATCH   メイトと合わなかった・話が合わなかった
 *  NO_REPLY      返信が来ない · 답장이 오지 않아요
 *  UNCOMFORTABLE 대화가 불편했어요
 *  CANNOT_HELP   더 이상 도와주기 어려워요
 *  OTHER         その他 · 기타
 */
public enum CancelReason { FEW_SPOTS, PLAN_CHANGED, NOT_A_MATCH, NO_REPLY, UNCOMFORTABLE, CANNOT_HELP, OTHER }
