package server.album.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import server.album.domain.Album;
import server.album.repository.AlbumRepository;
import server.map.domain.SecretMap;
import server.map.repository.SecretMapRepository;
import server.match.repository.MatchRepository;
import server.visit.domain.SpotVisit;
import server.visit.repository.SpotVisitRepository;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.Comparator;

/** [B 소유] 여행 완료(MATCH-08)·자동 완료 배치에서 앨범 생성. 빈 제목·표지는 기본값(지도 이름·첫 인증 사진)으로 */
@Service
@RequiredArgsConstructor
public class AlbumServiceImpl implements AlbumService {

    private final AlbumRepository albumRepository;
    private final MatchRepository matchRepository;
    private final SecretMapRepository mapRepository;
    private final SpotVisitRepository visitRepository;
    private final Clock clock;

    @Override
    @Transactional
    public Long createForMatch(Long matchId, String title, String coverUrl) {
        return albumRepository.findByMatchId(matchId).map(Album::getId).orElseGet(() -> {
            String t = title == null || title.isBlank() ? null : title.trim();
            if (t == null) {
                t = matchRepository.findById(matchId)
                        .flatMap(m -> m.getCourseMapId() == null ? java.util.Optional.<SecretMap>empty() : mapRepository.findById(m.getCourseMapId()))
                        .map(SecretMap::getTitle).orElse(null);
            }
            String cover = coverUrl == null || coverUrl.isBlank() ? null : coverUrl.trim();
            if (cover == null) {
                cover = visitRepository.findByMatchId(matchId).stream()
                        .min(Comparator.comparing(SpotVisit::getVerifiedAt).thenComparing(SpotVisit::getId))
                        .map(SpotVisit::getPhotoUrl).orElse(null);
            }
            return albumRepository.save(Album.of(matchId, t, cover, LocalDateTime.now(clock))).getId();
        });
    }
}
