-- API v1.7 / ERD v2.6 (화면 명세 v9 반영)
-- 1) 여행자에게 지도 제목을 일본어로 보여 주기 위한 번역 칸 (MAP-07·08, 서버 B가 엔티티에 매핑)
ALTER TABLE secret_maps ADD COLUMN title_translated VARCHAR(100);

-- 2) 매칭 끊기(MATCH-07) 사유(선택)와 끊은 사람
ALTER TABLE matches ADD COLUMN cancel_reason VARCHAR(30);
ALTER TABLE matches ADD COLUMN cancel_detail VARCHAR(300);
ALTER TABLE matches ADD COLUMN canceled_by UUID REFERENCES users (id);

-- 3) 같은 지도 중복 선택 확인(MATCH-01 MAP_ALREADY_SELECTED)용 인덱스
CREATE INDEX idx_match_traveler_map ON matches (traveler_id, course_map_id);

-- traveler_chat_ok · mate_chat_ok 는 v1.7부터 쓰지 않는다 (채팅은 여행자가 바로 연다). 데이터 호환을 위해 칼럼은 남겨 둔다.
