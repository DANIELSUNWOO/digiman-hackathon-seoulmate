package server.user.domain;

/** ANY = 상관없음, SAME = 같은 성별 */
public enum GenderPref {
    ANY, SAME, MALE, FEMALE;

    /** 여행자 성별 기준으로 메이트 성별이 조건에 맞는지 (서버 B 추천 필터에서도 사용) */
    public boolean accepts(Gender travelerGender, Gender mateGender) {
        return switch (this) {
            case ANY -> true;
            case SAME -> travelerGender != null && travelerGender == mateGender;
            case MALE -> mateGender == Gender.MALE;
            case FEMALE -> mateGender == Gender.FEMALE;
        };
    }
}
