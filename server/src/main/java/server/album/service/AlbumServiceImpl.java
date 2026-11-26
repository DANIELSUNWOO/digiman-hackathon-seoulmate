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

/** [B 소유] 임시로 A가 작성한 동작하는 구현. 선우님이 자유롭게 수정 */
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
            String t = title;
            if (t == null) {
                t = matchRepository.findById(matchId)
                        .flatMap(m -> m.getCourseMapId() == null ? java.util.Optional.<SecretMap>empty() : mapRepository.findById(m.getCourseMapId()))
                        .map(SecretMap::getTitle).orElse(null);
            }
            String cover = coverUrl;
            if (cover == null) {
                cover = visitRepository.findByMatchId(matchId).stream()
                        .min(Comparator.comparing(SpotVisit::getVerifiedAt))
                        .map(SpotVisit::getPhotoUrl).orElse(null);
            }
            return albumRepository.save(Album.of(matchId, t, cover, LocalDateTime.now(clock))).getId();
        });
    }
}
