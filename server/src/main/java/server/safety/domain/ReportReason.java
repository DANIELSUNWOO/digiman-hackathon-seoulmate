package server.safety.domain;

/** REPORT-01·BLOCK-01 사유 (API v1.7 C-06, 6개). OTHER 는 detail 필수 */
public enum ReportReason { ABUSIVE, CONTACT_REQUEST, FORCED_MEETING, SEXUAL, SPAM, OTHER }
