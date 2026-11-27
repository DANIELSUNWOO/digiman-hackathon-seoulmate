package server.place;

import java.util.Map;

/** 네이버 지역 검색을 부르고 받은 JSON 을 그대로 돌려준다 (테스트에서는 가짜로 바꿔 끼운다) */
public interface PlaceSearchClient {
    Map<?, ?> search(String query);
}
