package server.tag.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** 취향. depth 1 = 대분류(카페), 2 = 세부(조용한 카페). 초기 데이터는 서버 B 시드 담당 */
@Entity
@Table(name = "tags")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Tag {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "parent_id")
    private Long parentId;

    @Column(length = 50)
    private String category;

    @Column(name = "name_ko", nullable = false, length = 50)
    private String nameKo;

    @Column(name = "name_ja", nullable = false, length = 50)
    private String nameJa;

    @Column(nullable = false)
    private int depth;

    public static Tag of(Long parentId, String category, String nameKo, String nameJa, int depth) {
        Tag t = new Tag();
        t.parentId = parentId;
        t.category = category;
        t.nameKo = nameKo;
        t.nameJa = nameJa;
        t.depth = depth;
        return t;
    }

    public String nameIn(String language) {
        return "ja".equals(language) ? nameJa : nameKo;
    }
}
