// 메이트 화면이라 한국어만 쓴다. M-12a 디자인을 받기 전 문구다.
export const strings = {
  inputLabel: "장소 검색",
  placeholder: "장소 이름으로 검색 (예: 성수 카페)",
  hint: "장소 이름을 입력하면 찾아 드려요",
  loading: "검색 중",
  empty: "검색 결과가 없어요. 다른 이름으로 검색해 보세요",
  retry: "다시 시도",
  errorUnavailable:
    "지금은 장소를 검색할 수 없어요. 잠시 후 다시 시도해 주세요",
  errorRole: "메이트만 장소를 검색할 수 있어요",
  errorValidation: "검색어는 50자까지 쓸 수 있어요",
  errorNetwork: "네트워크 연결을 확인해 주세요",
  errorSession: "다시 로그인해 주세요",
  errorDefault: "검색하지 못했어요",
} as const;
