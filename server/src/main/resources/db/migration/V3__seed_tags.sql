-- 취향 태그 (API v1.7, 화면 명세 v9 T-05·M-04 기준). 서버 B
-- depth 1 = 분류, depth 2 = 항목. 사용자는 항목만 고르고, 분류마다 최대 2개 (TAG-02)
-- AREA(동네)는 메이트의 "잘 아는 동네"(M-04)용이다. 여행자 취향 설문(T-05)에서는 앱이 이 분류를 숨긴다
-- T-05a 세부 선택(예: 카페 → 조용한 카페)은 3단계라 결선 버전에서는 넣지 않는다 (정식 버전에서 depth 3 으로 추가)

INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES (NULL, 'FOOD', '카페·맛집', 'カフェ・グルメ', 1);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES (NULL, 'WALK', '동네 산책', 'まち歩き', 1);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES (NULL, 'CULTURE', '문화', 'カルチャー', 1);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES (NULL, 'SHOP', '쇼핑', 'ショッピング', 1);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES (NULL, 'SPORTS', '스포츠', 'スポーツ', 1);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES (NULL, 'WELLNESS', '웰니스', 'ウェルネス', 1);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES (NULL, 'AREA', '동네', 'エリア', 1);

INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'FOOD' AND depth = 1), 'FOOD', '카페', 'カフェ', 2);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'FOOD' AND depth = 1), 'FOOD', '로컬 식당', 'ローカル食堂', 2);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'FOOD' AND depth = 1), 'FOOD', '디저트', 'スイーツ', 2);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'FOOD' AND depth = 1), 'FOOD', '술', 'お酒', 2);

INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'WALK' AND depth = 1), 'WALK', '골목 산책', '路地裏散歩', 2);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'WALK' AND depth = 1), 'WALK', '야경', '夜景', 2);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'WALK' AND depth = 1), 'WALK', '공원', '公園', 2);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'WALK' AND depth = 1), 'WALK', '시장', '市場', 2);

INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'CULTURE' AND depth = 1), 'CULTURE', '사진', '写真', 2);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'CULTURE' AND depth = 1), 'CULTURE', '갤러리', 'ギャラリー', 2);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'CULTURE' AND depth = 1), 'CULTURE', 'K-POP', 'K-POP', 2);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'CULTURE' AND depth = 1), 'CULTURE', '드라마 촬영지', 'ドラマのロケ地', 2);

INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'SHOP' AND depth = 1), 'SHOP', '빈티지', '古着', 2);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'SHOP' AND depth = 1), 'SHOP', '소품숍', '雑貨屋', 2);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'SHOP' AND depth = 1), 'SHOP', '화장품', 'コスメ', 2);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'SHOP' AND depth = 1), 'SHOP', '서점', '本屋', 2);

INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'SPORTS' AND depth = 1), 'SPORTS', '러닝', 'ランニング', 2);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'SPORTS' AND depth = 1), 'SPORTS', '등산', '登山', 2);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'SPORTS' AND depth = 1), 'SPORTS', '야구 관람', '野球観戦', 2);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'SPORTS' AND depth = 1), 'SPORTS', '자전거', 'サイクリング', 2);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'SPORTS' AND depth = 1), 'SPORTS', '클라이밍', 'ボルダリング', 2);

INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'WELLNESS' AND depth = 1), 'WELLNESS', '찜질방', 'チムジルバン', 2);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'WELLNESS' AND depth = 1), 'WELLNESS', '요가', 'ヨガ', 2);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'WELLNESS' AND depth = 1), 'WELLNESS', '템플스테이', 'テンプルステイ', 2);

INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'AREA' AND depth = 1), 'AREA', '성수', '聖水', 2);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'AREA' AND depth = 1), 'AREA', '연남', '延南', 2);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'AREA' AND depth = 1), 'AREA', '을지로', '乙支路', 2);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'AREA' AND depth = 1), 'AREA', '망원', '望遠', 2);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'AREA' AND depth = 1), 'AREA', '익선', '益善', 2);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'AREA' AND depth = 1), 'AREA', '한남', '漢南', 2);
