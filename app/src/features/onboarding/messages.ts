import { ApiError } from "../../api";
import { errorMessage } from "../../authMessages";
import type {
  BioIssue,
  BirthYearIssue,
  GenderIssue,
  ImageFileIssue,
  ImageUrlIssue,
  NicknameIssue,
} from "./validation";

export type PhotoErrorCode =
  | ImageFileIssue
  | "PERMISSION_DENIED"
  | "IMAGE_READ_FAILED"
  | "UPLOAD_ABORTED"
  | "UPLOAD_TIMEOUT"
  | "UPLOAD_FAILED";

export function onboardingErrorCode(error: unknown): string | undefined {
  if (error instanceof ApiError) return error.serverError?.code ?? error.code;
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === "string" ? code : undefined;
  }
  return undefined;
}

export function fieldIssueMessage(
  issue:
    NicknameIssue | GenderIssue | BirthYearIssue | BioIssue | ImageUrlIssue,
  ko: boolean,
): string {
  switch (issue) {
    case "NICKNAME_REQUIRED":
      return ko
        ? "닉네임을 입력해 주세요."
        : "ニックネームを入力してください。";
    case "NICKNAME_TOO_SHORT":
      return ko
        ? "닉네임은 2자 이상 입력해 주세요."
        : "ニックネームは2文字以上で入力してください。";
    case "NICKNAME_TOO_LONG":
      return ko
        ? "닉네임은 8자까지 입력할 수 있습니다."
        : "ニックネームは8文字まで入力できます。";
    case "GENDER_REQUIRED":
      return ko ? "성별을 선택해 주세요." : "性別を選択してください。";
    case "GENDER_UNSPECIFIED_UNSUPPORTED":
      return ko
        ? "응답 안 함은 현재 서버 계약에서 아직 지원되지 않아 여성 또는 남성만 저장할 수 있습니다."
        : "「回答しない」は現在のサーバー仕様で未対応のため、女性または男性のみ保存できます。";
    case "BIRTH_YEAR_REQUIRED":
      return ko
        ? "출생연도를 입력해 주세요."
        : "生まれた年を入力してください。";
    case "BIRTH_YEAR_FORMAT":
      return ko
        ? "출생연도는 4자리 숫자로 입력해 주세요."
        : "生まれた年は4桁の数字で入力してください。";
    case "BIRTH_YEAR_RANGE":
      return ko
        ? "유효한 출생연도를 입력해 주세요."
        : "正しい生まれた年を入力してください。";
    case "UNDER_AGE":
      return ko
        ? "만 18세 이상만 가입할 수 있습니다."
        : "18歳以上の方のみ登録できます。";
    case "BIO_TOO_LONG":
      return ko
        ? "소개는 200자까지 입력할 수 있습니다."
        : "自己紹介は200文字まで入力できます。";
    case "PROFILE_IMAGE_URL_TOO_LONG":
      return ko
        ? "프로필 사진 주소가 너무 깁니다."
        : "プロフィール画像のURLが長すぎます。";
  }
}

export function photoErrorMessage(code: PhotoErrorCode, ko: boolean): string {
  switch (code) {
    case "PERMISSION_DENIED":
      return ko
        ? "사진 또는 카메라 접근 권한이 필요합니다."
        : "写真またはカメラへのアクセス許可が必要です。";
    case "UNSUPPORTED_IMAGE":
      return ko
        ? "JPG, PNG, WebP 이미지만 선택할 수 있습니다."
        : "JPG・PNG・WebP形式の画像のみ選択できます。";
    case "FILE_TOO_LARGE":
      return ko
        ? "이미지는 5MB 이하만 올릴 수 있습니다."
        : "画像は5MB以下のみアップロードできます。";
    case "IMAGE_EMPTY":
    case "IMAGE_READ_FAILED":
      return ko
        ? "이미지를 읽지 못했습니다. 다른 사진을 선택해 주세요."
        : "画像を読み込めませんでした。別の写真をお試しください。";
    case "UPLOAD_ABORTED":
      return ko
        ? "사진 업로드를 취소했습니다."
        : "画像のアップロードをキャンセルしました。";
    case "UPLOAD_TIMEOUT":
      return ko
        ? "사진 업로드 시간이 초과되었습니다. 연결을 확인하고 다시 시도해 주세요."
        : "画像のアップロードがタイムアウトしました。接続を確認して再度お試しください。";
    case "UPLOAD_FAILED":
      return ko
        ? "사진 업로드에 실패했습니다. 다시 시도해 주세요."
        : "画像のアップロードに失敗しました。再度お試しください。";
  }
}

export function onboardingApiMessage(error: unknown, ko: boolean): string {
  const code = onboardingErrorCode(error);
  if (code === "NICKNAME_DUPLICATED") {
    return ko
      ? "이미 사용 중인 닉네임입니다."
      : "すでに使われているニックネームです。";
  }
  if (code === "UNDER_AGE") {
    return ko
      ? "만 18세 이상만 가입할 수 있습니다."
      : "18歳以上の方のみ登録できます。";
  }
  if (code === "FILE_TOO_LARGE") {
    return ko
      ? "이미지는 5MB 이하만 올릴 수 있습니다."
      : "画像は5MB以下のみアップロードできます。";
  }
  if (code === "NOT_VERIFIED") {
    return ko
      ? "먼저 본인 인증을 완료해 주세요."
      : "先に本人確認を完了してください。";
  }
  if (code === "PROFILE_ALREADY_REGISTERED") {
    return ko
      ? "이미 프로필이 등록되어 있습니다. 상태를 다시 확인해 주세요."
      : "プロフィールはすでに登録されています。状態を再確認してください。";
  }
  if (code === "VALIDATION_ERROR") {
    return ko ? "입력값을 다시 확인해 주세요." : "入力内容を確認してください。";
  }
  if (
    code === "PERMISSION_DENIED" ||
    code === "UNSUPPORTED_IMAGE" ||
    code === "IMAGE_EMPTY" ||
    code === "IMAGE_READ_FAILED" ||
    code === "UPLOAD_ABORTED" ||
    code === "UPLOAD_TIMEOUT" ||
    code === "UPLOAD_FAILED"
  ) {
    return photoErrorMessage(code, ko);
  }
  return errorMessage(error, ko);
}

export const verificationCopy = (ko: boolean) => ({
  headerTitle: ko ? "본인 인증" : "本人確認",
  backLabel: ko ? "뒤로" : "戻る",
  headline: ko
    ? "신분증 앞면을 맞춰 촬영해 주세요"
    : "パスポートを撮影してください",
  description: ko
    ? "안전한 만남을 위해 모든 회원이 시연용 본인 인증을 진행합니다. 전송한 사진은 서버에 저장하지 않습니다."
    : "安心して会えるよう、すべてのユーザーがデモ用本人確認を行います。写真は確認後に保存されません。",
  frameCaption: ko ? "ID / PASSPORT DEMO" : "PASSPORT DEMO",
  frameSampleLine1: "P<SEOULMATE<<DEMO<<<<<<",
  frameSampleLine2: "SM0000000<0DEMO<<<<<<<<",
  selectedLabel: ko ? "선택한 시연 이미지" : "選択したデモ画像",
  infoText: ko
    ? "얼굴 사진 면을 틀에 맞춰 주세요. 현재 MVP에서는 시연용 확인만 진행하며 여권 이미지는 보관하지 않습니다."
    : "顔写真のページを枠に合わせてください。MVPではデモ確認のみ行い、パスポート画像は保存しません。",
  pickPhoto: ko ? "사진 선택" : "写真を選ぶ",
  takePhoto: ko ? "촬영하기" : "撮影する",
  demoButton: ko
    ? "시연용 샘플로 인증 완료하기"
    : "デモ用サンプルで確認を進める",
  submitSelectedButton: ko
    ? "선택한 사진으로 인증하기"
    : "選択した写真で確認を進める",
  submitting: ko ? "확인 중" : "確認中",
  cancelButton: ko ? "취소" : "キャンセル",
  refreshFailed: ko
    ? "인증은 전송됐지만 회원 상태를 다시 확인하지 못했습니다."
    : "確認は送信されましたが、会員状態を再取得できませんでした。",
  retryRefresh: ko ? "상태 다시 확인" : "状態を再確認",
});

export const profileCopy = (ko: boolean, isMate: boolean) => ({
  headerTitle: ko ? "프로필" : "プロフィール",
  backLabel: ko ? "뒤로" : "戻る",
  changePhotoLabel: ko ? "프로필 사진 변경" : "プロフィール写真を変更",
  pickPhoto: ko ? "앨범에서 선택" : "アルバムから選ぶ",
  takePhoto: ko ? "카메라로 촬영" : "カメラで撮る",
  removePhoto: ko ? "사진 지우기" : "写真を外す",
  photoSelectedHint: ko
    ? "프로필 사진이 선택되었습니다"
    : "プロフィール写真を選択しました",
  photoOptionalHint: ko ? "사진은 선택 사항입니다" : "写真は任意です",
  nicknameLabel: ko ? "닉네임" : "ニックネーム",
  nicknamePlaceholder: ko ? "예: 지우" : "例: ゆき",
  nicknameHint: isMate
    ? ko
      ? "8자까지 입력하며 여행자 화면의 매칭 버튼에 표시돼요"
      : "8文字まで入力でき、旅行者画面のマッチングボタンに表示されます"
    : ko
      ? "8자까지 입력하며 매칭 버튼에 표시돼요"
      : "8文字まで入力でき、マッチングボタンに表示されます",
  genderLabel: ko ? "성별" : "性別",
  genderFemale: ko ? "여성" : "女性",
  genderMale: ko ? "남성" : "男性",
  genderUnspecified: ko ? "응답 안 함" : "回答しない",
  birthYearLabel: ko ? "출생연도" : "生まれた年",
  birthYearPlaceholder: ko ? "예: 1998" : "例: 2000",
  birthYearHint: ko
    ? "4자리 연도, 만 18세 이상만 가입할 수 있습니다"
    : "4桁の西暦、18歳以上のみ登録できます",
  bioLabel: ko ? "소개 (선택)" : "自己紹介 (任意)",
  bioPlaceholder: ko
    ? "성수에서 8년째 살고 있어요. 카페 사장님들과 친해요."
    : "初めてのソウル一人旅です。カフェと写真が好き！",
  nextButton: ko ? "다음" : "次へ",
  savingButton: ko ? "저장 중" : "保存中",
  cancelButton: ko ? "취소" : "キャンセル",
  refreshFailed: ko
    ? "프로필이 저장됐지만 다음 단계 확인에 실패했습니다."
    : "プロフィールは保存されましたが、次の段階の確認に失敗しました。",
  retryRefresh: ko ? "상태 다시 확인" : "状態を再確認",
});
