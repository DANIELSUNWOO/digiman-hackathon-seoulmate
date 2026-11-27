-- 받은 후기 모음 (C-02a, 디자인 11/26): 후기도 상대 언어로 번역해 보여 준다
ALTER TABLE reviews ADD COLUMN content_translated TEXT;

-- 내가 받은 후기를 최근 순으로 읽는다
CREATE INDEX idx_reviews_reviewee ON reviews (reviewee_id, created_at DESC);
