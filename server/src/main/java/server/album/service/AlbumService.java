package server.album.service;

/** [B 소유 · A가 사용] 여행 완료(MATCH-08)·자동 완료 배치에서 호출 */
public interface AlbumService {
    /**
     * 매칭의 앨범을 만들고 id 를 돌려준다. 이미 있으면 기존 id.
     * title·coverUrl 이 null 이면 제목 = 코스 지도 이름, 표지 = 첫 인증 사진.
     * 호출한 쪽 트랜잭션 안에서 실행된다.
     */
    Long createForMatch(Long matchId, String title, String coverUrl);
}
