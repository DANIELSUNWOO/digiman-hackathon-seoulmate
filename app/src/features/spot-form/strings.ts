// 메이트 화면이라 한국어만 쓴다. M-13 최신 디자인을 받기 전 문구다.
export const strings = {
  title: "스팟 정보",
  photos: (count: number, max: number) => `사진 ${count} / ${max}`,
  takePhoto: "카메라로 찍기",
  choosePhoto: "앨범에서 고르기",
  preparing: "사진을 준비하고 있어요",
  photoLabel: (order: number) => `고른 사진 ${order}`,
  removePhoto: (order: number) => `사진 ${order} 빼기`,
  cameraDenied:
    "카메라 사용이 허용되지 않았어요. 설정에서 허용하거나 앨범에서 골라 주세요",
  openSettings: "설정 열기",
  photoFailed: "사진을 불러오지 못했어요. 다시 시도해 주세요",
  nameField: "스팟 이름",
  reviewField: "소개 (선택)",
  reviewPlaceholder: "어떤 곳인지 소개해 주세요",
  reasonField: "추천 이유",
  reasonPlaceholder: "여행자에게 권하는 이유를 알려 주세요",
  translated: "여행자에게는 일본어로 번역해 보여 줘요",
  save: "저장",
  saving: "저장 중",
  uploading: (index: number, total: number) =>
    `사진 올리는 중 (${index} / ${total})`,
  savingSpot: "스팟을 저장하는 중",
  errorUpload: "사진을 올리지 못했어요. 입력한 내용은 그대로예요",
  errorNetwork: "네트워크 연결을 확인해 주세요",
  errorSession: "다시 로그인해 주세요",
  errorNotOwner: "내가 만든 지도가 아니에요",
  errorMapNotFound: "지도를 찾을 수 없어요",
  errorLocked: "여행 중인 여행자가 있어 지금은 바꿀 수 없어요",
  errorValidation: "입력한 내용을 확인해 주세요",
  errorDefault: "저장하지 못했어요. 다시 시도해 주세요",
  errorSavedHere: (name: string) =>
    `‘${name}’ 스팟은 이미 저장됐어요. 지금 고친 내용은 반영되지 않았으니 지도에서 확인해 주세요`,
  errorSavedBefore: (name: string) =>
    `이전에 저장한 ‘${name}’ 스팟은 이미 등록됐어요. 지금 장소는 아직 저장하지 않았어요. 다시 저장하면 새로 등록해요`,
} as const;
