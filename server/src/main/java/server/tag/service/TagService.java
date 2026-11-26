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
     * TAG-01 대분류 → 세부 트리, 요청한 사람 언어로.
     * category(FOOD·WALK·CULTURE·SHOP·SPORTS·WELLNESS·AREA)로 앱이 분류를 구분한다.
     * AREA(동네)는 메이트 M-04 전용이라 여행자 T-05 에서는 앱이 숨긴다.
     */
    @Transactional(readOnly = true)
    public List<TagTree> tree(String language) {
        Map<Long, TagTree> roots = new LinkedHashMap<>();
        List<Tag> all = tagRepository.findAllByOrderByDepthAscIdAsc();
        for (Tag t : all) {
            if (t.getDepth() == 1) roots.put(t.getId(), new TagTree(t.getId(), t.getCategory(), t.nameIn(language), new ArrayList<>()));
        }
        for (Tag t : all) {
            if (t.getDepth() == 2 && roots.containsKey(t.getParentId())) {
                roots.get(t.getParentId()).children().add(new TagTree.Child(t.getId(), t.nameIn(language)));
            }
        }
        return new ArrayList<>(roots.values());
    }

    /** 대분류(카테고리)마다 고를 수 있는 세부 취향 수 (화면 명세 v9 T-05) */
    private static final int MAX_PER_CATEGORY = 2;

    /** TAG-02 기존 선택을 통째로 교체 */
    @Transactional
    public List<TagView> replaceMine(UUID userId, String language, List<Long> tagIds) {
        Set<Long> ids = new LinkedHashSet<>(tagIds == null ? List.of() : tagIds);
        if (ids.isEmpty() || ids.size() > policy.maxTags()) throw new ApiException(ErrorCode.TAG_COUNT_INVALID);
        List<Tag> tags = tagRepository.findAllById(ids);
        if (tags.size() != ids.size() || tags.stream().anyMatch(t -> t.getDepth() != 2)) {
            throw new ApiException(ErrorCode.INVALID_TAG);                 // 없는 태그 또는 대분류
        }
        // API v1.7 (T-05): 대분류당 최대 2개
        boolean overPerCategory = tags.stream()
                .collect(java.util.stream.Collectors.groupingBy(Tag::getParentId, java.util.stream.Collectors.counting()))
                .values().stream().anyMatch(c -> c > MAX_PER_CATEGORY);
        if (overPerCategory) throw new ApiException(ErrorCode.TAG_COUNT_INVALID);
        userTagRepository.deleteAllByUserId(userId);
        userTagRepository.saveAll(ids.stream().map(id -> UserTag.of(userId, id)).toList());
        return tags.stream().map(t -> TagView.of(t, language)).toList();
    }

    @Transactional(readOnly = true)
    public List<TagView> mine(UUID userId, String language) {
        List<Long> ids = userTagRepository.findByUserId(userId).stream().map(UserTag::getTagId).toList();
        return tagRepository.findAllById(ids).stream().map(t -> TagView.of(t, language)).toList();
    }

    public record TagView(Long tagId, String category, String name, Long parentId) {
        public static TagView of(Tag t, String language) {
            return new TagView(t.getId(), t.getCategory(), t.nameIn(language), t.getParentId());
        }
    }

    public record TagTree(Long tagId, String category, String name, List<Child> children) {
        public record Child(Long tagId, String name) {}
    }
}
