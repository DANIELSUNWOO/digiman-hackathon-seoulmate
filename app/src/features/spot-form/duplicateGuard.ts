// 응답을 못 받은 저장을 기억해 같은 스팟이 두 번 생기지 않게 한다.
import type { SpotFormApi } from "./api";
import { AlreadySavedError } from "./errors";

/** 저장을 시도하는 내용 */
export interface Attempt {
  place: string;
  /** 같은 입력인지 비교하는 값 */
  content: string;
  name: string;
}

interface SentAttempt extends Attempt {
  photoUrl: string;
}

export interface DuplicateGuard {
  /**
   * 보내기 전에 부른다. 같은 내용이 이미 저장돼 있으면 true.
   * 다른 내용이 저장돼 있었다면 AlreadySavedError를 던진다.
   */
  isSaved: (next: Attempt) => Promise<boolean>;
  /** 서버가 저장했는지 알 수 없는 요청 */
  remember: (sent: SentAttempt) => void;
}

/**
 * onStaleUploads: 올려 둔 URL을 다시 쓰면 안 될 때 부른다. 저장 여부를 사진 URL로
 * 확인하므로, 이전 요청과 URL을 나눠 쓰면 다음 확인이 틀린다.
 */
export function createDuplicateGuard(
  api: Pick<SpotFormApi, "getPhotoUrls">,
  mapId: number,
  onStaleUploads: () => void,
): DuplicateGuard {
  let unsure: SentAttempt | null = null;
  let confirmed: Attempt[] = [];

  /** 결과를 모르던 요청을 확인한다. 저장돼 있었으면 돌려준다. */
  const settle = async (next: Attempt): Promise<Attempt | null> => {
    if (!unsure) return null;
    const sent = unsure;
    const saved = (await api.getPhotoUrls(mapId)).includes(sent.photoUrl);
    if (saved) confirmed = [...confirmed, sent];
    if (saved || sent.content !== next.content) onStaleUploads();
    unsure = null;
    return saved ? sent : null;
  };

  return {
    isSaved: async (next) => {
      const justSaved = await settle(next);
      if (confirmed.some(({ content }) => content === next.content))
        return true;
      const samePlace = confirmed.find(({ place }) => place === next.place);
      if (samePlace) throw new AlreadySavedError(samePlace.name, true);
      // 다른 장소는 한 번 알리고, 다시 저장하면 새로 등록한다.
      if (justSaved) throw new AlreadySavedError(justSaved.name, false);
      return false;
    },
    remember: (sent) => {
      unsure = sent;
    },
  };
}
