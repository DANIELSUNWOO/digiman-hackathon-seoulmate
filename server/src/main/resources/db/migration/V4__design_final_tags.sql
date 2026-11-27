-- 취향 태그를 디자인 최종본(개발 전달 패키지 v4 · 프로토타입 v9 블루, 11/26)으로 교체한다. 서버 B
-- 분류 11개 (여행 취향 6 + 推し 4 + 동네 1), 2단계 항목 63개, 3단계 세부·멤버 87개
-- category: CAFE · FOOD · BEAUTY · SHOP · WALK · CULTURE (취향) / OSHI_KPOP · OSHI_DRAMA · OSHI_ANIME · OSHI_BASEBALL (推し) / AREA (동네)
-- 세부 항목의 한국어 이름(노포, 빙수 등)은 프로토타입에 일본어만 있어서 서버 B가 옮겼다. 디자이너 확인 필요
--
-- 예전(V3) 태그는 모두 지우고 다시 넣는다. 결선 전이라 실제 사용자 선택은 없다고 보고,
-- 스팟의 tag_id 와 사용자 선택(user_tags)도 함께 비운다. 시연 메이트 취향은 DEMO_SEED 로 다시 붙인다

UPDATE spots SET tag_id = NULL WHERE tag_id IS NOT NULL;
DELETE FROM user_tags;
DELETE FROM tags WHERE depth = 3;
DELETE FROM tags WHERE depth = 2;
DELETE FROM tags WHERE depth = 1;

-- 1) 여행 취향 6분류 (T-05 · M-04 ①)
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES (NULL, 'CAFE', '카페', 'カフェ', 1);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES (NULL, 'FOOD', '맛집', 'グルメ', 1);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES (NULL, 'BEAUTY', '뷰티', 'ビューティー', 1);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES (NULL, 'SHOP', '쇼핑', 'ショッピング', 1);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES (NULL, 'WALK', '동네 산책', 'まち歩き', 1);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES (NULL, 'CULTURE', '문화·체험', '文化・体験', 1);

INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'CAFE' AND depth = 1), 'CAFE', '조용한 카페', '静かなカフェ', 2);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'CAFE' AND depth = 1), 'CAFE', '베이커리', 'ベーカリー', 2);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'CAFE' AND depth = 1), 'CAFE', '감성 카페', '映えカフェ', 2);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'CAFE' AND depth = 1), 'CAFE', '전통찻집', '伝統茶屋', 2);

INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'FOOD' AND depth = 1), 'FOOD', '로컬 식당', 'ローカル食堂', 2);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'FOOD' AND depth = 1), 'FOOD', '시장·포차', '市場・屋台', 2);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'FOOD' AND depth = 1), 'FOOD', '고기', '焼肉', 2);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'FOOD' AND depth = 1), 'FOOD', '디저트', 'スイーツ', 2);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'FOOD' AND depth = 1), 'FOOD', '술 한잔', 'お酒', 2);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'FOOD' AND depth = 2 AND name_ko = '로컬 식당'), 'FOOD', '노포', '老舗', 3);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'FOOD' AND depth = 2 AND name_ko = '로컬 식당'), 'FOOD', '혼밥 가능', 'ひとりご飯OK', 3);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'FOOD' AND depth = 2 AND name_ko = '로컬 식당'), 'FOOD', '줄 서는 집', '行列店', 3);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'FOOD' AND depth = 2 AND name_ko = '디저트'), 'FOOD', '빙수', 'かき氷', 3);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'FOOD' AND depth = 2 AND name_ko = '디저트'), 'FOOD', '전통 과자', '伝統菓子', 3);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'FOOD' AND depth = 2 AND name_ko = '디저트'), 'FOOD', '케이크', 'ケーキ', 3);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'FOOD' AND depth = 2 AND name_ko = '술 한잔'), 'FOOD', '막걸리', 'マッコリ', 3);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'FOOD' AND depth = 2 AND name_ko = '술 한잔'), 'FOOD', '수제 맥주', 'クラフトビール', 3);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'FOOD' AND depth = 2 AND name_ko = '술 한잔'), 'FOOD', '와인바', 'ワインバー', 3);

INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'BEAUTY' AND depth = 1), 'BEAUTY', '코스메 쇼핑', 'コスメ', 2);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'BEAUTY' AND depth = 1), 'BEAUTY', '퍼스널컬러', 'パーソナルカラー', 2);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'BEAUTY' AND depth = 1), 'BEAUTY', '네일', 'ネイル', 2);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'BEAUTY' AND depth = 2 AND name_ko = '코스메 쇼핑'), 'BEAUTY', '올리브영', 'オリーブヤング', 3);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'BEAUTY' AND depth = 2 AND name_ko = '코스메 쇼핑'), 'BEAUTY', '한국 브랜드', '韓国ブランド', 3);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'BEAUTY' AND depth = 2 AND name_ko = '코스메 쇼핑'), 'BEAUTY', '로드숍', 'ロードショップ', 3);

INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'SHOP' AND depth = 1), 'SHOP', '빈티지', '古着', 2);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'SHOP' AND depth = 1), 'SHOP', '소품샵', '雑貨屋', 2);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'SHOP' AND depth = 1), 'SHOP', '팝업스토어', 'ポップアップ', 2);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'SHOP' AND depth = 1), 'SHOP', '서점·문구', '本屋・文具', 2);

INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'WALK' AND depth = 1), 'WALK', '골목', '路地裏', 2);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'WALK' AND depth = 1), 'WALK', '레트로', 'レトロ', 2);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'WALK' AND depth = 1), 'WALK', '야경', '夜景', 2);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'WALK' AND depth = 1), 'WALK', '한강·공원', '漢江・公園', 2);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'WALK' AND depth = 2 AND name_ko = '야경'), 'WALK', '전망대', '展望台', 3);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'WALK' AND depth = 2 AND name_ko = '야경'), 'WALK', '한강', '漢江', 3);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'WALK' AND depth = 2 AND name_ko = '야경'), 'WALK', '루프톱', '屋上', 3);

INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'CULTURE' AND depth = 1), 'CULTURE', '전시·갤러리', '展示・ギャラリー', 2);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'CULTURE' AND depth = 1), 'CULTURE', '사진관·네컷', '写真館・4カット', 2);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'CULTURE' AND depth = 1), 'CULTURE', '한복', '韓服', 2);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'CULTURE' AND depth = 1), 'CULTURE', '공연·라이브', 'ライブ・公演', 2);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'CULTURE' AND depth = 1), 'CULTURE', '찜질방', 'チムジルバン', 2);

-- 2) 推し · 최애 (T-05b · M-04b). 2단계 = 그룹·작품·팀(그룹을 고르면 箱推し), 3단계 = 멤버
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES (NULL, 'OSHI_KPOP', 'K-POP', 'K-POP', 1);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES (NULL, 'OSHI_DRAMA', '드라마·배우', 'ドラマ・俳優', 1);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES (NULL, 'OSHI_ANIME', '일본 애니·J-POP', 'アニメ・J-POP', 1);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES (NULL, 'OSHI_BASEBALL', '야구', '野球', 1);

INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_KPOP' AND depth = 1), 'OSHI_KPOP', 'NCT DREAM', 'NCT DREAM', 2);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_KPOP' AND depth = 1), 'OSHI_KPOP', 'NCT WISH', 'NCT WISH', 2);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_KPOP' AND depth = 1), 'OSHI_KPOP', 'SEVENTEEN', 'SEVENTEEN', 2);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_KPOP' AND depth = 1), 'OSHI_KPOP', 'BTS', 'BTS', 2);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_KPOP' AND depth = 1), 'OSHI_KPOP', 'TWICE', 'TWICE', 2);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_KPOP' AND depth = 1), 'OSHI_KPOP', 'Stray Kids', 'Stray Kids', 2);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_KPOP' AND depth = 1), 'OSHI_KPOP', 'LE SSERAFIM', 'LE SSERAFIM', 2);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_KPOP' AND depth = 1), 'OSHI_KPOP', 'IVE', 'IVE', 2);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_KPOP' AND depth = 1), 'OSHI_KPOP', 'ENHYPEN', 'ENHYPEN', 2);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_KPOP' AND depth = 1), 'OSHI_KPOP', 'NewJeans', 'NewJeans', 2);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_KPOP' AND depth = 2 AND name_ko = 'NCT DREAM'), 'OSHI_KPOP', '런쥔', 'ロンジュン', 3);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_KPOP' AND depth = 2 AND name_ko = 'NCT DREAM'), 'OSHI_KPOP', '제노', 'ジェノ', 3);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_KPOP' AND depth = 2 AND name_ko = 'NCT DREAM'), 'OSHI_KPOP', '해찬', 'ヘチャン', 3);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_KPOP' AND depth = 2 AND name_ko = 'NCT DREAM'), 'OSHI_KPOP', '재민', 'ジェミン', 3);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_KPOP' AND depth = 2 AND name_ko = 'NCT DREAM'), 'OSHI_KPOP', '천러', 'チョンロ', 3);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_KPOP' AND depth = 2 AND name_ko = 'NCT DREAM'), 'OSHI_KPOP', '지성', 'チソン', 3);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_KPOP' AND depth = 2 AND name_ko = 'NCT WISH'), 'OSHI_KPOP', '시온', 'シオン', 3);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_KPOP' AND depth = 2 AND name_ko = 'NCT WISH'), 'OSHI_KPOP', '리쿠', 'リク', 3);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_KPOP' AND depth = 2 AND name_ko = 'NCT WISH'), 'OSHI_KPOP', '유우시', 'ユウシ', 3);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_KPOP' AND depth = 2 AND name_ko = 'NCT WISH'), 'OSHI_KPOP', '재희', 'ジェヒ', 3);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_KPOP' AND depth = 2 AND name_ko = 'NCT WISH'), 'OSHI_KPOP', '료', 'リョウ', 3);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_KPOP' AND depth = 2 AND name_ko = 'NCT WISH'), 'OSHI_KPOP', '사쿠야', 'サクヤ', 3);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_KPOP' AND depth = 2 AND name_ko = 'SEVENTEEN'), 'OSHI_KPOP', '에스쿱스', 'エスクプス', 3);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_KPOP' AND depth = 2 AND name_ko = 'SEVENTEEN'), 'OSHI_KPOP', '정한', 'ジョンハン', 3);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_KPOP' AND depth = 2 AND name_ko = 'SEVENTEEN'), 'OSHI_KPOP', '조슈아', 'ジョシュア', 3);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_KPOP' AND depth = 2 AND name_ko = 'SEVENTEEN'), 'OSHI_KPOP', '준', 'ジュン', 3);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_KPOP' AND depth = 2 AND name_ko = 'SEVENTEEN'), 'OSHI_KPOP', '호시', 'ホシ', 3);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_KPOP' AND depth = 2 AND name_ko = 'SEVENTEEN'), 'OSHI_KPOP', '원우', 'ウォヌ', 3);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_KPOP' AND depth = 2 AND name_ko = 'SEVENTEEN'), 'OSHI_KPOP', '우지', 'ウジ', 3);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_KPOP' AND depth = 2 AND name_ko = 'SEVENTEEN'), 'OSHI_KPOP', '도겸', 'ドギョム', 3);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_KPOP' AND depth = 2 AND name_ko = 'SEVENTEEN'), 'OSHI_KPOP', '민규', 'ミンギュ', 3);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_KPOP' AND depth = 2 AND name_ko = 'SEVENTEEN'), 'OSHI_KPOP', '디에잇', 'ディエイト', 3);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_KPOP' AND depth = 2 AND name_ko = 'SEVENTEEN'), 'OSHI_KPOP', '승관', 'スングァン', 3);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_KPOP' AND depth = 2 AND name_ko = 'SEVENTEEN'), 'OSHI_KPOP', '버논', 'バーノン', 3);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_KPOP' AND depth = 2 AND name_ko = 'SEVENTEEN'), 'OSHI_KPOP', '디노', 'ディノ', 3);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_KPOP' AND depth = 2 AND name_ko = 'BTS'), 'OSHI_KPOP', 'RM', 'RM', 3);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_KPOP' AND depth = 2 AND name_ko = 'BTS'), 'OSHI_KPOP', '진', 'ジン', 3);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_KPOP' AND depth = 2 AND name_ko = 'BTS'), 'OSHI_KPOP', '슈가', 'シュガ', 3);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_KPOP' AND depth = 2 AND name_ko = 'BTS'), 'OSHI_KPOP', '제이홉', 'J-HOPE', 3);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_KPOP' AND depth = 2 AND name_ko = 'BTS'), 'OSHI_KPOP', '지민', 'ジミン', 3);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_KPOP' AND depth = 2 AND name_ko = 'BTS'), 'OSHI_KPOP', '뷔', 'V', 3);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_KPOP' AND depth = 2 AND name_ko = 'BTS'), 'OSHI_KPOP', '정국', 'ジョングク', 3);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_KPOP' AND depth = 2 AND name_ko = 'TWICE'), 'OSHI_KPOP', '나연', 'ナヨン', 3);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_KPOP' AND depth = 2 AND name_ko = 'TWICE'), 'OSHI_KPOP', '정연', 'ジョンヨン', 3);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_KPOP' AND depth = 2 AND name_ko = 'TWICE'), 'OSHI_KPOP', '모모', 'モモ', 3);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_KPOP' AND depth = 2 AND name_ko = 'TWICE'), 'OSHI_KPOP', '사나', 'サナ', 3);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_KPOP' AND depth = 2 AND name_ko = 'TWICE'), 'OSHI_KPOP', '지효', 'ジヒョ', 3);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_KPOP' AND depth = 2 AND name_ko = 'TWICE'), 'OSHI_KPOP', '미나', 'ミナ', 3);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_KPOP' AND depth = 2 AND name_ko = 'TWICE'), 'OSHI_KPOP', '다현', 'ダヒョン', 3);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_KPOP' AND depth = 2 AND name_ko = 'TWICE'), 'OSHI_KPOP', '채영', 'チェヨン', 3);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_KPOP' AND depth = 2 AND name_ko = 'TWICE'), 'OSHI_KPOP', '쯔위', 'ツウィ', 3);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_KPOP' AND depth = 2 AND name_ko = 'Stray Kids'), 'OSHI_KPOP', '방찬', 'バンチャン', 3);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_KPOP' AND depth = 2 AND name_ko = 'Stray Kids'), 'OSHI_KPOP', '리노', 'リノ', 3);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_KPOP' AND depth = 2 AND name_ko = 'Stray Kids'), 'OSHI_KPOP', '창빈', 'チャンビン', 3);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_KPOP' AND depth = 2 AND name_ko = 'Stray Kids'), 'OSHI_KPOP', '현진', 'ヒョンジン', 3);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_KPOP' AND depth = 2 AND name_ko = 'Stray Kids'), 'OSHI_KPOP', '한', 'ハン', 3);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_KPOP' AND depth = 2 AND name_ko = 'Stray Kids'), 'OSHI_KPOP', '필릭스', 'フィリックス', 3);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_KPOP' AND depth = 2 AND name_ko = 'Stray Kids'), 'OSHI_KPOP', '승민', 'スンミン', 3);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_KPOP' AND depth = 2 AND name_ko = 'Stray Kids'), 'OSHI_KPOP', '아이엔', 'アイエン', 3);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_KPOP' AND depth = 2 AND name_ko = 'LE SSERAFIM'), 'OSHI_KPOP', '채원', 'チェウォン', 3);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_KPOP' AND depth = 2 AND name_ko = 'LE SSERAFIM'), 'OSHI_KPOP', '사쿠라', 'サクラ', 3);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_KPOP' AND depth = 2 AND name_ko = 'LE SSERAFIM'), 'OSHI_KPOP', '윤진', 'ユンジン', 3);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_KPOP' AND depth = 2 AND name_ko = 'LE SSERAFIM'), 'OSHI_KPOP', '카즈하', 'カズハ', 3);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_KPOP' AND depth = 2 AND name_ko = 'LE SSERAFIM'), 'OSHI_KPOP', '은채', 'ウンチェ', 3);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_KPOP' AND depth = 2 AND name_ko = 'IVE'), 'OSHI_KPOP', '유진', 'ユジン', 3);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_KPOP' AND depth = 2 AND name_ko = 'IVE'), 'OSHI_KPOP', '가을', 'ガウル', 3);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_KPOP' AND depth = 2 AND name_ko = 'IVE'), 'OSHI_KPOP', '레이', 'レイ', 3);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_KPOP' AND depth = 2 AND name_ko = 'IVE'), 'OSHI_KPOP', '원영', 'ウォニョン', 3);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_KPOP' AND depth = 2 AND name_ko = 'IVE'), 'OSHI_KPOP', '리즈', 'リズ', 3);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_KPOP' AND depth = 2 AND name_ko = 'IVE'), 'OSHI_KPOP', '이서', 'イソ', 3);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_KPOP' AND depth = 2 AND name_ko = 'ENHYPEN'), 'OSHI_KPOP', '정원', 'ジョンウォン', 3);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_KPOP' AND depth = 2 AND name_ko = 'ENHYPEN'), 'OSHI_KPOP', '희승', 'ヒスン', 3);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_KPOP' AND depth = 2 AND name_ko = 'ENHYPEN'), 'OSHI_KPOP', '제이', 'ジェイ', 3);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_KPOP' AND depth = 2 AND name_ko = 'ENHYPEN'), 'OSHI_KPOP', '제이크', 'ジェイク', 3);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_KPOP' AND depth = 2 AND name_ko = 'ENHYPEN'), 'OSHI_KPOP', '성훈', 'ソンフン', 3);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_KPOP' AND depth = 2 AND name_ko = 'ENHYPEN'), 'OSHI_KPOP', '선우', 'ソヌ', 3);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_KPOP' AND depth = 2 AND name_ko = 'ENHYPEN'), 'OSHI_KPOP', '니키', 'ニキ', 3);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_KPOP' AND depth = 2 AND name_ko = 'NewJeans'), 'OSHI_KPOP', '민지', 'ミンジ', 3);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_KPOP' AND depth = 2 AND name_ko = 'NewJeans'), 'OSHI_KPOP', '하니', 'ハニ', 3);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_KPOP' AND depth = 2 AND name_ko = 'NewJeans'), 'OSHI_KPOP', '다니엘', 'ダニエル', 3);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_KPOP' AND depth = 2 AND name_ko = 'NewJeans'), 'OSHI_KPOP', '해린', 'ヘリン', 3);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_KPOP' AND depth = 2 AND name_ko = 'NewJeans'), 'OSHI_KPOP', '혜인', 'ヘイン', 3);

INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_DRAMA' AND depth = 1), 'OSHI_DRAMA', '사랑의 불시착', '愛の不時着', 2);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_DRAMA' AND depth = 1), 'OSHI_DRAMA', '이태원 클라쓰', '梨泰院クラス', 2);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_DRAMA' AND depth = 1), 'OSHI_DRAMA', '눈물의 여왕', '涙の女王', 2);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_DRAMA' AND depth = 1), 'OSHI_DRAMA', '도깨비', 'トッケビ', 2);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_DRAMA' AND depth = 1), 'OSHI_DRAMA', '선재 업고 튀어', 'ソンジェ背負って走れ', 2);

INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_ANIME' AND depth = 1), 'OSHI_ANIME', '원피스', 'ワンピース', 2);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_ANIME' AND depth = 1), 'OSHI_ANIME', '주술회전', '呪術廻戦', 2);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_ANIME' AND depth = 1), 'OSHI_ANIME', '슬램덩크', 'スラムダンク', 2);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_ANIME' AND depth = 1), 'OSHI_ANIME', 'YOASOBI', 'YOASOBI', 2);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_ANIME' AND depth = 1), 'OSHI_ANIME', 'Ado', 'Ado', 2);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_ANIME' AND depth = 1), 'OSHI_ANIME', 'King Gnu', 'King Gnu', 2);

INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_BASEBALL' AND depth = 1), 'OSHI_BASEBALL', '두산 베어스', '斗山ベアーズ', 2);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_BASEBALL' AND depth = 1), 'OSHI_BASEBALL', 'LG 트윈스', 'LGツインズ', 2);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_BASEBALL' AND depth = 1), 'OSHI_BASEBALL', 'KIA 타이거즈', '起亜タイガース', 2);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_BASEBALL' AND depth = 1), 'OSHI_BASEBALL', '삼성 라이온즈', 'サムスンライオンズ', 2);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_BASEBALL' AND depth = 1), 'OSHI_BASEBALL', '롯데 자이언츠', 'ロッテジャイアンツ', 2);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_BASEBALL' AND depth = 1), 'OSHI_BASEBALL', '한화 이글스', 'ハンファイーグルス', 2);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_BASEBALL' AND depth = 1), 'OSHI_BASEBALL', 'SSG 랜더스', 'SSGランダース', 2);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_BASEBALL' AND depth = 1), 'OSHI_BASEBALL', '키움 히어로즈', 'キウムヒーローズ', 2);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_BASEBALL' AND depth = 1), 'OSHI_BASEBALL', 'KT 위즈', 'KTウィズ', 2);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_BASEBALL' AND depth = 1), 'OSHI_BASEBALL', 'NC 다이노스', 'NCダイノス', 2);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'OSHI_BASEBALL' AND depth = 1), 'OSHI_BASEBALL', '직관해 보고 싶어요', '観戦してみたい', 2);

-- 3) 동네 (메이트 "잘 아는 동네" · 여행자 「行ってみたい街」). 추천 점수에는 넣지 않는다
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES (NULL, 'AREA', '동네', 'エリア', 1);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'AREA' AND depth = 1), 'AREA', '성수', '聖水', 2);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'AREA' AND depth = 1), 'AREA', '연남', '延南洞', 2);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'AREA' AND depth = 1), 'AREA', '을지로', '乙支路', 2);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'AREA' AND depth = 1), 'AREA', '망원', '望遠', 2);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'AREA' AND depth = 1), 'AREA', '익선', '益善洞', 2);
INSERT INTO tags (parent_id, category, name_ko, name_ja, depth) VALUES ((SELECT id FROM tags WHERE category = 'AREA' AND depth = 1), 'AREA', '한남', '漢南洞', 2);
