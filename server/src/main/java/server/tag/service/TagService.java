package server.tag.service;

import server.global.config.PolicyProperties;
import server.global.error.ApiException;
import server.global.error.ErrorCode;
import server.tag.domain.Tag;
import server.tag.domain.UserTag;
import server.tag.repository.TagRepository;
import server.tag.repository.UserTagRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
public class TagService {

    private final TagRepository tagRepository;
    private final UserTagRepository userTagRepository;
    private final PolicyProperties policy;

    /**
     * TAG-01 분류 → 항목 → 세부 트리 (3단계), 요청한 사람 언어로. 디자인 최종본 11/26 (V4).
     * category 로 앱이 분류를 구분한다 (CAFE·FOOD·BEAUTY·SHOP·WALK·CULTURE·OSHI_*·AREA).
     * 세부가 없는 항목은 children = [].
     */
    @Transactional(readOnly = true)
    public List<TagTree> tree(String language) {
        Map<Long, TagTree> roots = new LinkedHashMap<>();
        Map<Long, TagTree.Child> items = new HashMap<>();
        List<Tag> all = tagRepository.findAllByOrderByDepthAscIdAsc();
        for (Tag t : all) {
            if (t.getDepth() == 1) roots.put(t.getId(), new TagTree(t.getId(), t.getCategory(), t.nameIn(language), new ArrayList<>()));
        }
        for (Tag t : all) {
            if (t.getDepth() == 2 && roots.containsKey(t.getParentId())) {
                TagTree.Child item = new TagTree.Child(t.getId(), t.nameIn(language), new ArrayList<>());
                roots.get(t.getParentId()).children().add(item);
                items.put(t.getId(), item);
            }
        }
        for (Tag t : all) {
            if (t.getDepth() == 3 && items.containsKey(t.getParentId())) {
                items.get(t.getParentId()).children().add(new TagTree.Detail(t.getId(), t.nameIn(language)));
            }
        }
        return new ArrayList<>(roots.values());
    }

    /**
     * TAG-02 기존 선택을 통째로 교체. 디자인 최종본 11/26:
     * - 개수 제한 없음 (1개 이상). max-tags 는 요청 크기 보호용 상한 = 고를 수 있는 태그 전체 수
     * - 2단계 항목과 3단계 세부(推し 멤버 포함) 모두 고를 수 있다. 분류(1단계)는 못 고른다
     * - 여행자도 동네(AREA)를 고를 수 있다 (「行ってみたい街」). 추천 점수에는 들어가지 않는다 (MAP-07)
     */
    @Transactional
    public List<TagView> replaceMine(UUID userId, String language, List<Long> tagIds) {
        Set<Long> ids = new LinkedHashSet<>(tagIds == null ? List.of() : tagIds);
        if (ids.isEmpty() || ids.size() > policy.maxTags()) throw new ApiException(ErrorCode.TAG_COUNT_INVALID);
        List<Tag> tags = tagRepository.findAllById(ids);
        if (tags.size() != ids.size() || tags.stream().anyMatch(t -> t.getDepth() < 2)) {
            throw new ApiException(ErrorCode.INVALID_TAG);                 // 없는 태그 또는 분류
        }
        userTagRepository.deleteAllByUserId(userId);
        userTagRepository.saveAll(ids.stream().map(id -> UserTag.of(userId, id)).toList());
        return tags.stream().map(t -> TagView.of(t, language)).toList();
    }

    @Transactional(readOnly = true)
    public List<TagView> mine(UUID userId, String language) {
        List<Long> ids = userTagRepository.findByUserId(userId).stream().map(UserTag::getTagId).toList();
        return tagRepository.findAllById(ids).stream().map(t -> TagView.of(t, language)).toList();
    }

    public record TagView(Long tagId, String category, String name, Long parentId, int depth) {
        public static TagView of(Tag t, String language) {
            return new TagView(t.getId(), t.getCategory(), t.nameIn(language), t.getParentId(), t.getDepth());
        }
    }

    public record TagTree(Long tagId, String category, String name, List<Child> children) {
        public record Child(Long tagId, String name, List<Detail> children) {}
        public record Detail(Long tagId, String name) {}
    }
}
